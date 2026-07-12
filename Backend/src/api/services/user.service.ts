import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'
import { getPaginationParams, getSkip, buildMeta } from '../../utils/pagination'

export async function listUsers(query: { role?: string; page?: string; limit?: string }) {
  const pagination = getPaginationParams(query)
  const where = query.role ? { role: query.role } : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      skip: getSkip(pagination),
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ])

  return { users, meta: buildMeta(total, pagination) }
}

export async function updateUser(
  id: string,
  data: { name?: string; role?: string; isActive?: boolean },
) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw Errors.notFound('User')

  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isActive: true, updatedAt: true },
  })
}

export async function deactivateUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw Errors.notFound('User')

  return prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: { id: true, isActive: true },
  })
}
