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
- Create and manage boards, classes, subjects, chapters, concepts
- Trigger exports and n8n syncs
- Access all batches and questions across all subjects
- View audit logs

**Restrictions:**
- None — full access to everything

---

## Admin

**Who:** Content lead, curriculum manager.

**Responsibilities:**
- Create and assign batches to interns
- View and manage prompts (cannot publish/archive — Super Admin only)
- Trigger import and validation
- Trigger diagram pipeline
- View SME review results
- Trigger exports
- Trigger n8n sync
- Manage intern accounts

**Restrictions:**
- Cannot create/edit Field Registry
- Cannot create/edit Subject Profiles
- Cannot create/edit Schema versions
- Cannot create/edit boards, classes, subjects, chapters (read-only)
- Cannot manage SME accounts (Super Admin only)

---

## SME (Subject Matter Expert)

**Who:** Teacher, academic reviewer, domain expert.

**Responsibilities:**
- Review assigned questions in batches
- Approve / Reject / Request Revision per question
- Add batch-level notes
- View question history and previous versions

**Restrictions:**
- Cannot create batches
- Cannot import questions
- Cannot trigger diagram pipeline
- Cannot export
- Cannot access Prompt Library (read-only view of prompt used for a batch)
- Cannot manage any users
- Can only see batches assigned to them or in `reviewing` status

---

## Intern

**Who:** Content writer, question generator.

**Responsibilities:**
- Create batches (subject and chapter selected from dropdown)
- Generate questions via n8n integration
- Import raw JSON into platform
- View validation results
- Monitor diagram pipeline status
- Resubmit rejected questions for review

**Restrictions:**
- Cannot access Prompt Library (no view)
- Cannot create/edit any master data
- Cannot trigger exports
- Cannot trigger n8n sync
- Cannot approve/reject questions (SME role only)
- Can only see their own batches

---

## Role Comparison Summary

| Action | Super Admin | Admin | SME | Intern |
|---|---|---|---|---|
| Create users | ✔ | Intern only | ✖ | ✖ |
| Manage Field Registry | ✔ | ✖ | ✖ | ✖ |
| Manage Subject Profiles | ✔ | ✖ | ✖ | ✖ |
| Manage Prompt Library | ✔ | View + Edit draft | Read | ✖ |
| Publish/archive prompts | ✔ | ✖ | ✖ | ✖ |
| Manage schemas | ✔ | ✖ | ✖ | ✖ |
| Create boards/classes/subjects | ✔ | ✖ | ✖ | ✖ |
| Create batches | ✔ | ✔ | ✖ | ✔ |
| Import questions | ✔ | ✔ | ✖ | ✔ |
| Trigger diagram pipeline | ✔ | ✔ | ✖ | ✖ |
| Review questions | ✔ | ✔ | ✔ | ✖ |
| Export | ✔ | ✔ | ✖ | ✖ |
| n8n sync | ✔ | ✔ | ✖ | ✖ |
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
