import { z } from 'zod'

export const upsertSubjectProfileSchema = z.object({
  subjectId: z.string().uuid(),
  promptVersionId: z.string().uuid(),
  schemaVersionId: z.string().uuid(),
  maxConcepts: z.number().int().min(0).max(10).default(0),
  generationProvider: z.string().default('manual_qwen'),
  fieldRegistryJson: z.record(z.unknown()).default({}),
  diagramEnabled: z.boolean().default(false),
  passageEnabled: z.boolean().default(false),
  conceptEnabled: z.boolean().default(false),
  solutionStepsEnabled: z.boolean().default(false),
})
