# 18 — Folder Structure

## Root

```
questiongen/
├── Backend/
├── Frontend/
├── Documentation/
├── Assets/
├── Database/
├── Scripts/
├── Deployment/
├── Postman/
├── Development/
├── docker-compose.yml
└── README.md
```

---

## Backend

```
Backend/
├── src/
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── batch.controller.ts
│   │   │   ├── question.controller.ts
│   │   │   ├── prompt.controller.ts
│   │   │   ├── review.controller.ts
│   │   │   ├── diagram.controller.ts
│   │   │   ├── export.controller.ts
│   │   │   ├── masterdata.controller.ts
│   │   │   ├── fieldregistry.controller.ts
│   │   │   ├── schema.controller.ts
│   │   │   └── subjectprofile.controller.ts
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── batch.service.ts
│   │   │   ├── question.service.ts
│   │   │   ├── prompt.service.ts
│   │   │   ├── review.service.ts
│   │   │   ├── diagram.service.ts
│   │   │   ├── export.service.ts
│   │   │   ├── masterdata.service.ts
│   │   │   ├── fieldregistry.service.ts
│   │   │   ├── schema.service.ts
│   │   │   └── subjectprofile.service.ts
│   │   │
│   │   ├── repositories/
│   │   │   ├── user.repo.ts
│   │   │   ├── batch.repo.ts
│   │   │   ├── question.repo.ts
│   │   │   ├── prompt.repo.ts
│   │   │   ├── review.repo.ts
│   │   │   ├── diagram.repo.ts
│   │   │   ├── export.repo.ts
│   │   │   └── masterdata.repo.ts
│   │   │
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts        # JWT verify
│   │   │   ├── role.middleware.ts        # Role guard factory
│   │   │   ├── validate.middleware.ts    # Zod request validation
│   │   │   ├── error.middleware.ts       # Global error handler
│   │   │   └── upload.middleware.ts      # Multer config
│   │   │
│   │   ├── validators/
│   │   │   ├── auth.schema.ts
│   │   │   ├── batch.schema.ts
│   │   │   ├── question.schema.ts
│   │   │   ├── prompt.schema.ts
│   │   │   └── review.schema.ts
│   │   │
│   │   └── routes/
│   │       ├── index.ts                  # Mount all routers
│   │       ├── auth.routes.ts
│   │       ├── user.routes.ts
│   │       ├── batch.routes.ts
│   │       ├── question.routes.ts
│   │       ├── prompt.routes.ts
│   │       ├── review.routes.ts
│   │       ├── diagram.routes.ts
│   │       ├── export.routes.ts
│   │       ├── masterdata.routes.ts
│   │       ├── fieldregistry.routes.ts
│   │       ├── schema.routes.ts
│   │       └── subjectprofile.routes.ts
│   │
│   ├── config/
│   │   ├── env.ts                        # Type-safe env var loading
│   │   ├── database.ts                   # Prisma client singleton
│   │   ├── r2.ts                         # S3/R2 client
│   │   └── logger.ts                     # Pino logger config
│   │
│   ├── diagram/
│   │   ├── diagram.worker.ts             # Job processor
│   │   └── diagram.uploader.ts           # R2 upload helper
│   │
│   ├── exports/
│   │   ├── json.exporter.ts
│   │   ├── pdf.exporter.ts
│   │   └── excel.exporter.ts
│   │
│   ├── renderers/
│   │   └── katex.renderer.ts             # Server-side KaTeX for PDF
│   │
│   ├── schemas/                          # AJV JSON Schema validator
│   │   └── question.validator.ts
│   │
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   ├── pagination.ts
│   │   ├── r2-key.ts                     # R2 key builder
│   │   └── import-parser.ts              # JSON import normaliser
│   │
│   └── app.ts                            # Express app setup
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── package.json
├── tsconfig.json
├── .env.example
└── ecosystem.config.js                   # PM2 config
```

---

## Frontend

```
Frontend/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx                # Sidebar + topbar
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── batches/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── import/page.tsx
│   │   │   │       ├── questions/page.tsx
│   │   │   │       ├── diagrams/page.tsx
│   │   │   │       └── export/page.tsx
│   │   │   ├── review/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [batchId]/page.tsx
│   │   │   ├── prompts/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── versions/[versionId]/page.tsx
│   │   │   └── admin/
│   │   │       ├── users/page.tsx
│   │   │       ├── master-data/page.tsx
│   │   │       ├── field-registry/page.tsx
│   │   │       ├── subject-profiles/page.tsx
│   │   │       └── schemas/page.tsx
│   │   └── api/                          # Next.js API routes (thin proxy if needed)
│   │
│   ├── components/
│   │   ├── ui/                           # shadcn/ui base components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   ├── batch/
│   │   │   ├── BatchCard.tsx
│   │   │   ├── BatchTable.tsx
│   │   │   └── BatchStatusBadge.tsx
│   │   ├── question/
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── QuestionRenderer.tsx      # KaTeX + HTML renderer
│   │   │   ├── QuestionTable.tsx
│   │   │   └── ValidationResultRow.tsx
│   │   ├── review/
│   │   │   └── ReviewActionBar.tsx
│   │   ├── diagram/
│   │   │   └── DiagramJobRow.tsx
│   │   └── common/
│   │       ├── PageHeader.tsx
│   │       ├── ConfirmModal.tsx
│   │       └── StatusBadge.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useBatch.ts
│   │   ├── useQuestions.ts
│   │   └── useReview.ts
│   │
│   ├── lib/
│   │   ├── api.ts                        # Axios instance + interceptors
│   │   ├── auth.ts                       # Token storage + refresh
│   │   └── katex.ts                      # KaTeX render helper
│   │
│   ├── store/
│   │   └── auth.store.ts                 # Zustand auth store
│   │
│   └── types/
│       ├── api.types.ts
│       ├── batch.types.ts
│       ├── question.types.ts
│       └── user.types.ts
│
├── public/
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```
