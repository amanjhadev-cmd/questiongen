import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import { validate } from '../middlewares/validate.middleware'
import * as ctrl from '../controllers/import.controller'
import { importQuestionsSchema } from '../validators/batch.schema'

// This router is mounted under /batches/:batchId
const router = Router({ mergeParams: true })
router.use(authenticate)

router.post('/import', requireRole('super_admin', 'admin', 'intern'), validate(importQuestionsSchema), ctrl.importQuestions)
router.post('/revalidate', requireRole('super_admin', 'admin', 'intern'), ctrl.revalidateBatch)
router.get('/questions', ctrl.listBatchQuestions)
router.get('/questions/:questionId', ctrl.getQuestion)

export default router
