import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'

export async function listPrompts(subjectId?: string) {
  return prisma.prompt.findMany({
    where: {
      isActive: true,
      ...(subjectId ? { subjectId } : {}),
    },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      versions: {
        orderBy: { versionNo: 'desc' },
        take: 1,
        select: { id: true, versionNo: true, status: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getPrompt(id: string) {
  const prompt = await prisma.prompt.findUnique({
    where: { id, isActive: true },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      versions: { orderBy: { versionNo: 'asc' } },
    },
  })
  if (!prompt) throw Errors.notFound('Prompt')
  return prompt
}

export async function createPrompt(data: {
  name: string
  subjectId?: string
  description?: string
  createdById: string
}) {
  return prisma.prompt.create({
    data: {
      name: data.name,
      subjectId: data.subjectId ?? null,
      description: data.description,
      createdById: data.createdById,
    },
    include: {
      subject: { select: { id: true, name: true, code: true } },
    },
  })
}

export async function addPromptVersion(
  promptId: string,
  data: { content: string; variables: string[]; notes?: string; createdById: string },
) {
  const prompt = await prisma.prompt.findUnique({ where: { id: promptId, isActive: true } })
  if (!prompt) throw Errors.notFound('Prompt')

  const latest = await prisma.promptVersion.findFirst({
    where: { promptId },
    orderBy: { versionNo: 'desc' },
    select: { versionNo: true },
  })
  const nextVersion = (latest?.versionNo ?? 0) + 1

  return prisma.promptVersion.create({
    data: {
      promptId,
      versionNo: nextVersion,
      content: data.content,
      variables: data.variables,
      notes: data.notes,
      createdById: data.createdById,
      status: 'draft',
    },
  })
}

export async function updatePromptVersionStatus(
  promptId: string,
  versionId: string,
  status: 'draft' | 'published' | 'archived',
) {
  const version = await prisma.promptVersion.findFirst({ where: { id: versionId, promptId } })
  if (!version) throw Errors.notFound('Prompt version')

  if (status === 'published') {
    // Archive any currently published version for this prompt
    await prisma.promptVersion.updateMany({
      where: { promptId, status: 'published', id: { not: versionId } },
      data: { status: 'archived' },
    })
  }

  return prisma.promptVersion.update({ where: { id: versionId }, data: { status } })
}

export async function getPublishedVersion(promptId: string) {
  const version = await prisma.promptVersion.findFirst({
    where: { promptId, status: 'published' },
    orderBy: { versionNo: 'desc' },
  })
  if (!version) throw Errors.notFound('Published prompt version')
  return version
}

export async function archivePrompt(id: string) {
  const prompt = await prisma.prompt.findUnique({ where: { id } })
  if (!prompt) throw Errors.notFound('Prompt')
  return prisma.prompt.update({ where: { id }, data: { isActive: false } })
}
