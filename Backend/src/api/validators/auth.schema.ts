import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['super_admin', 'admin', 'sme', 'intern']),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(['super_admin', 'admin', 'sme', 'intern']).optional(),
  isActive: z.boolean().optional(),
})

export const setUserSubjectsSchema = z.object({
  subjectIds: z.array(z.string().uuid()),
})
