import { Router } from 'express'
import authRoutes from './auth.routes'
import userRoutes from './user.routes'
import masterDataRoutes from './master-data.routes'
import promptRoutes from './prompt.routes'
import batchRoutes from './batch.routes'
import subjectProfileRoutes from './subject-profile.routes'
import schemaRoutes from './schema.routes'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/master', masterDataRoutes)
router.use('/prompts', promptRoutes)
router.use('/schemas', schemaRoutes)
router.use('/subject-profiles', subjectProfileRoutes)
router.use('/batches', batchRoutes)

// TODO M3: /diagrams routes
// TODO M4: /review routes, /exports routes
// TODO M5: /field-registry routes

export default router
