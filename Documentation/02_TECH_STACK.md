# 02 — Tech Stack

All decisions are final for V1. No alternatives will be evaluated during development.

## Frontend

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | 14.x (App Router) |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| UI Components | shadcn/ui | latest |
| Math Rendering | KaTeX | 0.16.x |
| HTTP Client | Axios | 1.x |
| State Management | Zustand | 4.x |
| Form Handling | React Hook Form + Zod | latest |
| Table | TanStack Table | 8.x |
| Icons | Lucide React | latest |

## Backend

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 20.x LTS |
| Framework | Express | 4.x |
| Language | TypeScript | 5.x |
| ORM | Prisma | 5.x |
| Validation | Zod | 3.x |
| Auth | jsonwebtoken + bcrypt | latest |
| File Upload | Multer | latest |
| PDF Generation | Puppeteer | latest |
| Excel Generation | ExcelJS | latest |
| S3 Client | @aws-sdk/client-s3 | 3.x |
| Process Manager | PM2 | latest |

## Database

| Component | Technology |
|---|---|
| Primary Database | PostgreSQL 15 |
| ORM / Migrations | Prisma Migrate |
| Connection Pooling | PgBouncer (optional, add in V2) |

## Infrastructure

| Component | Technology |
|---|---|
| Server OS | Ubuntu 22.04 LTS |
| Reverse Proxy | Nginx |
| SSL | Certbot (Let's Encrypt) |
| Asset Storage | Cloudflare R2 |
| CDN | Cloudflare (automatic via R2 public URL) |
| DNS | Cloudflare DNS |
| Workflow Engine | n8n (self-hosted or cloud) |

## Development Tools

| Tool | Purpose |
|---|---|
| pnpm | Package manager (monorepo-ready) |
| ESLint | Linting |
| Prettier | Formatting |
| Husky | Pre-commit hooks |
| Jest | Unit + integration tests |
| Postman | API testing |
| Docker Compose | Local development environment |
| GitHub Actions | CI/CD |

## Environment Summary

```
Production:
  Ubuntu 22.04 → Nginx → PM2 → Node.js API
                                    ↓
                              PostgreSQL 15
                                    ↓
                           Cloudflare R2 (diagrams + exports)
                                    ↓
                              n8n (sync workflows)

Development:
  Docker Compose → PostgreSQL + Node.js API + Next.js
```
