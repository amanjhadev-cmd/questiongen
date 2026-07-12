# 09 — Batch Workflow

## Batch Status Lifecycle

```
created → generating → importing → validating → diagramming → reviewing → approved → exported
```

| Status | Who Triggers | Meaning |
|---|---|---|
| `created` | Admin / Intern | Batch created, not yet sent to LLM |
| `generating` | n8n | LLM is generating questions |
| `importing` | Intern | JSON is being imported |
| `validating` | System | Validation engine is running |
| `diagramming` | System | Diagram jobs are in progress |
| `reviewing` | Admin | Sent to SME for review |
| `approved` | System | All questions approved by SME |
| `exported` | Admin | At least one export created |

A batch can go backwards (e.g. from `reviewing` back to `importing` if the SME requests a full reimport).

---

## Step-by-Step Workflow

### Step 1: Create Batch

```
Actor: Admin or Intern

Actions:
  1. Click "New Batch"
  2. Select Board → Class → Subject
  3. Select Chapter (optional — can be left as batch-level only)
  4. System fetches active Subject Profile for selected subject
  5. Profile displayed: Prompt v{n}, Schema v{n}, Provider
  6. Enter batch name and optional notes
  7. Assign to intern (Admin only; Intern sees self)
  8. Confirm → batch created with status: created
```

### Step 2: Generate Questions

```
Actor: Intern (or Admin)

Actions:
  1. Open batch → click "Generate Questions"
  2. Enter: count, difficulty, bloom_level, concept list
  3. Click "Send to AI"
  4. n8n webhook triggered → status: generating
  5. n8n interpolates prompt template with batch variables
  6. n8n calls LLM API
  7. LLM returns raw JSON array
  8. n8n writes raw JSON to batch.generation_output (temp field)
  9. n8n calls back /api/batch/:id/generation-complete
  10. Status stays at: generating until intern imports
```

### Step 3: Import

```
Actor: Intern

Actions:
  1. Click "Import Questions"
  2. Paste raw JSON or upload .json file
  3. Click "Import" → status: importing
  4. System parses JSON → validates structure (is it an array? is it wrapped?)
  5. Passes each question to Validation Engine
  6. Status → validating
```

### Step 4: Validate

```
Actor: System (automatic on import)

Actions:
  1. Validation Engine iterates each question
  2. Runs JSON Schema validation against schema_version pinned to batch
  3. Runs Field Registry rules (required fields, conditional rules, type checks)
  4. Flags errors per question
  5. Questions with 0 errors → status: imported
  6. Questions with errors → status: import_failed, errors stored in import_errors
  7. Summary shown to Intern: X passed, Y failed
  8. Intern can fix JSON and re-import failed questions only
```

### Step 5: Diagram Pipeline

```
Actor: Admin (triggers after import is clean)

Actions:
  1. Click "Start Diagram Pipeline" on batch
  2. System finds all questions where diagram_required = true
  3. Creates diagram_jobs row for each
  4. Background worker processes each job:
     a. Reads diagram_description from question
     b. Calls image generation API (or sends to n8n for processing)
     c. Uploads image to Cloudflare R2
     d. Writes diagram_assets row with r2_key and public_url
     e. Updates question.content.diagram_url
     f. Updates question.status = 'diagram_done'
  5. Batch status: diagramming until all jobs done
  6. Admin can see live progress: X/Y diagrams complete
```

### Step 6: SME Review

```
Actor: Admin (sends to review) + SME (reviews)

Admin:
  1. Click "Send to SME Review" on batch
  2. Select SME user from dropdown
  3. Batch status → reviewing

SME:
  1. Sees batch in their queue
  2. Opens batch → sees paginated question list
  3. For each question:
     a. View rendered question (KaTeX + HTML rendered)
     b. Click Approve → sme_reviews row created (decision: approved)
     c. Click Reject → must add note → decision: rejected
     d. Click Request Revision → must add note → decision: revision_requested
  4. After all questions reviewed:
     - All approved → batch status → approved
     - Any rejected or revision_requested → stays at reviewing
     - Intern notified to fix → re-import rejected questions
```

### Step 7: Export

```
Actor: Admin

Actions:
  1. Click "Export" on approved batch
  2. Select format: JSON / PDF / Excel
  3. System queues export job
  4. Export Engine packages approved questions only
  5. File uploaded to Cloudflare R2
  6. exports row created with public_url
  7. Batch status → exported
  8. Admin downloads file
```

### Step 8: n8n Sync to Production DB

```
Actor: Admin

Actions:
  1. Click "Sync to Production" on exported batch
  2. Admin confirms (irreversible action — confirm modal)
  3. n8n webhook called with export JSON URL
  4. n8n downloads export → validates → writes to Production DB
  5. Sync status logged
```

---

## Flowchart (Text)

```
[Batch Created]
      │
      ▼
[Generate via n8n] ──► [LLM Returns JSON]
      │
      ▼
[Import JSON]
      │
      ▼
[Validation Engine]
      │
   ┌──┴──┐
   │ Fail │──► [Show Errors to Intern] ──► [Re-import]
   └──┬──┘
      │ Pass
      ▼
[Diagram Pipeline] (if any diagram_required = true)
      │
      ▼
[Send to SME Review]
      │
   ┌──┴────────┐
   │ Rejected  │──► [Intern Fixes] ──► [Re-import]
   └──┬────────┘
      │ All Approved
      ▼
[Export]
      │
      ▼
[n8n Sync to Production DB]
```
