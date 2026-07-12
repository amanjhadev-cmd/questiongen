import { Router } from 'express'
import { Request, Response, NextFunction } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import { validate } from '../middlewares/validate.middleware'
import * as svc from '../services/field-registry.service'
import { createFieldRegistrySchema, updateFieldRegistrySchema } from '../validators/field-registry.schema'

const router = Router()
router.use(authenticate)

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activeOnly = req.query.activeOnly !== 'false'
    res.json(await svc.listFields(activeOnly))
  } catch (e) { next(e) }
})

router.get('/by-mode/:mode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mode = req.params.mode as 'required' | 'optional' | 'disabled' | 'auto'
    res.json(await svc.getFieldsByMode(mode))
  } catch (e) { next(e) }
})

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await svc.getField(req.params.id)) } catch (e) { next(e) }
})

router.post('/', requireRole('super_admin', 'admin'), validate(createFieldRegistrySchema), async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await svc.createField(req.body)) } catch (e) { next(e) }
})

router.patch('/:id', requireRole('super_admin', 'admin'), validate(updateFieldRegistrySchema), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await svc.updateField(req.params.id, req.body)) } catch (e) { next(e) }
})

router.delete('/:id', requireRole('super_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await svc.deactivateField(req.params.id)) } catch (e) { next(e) }
})

export default router
