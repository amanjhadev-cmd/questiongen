import { Request, Response, NextFunction } from 'express'
import * as svc from '../services/review.service'
import { buildBatchScope, canAccessBatch } from '../services/scope.service'
import { Errors } from '../../utils/app-error'

export async function getBatchForReview(req: Request, res: Response, next: NextFunction) {
  try {
    const batch = await svc.getBatchForReview(req.params.batchId)
    const scope = await buildBatchScope(req.user)
    if (!canAccessBatch(scope, batch)) throw Errors.forbidden('You are not assigned to review this batch')
    res.json(batch)
  } catch (e) { next(e) }
}

export async function getBatchReviewStats(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getBatchReviewStats(req.params.batchId))
  } catch (e) { next(e) }
}

export async function reviewQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const { decision, notes } = req.body
    res.status(201).json(
      await svc.reviewQuestion(req.params.questionId, req.user!.userId, decision, notes),
    )
  } catch (e) { next(e) }
}

export async function submitBatchReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { batchNotes } = req.body
    res.json(await svc.submitBatchReview(req.params.batchId, batchNotes))
  } catch (e) { next(e) }
}
