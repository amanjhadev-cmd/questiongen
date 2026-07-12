import { Request, Response, NextFunction } from 'express'
import * as exportSvc from '../services/export.service'
import * as syncSvc from '../services/sync.service'
import { buildFinalJson } from '../services/final-json-builder.service'

export async function getFinalJson(req: Request, res: Response, next: NextFunction) {
  try {
    const questions = await buildFinalJson(req.params.batchId)
    res.json({ questions, count: questions.length })
  } catch (e) { next(e) }
}

export async function triggerJsonExport(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(202).json(await exportSvc.exportJson(req.params.batchId, req.user!.userId))
  } catch (e) { next(e) }
}

export async function triggerExcelExport(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(202).json(await exportSvc.exportExcel(req.params.batchId, req.user!.userId))
  } catch (e) { next(e) }
}

export async function triggerPdfExport(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(202).json(await exportSvc.exportPdf(req.params.batchId, req.user!.userId))
  } catch (e) { next(e) }
}

export async function listExports(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await exportSvc.listExports(req.params.batchId))
  } catch (e) { next(e) }
}

export async function markExportComplete(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await exportSvc.markBatchExportComplete(req.params.batchId))
  } catch (e) { next(e) }
}

export async function syncToN8n(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await syncSvc.syncBatchToN8n(req.params.batchId))
  } catch (e) { next(e) }
}
