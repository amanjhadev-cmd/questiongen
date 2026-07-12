import { Request, Response, NextFunction } from 'express'
import * as svc from '../services/subject-profile.service'

export async function listSubjectProfiles(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.listSubjectProfiles())
  } catch (e) { next(e) }
}

export async function getSubjectProfile(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getSubjectProfile(req.params.subjectId))
  } catch (e) { next(e) }
}

export async function upsertSubjectProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const data = { ...req.body, createdById: req.user!.userId }
    res.json(await svc.upsertSubjectProfile(data))
  } catch (e) { next(e) }
}
