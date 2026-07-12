import { Errors } from './app-error'

export type RawInput = string | unknown[] | Record<string, unknown>

export function parseImportInput(input: RawInput): Record<string, unknown>[] {
  let parsed: unknown

  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input)
    } catch (e) {
      throw Errors.validation(`Invalid JSON: ${(e as Error).message}`)
    }
  } else {
    parsed = input
  }

  let questions: unknown[]

  if (Array.isArray(parsed)) {
    questions = parsed
  } else if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>
    if (Array.isArray(obj.questions)) {
      questions = obj.questions
    } else {
      // Single question object
      questions = [parsed]
    }
  } else {
    throw Errors.validation('Invalid import format: expected JSON object or array')
  }

  if (questions.length === 0) {
    throw Errors.validation('No questions found in import')
  }

  if (questions.length > 200) {
    throw Errors.validation('Maximum 200 questions per import. Split into multiple imports.')
  }

  return questions as Record<string, unknown>[]
}
