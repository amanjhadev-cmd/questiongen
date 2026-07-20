import { Router } from 'express'
import authRoutes from './auth.routes'
import userRoutes from './user.routes'
import masterDataRoutes from './master-data.routes'
import promptRoutes from './prompt.routes'
import batchRoutes from './batch.routes'
import subjectProfileRoutes from './subject-profile.routes'
import schemaRoutes from './schema.routes'
import diagramRoutes from './diagram.routes'
import reviewRoutes from './review.routes'
import exportRoutes from './export.routes'
import questionRoutes from './question.routes'
import fieldRegistryRoutes from './field-registry.routes'
import coverageRoutes from './coverage.routes'
import questionTypeSchemaRoutes from './question-type-schema.routes'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Auth & Users
router.use('/auth', authRoutes)
router.use('/users', userRoutes)

// Master Data
router.use('/master', masterDataRoutes)

// Prompt Library & Schemas
router.use('/prompts', promptRoutes)
router.use('/schemas', schemaRoutes)

// Subject Profiles & Field Registry (M5 Admin Config)
router.use('/subject-profiles', subjectProfileRoutes)
router.use('/field-registry', fieldRegistryRoutes)

// Batch Pipeline
router.use('/batches', batchRoutes)

// Batch-nested: review + export (merged params from batch routes)
router.use('/batches/:batchId', reviewRoutes)
router.use('/batches/:batchId', exportRoutes)

// Diagram Pipeline (M3) — uses its own flat paths
router.use('/', diagramRoutes)

// Individual question review (M4)
router.use('/questions', questionRoutes)

// Coverage dashboard (dedup Layer 3)
router.use('/coverage', coverageRoutes)

// Per-question-type output schemas (validation + export shape)
router.use('/question-type-schemas', questionTypeSchemaRoutes)

export default router
