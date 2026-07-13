import { z } from 'zod'

export const createBoardSchema = z.object({
  name: z.string().min(1).max(100),
})

export const createClassSchema = z.object({
  boardId: z.string().uuid(),
  name: z.string().min(1).max(100),
})

export const createSubjectSchema = z.object({
  classId: z.string().uuid(),
  name: z.string().min(1).max(200),
  code: z.string().min(2).max(20).toUpperCase(),
})

export const createChapterSchema = z.object({
  subjectId: z.string().uuid(),
  name: z.string().min(1).max(300),
  chapterNo: z.number().int().min(1).max(999),
})

export const createConceptSchema = z.object({
  chapterId: z.string().uuid(),
  name: z.string().min(1).max(300),
  uuid: z.string().regex(/^[A-Z]{2,6}-\d{4}-[A-Z0-9]{4}$/, 'UUID must match pattern e.g. SCI-1042-CH3A'),
  shortNote: z.string().max(1000).optional(),
})

export const updateConceptSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  shortNote: z.string().max(1000).optional(),
})

// ── Update schemas for edit support ─────────────────────────────────────────────
export const updateBoardSchema = z.object({
  name: z.string().min(1).max(100),
})

export const updateClassSchema = z.object({
  name: z.string().min(1).max(100),
})

export const updateSubjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().min(2).max(20).toUpperCase().optional(),
})

export const updateChapterSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  chapterNo: z.number().int().min(1).max(999).optional(),
})

// ── Question Types ──────────────────────────────────────────────────────────────
export const createQuestionTypeSchema = z.object({
  code: z.string().min(1).max(20).toUpperCase(),
  label: z.string().min(1).max(100),
})

export const updateQuestionTypeSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
})
