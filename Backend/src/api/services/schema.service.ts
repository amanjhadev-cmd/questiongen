import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'

export async function listSchemas() {
  return prisma.schema.findMany({
    include: {
      versions: {
        orderBy: { versionNo: 'desc' },
        select: { id: true, versionNo: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createSchema(name: string, description?: string) {
  return prisma.schema.create({ data: { name, description: description ?? null } })
}

export async function getSchema(id: string) {
  const schema = await prisma.schema.findUnique({
    where: { id },
    include: { versions: { orderBy: { versionNo: 'asc' } } },
  })
  if (!schema) throw Errors.notFound('Schema')
  return schema
}

export async function createSchemaVersion(
  schemaId: string,
  definition: Record<string, unknown>,
  createdById: string,
) {
  const schema = await prisma.schema.findUnique({ where: { id: schemaId } })
  if (!schema) throw Errors.notFound('Schema')

  const latest = await prisma.schemaVersion.findFirst({
    where: { schemaId },
    orderBy: { versionNo: 'desc' },
    select: { versionNo: true },
  })
  const nextVersion = (latest?.versionNo ?? 0) + 1

  return prisma.schemaVersion.create({
    data: { schemaId, versionNo: nextVersion, definition, createdById },
  })
}
