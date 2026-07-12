import { Router } from 'express'
import authRoutes from './auth.routes'
import userRoutes from './user.routes'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

router.use('/auth', authRoutes)
router.use('/users', userRoutes)

// TODO M2: batch, question, prompt, schema, subjectprofile routes
// TODO M3: diagram routes
// TODO M4: review, export routes
// TODO M5: fieldregistry routes

export default router
