import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/app-error'
import { logger } from '../../config/logger'

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    })
    return
  }

  logger.error({ err, path: req.path }, 'Unhandled error')
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' })
}
