import { Request, Response, NextFunction } from 'express'
import * as svc from '../services/import.service'

export async function importQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const { batchId } = req.params
    const { rawJson, mode } = req.body
    res.status(201).json(await svc.importQuestions(batchId, rawJson, mode))
  } catch (e) { next(e) }
}

export async function revalidateBatch(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.revalidateBatch(req.params.batchId))
  } catch (e) { next(e) }
}

export async function listBatchQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const { batchId } = req.params
    const status = req.query.status as string | undefined
    res.json(await svc.listBatchQuestions(batchId, status))
  } catch (e) { next(e) }
}

export async function getQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getQuestion(req.params.questionId))
  } catch (e) { next(e) }
}
