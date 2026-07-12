# 08 — User Roles

## Roles

```
super_admin
admin
sme
intern
```

No other roles exist in V1.

---

## Super Admin

**Who:** Platform owner, CTO, senior technical lead.

**Responsibilities:**
- Create and manage all users (including other admins)
- Configure Field Registry
- Configure Subject Profiles
- Manage Prompt Library (all CRUD + publish/archive)
- Manage Schema versions
- Create and manage boards, classes, subjects, chapters, concepts (including short_note)
- Create and assign batches
- Trigger exports and n8n production sync
- Access all batches and questions across all subjects
- View audit logs

**Restrictions:**
- None — full access to everything

---

## Admin

**Who:** Content lead, curriculum manager.

**Responsibilities:**
- Create and assign batches to interns
- View and edit draft prompts (cannot publish/archive — Super Admin only)
- Trigger export and n8n production sync
- Move batches through status pipeline (send to SME, trigger export, trigger sync)
- Manage intern accounts

**Restrictions:**
- Cannot create/edit Field Registry
- Cannot create/edit Subject Profiles
- Cannot publish/archive prompt versions
- Cannot create/edit Schema versions
- Cannot create/edit boards, classes, subjects, chapters (read-only)
- Cannot manage SME accounts (Super Admin only)

---

## SME (Subject Matter Expert)

**Who:** Teacher, academic reviewer, domain expert.

**Responsibilities:**
- Review assigned batches — see fully rendered questions
- **Approve** or **Reject** each question (two options only — no revision request)
- Add batch-level notes at end of review session
- View question history and previous versions

**Restrictions:**
- Cannot create batches
- Cannot import questions
- Cannot trigger diagram pipeline
- Cannot export
- Cannot access Prompt Library (can view prompt used for a specific batch if shown by Admin)
- Cannot manage any users
- Can only see batches assigned to them or in `sme_review_complete` status
- No per-question note-taking during review — only batch-level notes at end

---

## Intern

**Who:** Content writer, question generator.

**Responsibilities:**
- Create batches (selects board, class, subject, chapter, question type, difficulty, question count)
- View the approved prompt + concept list for their batch
- Copy prompt (+ concept list) and generate questions in Qwen Chat (external)
- Import raw JSON into platform
- View validation results and fix failed questions
- Upload diagram images for questions requiring diagrams
- Monitor batch status progress

**Restrictions:**
- Cannot edit Prompt Library (no access to Prompt Library nav)
- Cannot create/edit any master data (boards, classes, subjects, chapters, concepts, field registry, subject profiles, schemas)
- Cannot trigger exports
- Cannot trigger n8n production sync
- Cannot approve/reject questions (SME role only)
- Can only see their own batches

---

## Role Comparison Summary

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| Create users | ✔ | Intern only | ✖ | ✖ |
| Manage Field Registry | ✔ | ✖ | ✖ | ✖ |
| Manage Subject Profiles | ✔ | ✖ | ✖ | ✖ |
| Manage Prompt Library | ✔ | Edit draft | ✖ | ✖ |
| Publish/archive prompts | ✔ | ✖ | ✖ | ✖ |
| View prompt for own batch | ✔ | ✔ | Read (assigned batch) | ✔ (own batch) |
| Manage schemas | ✔ | ✖ | ✖ | ✖ |
| Create master data | ✔ | ✖ | ✖ | ✖ |
| Create batches | ✔ | ✔ | ✖ | ✔ |
| Import questions | ✔ | ✔ | ✖ | ✔ |
| Upload diagram images | ✔ | ✔ | ✖ | ✔ |
| Approve/Reject questions | ✔ | ✔ | ✔ | ✖ |
| Export | ✔ | ✔ | ✖ | ✖ |
| n8n production sync | ✔ | ✔ | ✖ | ✖ |
| View audit logs | ✔ | ✔ | ✖ | ✖ |

---

## Auth Flow

```
Login (email + password)
        ↓
bcrypt verify
        ↓
Issue JWT: { user_id, role, email, iat, exp }
Access token: 15 minutes
Refresh token: 7 days (stored in httpOnly cookie)
        ↓
Frontend stores access token in memory (not localStorage)
        ↓
API reads role from JWT → enforces permissions per route
```

## Permission Enforcement

- Route-level middleware checks role
- Service-level checks for row-level rules (e.g., intern can only see own batches)
- Frontend hides UI elements based on role, but backend is the authority
