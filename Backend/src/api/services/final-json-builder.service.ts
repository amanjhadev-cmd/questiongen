import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'
import { getActiveSchemasByCode } from './question-type-schema.service'

export interface FinalQuestion {
  id: string
  question_type: string
  // Content fields are shaped by each question type's schema (2B), so they vary.
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

// The content fields emitted when a question type has no custom schema yet.
const LEGACY_FIELDS = [
  'question_text', 'question_type', 'marks', 'difficulty', 'bloom_level', 'explanation',
  'options', 'correct_option', 'correct_answer', 'blanks', 'column_a', 'column_b',
  'correct_matches', 'solution_steps', 'passage', 'hint', 'tags',
  'diagram_required', 'diagram_description', 'language', 'is_ncert', 'ncert_page', 'year_asked',
]

export async function buildFinalJson(batchId: string): Promise<Array<Record<string, unknown>>> {
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
      chapter: { select: { id: true, uuid: true } },
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
  // Prefer the source chapter UUID (e.g. from the Excel import); fall back to
  // the internal DB id only when the chapter has no source UUID.
  const chapterUuid = batch.chapter?.uuid ?? batch.chapter?.id ?? null

  // Per-question-type schemas decide which content fields the export carries (2B).
  const schemas = await getActiveSchemasByCode()

  type BatchQuestion = typeof batch.questions[0]
  return batch.questions.map((q: BatchQuestion): Record<string, unknown> => {
    const content = q.content as Record<string, unknown>

    // ── Nested production format: echo it back, overriding identity fields ────────
    if (content.metadata && content.question) {
      const c = JSON.parse(JSON.stringify(content)) as Record<string, unknown>
      const m = c.metadata as Record<string, unknown>
      if (batch.chapter?.uuid) m.chapter_uuid = batch.chapter.uuid // guarantee correct chapter linkage
      m.batch_uuid = batch.id
      return { id: q.id, ...c }
    }

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

    // Which content fields to emit: the type's schema `properties` if configured,
    // otherwise the legacy field list (so exports keep working until a schema is set).
    const code = String(content.question_type ?? '')
    const schema = schemas.get(code)
    const schemaProps =
      schema && typeof schema.definition === 'object' && schema.definition !== null
        ? (schema.definition as { properties?: Record<string, unknown> }).properties
        : undefined
    const fieldKeys =
      schemaProps && typeof schemaProps === 'object' ? Object.keys(schemaProps) : LEGACY_FIELDS

    const contentOut: Record<string, unknown> = {}
    for (const key of fieldKeys) {
      if (content[key] !== undefined) contentOut[key] = content[key]
    }
    // question_type always identifies the record, even if a schema omits it.
    if (contentOut.question_type === undefined) contentOut.question_type = content.question_type

    return { id: q.id, ...contentOut, _meta: meta } as FinalQuestion
  })
}
