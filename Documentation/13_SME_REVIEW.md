# 13 — SME Review

## Overview

The SME (Subject Matter Expert) Review module is the quality gate before any question can be exported or synced to the Production DB. Only approved questions are included in exports.

## Review States Per Question

```
under_review → approved
under_review → rejected
under_review → revision_requested
```

A rejected or revision_requested question goes back to the Intern for correction and re-import.

---

## SME Workflow

### 1. Batch Assigned to SME

Admin clicks "Send to SME Review" → selects SME → batch status = `reviewing`.

SME sees the batch in their **Review Queue** on their dashboard.

### 2. SME Opens Batch

- Sees paginated list of questions (20 per page)
- Filter bar: All | Pending | Approved | Rejected | Revision Requested
- Progress bar: `14/20 reviewed`
- Each question shows:
  - Rendered question (KaTeX + diagram if present)
  - Rendered options (for MCQ)
  - Rendered explanation (collapsed, expandable)
  - Difficulty | Bloom Level | Marks | Concept UUID
  - Current review status badge

### 3. SME Reviews a Question

For each question, the SME sees three action buttons:

**Approve**
```
Click → sme_reviews row created:
  { question_id, reviewed_by, decision: 'approved', notes: null }
question.status = 'approved'
```

**Reject**
```
Click → modal opens (notes field is REQUIRED)
Submit → sme_reviews row created:
  { question_id, reviewed_by, decision: 'rejected', notes: "..." }
question.status = 'rejected'
```

**Request Revision**
```
Click → modal opens (notes field is REQUIRED)
Submit → sme_reviews row created:
  { question_id, reviewed_by, decision: 'revision_requested', notes: "..." }
question.status = 'rejected'   ← same as rejected for pipeline purposes
```

The difference between `rejected` and `revision_requested`:
- `rejected` → content is wrong/inappropriate; discard this question
- `revision_requested` → minor fix needed; Intern should correct and resubmit

### 4. Batch Completion Check

After every review action, system checks:
- If ALL questions = `approved` → batch.status = `approved`
- If any questions = `rejected` or `revision_requested` → batch stays at `reviewing`

Admin is notified when batch.status changes to `approved`.

---

## Revision Loop

```
SME requests revision
        ↓
Intern sees rejected questions in batch
        ↓
Intern edits JSON locally
        ↓
Intern re-imports ONLY the rejected questions (replace mode)
        ↓
Validation runs again
        ↓
Questions go back to status: under_review
        ↓
SME re-reviews those questions only
```

---

## Batch-Level Notes

SME can add a note at the batch level (not per-question):
- Stored in `batches.notes` (appended, not replaced)
- Visible to Admin and Super Admin
- Not visible to Intern

---

## Review History

Every review action creates a row in `sme_reviews`. A question can have multiple review rows if it goes through multiple revision cycles. The history is visible to:
- SME (their own reviews)
- Admin (all reviews for batches they manage)
- Super Admin (all reviews)

History view shows:
```
[Revision 1] Rejected by Dr. Sharma — "Explanation is incorrect. The answer should be B not C."
[Revision 2] Approved by Dr. Sharma — ""
```

---

## SME Dashboard

| Section | Content |
|---|---|
| Review Queue | Batches in `reviewing` status assigned to this SME |
| Completed | Batches this SME has fully reviewed (all questions) |
| My Stats | Approved: 142 | Rejected: 18 | Pending: 7 (this month) |

---

## Permissions Reminder

- SME cannot edit question content — read + review only
- SME cannot see other SMEs' review notes on the same question
- SME cannot trigger export
- SME can view the prompt used for a batch (read-only) but cannot edit prompts
