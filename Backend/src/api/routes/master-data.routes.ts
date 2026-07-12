import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import { validate } from '../middlewares/validate.middleware'
import * as ctrl from '../controllers/master-data.controller'
import {
  createBoardSchema,
  createClassSchema,
  createSubjectSchema,
  createChapterSchema,
  createConceptSchema,
  updateConceptSchema,
} from '../validators/master-data.schema'

const router = Router()
router.use(authenticate)

// Boards
router.get('/boards', ctrl.listBoards)
router.post('/boards', requireRole('super_admin', 'admin'), validate(createBoardSchema), ctrl.createBoard)

// Classes
router.get('/classes', ctrl.listClasses)
router.post('/classes', requireRole('super_admin', 'admin'), validate(createClassSchema), ctrl.createClass)

// Subjects
router.get('/subjects', ctrl.listSubjects)
router.get('/subjects/:id', ctrl.getSubject)
router.post('/subjects', requireRole('super_admin', 'admin'), validate(createSubjectSchema), ctrl.createSubject)

// Chapters
router.get('/chapters', ctrl.listChapters)
router.get('/chapters/:id', ctrl.getChapter)
router.post('/chapters', requireRole('super_admin', 'admin'), validate(createChapterSchema), ctrl.createChapter)

// Concepts
router.get('/concepts', ctrl.listConcepts)
router.get('/concepts/:id', ctrl.getConcept)
router.post('/concepts', requireRole('super_admin', 'admin'), validate(createConceptSchema), ctrl.createConcept)
router.patch('/concepts/:id', requireRole('super_admin', 'admin'), validate(updateConceptSchema), ctrl.updateConcept)

// Question Types (read-only via API; managed via seed)
router.get('/question-types', ctrl.listQuestionTypes)

export default router
