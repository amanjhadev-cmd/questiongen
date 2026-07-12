import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'

export interface FinalQuestion {
  id: string
  question_text: string
  question_type: string
  marks: number
  difficulty: string
  bloom_level: string
  explanation: string
  // optional fields present if applicable
  [key: string]: unknown
  // injected metadata
  _meta: {
    board: string
    class: string
    subject: string
    chapter_uuid: string | null
    batch_uuid: string
    prompt_version: number
    schema_version: number
    created_by: string
    created_at: string
    diagram_url?: string
    diagram_alt_text?: string
    concept_uuids?: string[]
  }
}

export async function buildFinalJson(batchId: string): Promise<FinalQuestion[]> {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      subject: {
        include: {
          class: { include: { board: true } },
          subjectProfile: {
            include: {
              promptVersion: { select: { versionNo: true } },
              schemaVersion: { select: { versionNo: true } },
            },
          },
        },
      },
      chapter: { select: { id: true } },
      questions: {
        where: { status: 'approved' },
        include: {
          concept: { select: { uuid: true } },
          diagramJobs: {
            include: {
              assets: { where: { isActive: true }, orderBy: { version: 'desc' }, take: 1 },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!batch) throw Errors.notFound('Batch')

  if (batch.questions.length === 0) {
    throw Errors.validation('No approved questions found in this batch')
  }

  const profile = batch.subject.subjectProfile
  const board = batch.subject.class.board.name
  const cls = batch.subject.class.name
  const subject = batch.subject.name
  const chapterUuid = batch.chapter?.id ?? null

  type BatchQuestion = typeof batch.questions[0]
  return batch.questions.map((q: BatchQuestion) => {
    const content = q.content as Record<string, unknown>
    const injectedMeta = q.injectedMetadata as Record<string, unknown>

    // Active diagram asset (if any)
    const activeAsset = q.diagramJobs[0]?.assets[0]
    const diagramUrl = activeAsset?.publicUrl ?? undefined
    const diagramAltText = activeAsset ? (content.diagram_description as string | undefined) : undefined

    // Reconstruct concept_uuids from DB: use stored content field's concept_uuids if present,
    // but also include the primary FK concept uuid
    const conceptUuids: string[] | undefined = Array.isArray(content.concept_uuids)
      ? (content.concept_uuids as string[])
      : q.concept?.uuid
        ? [q.concept.uuid]
        : undefined

    const meta = {
      board: (injectedMeta.board as string | undefined) ?? board,
      class: (injectedMeta.class as string | undefined) ?? cls,
      subject: (injectedMeta.subject as string | undefined) ?? subject,
      chapter_uuid: (injectedMeta.chapter_uuid as string | undefined) ?? chapterUuid,
      batch_uuid: batch.id,
      prompt_version: (injectedMeta.prompt_version as number | undefined) ?? profile?.promptVersion.versionNo ?? 0,
      schema_version: (injectedMeta.schema_version as number | undefined) ?? profile?.schemaVersion.versionNo ?? 0,
      created_by: (injectedMeta.created_by as string | undefined) ?? '',
      created_at: (injectedMeta.created_at as string | undefined) ?? q.createdAt.toISOString(),
      ...(diagramUrl ? { diagram_url: diagramUrl } : {}),
      ...(diagramAltText ? { diagram_alt_text: diagramAltText } : {}),
      ...(conceptUuids ? { concept_uuids: conceptUuids } : {}),
    }

    // Build the final question object from DB content (not from imported JSON directly)
    return {
      id: q.id,
      question_text: content.question_text as string,
      question_type: content.question_type as string,
      marks: content.marks as number,
      difficulty: content.difficulty as string,
      bloom_level: content.bloom_level as string,
      explanation: content.explanation as string,
      // Include optional fields if present
      ...(content.options !== undefined ? { options: content.options } : {}),
      ...(content.correct_option !== undefined ? { correct_option: content.correct_option } : {}),
      ...(content.correct_answer !== undefined ? { correct_answer: content.correct_answer } : {}),
      ...(content.blanks !== undefined ? { blanks: content.blanks } : {}),
      ...(content.column_a !== undefined ? { column_a: content.column_a } : {}),
      ...(content.column_b !== undefined ? { column_b: content.column_b } : {}),
      ...(content.correct_matches !== undefined ? { correct_matches: content.correct_matches } : {}),
      ...(content.solution_steps !== undefined ? { solution_steps: content.solution_steps } : {}),
      ...(content.passage !== undefined ? { passage: content.passage } : {}),
      ...(content.hint !== undefined ? { hint: content.hint } : {}),
      ...(content.tags !== undefined ? { tags: content.tags } : {}),
      ...(content.diagram_required !== undefined ? { diagram_required: content.diagram_required } : {}),
      ...(content.diagram_description !== undefined ? { diagram_description: content.diagram_description } : {}),
      ...(content.language !== undefined ? { language: content.language } : {}),
      ...(content.is_ncert !== undefined ? { is_ncert: content.is_ncert } : {}),
      ...(content.ncert_page !== undefined ? { ncert_page: content.ncert_page } : {}),
      ...(content.year_asked !== undefined ? { year_asked: content.year_asked } : {}),
      _meta: meta,
    } as FinalQuestion
  })
}
