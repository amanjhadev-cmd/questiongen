import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import * as ctrl from '../controllers/export.controller'

const router = Router({ mergeParams: true })
router.use(authenticate)

// Mounted under /batches/:batchId
router.get('/final-json', ctrl.getFinalJson)
router.get('/exports', ctrl.listExports)
router.post('/exports/json', requireRole('super_admin', 'admin'), ctrl.triggerJsonExport)
router.post('/exports/excel', requireRole('super_admin', 'admin'), ctrl.triggerExcelExport)
router.post('/exports/pdf', requireRole('super_admin', 'admin'), ctrl.triggerPdfExport)
router.post('/exports/mark-complete', requireRole('super_admin', 'admin'), ctrl.markExportComplete)
router.post('/sync', requireRole('super_admin', 'admin'), ctrl.syncToN8n)
router.post('/sqs-sync', requireRole('super_admin', 'admin'), ctrl.syncToSqs)

export default router
