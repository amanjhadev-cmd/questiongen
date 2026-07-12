import type { Request, Response, NextFunction } from 'express'
import * as authService from '../services/auth.service'
import { env } from '../../config/env'

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body
    const result = await authService.login(email, password)

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.json({ data: { accessToken: result.accessToken, user: result.user } })
  } catch (err) {
    next(err)
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refreshToken
    if (!token) {
      res.status(401).json({ error: 'No refresh token', code: 'UNAUTHORIZED' })
      return
    }
    const result = await authService.refresh(token)
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie('refreshToken')
  res.json({ data: {} })
}
