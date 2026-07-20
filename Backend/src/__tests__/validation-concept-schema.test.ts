import { validateQuestion, compileTypeSchema } from '../api/services/validation.service'

const OPTS = {
  diagramEnabled: true,
  conceptEnabled: true,
  passageEnabled: true,
  solutionStepsEnabled: true,
}

describe('concept-belongs-to-chapter (Pass 9) via resolved conceptUuids', () => {
  const allowed = new Set(['63385342-d5d6-4fc0-bdc2-72c43687f74d'])

  it('passes when the concept UUID belongs to the chapter', () => {
    const r = validateQuestion({}, {
      ...OPTS,
      allowedConceptUuids: allowed,
      conceptUuids: ['63385342-d5d6-4fc0-bdc2-72c43687f74d'],
    })
    expect(r.errors.filter((e) => e.pass === 9)).toHaveLength(0)
  })

  it('fails when the concept UUID is not in the chapter (nested format leaks caught)', () => {
    const r = validateQuestion({}, {
      ...OPTS,
      allowedConceptUuids: allowed,
      conceptUuids: ['ffffffff-ffff-4fff-8fff-ffffffffffff'],
    })
    expect(r.errors.filter((e) => e.pass === 9)).toEqual(
      expect.arrayContaining([expect.objectContaining({ pass: 9 })]),
    )
  })

  it('rejects a malformed concept UUID', () => {
    const r = validateQuestion({}, { ...OPTS, conceptUuids: ['not-a-uuid'] })
    expect(r.errors.filter((e) => e.pass === 9).length).toBeGreaterThan(0)
  })
})

describe('per-question-type schema drives Pass 3', () => {
  const schema = {
    type: 'object',
    required: ['question_type', 'marks'],
    properties: {
      question_type: { const: 'MCQ' },
      marks: { type: 'number', minimum: 1, maximum: 10 },
    },
  }
  const validator = compileTypeSchema(schema)

  it('compiles a valid schema', () => {
    expect(validator).not.toBeNull()
  })

  it('passes a conforming question against the type schema', () => {
    const r = validateQuestion({ question_type: 'MCQ', marks: 2 }, { ...OPTS, typeSchemaValidator: validator! })
    expect(r.errors.filter((e) => e.pass === 3)).toHaveLength(0)
  })

  it('fails a question that violates the type schema', () => {
    const r = validateQuestion({ question_type: 'MCQ', marks: 0 }, { ...OPTS, typeSchemaValidator: validator! })
    expect(r.errors.filter((e) => e.pass === 3).length).toBeGreaterThan(0)
  })

  it('returns null for an uncompilable schema', () => {
    expect(compileTypeSchema({ type: 123 })).toBeNull()
  })
})
