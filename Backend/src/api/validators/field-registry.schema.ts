import { z } from 'zod'

export const createFieldRegistrySchema = z.object({
  fieldName: z.string().min(1).max(100).regex(/^[a-z_]+$/, 'Field name must be lowercase with underscores'),
  label: z.string().min(1).max(200),
  mode: z.enum(['required', 'optional', 'disabled', 'auto']),
  dataType: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  validationRule: z.record(z.unknown()).optional(),
  renderingRule: z.record(z.unknown()).optional(),
  exportRule: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().min(0).default(0),
})

export const updateFieldRegistrySchema = z.object({
  label: z.string().min(1).max(200).optional(),
  mode: z.enum(['required', 'optional', 'disabled', 'auto']).optional(),
  validationRule: z.record(z.unknown()).optional(),
  renderingRule: z.record(z.unknown()).optional(),
  exportRule: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})
