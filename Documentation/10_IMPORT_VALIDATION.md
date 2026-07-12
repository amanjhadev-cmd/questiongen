# 10 — Import & Validation

## Parser

The Import Parser accepts:
1. Raw JSON pasted into a textarea
2. Uploaded `.json` file (max 5MB)

### Accepted Input Formats

**Wrapped format (preferred — from LLM):**
```json
{
  "questions": [ {...}, {...} ],
  "metadata": { "subject": "...", "generated_at": "..." }
}
```

**Raw array format:**
```json
[ {...}, {...} ]
```

**Single question (edge case):**
```json
{ "question_text": "...", "question_type": "MCQ", ... }
```

Parser normalises all three to a flat array before passing to the Validation Engine.

### Parser Rules

1. Input must be valid JSON — if not, reject immediately with: `"Invalid JSON: <parse error message>"`
2. If the root is an object with a `questions` key → use `questions` array
3. If the root is an array → use as-is
4. If the root is an object without `questions` → wrap in array, treat as single question
5. Empty array → reject with: `"No questions found in import"`
6. Max 200 questions per import (batch limit)

---

## Validation Engine

Validation runs in two passes:

### Pass 1: JSON Schema Validation

Uses the `schema_version` pinned to the batch's Subject Profile.

- Validates each question against the JSON Schema definition
- Uses `ajv` (Another JSON Validator) library
- Errors are structured as `{ path, message }` pairs

### Pass 2: Field Registry Rules

After schema validation, additional business rules from the Field Registry are enforced:

1. **Required fields present and non-empty** — empty strings count as missing
2. **Conditional fields** — if `diagram_required = true`, then `diagram_description` must be present
3. **Pattern validation** — `concept_uuid` must match `^[A-Z]{2,6}-\d{4}-[A-Z0-9]{4}$`
4. **Enum validation** — `difficulty`, `bloom_level`, `question_type` must be in allowed list
5. **Length validation** — `question_text` min 10 chars, `explanation` min 20 chars
6. **Cross-field validation** — if `question_type = MCQ`, then `options` and `correct_option` required
7. **Concept UUID existence** — check if concept_uuid exists in concepts table; warn if not found (soft fail, not error)
8. **`diagram_url` must NOT be present** — system adds this later; LLM must not generate it

### Error vs Warning

| Severity | Behaviour |
|---|---|
| Error | Question cannot be saved; must be fixed and re-imported |
| Warning | Question is saved with warning flag; Intern sees warning but can proceed |

Warnings (soft fails):
- Unknown fields (extra keys not in Field Registry)
- `concept_uuid` not found in concepts table
- `year_asked` in the future

---

## Validation Response Format

```json
{
  "total": 20,
  "passed": 17,
  "failed": 3,
  "warnings": 2,
  "results": [
    {
      "index": 0,
      "status": "passed",
      "warnings": []
    },
    {
      "index": 4,
      "status": "failed",
      "errors": [
        { "path": "options", "message": "must have at least 4 items" },
        { "path": "concept_uuid", "message": "does not match pattern ^[A-Z]{2,6}-\\d{4}-[A-Z0-9]{4}$" }
      ]
    },
    {
      "index": 9,
      "status": "passed",
      "warnings": [
        { "path": "concept_uuid", "message": "UUID not found in concept master list" }
      ]
    }
  ]
}
```

---

## UI Behaviour on Validation

1. Import button starts spinner
2. Server returns validation response
3. Show summary bar: `17 passed | 3 failed | 2 warnings`
4. Table shows all questions with status icon (✔ / ✖ / ⚠)
5. Clicking a failed question expands its errors inline
6. Intern can:
   - Download failed questions as JSON for correction
   - Re-import corrected questions (only failed ones re-processed)
   - Override a warning (not an error) with confirmation

---

## Failure Handling

| Scenario | Handling |
|---|---|
| JSON parse error | Reject entire import; show parse error line number |
| Empty array | Reject; show "No questions found" |
| >200 questions | Reject; show "Max 200 questions per import. Split into multiple imports." |
| All questions fail | Import saved with status `import_failed`; batch stays at `validating` |
| Some questions fail | Passed questions saved; failed questions saved with errors; shown separately |
| Duplicate import | If same batch already has questions, prompt: "Append" or "Replace" |
