import { prisma } from '../../config/database'
import { comparePassword, hashPassword } from '../../utils/password'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt'
import { Errors } from '../../utils/app-error'

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.isActive) {
    throw Errors.unauthorized('Invalid credentials')
  }

  const valid = await comparePassword(password, user.passwordHash)
  if (!valid) {
    throw Errors.unauthorized('Invalid credentials')
  }

  const payload = { userId: user.id, role: user.role, email: user.email }
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  }
}

export async function refresh(token: string) {
  let payload
  try {
    payload = verifyRefreshToken(token)
  } catch {
    throw Errors.unauthorized('Invalid or expired refresh token')
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user || !user.isActive) {
    throw Errors.unauthorized('User not found or inactive')
  }

  const newPayload = { userId: user.id, role: user.role, email: user.email }
  return { accessToken: signAccessToken(newPayload) }
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  role: string
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) {
    throw Errors.conflict('Email already in use')
  }

  const passwordHash = await hashPassword(data.password)
  return prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash, role: data.role },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  })
}
