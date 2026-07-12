# 01 — System Architecture

## Layer Diagram

```
┌─────────────────────────────────────────────────┐
│                   BROWSER                        │
│           Next.js Frontend (SSR + CSR)           │
└────────────────────┬────────────────────────────┘
                     │ HTTPS / REST JSON
┌────────────────────▼────────────────────────────┐
│               BACKEND API                        │
│          Node.js + Express (TypeScript)          │
│  Controllers → Services → Repositories → Prisma │
└──────┬─────────────┬──────────────┬─────────────┘
       │             │              │
  ┌────▼────┐  ┌────▼────┐  ┌─────▼──────┐
  │PostgreSQL│  │Cloudflare│  │  n8n       │
  │(Primary  │  │  R2     │  │(Production │
  │  DB)     │  │(Diagrams │  │ Sync only) │
  │          │  │ Assets) │  │            │
  └──────────┘  └─────────┘  └─────┬──────┘
                                    │
                             ┌──────▼──────┐
                             │Production DB│
                             │(Downstream) │
                             └─────────────┘
```

**Note:** n8n is used ONLY for Phase 13 (Production Sync). Question generation is manual — interns use Qwen Chat externally.

## Module Interaction

```
┌────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Auth Module│────▶│ Batch Module │────▶│ Question Module  │
└────────────┘     └──────┬───────┘     └────────┬────────┘
                          │                       │
                   ┌──────▼───────┐     ┌────────▼────────┐
                   │Subject Profile│    │ Validation Engine │
                   │   Module      │    │  (Field Registry) │
                   └──────┬───────┘     └────────┬────────┘
                          │                       │
                   ┌──────▼───────┐     ┌────────▼────────┐
                   │Prompt Library│     │Metadata Injection │
                   │   Module     │     │     Module        │
                   └──────────────┘     └────────┬────────┘
                                                  │
                                        ┌─────────▼───────┐
                                        │ Diagram Pipeline  │
                                        │ (Manual upload   │
                                        │  → R2 storage)   │
                                        └─────────┬───────┘
                                                  │
                                        ┌─────────▼───────┐
                                        │   SME Review     │
                                        │ (Approve/Reject) │
                                        └─────────┬───────┘
                                                  │
                                        ┌─────────▼───────┐
                                        │Final JSON Builder│
                                        │(Rebuild from DB) │
                                        └─────────┬───────┘
                                                  │
                                        ┌─────────▼───────┐
                                        │  Export Engine   │
                                        │ (JSON/Excel/PDF) │
                                        └─────────┬───────┘
                                                  │
                                        ┌─────────▼───────┐
                                        │   n8n Sync to    │
                                        │  Production DB   │
                                        └─────────────────┘
```

## Data Flow (13 Phases)

1. **Auth** — JWT issued on login, refreshed silently. Role encoded in payload.
2. **Batch Creation** — Intern creates batch selecting board/class/subject/chapter/question type/difficulty/count. Subject Profile auto-loads prompt + schema versions and field config.
3. **Prompt View** — Intern views the versioned prompt and concept list (if concept mapping enabled). Copies both and pastes into Qwen Chat externally.
4. **Manual Generation** — Intern uses Qwen Chat to generate questions. Platform is not involved in this step.
5. **Import** — Intern pastes raw JSON. Stored in Temporary Staging Area.
6. **Parser** — Splits JSON array into individual question records with IDs.
7. **Validation** — Pure software: JSON Schema + Field Registry rules + concept UUID checks + diagram field checks.
8. **Metadata Injection** — System auto-fills board, class, subject, chapter UUID, batch UUID, prompt version, schema version, created_by, created_time into every record.
9. **Diagram Pipeline** — Intern copies diagram description, generates image externally, uploads PNG. Platform uploads to R2, stores URL/version, links back by Question ID.
10. **Rendering** — Raw JSON in DB is converted to textbook view for SME review.
11. **SME Review** — SME approves or rejects each question. Adds batch notes at end.
12. **Final JSON Builder** — Ignores imported JSON; rebuilds production JSON entirely from validated DB records.
13. **Export** — JSON, Excel, PDF generated and stored in R2.
14. **n8n Sync** — Admin triggers; n8n reads export JSON, writes to Production DB.

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| API style | REST JSON | Simple, well-understood, easy to test with Postman |
| ORM | Prisma | Type-safe, great migration tooling, PostgreSQL native |
| LLM generation | Manual (Qwen Chat) | No API cost, intern-driven, flexible model choice |
| Production sync | n8n | Visual workflow editor, no infra to maintain |
| File storage | Cloudflare R2 | S3-compatible, no egress fees, global CDN |
| Rendering | KaTeX + custom HTML | LaTeX equations + physics/chemistry markup |
| Final JSON | Rebuilt from DB | Guarantees consistency regardless of what was imported |
| Auth | JWT (access + refresh) | Stateless, works across frontend + future mobile |
