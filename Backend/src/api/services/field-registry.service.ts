import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'

export async function listFields(activeOnly = true) {
  return prisma.fieldRegistry.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: 'asc' }, { fieldName: 'asc' }],
  })
}

export async function getField(id: string) {
  const field = await prisma.fieldRegistry.findUnique({ where: { id } })
  if (!field) throw Errors.notFound('Field registry entry')
  return field
}

export async function createField(data: {
  fieldName: string
  label: string
  mode: string
  dataType: string
  validationRule?: Record<string, unknown>
  renderingRule?: Record<string, unknown>
  exportRule?: Record<string, unknown>
  sortOrder: number
}) {
  const existing = await prisma.fieldRegistry.findUnique({ where: { fieldName: data.fieldName } })
  if (existing) throw Errors.conflict(`Field '${data.fieldName}' already exists in the registry`)
  return prisma.fieldRegistry.create({ data: data as Prisma.FieldRegistryUncheckedCreateInput })
}

export async function updateField(
  id: string,
  data: Partial<{
    label: string
    mode: string
    validationRule: Record<string, unknown>
    renderingRule: Record<string, unknown>
    exportRule: Record<string, unknown>
    sortOrder: number
    isActive: boolean
  }>,
) {
  const field = await prisma.fieldRegistry.findUnique({ where: { id } })
  if (!field) throw Errors.notFound('Field registry entry')
  return prisma.fieldRegistry.update({ where: { id }, data: data as Prisma.FieldRegistryUncheckedUpdateInput })
}

export async function deactivateField(id: string) {
  const field = await prisma.fieldRegistry.findUnique({ where: { id } })
  if (!field) throw Errors.notFound('Field registry entry')
  return prisma.fieldRegistry.update({ where: { id }, data: { isActive: false } })
}

export async function getFieldsByMode(mode: 'required' | 'optional' | 'disabled' | 'auto') {
  return prisma.fieldRegistry.findMany({
    where: { mode, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { fieldName: 'asc' }],
  })
}
