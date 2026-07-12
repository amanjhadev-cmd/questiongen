# 15 — API Specification

Base URL: `/api/v1`

Auth: `Authorization: Bearer <access_token>` on all protected routes.

---

## Auth

### POST /auth/login
```
Body: { email: string, password: string }
Response 200: { data: { accessToken: string, user: { id, name, email, role } } }
Response 401: { error: "Invalid credentials", code: "UNAUTHORIZED" }
Sets httpOnly cookie: refreshToken
```

### POST /auth/refresh
```
Cookie: refreshToken (httpOnly)
Response 200: { data: { accessToken: string } }
Response 401: { error: "Invalid or expired refresh token" }
```

### POST /auth/logout
```
Response 200: { data: {} }
Clears refresh token cookie
```

---

## Users (Super Admin / Admin)

### GET /users
```
Query: ?role=&page=1&limit=20
Response 200: { data: [...users], meta: { total, page, limit, totalPages } }
```

### POST /users
```
Body: { name, email, password, role }
Response 201: { data: user }
```

### PUT /users/:id
```
Body: { name?, role?, isActive? }
Response 200: { data: user }
```

### DELETE /users/:id
```
Response 200: { data: {} }
Soft delete: sets is_active = false
```

---

## Master Data

### GET /boards
### GET /boards/:boardId/classes
### GET /classes/:classId/subjects
### GET /subjects/:subjectId/chapters
### GET /chapters/:chapterId/concepts
```
Response 200: { data: [...] }
```
Concepts include `short_note` field.

### POST /boards (Super Admin only)
```
Body: { name }
```

### POST /classes (Super Admin only)
```
Body: { boardId, name }
```

### POST /subjects (Super Admin only)
```
Body: { classId, name, code }
```

### POST /chapters (Super Admin only)
```
Body: { subjectId, name, chapterNo }
```

### POST /concepts (Super Admin only)
```
Body: { chapterId, name, uuid, short_note? }
```

### PUT /concepts/:id (Super Admin only)
```
Body: { name?, short_note? }
```

---

## Subject Profiles (Super Admin only)

### GET /subject-profiles
```
Query: ?subject_id=
Response 200: { data: [...profiles] }
```

### GET /subject-profiles/:id

### POST /subject-profiles
```
Body: {
  subject_id,
  prompt_version_id,
  schema_version_id,
  max_concepts,           // 0 = concept mapping disabled
  generation_provider,    // 'manual_qwen' etc.
  diagram_enabled,
  passage_enabled,
  concept_enabled,
  solution_steps_enabled
}
Response 201: { data: profile }
```

### PUT /subject-profiles/:id

---

## Prompt Library

### GET /prompts
```
Query: ?subject_id=&status=published&page=1
Response 200: { data: [...prompts] }
```

### GET /prompts/:id
### GET /prompts/:id/versions
### GET /prompts/:id/versions/:versionId

### POST /prompts (Admin+)
```
Body: { name, subject_id?, description? }
Response 201: { data: prompt }
```

### POST /prompts/:id/versions (Admin+)
```
Body: { content, variables?, notes? }
Response 201: { data: version }
```

### PUT /prompts/:id/versions/:versionId/publish (Super Admin only)
### PUT /prompts/:id/versions/:versionId/archive (Super Admin only)

### GET /batches/:batchId/prompt-preview
```
Returns interpolated prompt text + concept list (if concept_enabled) for intern view.
Query: ?bloom_level=understand
Response 200: {
  data: {
    prompt_text: string,           // variables already interpolated
    concepts: [{ uuid, name, short_note }]  // empty array if concept_enabled = false
  }
}
```

---

## Schemas (Super Admin only)

### GET /schemas
### GET /schemas/:id/versions
### POST /schemas
### POST /schemas/:id/versions
```
Body: { definition: object, notes? }
```

---

## Batches

### GET /batches
```
Query: ?status=&subject_id=&assigned_to=&page=1&limit=20
Intern: sees own batches only (enforced server-side)
Response 200: { data: [...batches], meta: { total, page, limit, totalPages } }
```

### GET /batches/:id

### POST /batches
```
Body: {
  name,
  subject_id,
  chapter_id?,
  question_type_id,
  difficulty,              // 'easy' | 'medium' | 'hard'
  question_count,          // number
  notes?,
  assigned_to?             // intern user_id (Admin only; Intern = self)
}
Response 201: { data: batch }
System auto-sets profile_id from active subject profile.
```

### PUT /batches/:id
```
Body: { name?, notes?, assigned_to? }
Response 200: { data: batch }
```

### POST /batches/:id/mark-generation-complete
```
Intern marks that Qwen generation is done.
Response 200: { data: { status: 'generation_complete' } }
```

### POST /batches/:id/send-to-review
```
Admin+ only.
Body: { sme_id: string }
Sets all validated questions to 'under_review'.
Response 200: { data: batch }
```

### POST /batches/:id/sync
```
Admin+ only. Triggers n8n production sync webhook.
Batch must be at export_complete status.
Response 200: { data: { sync_status: 'triggered' } }
```

---

## Questions

### GET /batches/:batchId/questions
```
Query: ?status=&page=1&limit=20
Response 200: { data: [...questions], meta }
```

### GET /questions/:id

### POST /batches/:batchId/questions/import
```
Body: { raw_json: string | object, mode: 'append' | 'replace' }
Response 200: {
  data: {
    total, passed, failed, warnings,
    results: [{ index, status, errors?, warnings? }]
  }
}
Automatically runs validation + metadata injection.
```

### GET /questions/:id/reviews

---

## SME Review

### GET /review/queue (SME only)
```
Response 200: { data: [{ batch, total_questions, reviewed, remaining }] }
```

### POST /questions/:id/review
```
Body: { decision: 'approved' | 'rejected', notes?: string }
notes is REQUIRED when decision = 'rejected'
Response 201: { data: review }
```

### POST /batches/:batchId/review/submit
```
SME submits batch-level notes after reviewing all questions.
Body: { batch_notes?: string }
Response 200: { data: batch }
```

---

## Diagram Pipeline

### GET /batches/:batchId/diagrams
```
Response 200: {
  data: {
    total, pending, uploaded, failed,
    jobs: [{ id, question_id, description, status }]
  }
}
```

### POST /questions/:id/diagram/upload
```
Multipart/form-data: image field (max 5MB, image/png)
Platform: uploads to R2, creates diagram_assets row, updates question.content
Response 200: { data: { diagram_url, diagram_alt_text } }
```

### POST /questions/:id/diagram/replace
```
Same as upload — creates new version, deactivates previous.
```

### POST /diagram-jobs/:id/retry
```
Resets status to 'pending' if upload failed.
```

---

## Exports

### GET /batches/:batchId/exports
```
Response 200: { data: [...exports] }
```

### POST /batches/:batchId/exports
```
Admin+ only.
Triggers Final JSON Builder + generates JSON + Excel + PDF.
Response 202: { data: { export_ids: [...], status: 'processing' } }
```

### GET /exports/:id
```
Response 200: { data: { id, format, status, public_url, created_at } }
```

---

## Field Registry (Super Admin only)

### GET /field-registry
### POST /field-registry
```
Body: { field_name, label, mode, data_type, validation_rule?, rendering_rule?, export_rule?, sort_order? }
mode: 'required' | 'optional' | 'disabled' | 'auto'
```

### PUT /field-registry/:id
### DELETE /field-registry/:id (sets is_active = false)

---

## Error Response Format

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "details": {}
}
```

Common error codes:
```
UNAUTHORIZED          401
FORBIDDEN             403
NOT_FOUND             404
VALIDATION_ERROR      422
IMPORT_PARSE_ERROR    422
BATCH_STATUS_CONFLICT 409
RATE_LIMITED          429
INTERNAL_ERROR        500
```
