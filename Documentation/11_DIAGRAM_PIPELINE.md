# 11 — Diagram Pipeline

## Overview

The Diagram Pipeline manages the lifecycle from a text diagram description (written by the Qwen-generated question) to a stored image URL linked back to the question. Image generation is done externally by the intern — the platform handles job tracking, R2 storage, URL linking, and version management.

## Flow

```
Validation complete → system scans questions for diagram_required = true
              ↓
Creates diagram_jobs row for each (status: 'pending')
Sets question.status = 'diagram_pending'
              ↓
Intern opens "Pending Diagrams" panel
              ↓
For each pending job:
  Intern copies diagram_description
              ↓
  Intern generates image in external tool (Midjourney, DALL-E, etc.)
              ↓
  Intern uploads PNG to platform
              ↓
  Platform uploads PNG → Cloudflare R2
              ↓
  Platform creates diagram_assets row (r2_key, public_url, version, original_description)
              ↓
  Platform updates question.content: diagram_url, diagram_alt_text
  Sets question.status = 'diagram_done'
  Sets diagram_jobs.status = 'uploaded'
              ↓
When all jobs complete → batch.status = 'diagram_complete'
```

## R2 Folder Naming Convention

```
diagrams/{subject_code}/{batch_id}/{question_id}/v{version}.png
```

Examples:
```
diagrams/SCI10/550e8400-e29b-41d4-a716-446655440000/7c9e6679-7425-40de-a2d1-7e2f57a2c4dc/v1.png
diagrams/MATH9/a3f4b2c1-.../.../v1.png
```

Rules:
- `subject_code` is from `subjects.code` (uppercase, alphanumeric, e.g. `SCI10`)
- `batch_id` and `question_id` are full UUIDs
- Version increments if a diagram is re-uploaded (old version retained; new version is `is_active: true`)
- No spaces, no special characters in any path segment
- Always `.png` — no other formats in V1

## diagram_jobs Status

```
pending → uploaded
pending → failed (if upload errors out — manual retry available)
```

There is no `processing` state. The platform does not call any image generation API. Generation is purely external.

## diagram_assets

Each upload creates one row. If a diagram is re-uploaded (replaced), a new row is created with `version + 1` and `is_active: true`; the previous version is set to `is_active: false`. Old versions are kept for audit.

Fields stored:
- `r2_key` — full S3 path
- `public_url` — served via Cloudflare CDN
- `version` — incrementing integer per question
- `original_description` — the description at time of upload (for audit)

## Cloudflare R2 Upload (Backend)

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

async function uploadDiagram(key: string, imageBuffer: Buffer): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: imageBuffer,
    ContentType: 'image/png',
  }))
  return `${process.env.R2_PUBLIC_URL}/${key}`
}
```

The intern uploads via a multipart/form-data form field. The API receives the file via Multer, calls `uploadDiagram`, then creates the asset record.

## Alt Text Generation

```
"{subject} – {chapter}: {first 120 chars of diagram_description}"
```

Example:
```
"Science – Chemical Reactions: A labelled diagram of a plant cell showing cell wall, cell membrane, nucleus, chloroplast..."
```

Stored in `question.content.diagram_alt_text`. Included in PDF exports for accessibility.

## Pending Diagrams Panel (UI)

Intern sees a table:

| # | Question Preview | Diagram Description | Status | Action |
|---|---|---|---|---|
| 5 | "Which diagram shows..." | "Labelled diagram of..." | Pending | Upload |
| 8 | "Refer to the diagram..." | "Circuit diagram with..." | Uploaded ✔ | Replace |

Progress bar: `Uploaded: 6/9`

## Diagram Batches with No Diagrams

If no questions in the batch have `diagram_required = true`, the Diagram Pipeline step is skipped:
- No `diagram_jobs` rows created
- Batch status moves directly from `validation_complete` to `diagram_complete`
- No action required from intern or admin

## Replacing a Diagram

If a diagram is wrong or needs to be updated:
1. Intern uploads a new image via the "Replace" button
2. New `diagram_assets` row created with `version + 1`
3. Old version set to `is_active: false`
4. `question.content.diagram_url` updated to new public URL
5. `diagram_jobs.status` stays `uploaded`

## Manual Override by Admin

Admin can also upload a diagram from the batch admin view — same flow as intern upload. Used when an intern is unavailable.
