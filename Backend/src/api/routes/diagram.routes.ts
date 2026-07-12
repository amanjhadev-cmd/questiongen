import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import * as ctrl from '../controllers/diagram.controller'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
})

const router = Router()
router.use(authenticate)

// Batch-scoped diagram endpoints
router.get('/batches/:batchId/diagrams', ctrl.listDiagramJobs)
router.get('/batches/:batchId/diagrams/summary', ctrl.getBatchDiagramSummary)
router.post('/batches/:batchId/diagrams/mark-complete', requireRole('super_admin', 'admin', 'intern'), ctrl.markBatchDiagramComplete)

// Individual diagram job endpoints
router.get('/diagrams/:jobId', ctrl.getDiagramJob)
router.post('/diagrams/:jobId/upload', requireRole('super_admin', 'admin', 'intern'), upload.single('file'), ctrl.uploadDiagram)
router.post('/diagrams/:jobId/fail', requireRole('super_admin', 'admin'), ctrl.markDiagramFailed)

// Diagram asset management
router.delete('/diagram-assets/:assetId', requireRole('super_admin', 'admin'), ctrl.deleteDiagramAsset)

export default router
