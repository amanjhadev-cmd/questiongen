import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import { validate } from '../middlewares/validate.middleware'
import * as ctrl from '../controllers/review.controller'
import { reviewQuestionSchema } from '../validators/batch.schema'

const router = Router()
router.use(authenticate)

// POST /questions/:questionId/review  — SME reviews a single question
router.post(
  '/:questionId/review',
  requireRole('super_admin', 'sme'),
  validate(reviewQuestionSchema),
  ctrl.reviewQuestion,
)

export default router
