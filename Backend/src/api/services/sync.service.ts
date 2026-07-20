import { SendMessageBatchCommand, type SendMessageBatchRequestEntry } from '@aws-sdk/client-sqs'
import { prisma } from '../../config/database'
import { env } from '../../config/env'
import { Errors } from '../../utils/app-error'
import { logger } from '../../config/logger'
import { buildFinalJson } from './final-json-builder.service'
import { sqsClient, SQS_QUEUE_URL } from '../../config/sqs'
import { getActiveSchemasByCode } from './question-type-schema.service'
import { compileTypeSchema } from './validation.service'

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

// ── Push to AWS SQS (alternative to n8n) ────────────────────────────────────────
// Re-validates every approved question against its question-type Output Schema
// FIRST; if any fails, nothing is pushed. On success, sends one message per
// question (batched, 10 at a time) so the consumer inserts them queue-style.
export async function syncBatchToSqs(batchId: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } })
  if (!batch) throw Errors.notFound('Batch')
  if (batch.status !== 'export_complete') {
    throw Errors.validation(`Batch must be in 'export_complete' status before syncing. Current: '${batch.status}'`)
  }
  if (!sqsClient || !SQS_QUEUE_URL) {
    throw Errors.internal('SQS is not configured (set SQS_QUEUE_URL in .env)')
  }

  // ── Re-validate all approved questions before pushing anything ────────────────
  const questions = await prisma.question.findMany({
    where: { batchId, status: 'approved' },
    include: { questionType: { select: { code: true } } },
    orderBy: { createdAt: 'asc' },
  })
  if (questions.length === 0) throw Errors.validation('No approved questions to sync')

  const activeSchemas = await getActiveSchemasByCode()
  const validators = new Map<string, ReturnType<typeof compileTypeSchema>>()
  for (const [code, s] of activeSchemas) validators.set(code, compileTypeSchema(s.definition))

  const failures: Array<{ index: number; questionId: string; errors: string[] }> = []
  questions.forEach((q: { id: string; content: unknown; questionType: { code: string } }, i: number) => {
    const validate = validators.get(q.questionType.code)
    if (!validate) return // no strict schema for this type — skip (matches import fallback)
    if (!validate(q.content)) {
      failures.push({
        index: i,
        questionId: q.id,
        errors: (validate.errors ?? []).map((e) => `${e.instancePath || 'root'} ${e.message ?? ''}`.trim()),
      })
    }
  })
  if (failures.length > 0) {
    throw Errors.validation(
      `${failures.length} question(s) failed schema re-validation — nothing was pushed to the queue.`,
      { failures },
    )
  }

  // ── Push one message per question, batched (SendMessageBatch max 10) ───────────
  const finalQuestions = await buildFinalJson(batchId)
  const isFifo = SQS_QUEUE_URL.endsWith('.fifo')
  let pushed = 0

  for (let i = 0; i < finalQuestions.length; i += 10) {
    const chunk = finalQuestions.slice(i, i + 10)
    const entries: SendMessageBatchRequestEntry[] = chunk.map((fq, j) => {
      const meta = fq.metadata as Record<string, unknown> | undefined
      const qType = String(fq.question_type ?? meta?.question_type ?? '')
      return {
        Id: `q${i + j}`,
        MessageBody: JSON.stringify(fq),
        ...(isFifo ? { MessageGroupId: batchId, MessageDeduplicationId: String(fq.id ?? `${batchId}-${i + j}`) } : {}),
        MessageAttributes: {
          batchId: { DataType: 'String', StringValue: batchId },
          questionType: { DataType: 'String', StringValue: qType || 'unknown' },
        },
      }
    })
    const res = await sqsClient.send(new SendMessageBatchCommand({ QueueUrl: SQS_QUEUE_URL, Entries: entries }))
    if (res.Failed && res.Failed.length > 0) {
      logger.error({ batchId, failed: res.Failed }, 'SQS batch send had failures')
      throw Errors.internal(`SQS push failed for ${res.Failed.length} message(s) after ${pushed} succeeded.`)
    }
    pushed += res.Successful?.length ?? 0
  }

  const updated = await prisma.batch.update({ where: { id: batchId }, data: { status: 'synced' } })
  logger.info({ batchId, pushed }, 'Batch pushed to SQS')

  return { batchId, status: 'synced', pushed, queue: SQS_QUEUE_URL, updatedBatch: updated }
}
