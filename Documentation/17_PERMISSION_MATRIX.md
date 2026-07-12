# 17 — Permission Matrix

## Legend
- ✔ = Full access
- R = Read-only
- O = Own records only
- D = Draft only
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
| Create | ✔ | ✖ | ✖ | ✖ |
| Edit | ✔ | ✖ | ✖ | ✖ |
| Delete | ✔ | ✖ | ✖ | ✖ |

---

## Field Registry

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| View | ✔ | ✔ | ✖ | ✖ |
| Create / Edit / Delete | ✔ | ✖ | ✖ | ✖ |
| Toggle active | ✔ | ✖ | ✖ | ✖ |

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
| View all prompts | ✔ | ✔ | R | ✖ |
| View prompt content | ✔ | ✔ | R | ✖ |
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
| Send batch to SME review | ✔ | ✔ | ✖ | ✖ |
| Delete batch | ✔ | ✖ | ✖ | ✖ |

---

## Questions

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| View questions | ✔ | ✔ | Assigned batches | Own batches |
| Import questions | ✔ | ✔ | ✖ | ✔ (own batch) |
| Edit question | ✔ | ✔ | ✖ | ✖ |
| Delete question | ✔ | ✔ | ✖ | ✖ |
| View question history | ✔ | ✔ | ✔ | ✖ |

---

## SME Review

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| View review status | ✔ | ✔ | Own reviews | ✖ |
| Approve question | ✔ | ✔ | ✔ | ✖ |
| Reject question | ✔ | ✔ | ✔ | ✖ |
| Request revision | ✔ | ✔ | ✔ | ✖ |
| View all review history | ✔ | ✔ | Own reviews | ✖ |

---

## Diagram Pipeline

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| Start diagram pipeline | ✔ | ✔ | ✖ | ✖ |
| View diagram status | ✔ | ✔ | ✖ | ✔ (own batch) |
| Retry failed diagram | ✔ | ✔ | ✖ | ✖ |
| Manual diagram upload | ✔ | ✔ | ✖ | ✖ |

---

## Export

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| Trigger export | ✔ | ✔ | ✖ | ✖ |
| Download export | ✔ | ✔ | ✖ | ✖ |
| View export history | ✔ | ✔ | ✖ | ✖ |

---

## n8n Sync

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| Trigger sync to Production | ✔ | ✔ | ✖ | ✖ |

---

## Settings / Admin

| Module | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| User Settings | ✔ | ✔ | R | R |
| System Config | ✔ | ✖ | ✖ | ✖ |
| Audit Logs | ✔ | ✔ | ✖ | ✖ |
