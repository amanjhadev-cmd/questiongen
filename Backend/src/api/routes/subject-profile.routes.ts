import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import { validate } from '../middlewares/validate.middleware'
import * as ctrl from '../controllers/subject-profile.controller'
import { upsertSubjectProfileSchema } from '../validators/subject-profile.schema'

const router = Router()
router.use(authenticate)

router.get('/', ctrl.listSubjectProfiles)
router.get('/:subjectId', ctrl.getSubjectProfile)
router.put('/', requireRole('super_admin', 'admin'), validate(upsertSubjectProfileSchema), ctrl.upsertSubjectProfile)

export default router
