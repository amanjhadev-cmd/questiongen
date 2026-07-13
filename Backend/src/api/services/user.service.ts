import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'
import { getPaginationParams, getSkip, buildMeta } from '../../utils/pagination'

export async function listUsers(query: { role?: string; page?: string; limit?: string }) {
  const pagination = getPaginationParams(query)
  const where = query.role ? { role: query.role } : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
        smeSubjects: { select: { subject: { select: { id: true, name: true, code: true } } } },
      },
      skip: getSkip(pagination),
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ])

  // Flatten smeSubjects -> subjects for the client
  type SubjectRef = { id: string; name: string; code: string }
  const shaped = users.map((u: (typeof users)[number]) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt,
    subjects: u.smeSubjects.map((s: { subject: SubjectRef }) => s.subject),
  }))

  return { users: shaped, meta: buildMeta(total, pagination) }
}

// ── SME subject scoping ─────────────────────────────────────────────────────────

export async function getUserSubjects(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw Errors.notFound('User')
  const rows = await prisma.smeSubject.findMany({
    where: { userId },
    include: { subject: { select: { id: true, name: true, code: true } } },
  })
  return rows.map((r: { subject: { id: string; name: string; code: string } }) => r.subject)
}

export async function setUserSubjects(userId: string, subjectIds: string[]) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw Errors.notFound('User')

  // Replace the full set inside a transaction
  await prisma.$transaction([
    prisma.smeSubject.deleteMany({ where: { userId } }),
    ...(subjectIds.length > 0
      ? [prisma.smeSubject.createMany({
          data: subjectIds.map((subjectId) => ({ userId, subjectId })),
          skipDuplicates: true,
        })]
      : []),
  ])

  return getUserSubjects(userId)
}

// Returns the set of subjectIds an SME is scoped to (for batch filtering).
export async function getSmeSubjectIds(userId: string): Promise<string[]> {
  const rows = await prisma.smeSubject.findMany({ where: { userId }, select: { subjectId: true } })
  return rows.map((r: { subjectId: string }) => r.subjectId)
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
