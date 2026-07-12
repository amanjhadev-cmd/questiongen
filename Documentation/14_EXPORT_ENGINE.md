# 14 — Export Engine

## Overview

The Export Engine is triggered after `sme_review_complete`. It first runs the **Final JSON Builder** to reconstruct production-ready JSON from validated DB records, then packages three output formats automatically.

---

## Phase 11 — Final JSON Builder

The Final JSON Builder is the most important step. It does NOT use the imported JSON as the production output. It rebuilds every question from scratch from the database.

### Why Rebuild?

- The imported JSON might contain inconsistencies, extra whitespace, or slight formatting issues
- The database is the single source of truth
- `injected_metadata` was added after import — it must be merged properly
- `diagram_url` was added after import — it must come from `diagram_assets`, not from `questions.content`
- Question type comes from the batch, not from the import
- This guarantees output consistency regardless of what Qwen generated

### What Gets Read from DB

For each approved question:

```typescript
{
  // From questions.content (validated at import):
  question_text:       questions.content.question_text,
  explanation:         questions.content.explanation,
  options:             questions.content.options,           // MCQ
  correct_option:      questions.content.correct_option,   // MCQ
  blanks:              questions.content.blanks,            // FIB
  correct_answer:      questions.content.correct_answer,   // TF
  column_a:            questions.content.column_a,          // MATCH
  column_b:            questions.content.column_b,
  correct_matches:     questions.content.correct_matches,
  bloom_level:         questions.content.bloom_level,
  marks:               questions.content.marks,
  tags:                questions.content.tags,
  hint:                questions.content.hint,
  passage:             questions.content.passage,           // English
  solution_steps:      questions.content.solution_steps,   // Maths
  diagram_required:    questions.content.diagram_required,
  diagram_description: questions.content.diagram_description,
  concept_uuids:       questions.content.concept_uuids,
  language:            questions.content.language,
  is_ncert:            questions.content.is_ncert,
  ncert_page:          questions.content.ncert_page,
  year_asked:          questions.content.year_asked,

  // From diagram_assets (NOT from questions.content.diagram_url):
  diagram_url:         diagram_assets.public_url,          // active asset only
  diagram_alt_text:    generated from description,

  // From questions.injected_metadata (system-injected, never from import):
  board:               injected_metadata.board,
  class:               injected_metadata.class,
  subject:             injected_metadata.subject,
  chapter_uuid:        injected_metadata.chapter_uuid,
  batch_uuid:          injected_metadata.batch_uuid,
  prompt_version:      injected_metadata.prompt_version,
  schema_version:      injected_metadata.schema_version,
  created_by:          injected_metadata.created_by,
  created_at:          injected_metadata.created_at,

  // From batch:
  question_type:       question_types.code,
  difficulty:          batches.difficulty,
}
```

---

## Supported Output Formats (V1)

| Format | Order | Library | Use Case |
|---|---|---|---|
| JSON | 1st | Native Node.js | Developer/API consumption, n8n sync |
| Excel | 2nd | ExcelJS | Editorial review, offline reference |
| PDF | 3rd | Puppeteer | Print-ready question papers |

All three are generated automatically on a single "Export" action.

---

## JSON Export Structure

```json
{
  "export_metadata": {
    "batch_id": "...",
    "batch_name": "Science Chapter 3 - MCQ Set A",
    "subject": "Science",
    "class": "Class 10",
    "board": "CBSE",
    "chapter": "Chemical Reactions and Equations",
    "question_type": "MCQ",
    "difficulty": "easy",
    "exported_at": "2024-01-20T12:00:00Z",
    "exported_by": "admin@school.com",
    "schema_version": "v2",
    "prompt_version": "v6",
    "total_questions": 17
  },
  "questions": [
    {
      "board": "CBSE",
      "class": "Class 10",
      "subject": "Science",
      "chapter_uuid": "7c9e6679-...",
      "batch_uuid": "550e8400-...",
      "question_type": "MCQ",
      "difficulty": "easy",
      "bloom_level": "understand",
      "marks": 1,
      "question_text": "Which of the following is an example of a redox reaction?",
      "options": [
        { "key": "A", "text": "NaCl dissolving in water" },
        { "key": "B", "text": "Rusting of iron in the presence of oxygen and moisture" },
        { "key": "C", "text": "Melting of ice" },
        { "key": "D", "text": "Evaporation of water" }
      ],
      "correct_option": "B",
      "explanation": "Rusting involves iron (Fe) being oxidised...",
      "concept_uuids": ["SCI-1042-CH3A"],
      "diagram_url": "https://assets.example.com/diagrams/SCI10/.../v1.png",
      "diagram_alt_text": "Science – Chemical Reactions: A labelled diagram...",
      "tags": ["redox", "rusting"],
      "language": "en",
      "is_ncert": true,
      "ncert_page": 12,
      "prompt_version": "v6",
      "schema_version": "v2",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Excel Export

### Sheet Structure

**Sheet 1: Questions**

| # | Q Text | Type | Difficulty | Bloom | Marks | A | B | C | D | Answer | Explanation | Concept UUIDs | Tags | Diagram URL | NCERT Page |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

**Sheet 2: Metadata**

Batch details, export date, schema version, prompt version.

### Generation

```typescript
import ExcelJS from 'exceljs'

const wb = new ExcelJS.Workbook()
const ws = wb.addWorksheet('Questions')
ws.columns = [...columnDefs]
ws.getRow(1).font = { bold: true }
ws.getRow(1).fill = {
  type: 'pattern', pattern: 'solid',
  fgColor: { argb: 'FF1F3A5F' }
}
ws.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true }
questions.forEach((q, i) => ws.addRow(mapToRow(q, i + 1)))
```

---

## PDF Export

### Layout

```
Cover Page:
  Subject | Class | Board | Chapter | Question Type | Difficulty
  "Question Bank — Internal Use Only" | Export Date

Questions Section:
  [Q1] [MCQ] [Easy] [1 Mark] [Bloom: Understand]
  <rendered question text>
  [Diagram if present]
  A. option text
  B. option text
  C. option text
  D. option text

  ──────────────────────────
  Answer Key (last page):
  Q1: B   Q2: A   Q3: D ...

  ──────────────────────────
  Explanations (last section):
  Q1: ...
  Q2: ...
```

KaTeX CSS is inlined for math rendering. No external network requests during PDF generation.

---

## R2 Storage for Exports

```
exports/{batch_id}/{format}/{filename}
```

Examples:
```
exports/550e8400.../json/Science-Ch3-MCQ-Easy-2024-01-20.json
exports/550e8400.../excel/Science-Ch3-MCQ-Easy-2024-01-20.xlsx
exports/550e8400.../pdf/Science-Ch3-MCQ-Easy-2024-01-20.pdf
```

An `exports` DB row is created for each file with `public_url` and `status: 'done'`.

---

## Export Permissions

| Role | Trigger Export | Download |
|---|---|---|
| Super Admin | ✔ | ✔ |
| Admin | ✔ | ✔ |
| SME | ✖ | ✖ |
| Intern | ✖ | ✖ |

---

## Re-export

If more questions are approved after a partial export, admin can trigger a new export. A new `exports` row is created. Old exports are retained. The admin UI lists all exports for a batch with timestamps and download links.
