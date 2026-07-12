# 13 — SME Review

## Overview

SME Review is the quality gate before any question can be exported or synced to the Production DB. Only approved questions are included in exports. The SME has exactly two actions per question: **Approve** or **Reject**.

## Review States Per Question

```
under_review → approved
under_review → rejected
```

Rejected questions go back to interns for regeneration or correction and re-import.

There is no "revision requested" state — a question is either good enough (approved) or it is not (rejected). The notes field on rejection explains what the intern must fix.

---

## SME Workflow

### 1. Batch Assigned to SME

Admin clicks "Send to SME Review" → selects SME from dropdown.
- All validated questions in batch set to status `under_review`
- Batch status stays at `diagram_complete` during the review period

SME sees the batch in their **Review Queue** on the dashboard.

### 2. SME Opens Batch

- Paginated list of questions (20 per page)
- Filter bar: All | Pending | Approved | Rejected
- Progress bar: `14/20 reviewed`
- Each question shows rendered view (KaTeX + diagram if present)

### 3. SME Reviews Each Question

**[Approve]**
```
Click → sme_reviews row created:
  { question_id, reviewed_by, decision: 'approved', notes: null }
  question.status = 'approved'
```

**[Reject]**
```
Click → Modal opens
  Notes field: REQUIRED (cannot submit without explanation)
  Intern will see this note to understand what to fix.
Submit → sme_reviews row created:
  { question_id, reviewed_by, decision: 'rejected', notes: "the reason..." }
  question.status = 'rejected'
```

### 4. Batch Notes (End of Session)

After reviewing all questions, the SME adds optional batch-level notes:

```
Example Batch Notes:
"Question 5: Improve distractors — options B and C are too similar.
 Question 8: Diagram is unclear, needs to show labels more prominently.
 Question 12: Minor grammar issue in explanation."
```

These notes are appended to `batches.notes`. They are:
- Visible to Admin and Super Admin
- NOT visible to Intern (intern only sees their rejected question's per-question note)

SME clicks **"Submit Review"** when done.

### 5. Batch Completion Check

System checks after every review action:
- ALL questions `approved` → `batch.status = 'sme_review_complete'`
- Any questions `rejected` → batch stays at `diagram_complete`; Admin is notified

---

## Rejection Loop

```
SME rejects question(s)
        ↓
Intern sees rejected questions listed in batch
        ↓
Intern reads rejection note from SME
        ↓
Intern either:
  a. Fixes the question locally and re-imports (for editable content issues)
  b. Generates a replacement question via Qwen and re-imports
        ↓
Platform re-validates + re-injects metadata
        ↓
Question status → 'under_review' again
        ↓
SME re-reviews only the resubmitted questions
```

---

## SME Dashboard

| Section | Content |
|---|---|
| Review Queue | Batches at `diagram_complete` status assigned to this SME |
| Completed | Batches this SME has fully reviewed (all approved) |
| My Stats | Approved: 142 | Rejected: 18 | Pending Review: 7 (this month) |

---

## What SME Sees Per Question

The Rendering Engine is used — SME never sees raw JSON.

```
[Q5]  MCQ · Medium · 1 Mark
─────────────────────────────────────────────
Which of the following is an example of a redox reaction?

[Diagram here if present]

A. NaCl dissolving in water
B. Rusting of iron in the presence of oxygen and moisture
C. Melting of ice
D. Evaporation of water

[Explanation ▼ expand]
Rusting involves iron (Fe) being oxidised to Fe₂O₃...

Concept: SCI-1042-CH3A | Bloom: Understand | NCERT p.12

[ Approve ]   [ Reject ]
```

---

## SME Restrictions Reminder

- Cannot edit question content
- Cannot see other SMEs' reviews on the same question
- Cannot trigger exports
- Cannot browse Prompt Library
- Cannot manage users
- Batch notes are added once at end — not inline per question
