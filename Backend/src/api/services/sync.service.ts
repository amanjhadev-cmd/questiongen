import { prisma } from '../../config/database'
import { env } from '../../config/env'
import { Errors } from '../../utils/app-error'
import { logger } from '../../config/logger'
import { buildFinalJson } from './final-json-builder.service'

export async function syncBatchToN8n(batchId: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      subject: { select: { name: true, code: true } },
      exports: {
        where: { format: 'json', status: 'done' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { publicUrl: true, r2Key: true },
      },
    },
  })

  if (!batch) throw Errors.notFound('Batch')
  if (batch.status !== 'export_complete') {
    throw Errors.validation(
      `Batch must be in 'export_complete' status before syncing. Current: '${batch.status}'`,
    )
  }

  if (!env.N8N_WEBHOOK_URL) throw Errors.internal('N8N_WEBHOOK_URL is not configured')

  const jsonExport = batch.exports[0]
  const questions = await buildFinalJson(batchId)

  const payload = {
    batchId: batch.id,
    batchName: batch.name,
    subject: batch.subject.name,
    subjectCode: batch.subject.code,
    difficulty: batch.difficulty,
    questionCount: questions.length,
    exportUrl: jsonExport?.publicUrl ?? null,
    questions,
    sentAt: new Date().toISOString(),
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (env.N8N_SECRET_HEADER) {
    headers['X-N8N-Secret'] = env.N8N_SECRET_HEADER
  }

  const response = await fetch(env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    logger.error({ batchId, status: response.status, body }, 'n8n webhook failed')
    throw Errors.internal(`n8n webhook returned ${response.status}: ${body}`)
  }

  // Advance batch to synced
  const updated = await prisma.batch.update({
    where: { id: batchId },
    data: { status: 'synced' },
  })

  logger.info({ batchId, questionCount: questions.length }, 'Batch synced to n8n')

  return {
    batchId,
    status: 'synced',
    questionCount: questions.length,
    webhookStatus: response.status,
    updatedBatch: updated,
  }
}
