import { Request, Response, NextFunction } from 'express'
import * as svc from '../services/prompt.service'

export async function listPrompts(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.listPrompts(req.query.subjectId as string | undefined))
  } catch (e) { next(e) }
}

export async function getPrompt(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getPrompt(req.params.id))
  } catch (e) { next(e) }
}

export async function createPrompt(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, subjectId, description, content, variables } = req.body
    res.status(201).json(
      await svc.createPrompt({ name, subjectId, description, content, variables, createdById: req.user!.userId }),
    )
  } catch (e) { next(e) }
}

export async function addPromptVersion(req: Request, res: Response, next: NextFunction) {
  try {
    const { content, variables, notes } = req.body
    res.status(201).json(
      await svc.addPromptVersion(req.params.id, { content, variables, notes, createdById: req.user!.userId }),
    )
  } catch (e) { next(e) }
}

export async function updatePromptVersionStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.body
    res.json(await svc.updatePromptVersionStatus(req.params.id, req.params.versionId, status))
  } catch (e) { next(e) }
}

export async function listPromptVersions(req: Request, res: Response, next: NextFunction) {
  try {
    const prompt = await svc.getPrompt(req.params.id)
    res.json(prompt.versions)
  } catch (e) { next(e) }
}

export async function getPromptVersion(req: Request, res: Response, next: NextFunction) {
  try {
    const prompt = await svc.getPrompt(req.params.id)
    const version = prompt.versions.find((v: { id: string }) => v.id === req.params.versionId)
    if (!version) {
      res.status(404).json({ error: 'Prompt version not found' })
      return
    }
    res.json(version)
  } catch (e) { next(e) }
}

export async function archivePrompt(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.archivePrompt(req.params.id))
  } catch (e) { next(e) }
}
