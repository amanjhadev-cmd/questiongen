import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { getChapterCoverage } from '../services/coverage.service'

const router = Router()
router.use(authenticate)

router.get('/chapter/:chapterId', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await getChapterCoverage(req.params.chapterId)) } catch (e) { next(e) }
})

export default router
