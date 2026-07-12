import { parseImportInput } from '../utils/import-parser'

describe('parseImportInput', () => {
  it('accepts a JSON array', () => {
    const input = [{ question_text: 'Q1' }, { question_text: 'Q2' }]
    const result = parseImportInput(input)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ question_text: 'Q1' })
  })

  it('accepts an object with a "questions" key', () => {
    const input = { questions: [{ question_text: 'Q1' }] }
    const result = parseImportInput(input)
    expect(result).toHaveLength(1)
  })

  it('wraps a single question object in an array', () => {
    const input = { question_text: 'Q1', question_type: 'MCQ' }
    const result = parseImportInput(input)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ question_text: 'Q1' })
  })

  it('throws on null input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => parseImportInput(null as any)).toThrow()
  })

  it('throws on a non-array, non-object numeric type', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => parseImportInput(42 as any)).toThrow()
  })

  it('treats object with non-array questions key as a single question', () => {
    // Product decision: if "questions" key isn't an array, the whole object is treated as one question
    const result = parseImportInput({ question_text: 'Q', questions: 'bad' } as Record<string, unknown>)
    expect(result).toHaveLength(1)
  })
})
