# 16 — Frontend Pages

## Route Map

```
/login
/dashboard
/batches
/batches/new
/batches/:id
/batches/:id/import
/batches/:id/questions
/batches/:id/diagrams
/batches/:id/export
/review
/review/:batchId
/prompts
/prompts/:id
/prompts/:id/versions/:versionId
/admin/users
/admin/master-data
/admin/field-registry
/admin/subject-profiles
/admin/schemas
/settings
```

---

## /login

**Access:** Public (redirects to /dashboard if already logged in)

**Components:**
- Logo
- Email + password inputs
- Login button (loading state)
- Error message display

**Actions:**
- POST /auth/login → store access token → redirect to /dashboard

---

## /dashboard

**Access:** All roles

**Layout:** Sidebar navigation + top bar (user avatar, name, role badge)

**Content (varies by role):**

*Admin / Super Admin:*
- Stats row: Total Batches | Batches In Review | Batches Approved | Exports This Month
- Recent Batches table (last 10, with status badges)
- Quick Actions: New Batch | View All Batches | Prompt Library

*SME:*
- Review Queue: batches pending SME review
- My Stats: Approved | Rejected | Pending This Month

*Intern:*
- My Batches: active batches assigned to them
- Quick Actions: New Batch

---

## /batches

**Access:** All roles (filtered by role server-side)

**Components:**
- Filter bar: Status | Subject | Date Range | Assigned To
- Batches table:
  - Columns: Name | Subject | Chapter | Status | Created By | Assigned To | Updated At | Actions
  - Status badge (colour-coded)
  - Actions: View | Export (Admin+)
- Pagination
- "New Batch" button (Admin + Intern)

---

## /batches/new

**Access:** Admin, Intern

**Steps (multi-step form):**

Step 1: Select Subject
- Board → Class → Subject cascading dropdowns
- Chapter (optional dropdown)

Step 2: Confirm Profile
- Displays active Subject Profile details:
  - Prompt Version
  - Schema Version
  - Generation Provider
- Warning if no profile configured

Step 3: Batch Details
- Batch Name (text input)
- Notes (textarea, optional)
- Assign To (dropdown of interns — Admin only)

Step 4: Confirm & Create
- Summary
- Create button → POST /batches → redirect to /batches/:id

---

## /batches/:id

**Access:** Admin (all), Intern (own), SME (read-only for assigned)

**Sections:**
- Batch Header: Name | Subject | Chapter | Status badge | Created by | Assigned to
- Progress Timeline: Created → Generating → Importing → Validating → Diagramming → Reviewing → Approved → Exported
- Action Panel (context-sensitive):
  - `created`: "Generate Questions" button (links to n8n trigger)
  - `generating`: Spinner + "Waiting for AI..."
  - `importing`: "Import Questions" button
  - `validating`: Spinner
  - `diagramming`: Diagram progress bar
  - `reviewing`: "View SME Progress" | (SME: "Review Questions")
  - `approved`: "Export" button
  - `exported`: "Download Exports" | "Sync to Production"
- Questions summary: X imported | Y approved | Z rejected
- Notes section

---

## /batches/:id/import

**Access:** Admin, Intern

**Components:**
- Paste area (large textarea) OR file upload zone (.json, max 5MB)
- Mode toggle: Append / Replace
- Import button → POST /batches/:id/questions/import
- Validation Results panel (appears after import):
  - Summary bar: X passed | Y failed | Z warnings
  - Table: all questions with status + error details
  - "Download Failed Questions" button

---

## /batches/:id/questions

**Access:** All roles (role-appropriate actions)

**Components:**
- Filter bar: Status | Question Type | Difficulty | Bloom Level
- Questions table:
  - Columns: # | Preview | Type | Difficulty | Marks | Status | Actions
  - Preview: first 80 chars of question_text (rendered)
  - Actions: View | Edit (Admin+) | Delete (Admin+)
- Pagination (20 per page)

Question Detail Modal:
- Full rendered question (KaTeX)
- Options
- Correct Answer
- Explanation
- Diagram (if present)
- Metadata
- Review History

---

## /batches/:id/diagrams

**Access:** Admin

**Components:**
- Summary: Total | Pending | Processing | Done | Failed
- Progress bar
- "Start Pipeline" button (if not started)
- Jobs table: Question # | Description preview | Status | Created | Updated | Actions
- Failed jobs: Error message + "Retry" button
- Manual upload button per question

---

## /batches/:id/export

**Access:** Admin, Super Admin

**Components:**
- Export format buttons: JSON | PDF | Excel
- Past Exports table: Format | Created At | Status | Download link

---

## /review

**Access:** SME only

**Content:**
- "My Review Queue" — batches in `reviewing` status assigned to this SME
- Each row: Batch name | Subject | Total questions | Reviewed | Remaining | "Start Review" button

---

## /review/:batchId

**Access:** SME

**Components:**
- Progress bar: 14/20 reviewed
- Filter: All | Pending | Approved | Rejected
- Question card (one per screen on mobile, list on desktop):
  - Fully rendered question
  - 3 action buttons: Approve | Reject | Request Revision
  - Reject / Revision modal with required notes field
  - Previous review history (if any)
- Navigation: Prev / Next question
- Batch notes input (saved on blur)

---

## /prompts

**Access:** Admin (read + write), SME (read), Super Admin (full)

**Components:**
- Prompts list: Name | Subject | Versions | Status | Actions
- "New Prompt" button (Admin+)
- Version count badge

---

## /prompts/:id/versions/:versionId

**Access:** Admin (edit draft), Super Admin (publish/archive)

**Components:**
- Version selector (dropdown)
- Version status badge + Publish / Archive buttons (Super Admin)
- Prompt content editor (CodeMirror or textarea for draft, read-only for published)
- Variables list (auto-detected `{{variable}}` highlights)
- Preview: fill in sample values → see interpolated prompt
- "Duplicate as new version" button

---

## /admin/users

**Access:** Super Admin (all), Admin (intern management)

**Components:**
- Users table: Name | Email | Role | Status | Created At | Actions
- "Invite User" button → modal: name, email, role, temporary password
- Edit role / deactivate per user

---

## /admin/master-data

**Access:** Super Admin

**Components:**
- Tabs: Boards | Classes | Subjects | Chapters | Concepts | Question Types
- Each tab: table with add/edit/delete

---

## /admin/field-registry

**Access:** Super Admin

**Components:**
- Fields table with all registry entries
- "Add Field" button
- Edit: inline or modal
- Sort order drag-and-drop
- Active/inactive toggle

---

## /admin/subject-profiles

**Access:** Super Admin

**Components:**
- Subject list (one profile per subject)
- "Configure Profile" per subject
- Profile modal: select prompt version, schema version, set provider + max_concepts

---

## /admin/schemas

**Access:** Super Admin

**Components:**
- Schema list with version history
- "New Version" button → JSON editor (Monaco/CodeMirror)
- View diff between versions
