import { extractQuestionFields } from '../utils/question-fields'

const NESTED = {
  metadata: {
    board: 'CBSE',
    chapter_uuid: '57898383-52f1-404a-bdfa-0acaa7fe4050',
    concepts: [
      { concept_name: 'Types of Chemical Reaction', concept_no: 2, concept_uuid: '63385342-d5d6-4fc0-bdc2-72c43687f74d' },
      { concept_name: 'Understanding Chemical Equations', concept_no: 1, concept_uuid: '5805f15f-7b6a-44b7-9169-baadbf72d41e' },
    ],
    question_level: 'LEVEL_HARD',
    question_type: 'ASSERTION_REASONING',
    question_mark: 1,
    bloom: [
      { bloom_level: 'UNDERSTAND', bloom_priority: 2 },
      { bloom_level: 'REMEMBER', bloom_priority: 1 },
    ],
  },
  question: {
    question_text: '<p>Assertion...</p>',
    question_diagram_url: null,
    options: [{ option_number: 'A', option_text: '<p>x</p>' }],
  },
}

const FLAT = {
  question_text: 'What is a combination reaction?',
  question_type: 'MCQ',
  difficulty: 'medium',
  bloom_level: 'understand',
  concept_uuids: ['SCI-1042-CH3A'],
  diagram_required: true,
  diagram_description: 'a labelled diagram of the reaction',
}

describe('extractQuestionFields — nested production format', () => {
  const f = extractQuestionFields(NESTED)

  it('detects nested shape', () => expect(f.isNested).toBe(true))
  it('reads question type from metadata', () => expect(f.questionType).toBe('ASSERTION_REASONING'))
  it('reads question text from question.question_text', () => expect(f.questionText).toBe('<p>Assertion...</p>'))
  it('normalises question_level to difficulty', () => expect(f.difficulty).toBe('hard'))
  it('picks the priority-1 bloom, lowercased', () => expect(f.bloomLevel).toBe('remember'))
  it('extracts all concept uuids', () => {
    expect(f.conceptUuids).toEqual([
      '63385342-d5d6-4fc0-bdc2-72c43687f74d',
      '5805f15f-7b6a-44b7-9169-baadbf72d41e',
    ])
  })
  it('does not request a diagram job (url embedded)', () => expect(f.diagramRequired).toBe(false))
})

describe('extractQuestionFields — flat legacy format', () => {
  const f = extractQuestionFields(FLAT)

  it('detects flat shape', () => expect(f.isNested).toBe(false))
  it('reads top-level fields', () => {
    expect(f.questionType).toBe('MCQ')
    expect(f.questionText).toBe('What is a combination reaction?')
    expect(f.difficulty).toBe('medium')
    expect(f.bloomLevel).toBe('understand')
    expect(f.conceptUuids).toEqual(['SCI-1042-CH3A'])
  })
  it('requests a diagram job from the flat flag', () => {
    expect(f.diagramRequired).toBe(true)
    expect(f.diagramDescription).toBe('a labelled diagram of the reaction')
  })
})
