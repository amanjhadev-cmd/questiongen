import { z } from 'zod'

export const createBatchSchema = z.object({
  name: z.string().min(2).max(200),
  subjectId: z.string().uuid(),
  chapterId: z.string().uuid().optional(),
  questionTypeId: z.string().uuid(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questionCount: z.number().int().min(1).max(200).default(20),
  notes: z.string().max(2000).optional(),
  assignedTo: z.string().uuid().optional(),
})

export const updateBatchSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  notes: z.string().max(2000).optional(),
  assignedTo: z.string().uuid().optional(),
})

export const sendToReviewSchema = z.object({
  smeId: z.string().uuid(),
})

export const importQuestionsSchema = z.object({
  rawJson: z.union([z.string(), z.array(z.unknown()), z.record(z.unknown())]),
  mode: z.enum(['append', 'replace']).default('append'),
})

export const reviewQuestionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  notes: z.string().min(1).max(2000).optional(),
}).refine(
  (data) => data.decision !== 'rejected' || (data.notes && data.notes.length > 0),
  { message: 'Notes are required when rejecting a question', path: ['notes'] },
)

export const submitReviewSchema = z.object({
  batchNotes: z.string().max(5000).optional(),
})
