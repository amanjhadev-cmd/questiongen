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
3. Automate diagram upload and linking via Cloudflare R2
4. Provide structured SME review with full revision history
5. Export questions in JSON, Excel, and PDF formats
6. Sync approved question batches to the production database via n8n

## Non-Goals (V1)

- Public-facing student interface
- Auto-concept suggestion from syllabus
- LLM API called directly by the platform (generation is manual via Qwen Chat)
- Analytics dashboards
- Notification / alerting system
- CSV export
- Mobile app

See `20_FUTURE_SCOPE.md` for the complete V2+ backlog.

## Overall Workflow (13 Phases)

```
Phase 0  — System Setup (one time)
           Boards / Classes / Subjects / Chapters / Concepts
           Prompt Library → Schema Library → Field Registry → Subject Profiles
                ↓
Phase 1  — Create Batch
           Intern selects: Board → Class → Subject → Chapter → Question Type → Difficulty → Count
           System auto-loads: Prompt Version, Schema Version, Field Registry, Subject Profile
                ↓
Phase 2  — Prompt Library
           Intern views prompt + concept list (UUID + short note)
           Intern copies prompt (+ concept list if concept mapping enabled)
                ↓
Phase 3  — Question Generation (external — Qwen Chat)
           Intern pastes into Qwen Chat → Qwen generates JSON
                ↓
Phase 4  — Import
           Intern returns → pastes JSON → stored in Temporary Staging Area
                ↓
Phase 5  — Parser
           Splits array into individual question records with ID, Batch ID, Version 1
                ↓
Phase 6  — Validation Engine (pure software — no AI)
           JSON, Schema, Fields, Question Type rules, KaTeX, Options, Duplicates
           Concept UUID checks (if enabled), Diagram field checks (if enabled)
                ↓
Phase 7  — Metadata Injection (automatic)
           System fills: Board, Class, Subject, Chapter UUID, Batch UUID,
           Prompt Version, Schema Version, Created By, Created Time
                ↓
Phase 8  — Diagram Pipeline
           Intern copies description → generates image externally → uploads PNG
           Platform stores in Cloudflare R2, links URL back to question by ID
                ↓
Phase 9  — Rendering Engine
           DB stores raw JSON; renderer converts to textbook view for SME
                ↓
Phase 10 — SME Review
           Approve or Reject per question
           Batch Notes added at end
                ↓
Phase 11 — Final JSON Builder
           Ignores imported JSON; rebuilds production JSON from validated DB records
                ↓
Phase 12 — Export Engine
           JSON → Excel → PDF
                ↓
Phase 13 — Production Sync
           Final JSON → n8n → Production SQL Database
```

## Terminology

| Term | Definition |
|---|---|
| Batch | A named collection of questions for a specific subject + chapter + question type + difficulty |
| Subject Profile | Configuration record that pins prompt version, schema version, field registry profile, and feature flags per subject |
| Field Registry | Master list of all question fields with mode (required/optional/disabled/auto) and rules |
| Prompt | Versioned LLM instruction stored in the Prompt Library |
| Prompt Version | Immutable snapshot of a prompt |
| Schema Version | Immutable JSON Schema snapshot that validates imported questions |
| Staging Area | Temporary storage for imported questions before validation clears them |
| Metadata Injection | System step that auto-fills board/class/subject/batch/prompt/schema into every question record |
| Final JSON Builder | Reconstruction step that builds production-ready JSON entirely from validated DB records |
| Diagram Job | A record tracking that a question needs a diagram (intern uploads image; platform handles R2) |
| SME | Subject Matter Expert — the reviewer role |
| Concept UUID | Unique identifier linking a question to a concept in the master concept map |
| Export | A packaged output of approved questions in a supported format |
| Production DB | The downstream database that students and teachers consume |

## Final Principles (Never Change)

1. Database is the single source of truth.
2. No Excel is part of the workflow (only an output format).
3. Interns only generate and import content — they do not edit system configuration.
4. SMEs only approve or reject — they do not perform technical tasks like UUID mapping.
5. All prompts are version-controlled in the Prompt Library.
6. All behaviour is controlled by Subject Profiles and the Field Registry, not hardcoded logic.
7. Concept mapping happens during question generation (only for subjects that require it) and is validated during import.
8. Diagrams are generated externally, uploaded by the intern, stored in object storage, and linked by Question ID.
9. The imported JSON is never treated as the final product — the Final JSON Builder reconstructs production JSON from validated database records.
10. Every major component (prompts, schemas, subject profiles, field registry) is versioned so future changes never break existing batches.
