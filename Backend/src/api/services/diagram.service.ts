import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { prisma } from '../../config/database'
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from '../../config/r2'
import { buildDiagramKey } from '../../utils/r2-key'
import { Errors } from '../../utils/app-error'
import { logger } from '../../config/logger'

// ── List diagram jobs for a batch ─────────────────────────────────────────────

export async function listDiagramJobs(batchId: string, status?: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } })
  if (!batch) throw Errors.notFound('Batch')

  return prisma.diagramJob.findMany({
    where: {
      question: { batchId },
      ...(status ? { status } : {}),
    },
    include: {
      question: {
        select: {
          id: true,
          status: true,
          content: true,
          batch: { select: { id: true, subject: { select: { code: true } } } },
        },
      },
      assets: { where: { isActive: true }, orderBy: { version: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getDiagramJob(jobId: string) {
  const job = await prisma.diagramJob.findUnique({
    where: { id: jobId },
    include: {
      question: {
        select: {
          id: true,
          status: true,
          content: true,
          batchId: true,
          batch: { select: { id: true, subject: { select: { id: true, code: true } } } },
        },
      },
      assets: { orderBy: { version: 'desc' } },
    },
  })
  if (!job) throw Errors.notFound('Diagram job')
  return job
}

// ── Upload diagram PNG to R2 ──────────────────────────────────────────────────

export async function uploadDiagram(
  jobId: string,
  fileBuffer: Buffer,
  mimeType: string,
) {
  if (!r2Client) throw Errors.internal('R2 storage is not configured')

  const job = await prisma.diagramJob.findUnique({
    where: { id: jobId },
    include: {
      question: {
        include: {
          batch: { include: { subject: { select: { code: true } } } },
        },
      },
      assets: { where: { isActive: true }, orderBy: { version: 'desc' }, take: 1 },
    },
  })

  if (!job) throw Errors.notFound('Diagram job')
  if (job.status === 'uploaded') {
    // Already uploaded — this is a re-upload; deactivate previous asset
    const currentVersion = job.assets[0]?.version ?? 0
    const nextVersion = currentVersion + 1
    return _doUpload(job, fileBuffer, mimeType, nextVersion)
  }

  return _doUpload(job, fileBuffer, mimeType, 1)
}

async function _doUpload(
  job: Awaited<ReturnType<typeof prisma.diagramJob.findUnique>> & object,
  fileBuffer: Buffer,
  mimeType: string,
  version: number,
) {
  const typedJob = job as {
    id: string
    description: string
    question: {
      id: string
      batch: { id: string; subject: { code: string } }
    }
    assets: Array<{ id: string; version: number }>
  }

  const subjectCode = typedJob.question.batch.subject.code
  const batchId = typedJob.question.batch.id
  const questionId = typedJob.question.id
  const r2Key = buildDiagramKey(subjectCode, batchId, questionId, version)
  const publicUrl = `${R2_PUBLIC_URL}/${r2Key}`

  // Upload to R2
  await r2Client!.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: fileBuffer,
      ContentType: mimeType,
    }),
  )

  // Deactivate old assets
  if (typedJob.assets.length > 0) {
    await prisma.diagramAsset.updateMany({
      where: { diagramJobId: typedJob.id, isActive: true },
      data: { isActive: false },
    })
  }

  // Create new asset record
  const asset = await prisma.diagramAsset.create({
    data: {
      diagramJobId: typedJob.id,
      r2Key,
      publicUrl,
      version,
      originalDescription: typedJob.description,
      isActive: true,
    },
  })

  // Update job status
  await prisma.diagramJob.update({
    where: { id: typedJob.id },
    data: { status: 'uploaded' },
  })

  // Update question status to diagram_done
  await prisma.question.update({
    where: { id: questionId },
    data: { status: 'diagram_done' },
  })

  logger.info({ jobId: typedJob.id, r2Key, version }, 'Diagram uploaded')

  return asset
}

// ── Mark a diagram job as failed ──────────────────────────────────────────────

export async function markDiagramFailed(jobId: string, errorMessage: string) {
  const job = await prisma.diagramJob.findUnique({ where: { id: jobId } })
  if (!job) throw Errors.notFound('Diagram job')
  if (job.status === 'uploaded') throw Errors.validation('Cannot mark an uploaded diagram as failed')

  return prisma.diagramJob.update({
    where: { id: jobId },
    data: { status: 'failed', errorMessage },
  })
}

// ── Batch diagram completion check ────────────────────────────────────────────

export async function checkAndAdvanceBatchDiagramStatus(batchId: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } })
  if (!batch) throw Errors.notFound('Batch')

  if (!['validation_complete', 'diagram_complete'].includes(batch.status)) return batch

  // Count all pending diagram jobs for this batch
  const pendingJobs = await prisma.diagramJob.count({
    where: {
      status: 'pending',
      question: { batchId },
    },
  })

  // Count total diagram jobs
  const totalJobs = await prisma.diagramJob.count({
    where: { question: { batchId } },
  })

  if (totalJobs === 0) {
    // No diagrams needed — advance directly if in validation_complete
    if (batch.status === 'validation_complete') {
      return prisma.batch.update({
        where: { id: batchId },
        data: { status: 'diagram_complete' },
      })
    }
    return batch
  }

  if (pendingJobs === 0) {
    return prisma.batch.update({
      where: { id: batchId },
      data: { status: 'diagram_complete' },
    })
  }

  return batch
}

export async function getBatchDiagramSummary(batchId: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } })
  if (!batch) throw Errors.notFound('Batch')

  const [total, uploaded, failed, pending] = await Promise.all([
    prisma.diagramJob.count({ where: { question: { batchId } } }),
    prisma.diagramJob.count({ where: { status: 'uploaded', question: { batchId } } }),
    prisma.diagramJob.count({ where: { status: 'failed', question: { batchId } } }),
    prisma.diagramJob.count({ where: { status: 'pending', question: { batchId } } }),
  ])

  return {
    batchId,
    batchStatus: batch.status,
    diagrams: { total, uploaded, failed, pending },
    allDone: total > 0 && pending === 0,
  }
}

// ── Delete a diagram asset from R2 ────────────────────────────────────────────

export async function deleteDiagramAsset(assetId: string) {
  const asset = await prisma.diagramAsset.findUnique({ where: { id: assetId } })
  if (!asset) throw Errors.notFound('Diagram asset')

  if (r2Client) {
    try {
      await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: asset.r2Key }))
    } catch (err) {
      logger.warn({ assetId, r2Key: asset.r2Key, err }, 'R2 delete failed — marking asset inactive anyway')
    }
  }

  await prisma.diagramAsset.update({ where: { id: assetId }, data: { isActive: false } })

  // If this was the only active asset, reset job to pending
  const activeAssets = await prisma.diagramAsset.count({
    where: { diagramJobId: asset.diagramJobId, isActive: true },
  })
  if (activeAssets === 0) {
    await prisma.diagramJob.update({
      where: { id: asset.diagramJobId },
      data: { status: 'pending', errorMessage: null },
    })
    const job = await prisma.diagramJob.findUnique({ where: { id: asset.diagramJobId } })
    if (job) {
      await prisma.question.update({
        where: { id: job.questionId },
        data: { status: 'diagram_pending' },
      })
    }
  }

  return { deleted: true, assetId }
}
