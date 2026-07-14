import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'

// Questions that count toward the bank (exclude failed validation + rejected).
const KEPT_STATUSES = ['validated', 'diagram_pending', 'diagram_done', 'under_review', 'approved']

type CountRow<K extends string> = { _count: { _all: number } } & Record<K, string | null>

function tally<K extends string>(rows: CountRow<K>[], key: K): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const k = (r[key] as string | null) ?? 'unknown'
    out[k] = (out[k] ?? 0) + r._count._all
  }
  return out
}

export async function getChapterCoverage(chapterId: string) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      subject: { select: { id: true, name: true, code: true, class: { select: { name: true, board: { select: { name: true } } } } } },
      concepts: { select: { id: true, name: true, uuid: true }, orderBy: { name: 'asc' } },
    },
  })
  if (!chapter) throw Errors.notFound('Chapter')

  const where = { chapterId, status: { in: KEPT_STATUSES } }

  const [total, approved, batchesCount, byDifficultyRows, byBloomRows, byConceptRows, byStatusRows, byTypeRows] =
    await Promise.all([
      prisma.question.count({ where }),
      prisma.question.count({ where: { chapterId, status: 'approved' } }),
      prisma.batch.count({ where: { chapterId } }),
      prisma.question.groupBy({ by: ['difficulty'], where, _count: { _all: true } }),
      prisma.question.groupBy({ by: ['bloomLevel'], where, _count: { _all: true } }),
      prisma.question.groupBy({ by: ['conceptUuid'], where, _count: { _all: true } }),
      prisma.question.groupBy({ by: ['status'], where: { chapterId }, _count: { _all: true } }),
      prisma.question.groupBy({ by: ['questionTypeId'], where, _count: { _all: true } }),
    ])

  const byConceptCounts = tally(byConceptRows as CountRow<'conceptUuid'>[], 'conceptUuid')

  // Include every concept in the chapter so gaps (0 questions) are visible.
  const byConcept = chapter.concepts.map((c: { uuid: string; name: string; id: string }) => ({
    uuid: c.uuid,
    name: c.name,
    count: byConceptCounts[c.uuid] ?? 0,
  }))
  const unmappedCount = byConceptCounts['unknown'] ?? 0

  // Resolve question-type codes
  const typeIds = (byTypeRows as CountRow<'questionTypeId'>[]).map((r) => r.questionTypeId).filter(Boolean) as string[]
  const types = typeIds.length
    ? await prisma.questionType.findMany({ where: { id: { in: typeIds } }, select: { id: true, code: true } })
    : []
  const typeCode = new Map<string, string>(
    (types as Array<{ id: string; code: string }>).map((t) => [t.id, t.code]),
  )
  const byType: Record<string, number> = {}
  for (const r of byTypeRows as CountRow<'questionTypeId'>[]) {
    const code: string = typeCode.get((r.questionTypeId as string) ?? '') ?? 'unknown'
    byType[code] = (byType[code] ?? 0) + r._count._all
  }

  return {
    chapter: {
      id: chapter.id,
      name: chapter.name,
      chapterNo: chapter.chapterNo,
      subject: chapter.subject.name,
      class: chapter.subject.class.name,
      board: chapter.subject.class.board.name,
    },
    total,
    approved,
    batchesCount,
    byDifficulty: tally(byDifficultyRows as CountRow<'difficulty'>[], 'difficulty'),
    byBloom: tally(byBloomRows as CountRow<'bloomLevel'>[], 'bloomLevel'),
    byStatus: tally(byStatusRows as CountRow<'status'>[], 'status'),
    byType,
    byConcept,
    unmappedCount,
  }
}
