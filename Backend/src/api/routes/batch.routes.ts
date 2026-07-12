import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import { validate } from '../middlewares/validate.middleware'
import * as ctrl from '../controllers/batch.controller'
import { createBatchSchema, updateBatchSchema } from '../validators/batch.schema'
import importRoutes from './import.routes'

const router = Router()
router.use(authenticate)

router.get('/', ctrl.listBatches)
router.get('/:id', ctrl.getBatch)
router.post('/', requireRole('super_admin', 'admin', 'intern'), validate(createBatchSchema), ctrl.createBatch)
router.patch('/:id', requireRole('super_admin', 'admin', 'intern'), validate(updateBatchSchema), ctrl.updateBatch)
router.post('/:id/mark-generation-complete', requireRole('super_admin', 'admin', 'intern'), ctrl.markGenerationComplete)
router.get('/:id/prompt-preview', ctrl.getBatchPromptPreview)

// Nested import routes
router.use('/:batchId', importRoutes)

export default router
