import type { Request, Response, NextFunction } from 'express'
import * as userService from '../services/user.service'
import * as authService from '../services/auth.service'

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await userService.listUsers(req.query as Record<string, string>)
    res.json({ data: result.users, meta: result.meta })
  } catch (err) {
    next(err)
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.createUser(req.body)
    res.status(201).json({ data: user })
  } catch (err) {
    next(err)
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.updateUser(req.params.id, req.body)
    res.json({ data: user })
  } catch (err) {
    next(err)
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await userService.deactivateUser(req.params.id)
    res.json({ data: {} })
  } catch (err) {
    next(err)
  }
}

export async function getUserSubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ data: await userService.getUserSubjects(req.params.id) })
  } catch (err) {
    next(err)
  }
}

export async function setUserSubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ data: await userService.setUserSubjects(req.params.id, req.body.subjectIds) })
  } catch (err) {
    next(err)
  }
}
