import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'
import { parseImportInput, RawInput } from '../../utils/import-parser'
import { validateQuestion } from './validation.service'
import { buildInjectedMetadata } from './metadata-injection.service'
import { logger } from '../../config/logger'

export interface ImportResult {
  batchId: string
  total: number
  saved: number
  failed: number
  results: Array<{
    index: number
    questionId?: string
    valid: boolean
    errors: Array<{ pass: number; field: string; message: string }>
  }>
}

export async function importQuestions(
  batchId: string,
  raw: RawInput,
  mode: 'append' | 'replace' = 'append',
): Promise<ImportResult> {
  // Load batch with subject profile
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      subject: {
        include: {
          subjectProfile: true,
        },
      },
      chapter: { include: { concepts: true } },
      questionType: true,
    },
  })

  if (!batch) throw Errors.notFound('Batch')

  if (!['generation_complete', 'import_complete'].includes(batch.status)) {
    throw Errors.validation(
      `Import is only allowed when batch status is 'generation_complete' or 'import_complete'. Current: '${batch.status}'`,
    )
  }

  const profile = batch.subject.subjectProfile
  if (!profile) throw Errors.validation('Subject has no profile configured')

  // If replace mode, remove all existing staged/validation_failed questions
  if (mode === 'replace') {
    await prisma.question.deleteMany({
      where: {
        batchId,
        status: { in: ['staged', 'validation_failed'] },
      },
    })
  }

  // Parse raw input
  const questions = parseImportInput(raw)

  // Collect allowed concept UUIDs for this chapter (if concept mapping enabled)
  const allowedConceptUuids: Set<string> | undefined = profile.conceptEnabled && batch.chapter
    ? new Set(batch.chapter.concepts.map((c) => c.uuid as string))
    : undefined

  const validationOptions = {
    allowedConceptUuids,
    diagramEnabled: profile.diagramEnabled as boolean,
    conceptEnabled: profile.conceptEnabled as boolean,
    passageEnabled: profile.passageEnabled as boolean,
    solutionStepsEnabled: profile.solutionStepsEnabled as boolean,
  }

  // Build injected metadata once for all questions
  const injectedMetadata = await buildInjectedMetadata(batchId)

  const results: ImportResult['results'] = []
  let saved = 0
  let failed = 0

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const validation = validateQuestion(q, validationOptions)

    if (validation.valid) {
      // Resolve primary concept FK if concept_uuids present
      let conceptId: string | null = null
      let conceptUuid: string | null = null

      if (profile.conceptEnabled && Array.isArray(q.concept_uuids) && (q.concept_uuids as string[]).length > 0) {
        const firstUuid = (q.concept_uuids as string[])[0]
        const concept = await prisma.concept.findUnique({ where: { uuid: firstUuid } })
        if (concept) {
          conceptId = concept.id
          conceptUuid = concept.uuid
        }
      }

      const question = await prisma.question.create({
        data: {
          batchId,
          conceptId,
          conceptUuid,
          questionTypeId: batch.questionTypeId,
          content: q as object,
          injectedMetadata: injectedMetadata as object,
          status: 'validated',
          importErrors: [],
        },
      })

      // Create version snapshot
      await prisma.questionVersion.create({
        data: {
          questionId: question.id,
          versionNo: 1,
          content: q as object,
          changedById: batch.createdById,
          changeNote: 'Initial import',
        },
      })

      // If diagram required, create diagram job
      if (q.diagram_required === true && q.diagram_description) {
        await prisma.diagramJob.create({
          data: {
            questionId: question.id,
            description: q.diagram_description as string,
            status: 'pending',
          },
        })

        await prisma.question.update({
          where: { id: question.id },
          data: { status: 'diagram_pending' },
        })
      }

      results.push({ index: i, questionId: question.id, valid: true, errors: [] })
      saved++
    } else {
      // Save as staged with import errors recorded
      const question = await prisma.question.create({
        data: {
          batchId,
          questionTypeId: batch.questionTypeId,
          content: q as object,
          injectedMetadata: {},
          status: 'validation_failed',
          importErrors: validation.errors as object[],
        },
      })

      results.push({ index: i, questionId: question.id, valid: false, errors: validation.errors })
      failed++
    }
  }

  // Advance batch status
  const newStatus = failed === 0 ? 'validation_complete' : 'import_complete'
  await prisma.batch.update({
    where: { id: batchId },
    data: { status: newStatus },
  })

  logger.info({ batchId, saved, failed }, 'Import complete')

  return { batchId, total: questions.length, saved, failed, results }
}

export async function revalidateBatch(batchId: string): Promise<ImportResult> {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      subject: { include: { subjectProfile: true } },
      chapter: { include: { concepts: true } },
    },
  })

  if (!batch) throw Errors.notFound('Batch')
  if (batch.status !== 'import_complete') {
    throw Errors.validation(`Revalidation only available for 'import_complete' batches. Current: '${batch.status}'`)
  }

  const profile = batch.subject.subjectProfile!
  const allowedConceptUuids: Set<string> | undefined = profile.conceptEnabled && batch.chapter
    ? new Set(batch.chapter.concepts.map((c) => c.uuid as string))
    : undefined

  const validationOptions = {
    allowedConceptUuids,
    diagramEnabled: profile.diagramEnabled as boolean,
    conceptEnabled: profile.conceptEnabled as boolean,
    passageEnabled: profile.passageEnabled as boolean,
    solutionStepsEnabled: profile.solutionStepsEnabled as boolean,
  }

  const questions = await prisma.question.findMany({
    where: { batchId, status: 'validation_failed' },
  })

  const results: ImportResult['results'] = []
  let saved = 0
  let failed = 0

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const content = q.content as Record<string, unknown>
    const validation = validateQuestion(content, validationOptions)

    if (validation.valid) {
      await prisma.question.update({
        where: { id: q.id },
        data: { status: 'validated', importErrors: [] },
      })
      results.push({ index: i, questionId: q.id, valid: true, errors: [] })
      saved++
    } else {
      await prisma.question.update({
        where: { id: q.id },
        data: { importErrors: validation.errors as object[] },
      })
      results.push({ index: i, questionId: q.id, valid: false, errors: validation.errors })
      failed++
    }
  }

  const remainingFailed = await prisma.question.count({ where: { batchId, status: 'validation_failed' } })
  if (remainingFailed === 0) {
    await prisma.batch.update({ where: { id: batchId }, data: { status: 'validation_complete' } })
  }

  return { batchId, total: questions.length, saved, failed, results }
}

export async function listBatchQuestions(batchId: string, status?: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } })
  if (!batch) throw Errors.notFound('Batch')

  return prisma.question.findMany({
    where: { batchId, ...(status ? { status } : {}) },
    include: {
      concept: { select: { id: true, name: true, uuid: true } },
      questionType: { select: { id: true, code: true, label: true } },
      _count: { select: { smeReviews: true, diagramJobs: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getQuestion(questionId: string) {
  const q = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      concept: { select: { id: true, name: true, uuid: true } },
      questionType: { select: { id: true, code: true, label: true } },
      diagramJobs: {
        include: { assets: { where: { isActive: true } } },
        orderBy: { createdAt: 'desc' },
      },
      smeReviews: {
        include: { reviewedBy: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      },
      versions: { orderBy: { versionNo: 'desc' }, take: 5 },
    },
  })
  if (!q) throw Errors.notFound('Question')
  return q
}
