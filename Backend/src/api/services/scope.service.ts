import type { JwtPayload } from '../../utils/jwt'
import { getSmeSubjectIds } from './user.service'

export interface BatchScope {
  role: string
  userId: string
  subjectIds: string[]
}

// Builds the scope object used to filter batches. For SMEs it loads their
// assigned subjects; other roles get an empty subject list (they see everything).
export async function buildBatchScope(user: JwtPayload | undefined): Promise<BatchScope | undefined> {
  if (!user) return undefined
  if (user.role !== 'sme') {
    return { role: user.role, userId: user.userId, subjectIds: [] }
  }
  const subjectIds = await getSmeSubjectIds(user.userId)
  return { role: 'sme', userId: user.userId, subjectIds }
}

// True when the given batch is visible to the scope. Non-SME roles always pass.
export function canAccessBatch(
  scope: BatchScope | undefined,
  batch: { subjectId: string; assignedTo?: string | null },
): boolean {
  if (!scope || scope.role !== 'sme') return true
  return scope.subjectIds.includes(batch.subjectId) || batch.assignedTo === scope.userId
}
