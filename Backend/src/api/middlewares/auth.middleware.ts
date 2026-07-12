import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, type JwtPayload } from '../../utils/jwt'
import { Errors } from '../../utils/app-error'

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(Errors.unauthorized('Missing or invalid Authorization header'))
  }

  const token = header.slice(7)
  try {
    req.user = verifyAccessToken(token)
    next()
  } catch {
    next(Errors.unauthorized('Invalid or expired access token'))
  }
}
