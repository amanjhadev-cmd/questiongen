import { Request, Response, NextFunction } from 'express'
import * as svc from '../services/batch.service'
import { buildBatchScope, canAccessBatch } from '../services/scope.service'
import { Errors } from '../../utils/app-error'

export async function listBatches(req: Request, res: Response, next: NextFunction) {
  try {
    const scope = await buildBatchScope(req.user)
    res.json(await svc.listBatches(req.query as Record<string, string>, scope))
  } catch (e) { next(e) }
}

export async function getBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const batch = await svc.getBatch(req.params.id)
    const scope = await buildBatchScope(req.user)
    if (!canAccessBatch(scope, batch)) throw Errors.forbidden('You do not have access to this batch')
    res.json(batch)
  } catch (e) { next(e) }
}

export async function createBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, subjectId, chapterId, questionTypeId, difficulty, questionCount, notes, assignedTo } = req.body
    res.status(201).json(
      await svc.createBatch({ name, subjectId, chapterId, questionTypeId, difficulty, questionCount, notes, assignedTo, createdById: req.user!.userId }),
    )
  } catch (e) { next(e) }
}

export async function updateBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, notes, assignedTo } = req.body
    res.json(await svc.updateBatch(req.params.id, { name, notes, assignedTo }))
  } catch (e) { next(e) }
}

export async function markGenerationComplete(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.markGenerationComplete(req.params.id))
  } catch (e) { next(e) }
}

export async function reopenRejected(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.reopenRejected(req.params.id))
  } catch (e) { next(e) }
}

export async function sendToReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { smeId } = req.body
    res.json(await svc.sendToReview(req.params.id, smeId))
  } catch (e) { next(e) }
}

export async function getBatchPromptPreview(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getBatchPromptPreview(req.params.id))
  } catch (e) { next(e) }
}
