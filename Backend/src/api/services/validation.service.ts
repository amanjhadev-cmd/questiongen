import Ajv, { type ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)

// Lenient AJV for compiling superadmin-authored per-type schemas (they may use
// keywords our strict instance would reject at compile time).
const userAjv = new Ajv({ allErrors: true, strict: false })
addFormats(userAjv)

// Compile a per-question-type schema (from the DB) into a validator. Returns
// null if the schema can't compile, so validation falls back to the default.
export function compileTypeSchema(definition: unknown): ValidateFunction | null {
  try {
    return userAjv.compile(definition as object)
  } catch {
    return null
  }
}

// Inline schema (mirrors Assets/json-schemas/question-schema-v2.json version 2)
const QUESTION_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'QuestionSchema v2',
  type: 'object',
  required: ['question_text', 'question_type', 'marks', 'difficulty', 'bloom_level', 'explanation'],
  properties: {
    question_text:    { type: 'string', minLength: 10, maxLength: 2000 },
    question_type:    { type: 'string', enum: ['MCQ', 'FIB', 'TF', 'MATCH', 'SHORT', 'LONG'] },
    marks:            { type: 'number', minimum: 1, maximum: 10 },
    difficulty:       { type: 'string', enum: ['easy', 'medium', 'hard'] },
    bloom_level:      { type: 'string', enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'] },
    explanation:      { type: 'string', minLength: 20, maxLength: 3000 },
    concept_uuids:    { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', pattern: '^([A-Z]{2,6}-\\d{4}-[A-Z0-9]{4}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$' } },
    options:          { type: 'array', minItems: 4, maxItems: 4, items: { type: 'object', required: ['key', 'text'], properties: { key: { type: 'string', enum: ['A', 'B', 'C', 'D'] }, text: { type: 'string', minLength: 1 } } } },
    correct_option:   { type: 'string', enum: ['A', 'B', 'C', 'D'] },
    diagram_required: { type: 'boolean' },
    diagram_description: { type: 'string', minLength: 10 },
    tags:             { type: 'array', maxItems: 10, items: { type: 'string' } },
    hint:             { type: 'string', maxLength: 500 },
    passage:          { type: 'string', minLength: 50, maxLength: 5000 },
    solution_steps:   { type: 'array', minItems: 1, items: { type: 'object', required: ['step_no', 'content'], properties: { step_no: { type: 'number' }, content: { type: 'string', minLength: 1 } } } },
    blanks:           { type: 'array', minItems: 1, maxItems: 5, items: { type: 'object', required: ['position', 'answer'], properties: { position: { type: 'number' }, answer: { type: 'string', minLength: 1, maxLength: 100 }, alternatives: { type: 'array', items: { type: 'string' } } } } },
    correct_answer:   { type: 'boolean' },
    column_a:         { type: 'array', minItems: 3, maxItems: 6, items: { type: 'object' } },
    column_b:         { type: 'array', minItems: 3, maxItems: 6, items: { type: 'object' } },
    correct_matches:  { type: 'object' },
    language:         { type: 'string', enum: ['en', 'hi'], default: 'en' },
    is_ncert:         { type: 'boolean' },
    ncert_page:       { type: 'number' },
    year_asked:       { type: 'number', minimum: 2000, maximum: 2030 },
  },
  if: { properties: { question_type: { const: 'MCQ' } } },
  then: { required: ['options', 'correct_option'] },
  allOf: [
    { if: { required: ['diagram_required'], properties: { diagram_required: { const: true } } }, then: { required: ['diagram_description'] } },
    { if: { required: ['is_ncert'], properties: { is_ncert: { const: true } } }, then: { required: ['ncert_page'] } },
  ],
}

// Compiled once at module load
const _schemaValidator = ajv.compile(QUESTION_SCHEMA)

const AUTO_INJECTED_FIELDS = [
  'board', 'class', 'subject', 'chapter_uuid', 'batch_uuid',
  'prompt_version', 'schema_version', 'created_by', 'created_at',
  'diagram_url', 'diagram_alt_text',
]

const CONCEPT_UUID_PATTERN =
  /^([A-Z]{2,6}-\d{4}-[A-Z0-9]{4}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/

// Simple KaTeX-like expression detection (looks for $...$ or $$...$$)
const LATEX_PATTERN = /\$\$?[^$]+\$\$?/

// Potentially dangerous HTML tags
const DANGEROUS_HTML_PATTERN = /<(script|iframe|object|embed|form|input|button|link|style|meta|base)\b/i

export interface ValidationError {
  pass: number
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export function validateQuestion(
  q: Record<string, unknown>,
  options: {
    allowedConceptUuids?: Set<string>   // if provided, concept_uuids are checked against this set
    diagramEnabled: boolean
    conceptEnabled: boolean
    passageEnabled: boolean
    solutionStepsEnabled: boolean
    typeSchemaValidator?: ValidateFunction  // per-question-type schema; falls back to the built-in one
    conceptUuids?: string[]                 // resolved concept UUIDs (works for nested + flat formats)
  },
): ValidationResult {
  const errors: ValidationError[] = []

  // Concept UUIDs come either from the adapter (nested format) or the flat field.
  const conceptUuids: string[] = options.conceptUuids
    ?? (Array.isArray(q.concept_uuids) ? (q.concept_uuids as string[]) : [])

  // Pass 1: Auto-injected field check — these must NOT be present in import
  for (const field of AUTO_INJECTED_FIELDS) {
    if (field in q) {
      errors.push({ pass: 1, field, message: `Auto-injected field '${field}' must not be present in imported JSON` })
    }
  }

  // Pass 2: Disabled field check — validate disabled features aren't used
  if (!options.diagramEnabled) {
    if (q.diagram_required === true) {
      errors.push({ pass: 2, field: 'diagram_required', message: 'Diagrams are disabled for this subject' })
    }
    if (q.diagram_description !== undefined) {
      errors.push({ pass: 2, field: 'diagram_description', message: 'diagram_description is not allowed (diagrams disabled)' })
    }
  }
  if (!options.passageEnabled && q.passage !== undefined) {
    errors.push({ pass: 2, field: 'passage', message: 'Passage is disabled for this subject' })
  }
  if (!options.solutionStepsEnabled && q.solution_steps !== undefined) {
    errors.push({ pass: 2, field: 'solution_steps', message: 'Solution steps are disabled for this subject' })
  }
  if (!options.conceptEnabled && conceptUuids.length > 0) {
    errors.push({ pass: 2, field: 'concept_uuids', message: 'Concept mapping is disabled for this subject' })
  }

  // Pass 3: JSON Schema validation — use the per-question-type schema when one
  // is configured, otherwise the built-in baseline schema.
  const validate = options.typeSchemaValidator ?? _schemaValidator
  const schemaValid = validate(q)
  if (!schemaValid && validate.errors) {
    for (const err of validate.errors) {
      errors.push({
        pass: 3,
        field: err.instancePath ? err.instancePath.replace(/^\//, '') : (err.params as Record<string, string>).missingProperty ?? 'root',
        message: err.message ?? 'Schema validation failed',
      })
    }
  }

  // Pass 4: Required field depth check — MCQ must have valid options and correct_option
  if (q.question_type === 'MCQ') {
    const options_ = q.options as Array<{ key: string; text: string }> | undefined
    if (!Array.isArray(options_) || options_.length !== 4) {
      errors.push({ pass: 4, field: 'options', message: 'MCQ must have exactly 4 options' })
    } else {
      const keys = options_.map((o) => o.key)
      if (!['A', 'B', 'C', 'D'].every((k) => keys.includes(k))) {
        errors.push({ pass: 4, field: 'options', message: 'MCQ options must have keys A, B, C, D' })
      }
    }
    if (!q.correct_option) {
      errors.push({ pass: 4, field: 'correct_option', message: 'MCQ must have a correct_option' })
    }
  }

  if (q.question_type === 'TF') {
    if (typeof q.correct_answer !== 'boolean') {
      errors.push({ pass: 4, field: 'correct_answer', message: 'TF question must have a boolean correct_answer' })
    }
  }

  if (q.question_type === 'FIB') {
    if (!Array.isArray(q.blanks) || (q.blanks as unknown[]).length === 0) {
      errors.push({ pass: 4, field: 'blanks', message: 'FIB question must have at least one blank' })
    }
  }

  if (q.question_type === 'MATCH') {
    if (!Array.isArray(q.column_a) || (q.column_a as unknown[]).length < 3) {
      errors.push({ pass: 4, field: 'column_a', message: 'MATCH question must have at least 3 items in column_a' })
    }
    if (!Array.isArray(q.column_b) || (q.column_b as unknown[]).length < 3) {
      errors.push({ pass: 4, field: 'column_b', message: 'MATCH question must have at least 3 items in column_b' })
    }
    if (!q.correct_matches || typeof q.correct_matches !== 'object') {
      errors.push({ pass: 4, field: 'correct_matches', message: 'MATCH question must have correct_matches object' })
    }
  }

  // Pass 5: Optional field value checks
  if (q.ncert_page !== undefined && q.is_ncert !== true) {
    errors.push({ pass: 5, field: 'ncert_page', message: 'ncert_page is only allowed when is_ncert is true' })
  }
  if (q.diagram_required === true && !q.diagram_description) {
    errors.push({ pass: 5, field: 'diagram_description', message: 'diagram_description is required when diagram_required is true' })
  }

  // Pass 6: Question-type specific rules (already covered above in Pass 4)
  // Checking solution_steps structure if present
  if (Array.isArray(q.solution_steps)) {
    const steps = q.solution_steps as Array<{ step_no?: unknown; content?: unknown }>
    steps.forEach((step, i) => {
      if (typeof step.step_no !== 'number') {
        errors.push({ pass: 6, field: `solution_steps[${i}].step_no`, message: 'step_no must be a number' })
      }
      if (typeof step.content !== 'string' || (step.content as string).length === 0) {
        errors.push({ pass: 6, field: `solution_steps[${i}].content`, message: 'content must be a non-empty string' })
      }
    })
  }

  // Pass 7: KaTeX syntax check — look for malformed LaTeX ($...$ must be closed)
  const textFields = ['question_text', 'explanation']
  for (const field of textFields) {
    const text = q[field] as string | undefined
    if (text) {
      // Count unescaped $ signs — they should come in pairs
      const dollars = (text.match(/(?<!\\)\$/g) ?? []).length
      if (dollars % 2 !== 0) {
        errors.push({ pass: 7, field, message: `Unclosed LaTeX delimiter ($) in '${field}'` })
      }
    }
  }

  // Pass 8: HTML injection check
  for (const field of textFields) {
    const text = q[field] as string | undefined
    if (text && DANGEROUS_HTML_PATTERN.test(text)) {
      errors.push({ pass: 8, field, message: `Potentially dangerous HTML tag found in '${field}'` })
    }
  }

  // Pass 9: Concept UUID validation (works for nested + flat via resolved list)
  if (options.conceptEnabled && conceptUuids.length > 0) {
    for (const uuid of conceptUuids) {
      if (!CONCEPT_UUID_PATTERN.test(uuid)) {
        errors.push({ pass: 9, field: 'concept_uuids', message: `Concept UUID '${uuid}' is not a valid UUID format` })
      } else if (options.allowedConceptUuids && !options.allowedConceptUuids.has(uuid)) {
        errors.push({ pass: 9, field: 'concept_uuids', message: `Concept UUID '${uuid}' does not exist in this chapter` })
      }
    }
  }

  // Pass 10: Diagram field consistency check
  if (q.diagram_required === false && q.diagram_description !== undefined) {
    errors.push({ pass: 10, field: 'diagram_description', message: 'diagram_description should only be set when diagram_required is true' })
  }

  return { valid: errors.length === 0, errors }
}
