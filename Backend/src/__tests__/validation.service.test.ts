import { validateQuestion } from '../api/services/validation.service'

const BASE_OPTIONS = {
  diagramEnabled: true,
  conceptEnabled: true,
  passageEnabled: true,
  solutionStepsEnabled: true,
}

const VALID_MCQ = {
  question_text: 'What is the powerhouse of the cell?',
  question_type: 'MCQ',
  marks: 1,
  difficulty: 'easy',
  bloom_level: 'remember',
  explanation: 'Mitochondria produce ATP through cellular respiration, earning the nickname powerhouse.',
  options: [
    { key: 'A', text: 'Nucleus' },
    { key: 'B', text: 'Mitochondria' },
    { key: 'C', text: 'Ribosome' },
    { key: 'D', text: 'Golgi apparatus' },
  ],
  correct_option: 'B',
}

describe('validateQuestion — Pass 1: auto-injected field rejection', () => {
  it('rejects a question that already contains board', () => {
    const q = { ...VALID_MCQ, board: 'CBSE' }
    const result = validateQuestion(q, BASE_OPTIONS)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ pass: 1, field: 'board' })]),
    )
  })

  it('rejects multiple auto-injected fields', () => {
    const q = { ...VALID_MCQ, board: 'CBSE', batch_uuid: 'abc', created_at: '2025-01-01' }
    const result = validateQuestion(q, BASE_OPTIONS)
    const pass1Errors = result.errors.filter((e) => e.pass === 1)
    expect(pass1Errors.length).toBeGreaterThanOrEqual(3)
  })
})

describe('validateQuestion — Pass 2: disabled feature checks', () => {
  it('rejects diagram fields when diagrams disabled', () => {
    const q = { ...VALID_MCQ, diagram_required: true, diagram_description: 'A cell diagram.' }
    const result = validateQuestion(q, { ...BASE_OPTIONS, diagramEnabled: false })
    const fields = result.errors.filter((e) => e.pass === 2).map((e) => e.field)
    expect(fields).toContain('diagram_required')
    expect(fields).toContain('diagram_description')
  })

  it('rejects passage when passage disabled', () => {
    const q = { ...VALID_MCQ, passage: 'Long passage text here to test the passage feature being disabled.' }
    const result = validateQuestion(q, { ...BASE_OPTIONS, passageEnabled: false })
    expect(result.errors.some((e) => e.pass === 2 && e.field === 'passage')).toBe(true)
  })

  it('rejects concept_uuids when concept mapping disabled', () => {
    const q = { ...VALID_MCQ, concept_uuids: ['SCI-0001-A1B2'] }
    const result = validateQuestion(q, { ...BASE_OPTIONS, conceptEnabled: false })
    expect(result.errors.some((e) => e.pass === 2 && e.field === 'concept_uuids')).toBe(true)
  })
})

describe('validateQuestion — Pass 3: JSON Schema', () => {
  it('fails when question_text is too short', () => {
    const q = { ...VALID_MCQ, question_text: 'Short?' }
    const result = validateQuestion(q, BASE_OPTIONS)
    expect(result.errors.some((e) => e.pass === 3 && e.field.includes('question_text'))).toBe(true)
  })

  it('fails with invalid bloom_level', () => {
    const q = { ...VALID_MCQ, bloom_level: 'memorize' }
    const result = validateQuestion(q, BASE_OPTIONS)
    expect(result.errors.some((e) => e.pass === 3)).toBe(true)
  })

  it('fails with marks out of range', () => {
    const q = { ...VALID_MCQ, marks: 15 }
    const result = validateQuestion(q, BASE_OPTIONS)
    expect(result.errors.some((e) => e.pass === 3)).toBe(true)
  })

  it('passes for a fully valid MCQ', () => {
    const result = validateQuestion(VALID_MCQ, BASE_OPTIONS)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

describe('validateQuestion — Pass 4: question-type specific rules', () => {
  it('rejects MCQ with wrong option keys', () => {
    const q = {
      ...VALID_MCQ,
      options: [
        { key: 'A', text: 'Nucleus' },
        { key: 'B', text: 'Mitochondria' },
        { key: 'C', text: 'Ribosome' },
        { key: 'X', text: 'Golgi' }, // wrong key
      ],
    }
    const result = validateQuestion(q, BASE_OPTIONS)
    expect(result.errors.some((e) => e.pass === 4 && e.field === 'options')).toBe(true)
  })

  it('rejects TF question without correct_answer', () => {
    const q = {
      question_text: 'Photosynthesis produces oxygen as a byproduct of light reactions.',
      question_type: 'TF',
      marks: 1,
      difficulty: 'easy',
      bloom_level: 'remember',
      explanation: 'Water is split during the light-dependent reactions releasing oxygen molecules.',
    }
    const result = validateQuestion(q, BASE_OPTIONS)
    expect(result.errors.some((e) => e.pass === 4 && e.field === 'correct_answer')).toBe(true)
  })

  it('rejects FIB without blanks', () => {
    const q = {
      question_text: 'The nucleus contains the genetic material called ______.',
      question_type: 'FIB',
      marks: 1,
      difficulty: 'easy',
      bloom_level: 'remember',
      explanation: 'DNA is stored in the nucleus and carries genetic information for the cell.',
    }
    const result = validateQuestion(q, BASE_OPTIONS)
    expect(result.errors.some((e) => e.pass === 4 && e.field === 'blanks')).toBe(true)
  })
})

describe('validateQuestion — Pass 7: LaTeX delimiter check', () => {
  it('rejects unclosed $ in question_text', () => {
    const q = { ...VALID_MCQ, question_text: 'Solve $x^2 + 1 for x in the given question here' }
    const result = validateQuestion(q, BASE_OPTIONS)
    expect(result.errors.some((e) => e.pass === 7 && e.field === 'question_text')).toBe(true)
  })

  it('passes balanced $...$', () => {
    const q = { ...VALID_MCQ, question_text: 'Solve $x^2 + 1 = 0$ for x in real number system now.' }
    const result = validateQuestion(q, BASE_OPTIONS)
    expect(result.errors.filter((e) => e.pass === 7)).toHaveLength(0)
  })
})

describe('validateQuestion — Pass 8: HTML injection check', () => {
  it('rejects script tags in explanation', () => {
    const q = {
      ...VALID_MCQ,
      explanation: '<script>alert("xss")</script> Mitochondria produce ATP through cellular respiration.',
    }
    const result = validateQuestion(q, BASE_OPTIONS)
    expect(result.errors.some((e) => e.pass === 8 && e.field === 'explanation')).toBe(true)
  })

  it('allows safe HTML in text', () => {
    const q = {
      ...VALID_MCQ,
      question_text: 'The formula for water is H<sub>2</sub>O — what is its molecular weight here?',
    }
    const result = validateQuestion(q, BASE_OPTIONS)
    expect(result.errors.filter((e) => e.pass === 8)).toHaveLength(0)
  })
})

describe('validateQuestion — Pass 9: concept UUID validation', () => {
  it('rejects malformed UUID', () => {
    const q = { ...VALID_MCQ, concept_uuids: ['INVALID-UUID'] }
    const result = validateQuestion(q, BASE_OPTIONS)
    expect(result.errors.some((e) => e.pass === 9 && e.field === 'concept_uuids')).toBe(true)
  })

  it('rejects UUID not in allowed set', () => {
    const q = { ...VALID_MCQ, concept_uuids: ['SCI-0001-A1B2'] }
    const allowed = new Set(['SCI-0001-XXXX'])
    const result = validateQuestion(q, { ...BASE_OPTIONS, allowedConceptUuids: allowed })
    expect(result.errors.some((e) => e.pass === 9)).toBe(true)
  })

  it('passes UUID present in allowed set', () => {
    const q = { ...VALID_MCQ, concept_uuids: ['SCI-0001-A1B2'] }
    const allowed = new Set(['SCI-0001-A1B2'])
    const result = validateQuestion(q, { ...BASE_OPTIONS, allowedConceptUuids: allowed })
    expect(result.errors.filter((e) => e.pass === 9)).toHaveLength(0)
    expect(result.valid).toBe(true)
  })
})

describe('validateQuestion — Pass 10: diagram consistency', () => {
  it('rejects diagram_description when diagram_required is false', () => {
    const q = { ...VALID_MCQ, diagram_required: false, diagram_description: 'A diagram of a cell.' }
    const result = validateQuestion(q, BASE_OPTIONS)
    expect(result.errors.some((e) => e.pass === 10 && e.field === 'diagram_description')).toBe(true)
  })

  it('passes when diagram_required true and description provided', () => {
    const q = { ...VALID_MCQ, diagram_required: true, diagram_description: 'A labeled diagram of a plant cell showing organelles.' }
    const result = validateQuestion(q, BASE_OPTIONS)
    expect(result.errors.filter((e) => e.pass === 10)).toHaveLength(0)
  })
})
