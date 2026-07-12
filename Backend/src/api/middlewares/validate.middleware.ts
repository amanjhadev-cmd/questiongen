import type { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'
import { Errors } from '../../utils/app-error'

export function validate(schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target])
    if (!result.success) {
      return next(Errors.validation('Validation failed', (result.error as ZodError).flatten()))
    }
    req[target] = result.data
    next()
  }
}
