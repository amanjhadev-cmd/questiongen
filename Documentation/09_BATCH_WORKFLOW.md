# 09 — Batch Workflow (13 Phases)

## Batch Status Lifecycle

```
created → generation_complete → import_complete → validation_complete
        → diagram_complete → sme_review_complete → export_complete → synced
```

| Status | Set By | Meaning |
|---|---|---|
| `created` | Intern / Admin | Batch created; intern goes to copy prompt |
| `generation_complete` | Intern (manual) | Intern marks that Qwen generation is done; ready to import |
| `import_complete` | System (after import) | Raw JSON successfully stored in staging area |
| `validation_complete` | System (after validation + metadata injection) | All questions validated and metadata injected |
| `diagram_complete` | Admin (manual trigger) | All pending diagram jobs have been uploaded |
| `sme_review_complete` | System (when all questions approved) | SME has approved all questions |
| `export_complete` | System (after export job done) | At least one export file created |
| `synced` | Admin (manual trigger) | Production sync to downstream DB confirmed |

A batch can move backwards (e.g. from `sme_review_complete` back to `import_complete` if rejected questions need reimport).

---

## Phase 1 — Create Batch

```
Actor: Admin or Intern

1. Click "New Batch"
2. Select: Board → Class → Subject → Chapter (optional)
3. Select: Question Type (MCQ / FIB / TF / MATCH / SHORT / LONG)
4. Select: Difficulty (Easy / Medium / Hard)
5. Enter: Question Count (how many to generate)
6. System fetches active Subject Profile for selected subject
7. Profile displayed to confirm: Prompt v{n}, Schema v{n}, Provider, Feature Flags
8. Enter batch name and optional notes
9. Assign to intern (Admin only; Intern sees self)
10. Confirm → batch created with status: created
```

---

## Phase 2 — Prompt Library (View + Copy)

```
Actor: Intern

1. Open batch → "View Prompt" button
2. Platform displays the interpolated prompt:
   - All variables already filled (subject, chapter, count, difficulty, etc.)
   - Bloom's level: intern selects from dropdown (not in batch — chosen at prompt view time)
3. Concept list shown below prompt (if concept_enabled = true):
   - Each concept: UUID | Name | Short Note
4. Intern clicks "Copy Prompt" → clipboard
5. If concept_enabled: Intern clicks "Copy Concept List" → clipboard
6. Intern manually clicks "Mark Generation Started" → status stays at: created
   (No status change yet — generation is external)
```

---

## Phase 3 — Question Generation (External — Manual)

```
Actor: Intern (outside the platform)

1. Opens Qwen Chat (or any external LLM tool)
2. Pastes: copied prompt + concept list (if applicable)
3. Qwen generates questions (JSON format as instructed by prompt)
4. Intern reviews the output briefly for obvious errors
5. Returns to platform → batch page → clicks "Mark Generation Complete"
6. Batch status → generation_complete
```

The platform has NO involvement in this step. No API call. No n8n.

---

## Phase 4 — Import

```
Actor: Intern

1. Open batch → click "Import Questions"
2. Paste raw JSON from Qwen OR upload .json file (max 5MB)
3. Select mode: Append or Replace (Replace if re-importing corrected set)
4. Click "Import"
5. Platform stores each question in Temporary Staging Area (questions.status = 'staged')
6. Batch status → import_complete
7. Validation starts automatically
```

---

## Phase 5 — Parser

```
Actor: System (automatic on import)

1. Receives raw JSON (array or wrapped in {"questions": [...]})
2. Normalises to flat array
3. Creates individual question record for each item:
   - question_id (new UUID)
   - batch_id
   - version = 1
   - status = 'staged'
   - created_at = now()
   - created_by = intern user_id
4. Assigns question_type_id from batch (not from JSON — batch defines the type)
```

---

## Phase 6 — Validation Engine

```
Actor: System (automatic — no AI)

Checks run in order:
  1. JSON structure (is it valid JSON? is the array format correct?)
  2. JSON Schema validation against schema_version pinned to batch
  3. Required field check (per field_registry mode)
  4. auto field check (rejects if any auto-mode fields are present in import)
  5. disabled field check (warns if disabled fields are present)
  6. Question Type specific rules:
     - MCQ: options count = 4, correct_option in A/B/C/D, no duplicate option texts
     - FIB: blanks array present
     - TF: correct_answer is boolean
     - MATCH: column_a and column_b present
  7. KaTeX check: attempts to parse math expressions; flags invalid LaTeX
  8. HTML check: flags unsafe HTML tags
  9. Duplicate option text check (MCQ): all 4 options must be distinct
  10. Concept UUID checks (if concept_enabled = true):
      - UUID exists in concepts table
      - UUID belongs to the selected chapter
      - Concept name in JSON matches UUID in DB
      - Number of concepts ≤ subject_profile.max_concepts
  11. Diagram field checks (if diagram_enabled = true):
      - If diagram_required = true → diagram_description must be present
      - diagram_url must NOT be in import (it's auto-injected later)

Result: Each question gets status 'validated' or 'validation_failed'
        import_errors array populated for failed questions
```

---

## Phase 7 — Metadata Injection

```
Actor: System (automatic — runs after validation passes)

For every question with status = 'validated':
  System writes injected_metadata field with:
  {
    board:          "CBSE",
    class:          "Class 10",
    subject:        "Science",
    chapter_uuid:   "<chapter uuid>",
    batch_uuid:     "<batch uuid>",
    prompt_version: "v6",
    schema_version: "v2",
    created_by:     "<intern user_id>",
    created_at:     "2024-01-15T10:30:00Z"
  }

Nobody edits these values. System reads them from:
  - Board/Class/Subject from the batch → subject → class → board chain
  - Chapter UUID from batch.chapter_id
  - Prompt Version from batch.profile.prompt_version_id
  - Schema Version from batch.profile.schema_version_id
  - Created By from the logged-in user
  - Created At from current timestamp

Batch status → validation_complete
```

---

## Phase 8 — Diagram Pipeline

```
Actor: System (creates jobs) + Intern (uploads images)

Step 1 — System scans validated questions:
  For each question where content.diagram_required = true:
    Creates diagram_jobs row:
      { question_id, description: content.diagram_description, status: 'pending' }
    Sets question.status = 'diagram_pending'

Step 2 — Intern opens "Pending Diagrams" panel in batch:
  Sees table: Question # | Diagram Description | Status | Upload

Step 3 — Intern, for each pending diagram:
  1. Copies the diagram description shown on platform
  2. Opens preferred image generation tool (externally)
  3. Generates diagram.png
  4. Returns to platform → uploads PNG
  5. Platform:
     a. Uploads to Cloudflare R2:
        Key: diagrams/{subject_code}/{batch_id}/{question_id}/v1.png
     b. Creates diagram_assets row:
        { diagram_job_id, r2_key, public_url, version: 1, original_description }
     c. Updates question.content:
        diagram_url = public_url
        diagram_alt_text = "{subject} - {chapter}: {first 100 chars of description}"
     d. Sets diagram_jobs.status = 'uploaded'
     e. Sets question.status = 'diagram_done'

Step 4 — When all diagram jobs complete:
  Batch status → diagram_complete
  (Batches with no diagram jobs skip straight to diagram_complete)
```

---

## Phase 9 — Rendering Engine

```
Actor: System (automatic — on-demand per view)

Database stores raw JSON.
When SME opens a question for review, Rendering Engine converts:
  - question_text, explanation, hint, options → KaTeX-rendered HTML
  - diagram_url → <img> with alt text
  - column_a / column_b → HTML table (MATCH type)
  - solution_steps → numbered list (Maths)
  - passage → styled block (English)

SME never sees raw JSON — only the rendered textbook view.
```

---

## Phase 10 — SME Review

```
Actor: Admin (sends to review) + SME (reviews)

Admin:
  1. Batch at diagram_complete → "Send to SME Review" button
  2. Select SME from dropdown
  3. Questions status set to 'under_review'
  (Batch status does NOT change — it stays at diagram_complete during review)

SME:
  1. Sees batch in Review Queue
  2. Opens batch → paginated question list (20 per page)
  3. For each question:

     [Approve]
     → sme_reviews row: { decision: 'approved', notes: null }
     → question.status = 'approved'

     [Reject]
     → Modal with REQUIRED notes field
     → sme_reviews row: { decision: 'rejected', notes: "reason..." }
     → question.status = 'rejected'

  4. After finishing all questions:
     → SME adds optional Batch Notes (appended to batches.notes)
     → SME clicks "Submit Review"

  5. System checks:
     - All questions approved → batch.status = 'sme_review_complete'
     - Any rejected → batch stays at diagram_complete; Admin notified
     - Intern corrects rejected questions → re-imports → validation + metadata injection re-run
```

**Note:** There is no "Request Revision" option. Questions are either Approved or Rejected.

---

## Phase 11 — Final JSON Builder

```
Actor: System (automatic — triggered on export)

The platform IGNORES the imported JSON for production output.
Instead it reads every validated DB field and constructs a clean JSON:

For each approved question, it reads FROM THE DATABASE:
  - question_text (from questions.content)
  - question_type (from question_types.code)
  - options (from questions.content, for MCQ)
  - correct_option (from questions.content)
  - explanation (from questions.content)
  - diagram_url (from diagram_assets.public_url — NOT from imported content)
  - diagram_alt_text (generated)
  - concept_uuids (from questions.content, validated)
  - chapter_uuid (from injected_metadata)
  - difficulty (from batches.difficulty)
  - bloom_level (from questions.content)
  - marks (from questions.content)
  + ALL injected_metadata fields

Result: a clean, fully consistent production JSON
        regardless of what the original import contained.
```

---

## Phase 12 — Export Engine

```
Actor: Admin

1. Click "Export" on batch (status: sme_review_complete)
2. Export Engine runs Final JSON Builder
3. Creates three files automatically: JSON + Excel + PDF
4. All uploaded to Cloudflare R2 under exports/{batch_id}/
5. Batch status → export_complete
6. Admin downloads any format needed
```

---

## Phase 13 — Production Sync

```
Actor: Admin

1. Click "Sync to Production" on exported batch
2. Confirm modal (irreversible)
3. n8n webhook called with the export JSON URL
4. n8n downloads JSON → validates → writes to Production SQL Database
5. Batch status → synced
```

---

## Full Flowchart

```
[Batch Created]
      │
      ▼
[View Prompt + Copy] ──► [Intern pastes into Qwen Chat]
      │                         │
      │                   [Qwen generates JSON]
      │                         │
      ◄── [Intern returns] ─────┘
      │
      ▼ (status: generation_complete)
[Import JSON]
      │
      ▼ (status: import_complete)
[Parser] → individual records
      │
      ▼
[Validation Engine]
      │
   ┌──┴──────────┐
   │ Failed      │──► [Intern fixes JSON] ──► [Re-import]
   └──┬──────────┘
      │ Passed
      ▼
[Metadata Injection]
      │
      ▼ (status: validation_complete)
[Diagram Pipeline]
      │
   (if diagrams needed)
      │
   Intern uploads images
      │
      ▼ (status: diagram_complete)
[Send to SME Review]
      │
   ┌──┴──────────┐
   │ Rejected    │──► [Intern fixes + re-imports] ──► [Validation again]
   └──┬──────────┘
      │ All Approved
      ▼ (status: sme_review_complete)
[Final JSON Builder]
      │
[Export Engine] ──► JSON + Excel + PDF to R2
      │
      ▼ (status: export_complete)
[n8n Sync to Production DB]
      │
      ▼ (status: synced)
      ✓ Done
```
