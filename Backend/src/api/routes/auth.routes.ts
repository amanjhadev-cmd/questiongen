import { Router } from 'express'
import * as authController from '../controllers/auth.controller'
import { validate } from '../middlewares/validate.middleware'
import { authenticate } from '../middlewares/auth.middleware'
import { loginSchema } from '../validators/auth.schema'

const router = Router()

router.post('/login', validate(loginSchema), authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', authenticate, authController.logout)

export default router
