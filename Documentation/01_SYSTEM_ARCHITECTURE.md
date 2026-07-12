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
  │(Primary  │  │  R2     │  │ Workflow   │
  │  DB)     │  │(Diagrams │  │ Engine     │
  │          │  │ Assets) │  │            │
  └──────────┘  └─────────┘  └─────┬──────┘
                                    │
                             ┌──────▼──────┐
                             │Production DB│
                             │(Downstream) │
                             └─────────────┘
```

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
                   │Prompt Library│     │ Diagram Pipeline  │
                   │   Module     │     │  (Jobs + R2)      │
                   └──────────────┘     └────────┬────────┘
                                                  │
                                        ┌─────────▼───────┐
                                        │   SME Review     │
                                        │     Module       │
                                        └─────────┬───────┘
                                                  │
                                        ┌─────────▼───────┐
                                        │  Export Engine   │
                                        │ (JSON/PDF/Excel) │
                                        └─────────┬───────┘
                                                  │
                                        ┌─────────▼───────┐
                                        │   n8n Sync to    │
                                        │  Production DB   │
                                        └─────────────────┘
```

## Data Flow

1. **Auth** — JWT issued on login, refreshed silently. Role encoded in payload.
2. **Batch Creation** — Admin/Intern creates batch; Subject Profile selected; prompt + schema versions locked.
3. **Generation** — Intern triggers n8n workflow; n8n calls LLM with versioned prompt; raw JSON returned.
4. **Import** — Intern pastes or uploads raw JSON; Validation Engine runs field-by-field against Field Registry.
5. **Diagram** — For each question with `diagram_required: true`, Diagram Job created; worker converts description to image; uploads to R2; writes URL back to question.
6. **SME Review** — SME sees paginated question list; approves / rejects / adds notes.
7. **Export** — Admin triggers export; Export Engine packages approved questions; file stored in R2.
8. **n8n Sync** — Admin triggers sync; n8n reads export JSON; writes to Production DB.

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| API style | REST JSON | Simple, well-understood, easy to test with Postman |
| ORM | Prisma | Type-safe, great migration tooling, PostgreSQL native |
| Background jobs | n8n | Visual workflow editor, no infra to maintain, existing team familiarity |
| File storage | Cloudflare R2 | S3-compatible, no egress fees, global CDN |
| Rendering | KaTeX + custom HTML | LaTeX equations + physics/chemistry markup |
| Auth | JWT (access + refresh) | Stateless, works across frontend + future mobile |
