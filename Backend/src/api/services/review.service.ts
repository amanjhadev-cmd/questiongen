import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'

// ── Review a single question ──────────────────────────────────────────────────

export async function reviewQuestion(
  questionId: string,
  reviewerId: string,
  decision: 'approved' | 'rejected',
  notes?: string,
) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { batch: { select: { status: true } } },
  })
  if (!question) throw Errors.notFound('Question')

  if (!['diagram_done', 'validated', 'under_review', 'rejected'].includes(question.status)) {
    throw Errors.validation(
      `Question cannot be reviewed in its current status: '${question.status}'`,
    )
  }

  if (decision === 'rejected' && !notes) {
    throw Errors.validation('Notes are required when rejecting a question')
  }

  // Check if reviewer already reviewed this question — if so, update the existing review
  const existingReview = await prisma.smeReview.findFirst({
    where: { questionId, reviewedById: reviewerId },
    orderBy: { createdAt: 'desc' },
  })

  const review = existingReview
    ? await prisma.smeReview.update({
        where: { id: existingReview.id },
        data: { decision, notes: notes ?? null },
      })
    : await prisma.smeReview.create({
        data: { questionId, reviewedById: reviewerId, decision, notes: notes ?? null },
      })

  await prisma.question.update({
    where: { id: questionId },
    data: { status: decision === 'approved' ? 'approved' : 'rejected' },
  })

  return review
}

// ── Submit batch review (adds batch-level notes + advances status) ─────────────

export async function submitBatchReview(batchId: string, batchNotes?: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { _count: { select: { questions: true } } },
  })
  if (!batch) throw Errors.notFound('Batch')

  if (!['diagram_complete', 'validation_complete'].includes(batch.status)) {
    throw Errors.validation(
      `Batch must be in 'validation_complete' or 'diagram_complete' status to submit for review. Current: '${batch.status}'`,
    )
  }

  // Check that every question has been reviewed
  const unreviewed = await prisma.question.count({
    where: {
      batchId,
      status: { in: ['validated', 'diagram_done', 'under_review', 'diagram_pending'] },
    },
  })

  if (unreviewed > 0) {
    throw Errors.validation(
      `${unreviewed} question(s) have not been reviewed yet. Review all questions before submitting.`,
    )
  }

  return prisma.batch.update({
    where: { id: batchId },
    data: {
      status: 'sme_review_complete',
      notes: batchNotes ?? batch.notes,
    },
  })
}

// ── List batch questions for SME review ───────────────────────────────────────

export async function getBatchForReview(batchId: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      chapter: { select: { id: true, name: true, chapterNo: true } },
      questionType: { select: { id: true, code: true, label: true } },
      questions: {
        include: {
          concept: { select: { id: true, name: true, uuid: true } },
          diagramJobs: {
            include: { assets: { where: { isActive: true }, orderBy: { version: 'desc' }, take: 1 } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          smeReviews: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { reviewedBy: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!batch) throw Errors.notFound('Batch')
  return batch
}

// ── Batch-level review stats ──────────────────────────────────────────────────

export async function getBatchReviewStats(batchId: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } })
  if (!batch) throw Errors.notFound('Batch')

  const [total, approved, rejected, unreviewed] = await Promise.all([
    prisma.question.count({ where: { batchId } }),
    prisma.question.count({ where: { batchId, status: 'approved' } }),
    prisma.question.count({ where: { batchId, status: 'rejected' } }),
    prisma.question.count({ where: { batchId, status: { in: ['validated', 'diagram_done', 'under_review'] } } }),
  ])

  return { batchId, batchStatus: batch.status, total, approved, rejected, unreviewed }
}
