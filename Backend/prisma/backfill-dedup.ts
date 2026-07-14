/**
 * One-off backfill: populate the denormalised dedup/coverage fields
 * (chapterId, normalizedText, textHash, difficulty, bloomLevel) for questions
 * imported before the dedup feature existed.
 *
 * Run once:  npx ts-node prisma/backfill-dedup.ts
 * Safe to re-run (idempotent).
 */
import { PrismaClient } from '@prisma/client'
import { normalizeText, hashText } from '../src/utils/dedup'

const prisma = new PrismaClient()

async function main() {
  const questions = await prisma.question.findMany({
    include: { batch: { select: { chapterId: true } } },
  })
  console.log(`Backfilling ${questions.length} question(s)…`)

  let updated = 0
  for (const q of questions) {
    const content = q.content as Record<string, unknown>
    const text = String(content.question_text ?? '')
    const normalized = normalizeText(text)
    await prisma.question.update({
      where: { id: q.id },
      data: {
        chapterId: q.chapterId ?? q.batch.chapterId ?? null,
        normalizedText: normalized,
        textHash: hashText(normalized),
        difficulty: (content.difficulty as string | undefined) ?? null,
        bloomLevel: (content.bloom_level as string | undefined) ?? null,
      },
    })
    updated++
  }
  console.log(`Done. Updated ${updated} question(s).`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
