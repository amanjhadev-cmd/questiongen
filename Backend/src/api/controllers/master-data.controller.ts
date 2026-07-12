import { Request, Response, NextFunction } from 'express'
import * as svc from '../services/master-data.service'

// ── Boards ────────────────────────────────────────────────────────────────────

export async function listBoards(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.listBoards())
  } catch (e) { next(e) }
}

export async function createBoard(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await svc.createBoard(req.body.name))
  } catch (e) { next(e) }
}

// ── Classes ───────────────────────────────────────────────────────────────────

export async function listClasses(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.listClasses(req.query.boardId as string | undefined))
  } catch (e) { next(e) }
}

export async function createClass(req: Request, res: Response, next: NextFunction) {
  try {
    const { boardId, name } = req.body
    res.status(201).json(await svc.createClass(boardId, name))
  } catch (e) { next(e) }
}

// ── Subjects ──────────────────────────────────────────────────────────────────

export async function listSubjects(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.listSubjects(req.query.classId as string | undefined))
  } catch (e) { next(e) }
}

export async function getSubject(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getSubject(req.params.id))
  } catch (e) { next(e) }
}

export async function createSubject(req: Request, res: Response, next: NextFunction) {
  try {
    const { classId, name, code } = req.body
    res.status(201).json(await svc.createSubject(classId, name, code))
  } catch (e) { next(e) }
}

// ── Chapters ──────────────────────────────────────────────────────────────────

export async function listChapters(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.listChapters(req.query.subjectId as string | undefined))
  } catch (e) { next(e) }
}

export async function getChapter(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getChapter(req.params.id))
  } catch (e) { next(e) }
}

export async function createChapter(req: Request, res: Response, next: NextFunction) {
  try {
    const { subjectId, name, chapterNo } = req.body
    res.status(201).json(await svc.createChapter(subjectId, name, chapterNo))
  } catch (e) { next(e) }
}

// ── Concepts ──────────────────────────────────────────────────────────────────

export async function listConcepts(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.listConcepts(req.query.chapterId as string | undefined))
  } catch (e) { next(e) }
}

export async function getConcept(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getConcept(req.params.id))
  } catch (e) { next(e) }
}

export async function createConcept(req: Request, res: Response, next: NextFunction) {
  try {
    const { chapterId, name, uuid, shortNote } = req.body
    res.status(201).json(await svc.createConcept(chapterId, name, uuid, shortNote))
  } catch (e) { next(e) }
}

export async function updateConcept(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, shortNote } = req.body
    res.json(await svc.updateConcept(req.params.id, { name, shortNote }))
  } catch (e) { next(e) }
}

// ── Question Types ────────────────────────────────────────────────────────────

export async function listQuestionTypes(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.listQuestionTypes())
  } catch (e) { next(e) }
}
