import type { Request, Response, NextFunction } from 'express'
import { Errors } from '../../utils/app-error'

export type Role = 'super_admin' | 'admin' | 'sme' | 'intern'

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(Errors.unauthorized())
    }
    if (!roles.includes(req.user.role as Role)) {
      return next(Errors.forbidden('Insufficient permissions'))
    }
    next()
  }
}
