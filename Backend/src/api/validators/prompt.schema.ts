import { z } from 'zod'

export const createPromptSchema = z.object({
  name: z.string().min(2).max(200),
  subjectId: z.string().uuid().optional(),
  description: z.string().max(1000).optional(),
  // Optional initial template text — when provided, a first draft version is created.
  content: z.string().min(10).optional(),
  variables: z.array(z.string()).optional(),
})

export const createPromptVersionSchema = z.object({
  content: z.string().min(10),
  variables: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional(),
})

export const updatePromptVersionStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']),
})

export const updatePromptSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
  subjectId: z.string().uuid().nullable().optional(),
})
