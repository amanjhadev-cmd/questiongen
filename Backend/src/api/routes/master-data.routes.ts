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
  updateBoardSchema,
  updateClassSchema,
  updateSubjectSchema,
  updateChapterSchema,
  createQuestionTypeSchema,
  updateQuestionTypeSchema,
} from '../validators/master-data.schema'

const router = Router()
router.use(authenticate)

// Boards
router.get('/boards', ctrl.listBoards)
router.post('/boards', requireRole('super_admin', 'admin'), validate(createBoardSchema), ctrl.createBoard)
router.patch('/boards/:id', requireRole('super_admin', 'admin'), validate(updateBoardSchema), ctrl.updateBoard)
router.delete('/boards/:id', requireRole('super_admin', 'admin'), ctrl.deleteBoard)

// Classes
router.get('/classes', ctrl.listClasses)
router.get('/classes/:id', ctrl.getClass)
router.post('/classes', requireRole('super_admin', 'admin'), validate(createClassSchema), ctrl.createClass)
router.patch('/classes/:id', requireRole('super_admin', 'admin'), validate(updateClassSchema), ctrl.updateClass)
router.delete('/classes/:id', requireRole('super_admin', 'admin'), ctrl.deleteClass)

// Subjects
router.get('/subjects', ctrl.listSubjects)
router.get('/subjects/:id', ctrl.getSubject)
router.post('/subjects', requireRole('super_admin', 'admin'), validate(createSubjectSchema), ctrl.createSubject)
router.patch('/subjects/:id', requireRole('super_admin', 'admin'), validate(updateSubjectSchema), ctrl.updateSubject)
router.delete('/subjects/:id', requireRole('super_admin', 'admin'), ctrl.deleteSubject)

// Chapters
router.get('/chapters', ctrl.listChapters)
router.get('/chapters/:id', ctrl.getChapter)
router.post('/chapters', requireRole('super_admin', 'admin'), validate(createChapterSchema), ctrl.createChapter)
router.patch('/chapters/:id', requireRole('super_admin', 'admin'), validate(updateChapterSchema), ctrl.updateChapter)
router.delete('/chapters/:id', requireRole('super_admin', 'admin'), ctrl.deleteChapter)

// Concepts
router.get('/concepts', ctrl.listConcepts)
router.get('/concepts/:id', ctrl.getConcept)
router.post('/concepts', requireRole('super_admin', 'admin'), validate(createConceptSchema), ctrl.createConcept)
router.patch('/concepts/:id', requireRole('super_admin', 'admin'), validate(updateConceptSchema), ctrl.updateConcept)
router.delete('/concepts/:id', requireRole('super_admin', 'admin'), ctrl.deleteConcept)

// Question Types
router.get('/question-types', ctrl.listQuestionTypes)
router.post('/question-types', requireRole('super_admin', 'admin'), validate(createQuestionTypeSchema), ctrl.createQuestionType)
router.patch('/question-types/:id', requireRole('super_admin', 'admin'), validate(updateQuestionTypeSchema), ctrl.updateQuestionType)
router.delete('/question-types/:id', requireRole('super_admin', 'admin'), ctrl.deleteQuestionType)

export default router
