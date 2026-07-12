import { Request, Response, NextFunction } from 'express'
import * as svc from '../services/diagram.service'
import { Errors } from '../../utils/app-error'

export async function listDiagramJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const { batchId } = req.params
    const status = req.query.status as string | undefined
    res.json(await svc.listDiagramJobs(batchId, status))
  } catch (e) { next(e) }
}

export async function getDiagramJob(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getDiagramJob(req.params.jobId))
  } catch (e) { next(e) }
}

export async function uploadDiagram(req: Request, res: Response, next: NextFunction) {
  try {
    const { jobId } = req.params
    if (!req.file) throw Errors.validation('No file uploaded')
    if (!['image/png', 'image/jpeg'].includes(req.file.mimetype)) {
      throw Errors.validation('Only PNG or JPEG files are accepted for diagrams')
    }
    if (req.file.size > 5 * 1024 * 1024) {
      throw Errors.validation('Diagram file must be under 5 MB')
    }

    const asset = await svc.uploadDiagram(jobId, req.file.buffer, req.file.mimetype)

    // Check if all diagrams for the batch are done
    const job = await svc.getDiagramJob(jobId)
    await svc.checkAndAdvanceBatchDiagramStatus(
      (job.question as { batchId: string }).batchId,
    )

    res.status(201).json(asset)
  } catch (e) { next(e) }
}

export async function markDiagramFailed(req: Request, res: Response, next: NextFunction) {
  try {
    const { jobId } = req.params
    const { errorMessage } = req.body
    res.json(await svc.markDiagramFailed(jobId, errorMessage ?? 'No details provided'))
  } catch (e) { next(e) }
}

export async function getBatchDiagramSummary(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getBatchDiagramSummary(req.params.batchId))
  } catch (e) { next(e) }
}

export async function markBatchDiagramComplete(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.checkAndAdvanceBatchDiagramStatus(req.params.batchId))
  } catch (e) { next(e) }
}

export async function deleteDiagramAsset(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.deleteDiagramAsset(req.params.assetId))
  } catch (e) { next(e) }
}
