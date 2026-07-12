import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import { validate } from '../middlewares/validate.middleware'
import * as ctrl from '../controllers/review.controller'
import { reviewQuestionSchema, submitReviewSchema } from '../validators/batch.schema'

const router = Router({ mergeParams: true })
router.use(authenticate)

// Mounted under /batches/:batchId
router.get('/review', ctrl.getBatchForReview)
router.get('/review/stats', ctrl.getBatchReviewStats)
router.post('/review/submit', requireRole('super_admin', 'sme'), validate(submitReviewSchema), ctrl.submitBatchReview)

export default router
