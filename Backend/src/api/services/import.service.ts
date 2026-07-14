import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'
import { parseImportInput, RawInput } from '../../utils/import-parser'
import { validateQuestion } from './validation.service'
import { buildInjectedMetadata } from './metadata-injection.service'
import { logger } from '../../config/logger'
import { normalizeText, hashText, trigramSet, findDuplicate, type ExistingText } from '../../utils/dedup'

const DEDUP_THRESHOLD = 0.85

export interface ImportResult {
  batchId: string
  total: number
  saved: number
  failed: number
  duplicates: number
  results: Array<{
    index: number
    questionId?: string
    valid: boolean
    duplicate?: boolean
    matchedQuestionId?: string
    similarity?: number
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
    ? new Set(batch.chapter.concepts.map((c: { uuid: unknown }) => c.uuid as string))
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

  // ── De-dup setup ──────────────────────────────────────────────────────────────
  // Load existing "kept" questions for this chapter (across all batches) to compare
  // against. Rows with no normalizedText (pre-dedup imports) are skipped — run the
  // backfill script once to include them.
  const dedupChapterId = batch.chapterId
  const existingTexts: ExistingText[] = []
  if (dedupChapterId) {
    const rows = await prisma.question.findMany({
      where: {
        chapterId: dedupChapterId,
        normalizedText: { not: null },
        status: { in: ['validated', 'diagram_pending', 'diagram_done', 'under_review', 'approved'] },
      },
      select: { id: true, normalizedText: true, textHash: true },
    })
    for (const r of rows) {
      const nt = r.normalizedText as string
      existingTexts.push({ id: r.id, normalizedText: nt, textHash: r.textHash ?? '', trigrams: trigramSet(nt) })
    }
  }

  const results: ImportResult['results'] = []
  let saved = 0
  let failed = 0
  let duplicates = 0

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const validation = validateQuestion(q, validationOptions)

    if (validation.valid) {
      // ── De-dup check (per chapter, incl. earlier questions in this same import) ──
      const questionText = String(q.question_text ?? '')
      const normalized = normalizeText(questionText)
      const hash = hashText(normalized)
      const dup = findDuplicate(normalized, hash, existingTexts, DEDUP_THRESHOLD)
      if (dup) {
        results.push({
          index: i,
          valid: true,
          duplicate: true,
          matchedQuestionId: dup.matchedQuestionId,
          similarity: Math.round(dup.similarity * 100) / 100,
          errors: [],
        })
        duplicates++
        continue
      }
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
          chapterId: dedupChapterId ?? null,
          conceptId,
          conceptUuid,
          questionTypeId: batch.questionTypeId,
          content: q as object,
          normalizedText: normalized,
          textHash: hash,
          difficulty: (q.difficulty as string | undefined) ?? null,
          bloomLevel: (q.bloom_level as string | undefined) ?? null,
          injectedMetadata: injectedMetadata as object,
          status: 'validated',
          importErrors: [],
        },
      })

      // Register into the in-run dedup set so later rows in this same paste
      // are compared against it too.
      existingTexts.push({ id: question.id, normalizedText: normalized, textHash: hash, trigrams: trigramSet(normalized) })

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

  logger.info({ batchId, saved, failed, duplicates }, 'Import complete')

  return { batchId, total: questions.length, saved, failed, duplicates, results }
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
    ? new Set(batch.chapter.concepts.map((c: { uuid: unknown }) => c.uuid as string))
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
      const normalized = normalizeText(String(content.question_text ?? ''))
      await prisma.question.update({
        where: { id: q.id },
        data: {
          status: 'validated',
          importErrors: [],
          chapterId: batch.chapterId ?? null,
          normalizedText: normalized,
          textHash: hashText(normalized),
          difficulty: (content.difficulty as string | undefined) ?? null,
          bloomLevel: (content.bloom_level as string | undefined) ?? null,
        },
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

  return { batchId, total: questions.length, saved, failed, duplicates: 0, results }
}

export async function listBatchQuestions(batchId: string, status?: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } })
  if (!batch) throw Errors.notFound('Batch')

  // Accept comma-separated status values: ?status=diagram_pending,diagram_done
  const statusFilter = status
    ? status.includes(',')
      ? { status: { in: status.split(',').map((s) => s.trim()) } }
      : { status }
    : {}

  return prisma.question.findMany({
    where: { batchId, ...statusFilter },
    include: {
      concept: { select: { id: true, name: true, uuid: true } },
      questionType: { select: { id: true, code: true, label: true } },
      diagramJobs: {
        include: { assets: { where: { isActive: true }, orderBy: { version: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: { select: { smeReviews: true } },
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
