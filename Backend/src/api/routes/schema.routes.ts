import { Router } from 'express'
import { Request, Response, NextFunction } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import * as svc from '../services/schema.service'

const router = Router()
router.use(authenticate)

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json(await svc.listSchemas()) } catch (e) { next(e) }
})

router.post('/', requireRole('super_admin', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await svc.createSchema(req.body.name, req.body.description))
  } catch (e) { next(e) }
})

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await svc.getSchema(req.params.id)) } catch (e) { next(e) }
})

router.post('/:id/versions', requireRole('super_admin', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await svc.createSchemaVersion(req.params.id, req.body.definition, req.user!.userId))
  } catch (e) { next(e) }
})

export default router
