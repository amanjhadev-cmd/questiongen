import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'
import { getPaginationParams, buildMeta, getSkip } from '../../utils/pagination'

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
) {
  const pagination = getPaginationParams(query)
  const { page, limit } = pagination
  const skip = getSkip(pagination)

  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.subjectId ? { subjectId: query.subjectId } : {}),
    ...(query.createdById ? { createdById: query.createdById } : {}),
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

  const variables: Record<string, string> = {
    subject: batch.subject.name,
    board: batch.subject.class.board.name,
    class: batch.subject.class.name,
    chapter: batch.chapter?.name ?? '',
    count: String(batch.questionCount),
    question_type: batch.questionType.code,
    difficulty: batch.difficulty,
    bloom_level: '{{bloom_level}}', // set by intern at generation time
    max_concepts: String(profile.maxConcepts),
    schema: '{{schema}}', // injected separately
  }

  let interpolated = promptVersion.content
  for (const [key, value] of Object.entries(variables)) {
    interpolated = interpolated.replaceAll(`{{${key}}}`, value)
  }

  const concepts = (batch.chapter?.concepts ?? []).map(
    (c: { uuid: string; name: string; shortNote: string | null }) => ({
      uuid: c.uuid,
      name: c.name,
      shortNote: c.shortNote,
    }),
  )

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
  }
}
