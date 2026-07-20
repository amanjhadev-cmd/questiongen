import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'
import { getPaginationParams, buildMeta, getSkip } from '../../utils/pagination'
import { getActiveSchemasByCode } from './question-type-schema.service'

const BATCH_STATUS_ORDER = [
  'created',
  'generation_complete',
  'import_complete',
  'validation_complete',
  'diagram_complete',
  'sme_review_complete',
  'export_complete',
  'synced',
] as const

type BatchStatus = (typeof BATCH_STATUS_ORDER)[number]

function nextStatus(current: BatchStatus): BatchStatus | null {
  const idx = BATCH_STATUS_ORDER.indexOf(current)
  return idx >= 0 && idx < BATCH_STATUS_ORDER.length - 1 ? BATCH_STATUS_ORDER[idx + 1] : null
}

const batchIncludes = {
  subject: { select: { id: true, name: true, code: true } },
  chapter: { select: { id: true, name: true, chapterNo: true } },
  questionType: { select: { id: true, code: true, label: true } },
  profile: { select: { id: true, diagramEnabled: true, conceptEnabled: true, passageEnabled: true, solutionStepsEnabled: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
}

export async function listBatches(
  query: { page?: string; limit?: string; status?: string; subjectId?: string; createdById?: string },
  scope?: { role: string; userId: string; subjectIds: string[] },
) {
  const pagination = getPaginationParams(query)
  const { page, limit } = pagination
  const skip = getSkip(pagination)

  const statusFilter = query.status
    ? query.status.includes(',')
      ? { status: { in: query.status.split(',').map((s) => s.trim()) } }
      : { status: query.status }
    : {}

  // SME scoping: an SME sees batches whose subject is assigned to them OR that
  // are directly assigned to them via Batch.assignedTo. Other roles see everything.
  const scopeFilter =
    scope && scope.role === 'sme'
      ? { OR: [{ subjectId: { in: scope.subjectIds } }, { assignedTo: scope.userId }] }
      : {}

  const where = {
    ...statusFilter,
    ...(query.subjectId ? { subjectId: query.subjectId } : {}),
    ...(query.createdById ? { createdById: query.createdById } : {}),
    ...scopeFilter,
  }

  const [data, total] = await Promise.all([
    prisma.batch.findMany({
      where,
      include: batchIncludes,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.batch.count({ where }),
  ])

  return { data, meta: buildMeta(total, pagination) }
}

export async function getBatch(id: string) {
  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      ...batchIncludes,
      _count: { select: { questions: true } },
    },
  })
  if (!batch) throw Errors.notFound('Batch')
  return batch
}

export async function createBatch(data: {
  name: string
  subjectId: string
  chapterId?: string
  questionTypeId: string
  difficulty: string
  questionCount: number
  notes?: string
  assignedTo?: string
  createdById: string
}) {
  // Resolve subject profile (subject must have a profile before batch creation)
  const profile = await prisma.subjectProfile.findUnique({ where: { subjectId: data.subjectId } })
  if (!profile) throw Errors.validation('Subject has no active profile. Configure a Subject Profile first.')

  const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } })
  if (!subject) throw Errors.notFound('Subject')

  if (data.chapterId) {
    const chapter = await prisma.chapter.findFirst({ where: { id: data.chapterId, subjectId: data.subjectId } })
    if (!chapter) throw Errors.notFound('Chapter in this subject')
  }

  const qType = await prisma.questionType.findUnique({ where: { id: data.questionTypeId } })
  if (!qType) throw Errors.notFound('Question type')

  return prisma.batch.create({
    data: {
      name: data.name,
      subjectId: data.subjectId,
      chapterId: data.chapterId ?? null,
      questionTypeId: data.questionTypeId,
      difficulty: data.difficulty,
      questionCount: data.questionCount,
      profileId: profile.id,
      notes: data.notes,
      assignedTo: data.assignedTo ?? null,
      createdById: data.createdById,
    },
    include: batchIncludes,
  })
}

export async function updateBatch(
  id: string,
  data: { name?: string; notes?: string; assignedTo?: string },
) {
  const batch = await prisma.batch.findUnique({ where: { id } })
  if (!batch) throw Errors.notFound('Batch')
  if (batch.status !== 'created') {
    throw Errors.validation('Batch can only be edited in created status')
  }
  return prisma.batch.update({
    where: { id },
    data: { name: data.name, notes: data.notes, assignedTo: data.assignedTo ?? null },
    include: batchIncludes,
  })
}

// Remove rejected questions and reopen the batch so an intern can regenerate
// replacements. Approved questions are kept; the batch goes back to
// 'generation_complete' so the prompt can be re-copied and new JSON imported.
export async function reopenRejected(id: string) {
  const batch = await prisma.batch.findUnique({ where: { id } })
  if (!batch) throw Errors.notFound('Batch')
  if (['created', 'generation_complete', 'export_complete', 'synced'].includes(batch.status)) {
    throw Errors.validation(`Cannot regenerate rejected questions from '${batch.status}' status`)
  }

  const rejected = await prisma.question.findMany({ where: { batchId: id, status: 'rejected' }, select: { id: true } })
  if (rejected.length === 0) throw Errors.validation('No rejected questions to regenerate')
  const ids = rejected.map((r: { id: string }) => r.id)

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const jobs = await tx.diagramJob.findMany({ where: { questionId: { in: ids } }, select: { id: true } })
    const jobIds = jobs.map((j: { id: string }) => j.id)
    if (jobIds.length > 0) {
      await tx.diagramAsset.deleteMany({ where: { diagramJobId: { in: jobIds } } })
      await tx.diagramJob.deleteMany({ where: { id: { in: jobIds } } })
    }
    await tx.smeReview.deleteMany({ where: { questionId: { in: ids } } })
    await tx.questionVersion.deleteMany({ where: { questionId: { in: ids } } })
    await tx.question.deleteMany({ where: { id: { in: ids } } })
    await tx.batch.update({ where: { id }, data: { status: 'generation_complete' } })
  })

  return { removed: ids.length, status: 'generation_complete' }
}

export async function markGenerationComplete(id: string) {
  const batch = await prisma.batch.findUnique({ where: { id } })
  if (!batch) throw Errors.notFound('Batch')
  if (batch.status !== 'created') {
    throw Errors.validation(`Batch is already in '${batch.status}' status`)
  }
  return prisma.batch.update({
    where: { id },
    data: { status: 'generation_complete' },
    include: batchIncludes,
  })
}

export async function advanceBatchStatus(id: string, to: string) {
  const batch = await prisma.batch.findUnique({ where: { id } })
  if (!batch) throw Errors.notFound('Batch')

  const expectedNext = nextStatus(batch.status as BatchStatus)
  if (expectedNext !== to) {
    throw Errors.validation(`Cannot transition batch from '${batch.status}' to '${to}'`)
  }

  return prisma.batch.update({ where: { id }, data: { status: to }, include: batchIncludes })
}

export async function sendToReview(id: string, smeId: string) {
  const batch = await prisma.batch.findUnique({ where: { id } })
  if (!batch) throw Errors.notFound('Batch')

  if (!['validation_complete', 'diagram_complete'].includes(batch.status)) {
    throw Errors.validation(
      `Batch must be in 'validation_complete' or 'diagram_complete' status to send to review. Current: '${batch.status}'`,
    )
  }

  return prisma.batch.update({
    where: { id },
    data: { assignedTo: smeId },
    include: batchIncludes,
  })
}

export async function getBatchPromptPreview(batchId: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      subject: {
        include: {
          class: { include: { board: true } },
          subjectProfile: {
            include: {
              promptVersion: true,
            },
          },
        },
      },
      chapter: { include: { concepts: { orderBy: { name: 'asc' } } } },
      questionType: true,
    },
  })

  if (!batch) throw Errors.notFound('Batch')

  const profile = batch.subject.subjectProfile
  if (!profile) throw Errors.validation('Subject has no profile configured')

  const promptVersion = profile.promptVersion
  if (!promptVersion) throw Errors.validation('No prompt version configured for this subject profile')
  if (promptVersion.status !== 'published') throw Errors.validation('The linked prompt version is not published')

  // Inject the output schema for this batch's question type (from Output Schemas)
  // into the {{schema}} placeholder so the LLM sees the exact target format.
  const activeSchemas = await getActiveSchemasByCode()
  const typeSchema = activeSchemas.get(batch.questionType.code)
  const schemaText = typeSchema
    ? JSON.stringify(typeSchema.definition, null, 2)
    : `(No output schema configured for question type "${batch.questionType.code}". Configure one under Output Schemas.)`

  const variables: Record<string, string> = {
    subject: batch.subject.name,
    board: batch.subject.class.board.name,
    class: batch.subject.class.name,
    chapter: batch.chapter?.name ?? '',
    count: String(batch.questionCount),
    question_type: batch.questionType.code,
    difficulty: batch.difficulty,
    bloom_level: '{{bloom_level}}', // set by intern at generation time (frontend)
    max_concepts: String(profile.maxConcepts),
    schema: schemaText,
  }

  let interpolated = promptVersion.content
  for (const [key, value] of Object.entries(variables)) {
    // Function replacement avoids `$` in the value (e.g. "$schema", "$ref" in an
    // injected JSON Schema) being treated as a special replacement pattern.
    interpolated = interpolated.replaceAll(`{{${key}}}`, () => value)
  }

  const concepts = (batch.chapter?.concepts ?? []).map(
    (c: { uuid: string; name: string; shortNote: string | null }) => ({
      uuid: c.uuid,
      name: c.name,
      shortNote: c.shortNote,
    }),
  )

  // ── De-dup prevention context (Layer 2) ──────────────────────────────────────
  // Make the prompt aware of what already exists for this chapter so the LLM
  // steers away from duplicates and toward under-covered concepts.
  const KEPT = ['validated', 'diagram_pending', 'diagram_done', 'under_review', 'approved']
  let existingCount = 0
  let conceptCoverage: Array<{ uuid: string; name: string; count: number }> = []
  let avoidSample: string[] = []

  if (batch.chapterId) {
    const [count, sampleRows, conceptRows] = await Promise.all([
      prisma.question.count({ where: { chapterId: batch.chapterId, status: { in: KEPT } } }),
      prisma.question.findMany({
        where: { chapterId: batch.chapterId, status: { in: KEPT } },
        select: { content: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.question.groupBy({
        by: ['conceptUuid'],
        where: { chapterId: batch.chapterId, status: { in: KEPT } },
        _count: { _all: true },
      }),
    ])
    existingCount = count
    avoidSample = sampleRows
      .map((r: { content: unknown }) => String((r.content as Record<string, unknown>).question_text ?? '').trim())
      .filter(Boolean)
      .map((s: string) => (s.length > 160 ? `${s.slice(0, 160)}…` : s))
    const countByUuid = new Map<string, number>(
      (conceptRows as Array<{ conceptUuid: string | null; _count: { _all: number } }>).map((r) => [r.conceptUuid ?? 'unknown', r._count._all]),
    )
    conceptCoverage = concepts.map((c: { uuid: string; name: string }) => ({
      uuid: c.uuid,
      name: c.name,
      count: countByUuid.get(c.uuid) ?? 0,
    }))

    if (existingCount > 0) {
      const coverageLines = conceptCoverage
        .slice()
        .sort((a, b) => a.count - b.count)
        .map((c) => `- ${c.name}: ${c.count} already`)
        .join('\n')
      const avoidLines = avoidSample.map((s, i) => `${i + 1}. ${s}`).join('\n')
      interpolated += `

---
DUPLICATE-AVOIDANCE CONTEXT (IMPORTANT):
This chapter already has ${existingCount} question(s). Do NOT repeat or lightly reword any existing question. The importer AUTO-REJECTS any question that is more than 80% similar to an existing one (including number-swapped clones), so near-duplicates are wasted effort.

Concept coverage so far — favour the LEAST-covered concepts:
${coverageLines}

Sample of question stems that ALREADY EXIST — avoid these and anything close in wording or angle:
${avoidLines}

Produce questions that are clearly distinct in wording, framing, and values, and spread them across difficulty and Bloom levels.`
    }
  }

  return {
    batchId: batch.id,
    batchName: batch.name,
    promptVersionId: promptVersion.id,
    promptVersionNo: promptVersion.versionNo,
    interpolatedPrompt: interpolated,
    concepts,
    featureFlags: {
      diagramEnabled: profile.diagramEnabled,
      conceptEnabled: profile.conceptEnabled,
      passageEnabled: profile.passageEnabled,
      solutionStepsEnabled: profile.solutionStepsEnabled,
      maxConcepts: profile.maxConcepts,
    },
    dedup: {
      existingCount,
      conceptCoverage,
      avoidSampleCount: avoidSample.length,
    },
  }
}
