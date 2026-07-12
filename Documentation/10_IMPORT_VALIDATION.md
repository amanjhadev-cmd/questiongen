# 10 — Import, Validation & Metadata Injection

## Phase 4 — Parser

The Import Parser accepts:
1. Raw JSON pasted into a textarea
2. Uploaded `.json` file (max 5MB)

### Accepted Input Formats

**Wrapped format (from Qwen):**
```json
{
  "questions": [ {...}, {...} ]
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

Parser normalises all three to a flat array before storing.

### Parser Rules

1. Input must be valid JSON — if not, reject immediately with: `"Invalid JSON: <parse error message>"`
2. If root is object with `questions` key → use `questions` array
3. If root is array → use as-is
4. If root is object without `questions` → wrap in array, treat as single question
5. Empty array → reject with: `"No questions found in import"`
6. Max 200 questions per import

### Staging Area

After parsing, each question is saved with:
```
questions.status = 'staged'
questions.version = 1
questions.created_at = now()
questions.created_by = intern_user_id
questions.batch_id = current_batch_id
questions.question_type_id = from batch (not from JSON)
```

The `question_type` in the imported JSON is checked to match the batch's question type — mismatch is a validation error.

---

## Phase 5 — Validation Engine (Pure Software — No AI)

Validation runs automatically after parsing. It runs in these passes, in order:

### Pass 1: Auto Field Check

Any field with mode `auto` in the field_registry must NOT be present in imported JSON.

Blocked fields: `board`, `class`, `subject`, `chapter_uuid`, `batch_uuid`, `prompt_version`, `schema_version`, `created_by`, `created_at`, `diagram_url`, `diagram_alt_text`.

If any auto field is found in import → **error** (question fails).

### Pass 2: Disabled Field Check

Fields with mode `disabled` for this subject (per subject profile feature flags) must not be present.

If a disabled field is found → **warning** (question saved with warning, does not fail).

### Pass 3: JSON Schema Validation

Uses the `schema_version` pinned to the batch's Subject Profile (via `ajv`).

- Errors are structured as `{ path, message }` pairs
- Schema failures → **error**

### Pass 4: Required Field Check

Fields with mode `required` must be present and non-empty (empty string = missing).

### Pass 5: Optional Field Validation

Fields with mode `optional` are validated against their `validation_rule` only when present.

### Pass 6: Question Type Rules

| Question Type | Additional Checks |
|---|---|
| MCQ | options array has exactly 4 items; each has key (A/B/C/D) and text; no duplicate option texts; correct_option matches one key |
| FIB | blanks array present with at least 1 item; each blank has position and answer |
| TF | correct_answer is boolean |
| MATCH | column_a and column_b present; correct_matches keys correspond to column_a items |

### Pass 7: KaTeX Validation

For fields with `rendering_rule.type: "katex"`: attempts to parse all `$...$` and `$$...$$` expressions. Flags invalid LaTeX → **warning** (not error — renderer will show raw text as fallback).

### Pass 8: HTML Check

For all text fields: flags unsafe HTML tags (`<script>`, `<iframe>`, event attributes) → **error**.

### Pass 9: Concept UUID Checks (if concept_enabled = true)

For each UUID in `concept_uuids` array:

1. UUID exists in `concepts` table → else **error**
2. UUID belongs to the chapter selected in the batch → else **error**
3. Concept name in JSON matches name stored in DB → else **warning**
4. `concept_uuids.length` ≤ `subject_profile.max_concepts` → else **error**

### Pass 10: Diagram Field Checks (if diagram_enabled = true)

1. If `diagram_required = true` → `diagram_description` must be present → else **error**
2. `diagram_url` must NOT be in import → else **error** (it's an auto field)

---

## Error vs Warning

| Severity | Behaviour |
|---|---|
| Error | Question status = `validation_failed`; must be fixed and re-imported |
| Warning | Question status = `validated` with warnings; intern sees warning but can proceed |

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
        { "path": "options", "message": "must have exactly 4 items" },
        { "path": "concept_uuids[0]", "message": "UUID SCI-9999-XXXX does not exist" }
      ]
    },
    {
      "index": 9,
      "status": "passed",
      "warnings": [
        { "path": "question_text", "message": "Invalid LaTeX expression: $\\invalid$" }
      ]
    }
  ]
}
```

---

## Phase 6 — Metadata Injection (Automatic)

After validation passes for a question, the system immediately injects metadata into `questions.injected_metadata`:

```json
{
  "board": "CBSE",
  "class": "Class 10",
  "subject": "Science",
  "chapter_uuid": "7c9e6679-...",
  "batch_uuid": "550e8400-...",
  "prompt_version": "v6",
  "schema_version": "v2",
  "created_by": "intern-user-uuid",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Sources:**
- `board`, `class`, `subject` ← traversed from `batch.subject.class.board`
- `chapter_uuid` ← `batch.chapter_id`
- `batch_uuid` ← `batch.id`
- `prompt_version` ← `batch.profile.prompt_version.version_no`
- `schema_version` ← `batch.profile.schema_version.version_no`
- `created_by` ← current authenticated user
- `created_at` ← server timestamp

Nobody can edit these values. The system is the sole authority.

After metadata injection, `batch.status` → `validation_complete`.

---

## Re-import Flow

When an intern re-imports to fix failed questions:

1. Only `validation_failed` questions are replaced (Append mode does not touch passed questions)
2. Replace mode replaces ALL questions in the batch — use only when doing a full redo
3. Validation runs again on re-imported questions
4. Metadata injection runs again on newly passed questions
5. Previously approved questions are not affected by re-import

---

## UI Behaviour

After import and validation:

1. Summary bar: `17 passed | 3 failed | 2 warnings`
2. Table: all questions with status icon (✔ / ✖ / ⚠)
3. Clicking a failed row expands errors inline
4. "Download Failed Questions" button → JSON file with only the failed question objects
5. Intern fixes locally, re-imports failed ones only
