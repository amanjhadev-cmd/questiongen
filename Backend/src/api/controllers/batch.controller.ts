import { Request, Response, NextFunction } from 'express'
import * as svc from '../services/batch.service'

export async function listBatches(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.listBatches(req.query as Record<string, string>))
  } catch (e) { next(e) }
}

export async function getBatch(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getBatch(req.params.id))
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

export async function getBatchPromptPreview(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getBatchPromptPreview(req.params.id))
  } catch (e) { next(e) }
}
