import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'

export interface InjectedMetadata {
  board: string
  class: string
  subject: string
  chapter_uuid: string | null
  batch_uuid: string
  prompt_version: number
  schema_version: number
  created_by: string
  created_at: string
  schema_version_id: string
  prompt_version_id: string
}

export async function buildInjectedMetadata(batchId: string): Promise<InjectedMetadata> {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      subject: {
        include: {
          class: { include: { board: true } },
          subjectProfile: {
            include: {
              promptVersion: true,
              schemaVersion: true,
            },
          },
        },
      },
      chapter: true,
      createdBy: { select: { email: true } },
    },
  })

  if (!batch) throw Errors.notFound('Batch')

  const profile = batch.subject.subjectProfile
  if (!profile) throw Errors.validation('Subject has no profile — cannot inject metadata')

  return {
    board: batch.subject.class.board.name,
    class: batch.subject.class.name,
    subject: batch.subject.name,
    // Prefer the source chapter UUID (e.g. from the Excel import); fall back to
    // the internal DB id only when the chapter has no source UUID.
    chapter_uuid: batch.chapter ? (batch.chapter.uuid ?? batch.chapter.id) : null,
    batch_uuid: batch.id,
    prompt_version: profile.promptVersion.versionNo,
    schema_version: profile.schemaVersion.versionNo,
    created_by: batch.createdBy.email,
    created_at: new Date().toISOString(),
    schema_version_id: profile.schemaVersionId,
    prompt_version_id: profile.promptVersionId,
  }
}

export async function injectMetadataForQuestion(
  questionId: string,
  metadata: InjectedMetadata,
) {
  return prisma.question.update({
    where: { id: questionId },
    data: { injectedMetadata: metadata as object },
  })
}
