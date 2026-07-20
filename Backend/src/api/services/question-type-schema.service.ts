import Ajv, { type ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'
import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'

// Fresh AJV per compile so one bad user schema can't poison a shared cache.
function makeAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true, strict: false })
  addFormats(ajv)
  return ajv
}

// Compile a user-supplied JSON Schema. Throws a friendly error if it's not a
// valid schema document.
function compile(definition: unknown): ValidateFunction {
  try {
    return makeAjv().compile(definition as object)
  } catch (e) {
    throw Errors.validation(`Invalid JSON Schema: ${e instanceof Error ? e.message : 'could not compile'}`)
  }
}

// ── List: every active question type with its latest schema (if any) ────────────
export async function listQuestionTypeSchemas() {
  const types = await prisma.questionType.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
    include: {
      schemas: { orderBy: { versionNo: 'desc' }, take: 1 },
    },
  })
  return types.map((t: { id: string; code: string; label: string; schemas: Array<{ id: string; versionNo: number; definition: unknown; createdAt: Date }> }) => ({
    questionTypeId: t.id,
    code: t.code,
    label: t.label,
    activeVersion: t.schemas[0]
      ? { id: t.schemas[0].id, versionNo: t.schemas[0].versionNo, definition: t.schemas[0].definition, createdAt: t.schemas[0].createdAt }
      : null,
  }))
}

// ── Get one type with full version history ──────────────────────────────────────
export async function getQuestionTypeSchema(questionTypeId: string) {
  const type = await prisma.questionType.findUnique({
    where: { id: questionTypeId },
    include: { schemas: { orderBy: { versionNo: 'desc' } } },
  })
  if (!type) throw Errors.notFound('Question type')
  return {
    questionTypeId: type.id,
    code: type.code,
    label: type.label,
    versions: type.schemas.map((s: { id: string; versionNo: number; definition: unknown; createdAt: Date }) => ({
      id: s.id, versionNo: s.versionNo, definition: s.definition, createdAt: s.createdAt,
    })),
  }
}

// ── Save a new version (validates the schema compiles first) ────────────────────
export async function saveQuestionTypeSchemaVersion(
  questionTypeId: string,
  definition: unknown,
  createdById: string,
) {
  const type = await prisma.questionType.findUnique({ where: { id: questionTypeId } })
  if (!type) throw Errors.notFound('Question type')

  compile(definition) // throws if not a valid JSON Schema

  const latest = await prisma.questionTypeSchema.findFirst({
    where: { questionTypeId },
    orderBy: { versionNo: 'desc' },
    select: { versionNo: true },
  })
  const versionNo = (latest?.versionNo ?? 0) + 1

  return prisma.questionTypeSchema.create({
    data: { questionTypeId, versionNo, definition: definition as object, createdById },
  })
}

// ── Tester: validate a sample question against a draft schema ────────────────────
export interface SchemaTestResult {
  valid: boolean
  errors: Array<{ field: string; message: string }>
}

export function testSchema(definition: unknown, sample: unknown): SchemaTestResult {
  let validate: ValidateFunction
  try {
    validate = makeAjv().compile(definition as object)
  } catch (e) {
    return { valid: false, errors: [{ field: 'schema', message: `Schema itself is invalid: ${e instanceof Error ? e.message : 'compile failed'}` }] }
  }
  const ok = validate(sample)
  if (ok) return { valid: true, errors: [] }
  const errors = (validate.errors ?? []).map((err) => ({
    field: err.instancePath ? err.instancePath.replace(/^\//, '') : ((err.params as Record<string, string>).missingProperty ?? 'root'),
    message: err.message ?? 'validation failed',
  }))
  return { valid: false, errors }
}

// ── Active schemas keyed by question-type CODE (for import + export wiring) ──────
export async function getActiveSchemasByCode(): Promise<Map<string, { definition: unknown; versionNo: number }>> {
  const types = await prisma.questionType.findMany({
    include: { schemas: { orderBy: { versionNo: 'desc' }, take: 1 } },
  })
  const map = new Map<string, { definition: unknown; versionNo: number }>()
  for (const t of types as Array<{ code: string; schemas: Array<{ definition: unknown; versionNo: number }> }>) {
    if (t.schemas[0]) map.set(t.code, { definition: t.schemas[0].definition, versionNo: t.schemas[0].versionNo })
  }
  return map
}
