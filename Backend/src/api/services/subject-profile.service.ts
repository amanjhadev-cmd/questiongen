import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'

export async function getSubjectProfile(subjectId: string) {
  const profile = await prisma.subjectProfile.findUnique({
    where: { subjectId },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      promptVersion: { select: { id: true, versionNo: true, status: true, content: true } },
      schemaVersion: { select: { id: true, versionNo: true } },
    },
  })
  if (!profile) throw Errors.notFound('Subject profile')
  return profile
}

export async function upsertSubjectProfile(
  data: {
    subjectId: string
    promptVersionId: string
    schemaVersionId: string
    maxConcepts: number
    generationProvider: string
    fieldRegistryJson: Record<string, unknown>
    diagramEnabled: boolean
    passageEnabled: boolean
    conceptEnabled: boolean
    solutionStepsEnabled: boolean
    createdById: string
  },
) {
  const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } })
  if (!subject) throw Errors.notFound('Subject')

  const promptVersion = await prisma.promptVersion.findUnique({ where: { id: data.promptVersionId } })
  if (!promptVersion) throw Errors.notFound('Prompt version')
  if (promptVersion.status !== 'published') throw Errors.validation('Prompt version must be published before assigning to a subject profile')

  const schemaVersion = await prisma.schemaVersion.findUnique({ where: { id: data.schemaVersionId } })
  if (!schemaVersion) throw Errors.notFound('Schema version')

  const existing = await prisma.subjectProfile.findUnique({ where: { subjectId: data.subjectId } })

  if (existing) {
    return prisma.subjectProfile.update({
      where: { subjectId: data.subjectId },
      data: {
        promptVersionId: data.promptVersionId,
        schemaVersionId: data.schemaVersionId,
        maxConcepts: data.maxConcepts,
        generationProvider: data.generationProvider,
        fieldRegistryJson: data.fieldRegistryJson,
        diagramEnabled: data.diagramEnabled,
        passageEnabled: data.passageEnabled,
        conceptEnabled: data.conceptEnabled,
        solutionStepsEnabled: data.solutionStepsEnabled,
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        promptVersion: { select: { id: true, versionNo: true, status: true } },
        schemaVersion: { select: { id: true, versionNo: true } },
      },
    })
  }

  return prisma.subjectProfile.create({
    data: {
      subjectId: data.subjectId,
      promptVersionId: data.promptVersionId,
      schemaVersionId: data.schemaVersionId,
      maxConcepts: data.maxConcepts,
      generationProvider: data.generationProvider,
      fieldRegistryJson: data.fieldRegistryJson,
      diagramEnabled: data.diagramEnabled,
      passageEnabled: data.passageEnabled,
      conceptEnabled: data.conceptEnabled,
      solutionStepsEnabled: data.solutionStepsEnabled,
      createdById: data.createdById,
    },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      promptVersion: { select: { id: true, versionNo: true, status: true } },
      schemaVersion: { select: { id: true, versionNo: true } },
    },
  })
}

export async function deleteSubjectProfile(subjectId: string) {
  const profile = await prisma.subjectProfile.findUnique({ where: { subjectId } })
  if (!profile) throw Errors.notFound('Subject profile')
  const batchCount = await prisma.batch.count({ where: { profileId: profile.id } })
  if (batchCount > 0) {
    throw Errors.conflict(`Cannot delete: this profile is used by ${batchCount} batch(es).`)
  }
  await prisma.subjectProfile.delete({ where: { subjectId } })
  return { subjectId, deleted: true }
}

export async function listSubjectProfiles() {
  return prisma.subjectProfile.findMany({
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
          class: { select: { id: true, name: true, board: { select: { id: true, name: true } } } },
        },
      },
      promptVersion: { select: { id: true, versionNo: true, status: true, prompt: { select: { id: true, name: true } } } },
      schemaVersion: { select: { id: true, versionNo: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
}
