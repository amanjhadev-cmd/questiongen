import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import { validate } from '../middlewares/validate.middleware'
import * as ctrl from '../controllers/prompt.controller'
import {
  createPromptSchema,
  createPromptVersionSchema,
  updatePromptVersionStatusSchema,
} from '../validators/prompt.schema'

const router = Router()
router.use(authenticate)

router.get('/', ctrl.listPrompts)
router.get('/:id', ctrl.getPrompt)
router.get('/:id/versions', ctrl.listPromptVersions)
router.get('/:id/versions/:versionId', ctrl.getPromptVersion)
router.post('/', requireRole('super_admin', 'admin'), validate(createPromptSchema), ctrl.createPrompt)
router.post('/:id/versions', requireRole('super_admin', 'admin'), validate(createPromptVersionSchema), ctrl.addPromptVersion)
router.patch(
  '/:id/versions/:versionId/status',
  requireRole('super_admin', 'admin'),
  validate(updatePromptVersionStatusSchema),
  ctrl.updatePromptVersionStatus,
)
router.delete('/:id', requireRole('super_admin', 'admin'), ctrl.archivePrompt)

export default router
