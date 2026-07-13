import { Router } from 'express'
import * as userController from '../controllers/user.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import { validate } from '../middlewares/validate.middleware'
import { createUserSchema, updateUserSchema, setUserSubjectsSchema } from '../validators/auth.schema'

const router = Router()

router.use(authenticate)

router.get('/', requireRole('super_admin', 'admin'), userController.listUsers)
router.post('/', requireRole('super_admin', 'admin'), validate(createUserSchema), userController.createUser)
router.put('/:id', requireRole('super_admin', 'admin'), validate(updateUserSchema), userController.updateUser)
router.delete('/:id', requireRole('super_admin', 'admin'), userController.deleteUser)

// SME subject scoping
router.get('/:id/subjects', requireRole('super_admin', 'admin'), userController.getUserSubjects)
router.put('/:id/subjects', requireRole('super_admin', 'admin'), validate(setUserSubjectsSchema), userController.setUserSubjects)

export default router
