# 17 — Permission Matrix

## Legend
- ✔ = Full access
- R = Read-only
- O = Own records only
- ✖ = No access

---

## User Management

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| View all users | ✔ | ✔ | ✖ | ✖ |
| Create Super Admin | ✔ | ✖ | ✖ | ✖ |
| Create Admin | ✔ | ✖ | ✖ | ✖ |
| Create SME | ✔ | ✖ | ✖ | ✖ |
| Create Intern | ✔ | ✔ | ✖ | ✖ |
| Edit user role | ✔ | ✖ | ✖ | ✖ |
| Deactivate user | ✔ | Intern only | ✖ | ✖ |

---

## Master Data (Boards / Classes / Subjects / Chapters / Concepts)

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| View | ✔ | ✔ | ✔ | ✔ |
| Create / Edit / Delete | ✔ | ✖ | ✖ | ✖ |
| Edit concept short_note | ✔ | ✖ | ✖ | ✖ |

---

## Field Registry

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| View | ✔ | ✔ | ✖ | ✖ |
| Create / Edit / Delete | ✔ | ✖ | ✖ | ✖ |
| Toggle mode (required/optional/disabled/auto) | ✔ | ✖ | ✖ | ✖ |

---

## Subject Profiles

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| View | ✔ | ✔ | ✖ | ✖ |
| Create / Edit | ✔ | ✖ | ✖ | ✖ |

---

## Prompt Library

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| Browse Prompt Library | ✔ | ✔ | ✖ | ✖ |
| View prompt for assigned batch | ✔ | ✔ | R | R (own batch) |
| Create prompt | ✔ | ✔ | ✖ | ✖ |
| Edit draft version | ✔ | ✔ | ✖ | ✖ |
| Publish version | ✔ | ✖ | ✖ | ✖ |
| Archive version | ✔ | ✖ | ✖ | ✖ |
| Duplicate version | ✔ | ✔ | ✖ | ✖ |

---

## Schema Versions

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| View | ✔ | R | ✖ | ✖ |
| Create / Publish | ✔ | ✖ | ✖ | ✖ |

---

## Batches

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| View all batches | ✔ | ✔ | Assigned only | Own only |
| Create batch | ✔ | ✔ | ✖ | ✔ |
| Edit batch metadata | ✔ | ✔ | ✖ | Own only |
| Assign batch to intern | ✔ | ✔ | ✖ | ✖ |
| Mark generation complete | ✔ | ✔ | ✖ | ✔ (own) |
| Send batch to SME review | ✔ | ✔ | ✖ | ✖ |
| Delete batch | ✔ | ✖ | ✖ | ✖ |

---

## Questions

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| View questions | ✔ | ✔ | Assigned batches | Own batches |
| Import questions | ✔ | ✔ | ✖ | ✔ (own batch) |
| Edit question content | ✔ | ✔ | ✖ | ✖ |
| Delete question | ✔ | ✔ | ✖ | ✖ |
| View question history | ✔ | ✔ | ✔ | ✖ |

---

## SME Review

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| View review status | ✔ | ✔ | Own reviews | ✖ |
| Approve question | ✔ | ✔ | ✔ | ✖ |
| Reject question | ✔ | ✔ | ✔ | ✖ |
| Add batch notes | ✔ | ✔ | ✔ | ✖ |
| View batch notes | ✔ | ✔ | ✔ | ✖ |
| View all review history | ✔ | ✔ | Own reviews | ✖ |

---

## Diagram Pipeline

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| View diagram status | ✔ | ✔ | ✖ | ✔ (own batch) |
| Upload diagram image | ✔ | ✔ | ✖ | ✔ (own batch) |
| Replace diagram image | ✔ | ✔ | ✖ | ✔ (own batch) |
| Retry failed job | ✔ | ✔ | ✖ | ✔ (own batch) |

---

## Export

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| Trigger export | ✔ | ✔ | ✖ | ✖ |
| Download export | ✔ | ✔ | ✖ | ✖ |
| View export history | ✔ | ✔ | ✖ | ✖ |

---

## Production Sync

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| Trigger n8n sync to Production | ✔ | ✔ | ✖ | ✖ |

---

## Settings / Admin Panels

| Module | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| User Settings | ✔ | ✔ | R | R |
| System Config | ✔ | ✖ | ✖ | ✖ |
| Audit Logs | ✔ | ✔ | ✖ | ✖ |
