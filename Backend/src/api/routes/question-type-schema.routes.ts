import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import * as svc from '../services/question-type-schema.service'
import { Errors } from '../../utils/app-error'

const router = Router()
router.use(authenticate)

// List every question type + its active schema
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json(await svc.listQuestionTypeSchemas()) } catch (e) { next(e) }
})

// One type + full version history
router.get('/:questionTypeId', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await svc.getQuestionTypeSchema(req.params.questionTypeId)) } catch (e) { next(e) }
})

// Save a new version of a type's schema
router.post('/:questionTypeId/versions', requireRole('super_admin', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.body.definition === undefined) throw Errors.validation('Body must include a "definition" JSON Schema')
    res.status(201).json(await svc.saveQuestionTypeSchemaVersion(req.params.questionTypeId, req.body.definition, req.user!.userId))
  } catch (e) { next(e) }
})

// Tester: validate a sample against a draft schema (no save)
router.post('/test', requireRole('super_admin', 'admin'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const { definition, sample } = req.body
    if (definition === undefined) throw Errors.validation('Body must include "definition" and "sample"')
    res.json(svc.testSchema(definition, sample))
  } catch (e) { next(e) }
})

export default router
