# 16 — Frontend Pages

## Route Map

```
/login
/dashboard
/batches
/batches/new
/batches/:id
/batches/:id/prompt
/batches/:id/import
/batches/:id/questions
/batches/:id/diagrams
/batches/:id/export
/review
/review/:batchId
/prompts                    (Admin only)
/prompts/:id
/prompts/:id/versions/:versionId
/admin/users
/admin/master-data
/admin/field-registry
/admin/subject-profiles
/admin/schemas
```

---

## /login

**Access:** Public

**Components:**
- Logo
- Email + password inputs
- Login button (loading state)
- Error message display

**Actions:**
- POST /auth/login → store access token in memory → redirect to /dashboard

---

## /dashboard

**Access:** All roles

**Content (varies by role):**

*Admin / Super Admin:*
- Stats row: Total Batches | In Progress | SME Review Complete | Synced This Month
- Recent Batches table with status badges
- Quick Actions: New Batch | View All Batches | Prompt Library

*SME:*
- Review Queue: batches assigned and pending review
- My Stats: Approved | Rejected | Pending This Month

*Intern:*
- My Batches: active batches assigned to them
- Quick Action: New Batch

---

## /batches

**Access:** All roles (filtered by role server-side)

**Components:**
- Filter bar: Status | Subject | Date Range | Assigned To
- Batches table:
  - Columns: Name | Subject | Chapter | Type | Difficulty | Status | Assigned To | Updated At | Actions
  - Status badge (colour-coded)
- Pagination
- "New Batch" button (Admin + Intern)

---

## /batches/new

**Access:** Admin, Intern

**Multi-step form:**

**Step 1: Select Content**
```
Board ──► Class ──► Subject ──► Chapter (optional)
Question Type: [MCQ] [FIB] [TF] [MATCH] [SHORT] [LONG]
Difficulty: [Easy] [Medium] [Hard]
Question Count: [input, default 20]
```

**Step 2: Confirm Profile**
Displays active Subject Profile:
```
Prompt: Science MCQ v6
Schema: question-schema-v2
Provider: Manual Qwen
Max Concepts: 3
Features: Diagram ✔ | Concept ✔ | Passage ✖ | Solution Steps ✖
```
Warning shown if no active profile for selected subject.

**Step 3: Batch Details**
```
Batch Name: [text input]
Notes: [textarea, optional]
Assign To: [dropdown of interns — Admin only]
```

**Step 4: Confirm & Create**
→ POST /batches → redirect to /batches/:id

---

## /batches/:id

**Access:** Admin (all), Intern (own), SME (read, assigned)

**Sections:**

**Batch Header**
Name | Subject | Chapter | Type | Difficulty | Count | Status badge | Assigned to

**Pipeline Status Bar**
```
[Created] → [Generation Complete] → [Import Complete] → [Validation Complete]
         → [Diagram Complete] → [SME Review Complete] → [Export Complete] → [Synced]
```
Current stage highlighted. Completed stages checkmarked.

**Action Panel (context-sensitive by status)**

| Status | Intern sees | Admin sees |
|---|---|---|
| `created` | "View Prompt & Copy" | "View Prompt" |
| `generation_complete` | "Import Questions" | "Import Questions" |
| `import_complete` | Validation results | Validation results |
| `validation_complete` | "View Diagrams" (if applicable) | "View Diagrams" / "Send to SME Review" |
| `diagram_complete` | Progress bar | "Send to SME Review" |
| `sme_review_complete` | Read-only | "Export" |
| `export_complete` | Download links | Download links + "Sync to Production" |
| `synced` | Done banner | Done banner |

**Questions Summary Strip**
Total | Validated | Diagram Done | Approved | Rejected

---

## /batches/:id/prompt

**Access:** Intern (own batch), Admin (any)

**Components:**

Top section — Bloom Level selector (dropdown not in batch, selected here):
```
[Remember] [Understand] [Apply] [Analyze] [Evaluate] [Create]
```

Prompt box (read-only, interpolated):
```
┌──────────────────────────────────────────┐
│ You are an expert Science teacher...     │
│ Generate 20 MCQ questions on...          │
│ Difficulty: Easy | Bloom: Understand     │
│ Maximum 3 concepts per question...       │
└──────────────────────────────────────────┘
[Copy Prompt]
```

Concept List (shown only if concept_enabled = true):
```
UUID: SCI-1042-CH3A
Name: Combination Reaction
Note: Two or more substances combine to form...
────────────────────────────────
UUID: SCI-1042-CH3B
Name: Decomposition Reaction
Note: A single compound breaks into simpler...
────────────────────────────────
[Copy Concept List]
```

"Mark Generation Complete" button → POST /batches/:id/mark-generation-complete

---

## /batches/:id/import

**Access:** Admin, Intern

**Components:**
- Paste area (large textarea) OR file upload zone (.json, max 5MB)
- Mode toggle: Append / Replace (with clear warning on Replace)
- "Import & Validate" button → POST /batches/:id/questions/import
- Validation Results panel (appears after import):
  - Summary bar: X passed | Y failed | Z warnings
  - Table: all questions with status icon (✔ / ✖ / ⚠) and error list
  - "Download Failed Questions" button

---

## /batches/:id/questions

**Access:** All roles

**Components:**
- Filter bar: Status | Question Type | Difficulty | Bloom Level
- Questions table:
  - Columns: # | Preview (first 80 chars, rendered) | Type | Difficulty | Marks | Status | Actions
  - Actions: View (all), Edit (Admin+), Delete (Admin+)
- Pagination (20 per page)

**Question Detail Modal:**
- Full rendered question (KaTeX)
- Options, correct answer
- Explanation (collapsed, expandable)
- Diagram (if present)
- Concept UUIDs
- Injected metadata strip
- Review history (latest SME decision + note)

---

## /batches/:id/diagrams

**Access:** Admin, Intern

**Components:**
- Summary strip: Pending: X | Uploaded: Y | Failed: Z
- Progress bar
- Table: Q# | Question preview | Diagram Description | Status | Action
  - Status: Pending → shows "Upload" button
  - Status: Uploaded → shows "Replace" button + thumbnail
  - Status: Failed → shows error + "Retry" button
- Upload modal: file input + preview + confirm

---

## /batches/:id/export

**Access:** Admin, Super Admin

**Components:**
- "Generate Exports" button (triggers JSON + Excel + PDF together)
- Export history table: Format | Status | Created At | Download link
- "Sync to Production" button (appears after export_complete, confirms before triggering)

---

## /review

**Access:** SME only

**Content:**
- "My Review Queue" table: Batch Name | Subject | Total | Reviewed | Remaining | "Start Review"
- "Completed Reviews" section (past batches)

---

## /review/:batchId

**Access:** SME

**Components:**
- Progress bar: 14/20 reviewed
- Filter: All | Pending | Approved | Rejected
- Question card (full rendered view):
  - Diagram (if present)
  - Question text (KaTeX)
  - Options (MCQ) or relevant content
  - Explanation (collapsed, expandable)
  - Metadata strip: Type | Difficulty | Bloom | Marks | Concept
  - **[Approve]** and **[Reject]** buttons only
  - Rejection modal: required notes field
  - Previous review result badge (if re-reviewing after intern resubmit)
- Prev / Next navigation
- "Submit Review" button (shown when all questions reviewed):
  - Opens Batch Notes textarea (optional)
  - Confirm → POST /batches/:batchId/review/submit

---

## /prompts

**Access:** Admin, Super Admin only (Intern has no access to this nav)

**Components:**
- Prompts list: Name | Subject | Latest Version | Status | Actions
- "New Prompt" button (Admin+)
- Filter by subject

---

## /prompts/:id/versions/:versionId

**Access:** Admin (edit draft), Super Admin (publish/archive)

**Components:**
- Version selector dropdown
- Status badge (draft / published / archived)
- Publish / Archive buttons (Super Admin only)
- Content editor (editable for draft, read-only for published/archived)
- Variables list (auto-detected `{{variable}}` tokens shown as chips)
- Live preview: sample values → see interpolated output
- "Duplicate as New Version" button (Admin+)

---

## /admin/users

**Access:** Super Admin (all roles), Admin (interns only)

**Components:**
- Users table: Name | Email | Role | Status | Created At
- "Invite User" button → modal: name, email, role, temp password
- Edit role / deactivate

---

## /admin/master-data

**Access:** Super Admin

**Tabs:** Boards | Classes | Subjects | Chapters | Concepts | Question Types

Concepts tab includes `short_note` field in add/edit form.

---

## /admin/field-registry

**Access:** Super Admin

**Columns:** Field Name | Label | Mode | Data Type | Active | Actions

Mode values shown as badges: `required` (red) | `optional` (blue) | `disabled` (grey) | `auto` (purple)

---

## /admin/subject-profiles

**Access:** Super Admin

**Components:**
- Subject list showing current profile per subject
- "Configure Profile" per subject → opens profile editor:
  - Prompt Version selector (published only)
  - Schema Version selector
  - Max Concepts input (0 to 10)
  - Generation Provider text field
  - Feature flags toggles: Diagram | Concept | Passage | Solution Steps

---

## /admin/schemas

**Access:** Super Admin

**Components:**
- Schema list with version history
- "New Version" → JSON editor (Monaco/CodeMirror)
- View diff between versions
