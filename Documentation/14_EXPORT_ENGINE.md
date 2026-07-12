# 14 — Export Engine

## Overview

The Export Engine packages all `approved` questions from a batch into a downloadable file. Files are stored on Cloudflare R2 and made available via a signed or public URL.

## Supported Formats (V1)

| Format | Library | Use Case |
|---|---|---|
| JSON | Native Node.js | Developer/API consumption, n8n sync |
| PDF | Puppeteer | Print-ready question papers |
| Excel | ExcelJS | Editorial review, offline editing |

CSV is a V2 feature. See `20_FUTURE_SCOPE.md`.

---

## JSON Export

### Structure

```json
{
  "export_metadata": {
    "batch_id": "...",
    "batch_name": "Science Chapter 3 - MCQ Set A",
    "subject": "Science",
    "class": "Class 10",
    "board": "CBSE",
    "chapter": "Chemical Reactions and Equations",
    "exported_at": "2024-01-20T12:00:00Z",
    "exported_by": "admin@school.com",
    "schema_version": "v2",
    "prompt_version": "v3",
    "total_questions": 17
  },
  "questions": [
    {
      "id": "...",
      "concept_uuid": "SCI-1042-CH3A",
      "question_type": "MCQ",
      "question_text": "...",
      "options": [...],
      "correct_option": "B",
      "explanation": "...",
      "difficulty": "medium",
      "bloom_level": "understand",
      "marks": 1,
      "diagram_url": "https://cdn.example.com/diagrams/SCI10/.../v1.png",
      "diagram_alt_text": "...",
      "tags": ["redox", "oxidation"],
      "language": "en",
      "is_ncert": true,
      "ncert_page": 12
    }
  ]
}
```

### JSON Export Rules

- Only questions with `status = 'approved'` are included
- System-internal fields excluded: `batch_id`, `import_errors`, `version`
- `diagram_url` included only if `diagram_required = true` and diagram is done
- File named: `{batch_name}-{date}.json` (spaces replaced with hyphens)

---

## PDF Export

### Layout

```
Page 1: Cover Page
  - School/Platform logo
  - Subject, Class, Board, Chapter
  - Date
  - "Question Bank — Internal Use Only"

Page 2+: Questions
  Each question:
  [Q1] [MCQ] [Medium] [1 Mark]
  <rendered question text>
  A. <option A>
  B. <option B>
  C. <option C>
  D. <option D>

  ────────────────────────────
  [Answer Key section at end]
  ────────────────────────────
  Q1: B   Q2: A   Q3: D ...

  [Explanation section at end]
  Q1 Explanation: ...
```

### PDF Generation

```typescript
import puppeteer from 'puppeteer'

async function generatePDF(questions: Question[]): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  
  const html = buildQuestionPaperHTML(questions)  // includes KaTeX CSS inline
  await page.setContent(html, { waitUntil: 'networkidle0' })
  
  const pdf = await page.pdf({
    format: 'A4',
    margin: { top: '1cm', bottom: '1cm', left: '1.5cm', right: '1.5cm' },
    printBackground: true,
  })
  
  await browser.close()
  return pdf
}
```

KaTeX CSS is inlined so the PDF renders math without any external requests.

---

## Excel Export

### Columns

| Column | Field | Notes |
|---|---|---|
| # | Row number | Auto-generated |
| Question | `question_text` | Plain text (no LaTeX) |
| Type | `question_type` | |
| Option A | `options[0].text` | MCQ only |
| Option B | `options[1].text` | MCQ only |
| Option C | `options[2].text` | MCQ only |
| Option D | `options[3].text` | MCQ only |
| Answer | `correct_option` | |
| Explanation | `explanation` | Plain text |
| Difficulty | `difficulty` | |
| Bloom Level | `bloom_level` | |
| Marks | `marks` | |
| Concept UUID | `concept_uuid` | |
| Tags | `tags.join(', ')` | |
| NCERT Page | `ncert_page` | |
| Diagram URL | `diagram_url` | |

### Excel Generation

```typescript
import ExcelJS from 'exceljs'

async function generateExcel(questions: Question[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Questions')
  
  ws.columns = [...columnDefinitions]
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3A5F' } }
  ws.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true }
  
  questions.forEach((q, i) => ws.addRow(mapQuestionToRow(q, i + 1)))
  
  return wb.xlsx.writeBuffer() as Promise<Buffer>
}
```

---

## Upload to R2

After generation, files are uploaded to:

```
exports/{batch_id}/{format}/{filename}
```

Examples:
```
exports/550e8400.../json/Science-Ch3-MCQ-2024-01-20.json
exports/550e8400.../pdf/Science-Ch3-MCQ-2024-01-20.pdf
exports/550e8400.../excel/Science-Ch3-MCQ-2024-01-20.xlsx
```

The `exports` table row is created with the `public_url` and `status: 'done'`.

---

## Export Permissions

| Role | Can Trigger Export | Can Download |
|---|---|---|
| Super Admin | ✔ | ✔ |
| Admin | ✔ | ✔ |
| SME | ✖ | ✖ |
| Intern | ✖ | ✖ |

---

## Re-export

If a batch is re-exported (e.g. after additional questions are approved), a new `exports` row is created. Old exports are retained. The UI shows a list of all exports for a batch with timestamps.
