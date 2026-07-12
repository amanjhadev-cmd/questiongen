# 11 — Diagram Pipeline

## Overview

The Diagram Pipeline converts natural language diagram descriptions (written by the LLM during question generation) into actual images, uploads them to Cloudflare R2, and writes the URL back to the question record.

## Flow

```
Question imported with diagram_required: true
              ↓
Admin clicks "Start Diagram Pipeline" on batch
              ↓
System creates diagram_jobs rows for each question needing diagram
              ↓
Worker picks up pending jobs (FIFO)
              ↓
Reads diagram_description from question.content
              ↓
Calls Image Generation API (n8n → external image API)
              ↓
Receives image binary
              ↓
Uploads to Cloudflare R2 (S3-compatible PUT)
              ↓
Creates diagram_assets row with r2_key + public_url
              ↓
Updates question.content.diagram_url = public_url
Updates question.content.diagram_alt_text = generated alt text
Updates question.status = 'diagram_done'
Updates diagram_jobs.status = 'done'
              ↓
Batch status updates when all jobs complete
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
- `subject_code` is always from `subjects.code` (uppercase, alphanumeric)
- `batch_id` and `question_id` are full UUIDs
- Version increments if a diagram is regenerated (old version kept, new version is `is_active: true`)
- No spaces or special characters in any path segment

## diagram_jobs Table

See `03_DATABASE_SCHEMA.md` for full schema.

Job status flow:
```
pending → processing → done
pending → processing → failed (attempts <= 3)
failed after 3 attempts → stuck (requires manual intervention)
```

Retry logic: exponential backoff — 30s, 2min, 10min.

## diagram_assets Table

Each completed job creates one row. If a diagram is regenerated, a new row is created with `version + 1` and `is_active: true`; previous version set to `is_active: false`.

## Cloudflare R2 Upload

```typescript
// AWS SDK v3 (S3-compatible)
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,   // https://<account>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

await s3Client.send(new PutObjectCommand({
  Bucket: process.env.R2_BUCKET_NAME,
  Key: r2Key,
  Body: imageBuffer,
  ContentType: 'image/png',
  ACL: 'public-read',
}))
```

Public URL format:
```
https://{custom_domain}/{r2_key}
```
or (if no custom domain):
```
https://pub-{bucket_id}.r2.dev/{r2_key}
```

## Image Generation

V1: Image generation is done via n8n calling an external API (e.g. DALL-E, Stable Diffusion, or a custom diagram renderer).

The `diagram_description` field contains a precise, structured description:

```
Example:
"A labelled diagram of a plant cell showing: cell wall, cell membrane, nucleus,
chloroplast, vacuole, and mitochondria. Use a clean scientific illustration style
with clear labels and arrows. White background. 800x600 pixels."
```

The system does NOT use the image API directly — it sends the description to n8n which handles the API call and returns the image URL or binary.

## Progress Tracking

Admin sees per-batch diagram progress:
```
Diagram Pipeline: 14/20 complete | 3 processing | 2 pending | 1 failed
```

Clicking a failed job shows the error message and a "Retry" button.

## Manual Override

If auto-generation fails or produces a bad image:
- Admin can upload a manually created image for a specific question
- Upload goes through the same R2 path with `v2.png`
- diagram_assets row created with `version: 2, is_active: true`
- Question updated with new URL

## Alt Text

Alt text is auto-generated as:
```
"{subject} - {chapter}: {first 100 chars of diagram_description}"
```

This is stored in `question.content.diagram_alt_text` and included in PDF and JSON exports for accessibility.
