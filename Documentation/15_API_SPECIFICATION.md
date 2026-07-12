# 15 — API Specification

Base URL: `/api/v1`

Auth: `Authorization: Bearer <access_token>` on all protected routes.

---

## Auth

### POST /auth/login
```
Body: { email: string, password: string }
Response 200: { accessToken: string, user: { id, name, email, role } }
Response 401: { error: "Invalid credentials" }
```

### POST /auth/refresh
```
Cookie: refreshToken (httpOnly)
Response 200: { accessToken: string }
Response 401: { error: "Invalid or expired refresh token" }
```

### POST /auth/logout
```
Response 200: {}
Clears refresh token cookie
```

---

## Users (Super Admin only)

### GET /users
```
Query: ?role=&page=1&limit=20
Response 200: { users: [...], total, page, limit }
```

### POST /users
```
Body: { name, email, password, role }
Response 201: { user }
```

### PUT /users/:id
```
Body: { name?, role?, is_active? }
Response 200: { user }
```

### DELETE /users/:id
```
Response 200: {}
Soft delete: sets is_active = false
```

---

## Master Data (Super Admin / Admin read)

### GET /boards
### GET /boards/:boardId/classes
### GET /classes/:classId/subjects
### GET /subjects/:subjectId/chapters
### GET /chapters/:chapterId/concepts

All return arrays of their respective records.

### POST /boards, /classes, /subjects, /chapters, /concepts
Super Admin only. Body contains relevant fields.

---

## Subject Profiles

### GET /subject-profiles
```
Query: ?subject_id=
Response 200: { profiles: [...] }
```

### GET /subject-profiles/:id
### POST /subject-profiles (Super Admin only)
```
Body: { subject_id, prompt_version_id, schema_version_id, max_concepts, generation_provider }
Response 201: { profile }
```

### PUT /subject-profiles/:id (Super Admin only)

---

## Prompt Library

### GET /prompts
```
Query: ?subject_id=&status=published&page=1
Response 200: { prompts: [...] }
```

### GET /prompts/:id
### GET /prompts/:id/versions
### GET /prompts/:id/versions/:versionId

### POST /prompts (Admin+)
```
Body: { name, subject_id?, description }
Response 201: { prompt }
```

### POST /prompts/:id/versions (Admin+)
```
Body: { content, variables, notes }
Response 201: { version }
```

### PUT /prompts/:id/versions/:versionId/publish (Super Admin only)
### PUT /prompts/:id/versions/:versionId/archive (Super Admin only)

---

## Schemas

### GET /schemas
### GET /schemas/:id/versions
### POST /schemas (Super Admin only)
### POST /schemas/:id/versions (Super Admin only)
```
Body: { definition: object, notes? }
```

---

## Batches

### GET /batches
```
Query: ?status=&subject_id=&assigned_to=&page=1&limit=20
Intern: sees own batches only (enforced server-side)
Response 200: { batches: [...], total, page, limit }
```

### GET /batches/:id
### POST /batches
```
Body: { name, subject_id, chapter_id?, notes?, assigned_to? }
Response 201: { batch }
```

### PUT /batches/:id
```
Body: { name?, notes?, status?, assigned_to? }
Response 200: { batch }
```

### POST /batches/:id/send-to-review
```
Body: { sme_id: string }
Response 200: { batch }
```

### POST /batches/:id/generation-webhook
```
Internal — called by n8n only (verified by secret header)
Body: { status: 'done' | 'failed', output?: string, error?: string }
```

---

## Questions

### GET /batches/:batchId/questions
```
Query: ?status=&page=1&limit=20
Response 200: { questions: [...], total, page, limit }
```

### GET /questions/:id

### POST /batches/:batchId/questions/import
```
Body: { raw_json: string | object, mode: 'append' | 'replace' }
Response 200: { validation_result: { total, passed, failed, warnings, results } }
```

### PUT /questions/:id
```
Admin+ only. Body: partial question content
Response 200: { question }
```

### DELETE /questions/:id
```
Admin+ only.
```

---

## SME Review

### GET /reviews/queue (SME only)
```
Response 200: { batches_pending_review: [...] }
```

### POST /questions/:id/review
```
Body: { decision: 'approved' | 'rejected' | 'revision_requested', notes?: string }
Required notes for rejected and revision_requested.
Response 201: { review }
```

### GET /questions/:id/reviews
```
Response 200: { reviews: [...] }
```

---

## Diagram Pipeline

### POST /batches/:batchId/diagrams/start
```
Admin+ only
Response 200: { jobs_created: number }
```

### GET /batches/:batchId/diagrams/status
```
Response 200: { total, pending, processing, done, failed }
```

### POST /diagram-jobs/:id/retry
### POST /questions/:id/diagram/upload (manual override)
```
Body: multipart/form-data, field: image (max 5MB, image/png or image/jpeg)
Response 200: { diagram_url }
```

---

## Exports

### GET /batches/:batchId/exports
```
Response 200: { exports: [...] }
```

### POST /batches/:batchId/exports
```
Body: { format: 'json' | 'pdf' | 'excel' }
Response 202: { export_id, status: 'pending' }
```

### GET /exports/:id
```
Response 200: { export: { id, format, status, public_url, created_at } }
```

### POST /batches/:batchId/sync
```
Admin+ only. Triggers n8n sync workflow.
Response 200: { sync_status: 'triggered' }
```

---

## Field Registry (Super Admin only)

### GET /field-registry
### POST /field-registry
### PUT /field-registry/:id
### DELETE /field-registry/:id

---

## Error Response Format

All errors follow:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "details": {}   // optional additional context
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
