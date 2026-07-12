# 00 — Project Overview

## Vision

Question Factory is an internal platform for educational content teams to generate, validate, review, and export high-quality exam-ready questions at scale. It replaces manual, error-prone spreadsheet workflows with a structured, AI-assisted pipeline backed by a versioned JSON schema.

## Problem Statement

Content teams at edtech companies produce thousands of questions per board cycle. Without a unified system:
- Questions are generated ad hoc with no schema enforcement
- Prompts are inconsistent across subjects and contributors
- SME review is done via email threads with no audit trail
- Diagram generation is manual and untracked
- Export formats differ per client

Question Factory solves all of these with a single, end-to-end pipeline.

## Goals

1. Centralise question generation using versioned, subject-aware prompts
2. Enforce a strict JSON schema for every question at import time
3. Automate diagram description → image → upload → URL pipeline
4. Provide structured SME review with full revision history
5. Export questions in JSON, PDF, and Excel formats
6. Sync approved question batches to the production database via n8n

## Non-Goals (V1)

- Public-facing student interface
- Auto-concept suggestion from syllabus
- LLM provider switching per question
- Analytics dashboards
- Notification / alerting system
- CSV export
- Mobile app

See `20_FUTURE_SCOPE.md` for the complete V2+ backlog.

## Overall Workflow

```
Admin creates Batch
        ↓
Admin selects Subject → Subject Profile auto-loads prompt + schema version
        ↓
Intern generates questions via AI (n8n calls LLM with prompt)
        ↓
Intern imports raw JSON into platform
        ↓
Validation Engine checks every field against Field Registry rules
        ↓
Diagram Pipeline converts diagram descriptions → images → Cloudflare R2
        ↓
SME reviews each question (Approve / Reject / Request Revision)
        ↓
Admin triggers Export (JSON / PDF / Excel)
        ↓
n8n syncs approved questions to Production DB
```

## Terminology

| Term | Definition |
|---|---|
| Batch | A named collection of questions for a specific subject + chapter |
| Subject Profile | Configuration record that pins prompt version, schema version, and field registry for a subject |
| Field Registry | Master list of all question fields with mode, validation, and rendering rules |
| Prompt | Versioned LLM instruction stored in the Prompt Library |
| Prompt Version | Immutable snapshot of a prompt at a point in time |
| Schema Version | Immutable JSON Schema snapshot that validates imported questions |
| Diagram Job | A background task that converts a text description to an image |
| SME | Subject Matter Expert — the reviewer role |
| Concept UUID | Unique identifier linking a question to a concept in the master concept map |
| Export | A packaged output of approved questions in a supported format |
| Production DB | The downstream database that students and teachers consume |
