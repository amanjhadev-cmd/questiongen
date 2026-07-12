# Question Factory

Internal platform for AI-assisted educational question generation, review, and export.

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- pnpm
- Docker + Docker Compose (for PostgreSQL)
- PostgreSQL 15 (or use Docker)

### 1. Clone and install

```bash
git clone <repo-url>
cd questiongen
```

### 2. Backend setup

```bash
cd Backend
cp .env.example .env
# Edit .env with your values

pnpm install
npx prisma generate
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
pnpm dev
```

API running at: http://localhost:4000

### 3. Frontend setup (M2+)

```bash
cd Frontend
cp .env.local.example .env.local
pnpm install
pnpm dev
```

Frontend at: http://localhost:3000

### 4. Docker Compose (PostgreSQL only)

```bash
docker-compose up postgres -d
```

## Milestones

| # | Name | Status |
|---|---|---|
| M1 | Foundation — Auth, master data, DB, roles | In Progress |
| M2 | Question Pipeline — Batch, prompt, import, validation | Planned |
| M3 | Diagram Pipeline — Jobs, R2, rendering | Planned |
| M4 | Review & Export — SME workflow, export engine, n8n sync | Planned |
| M5 | Admin Config — Field Registry, subject profiles, schema versions | Planned |
| M6 | Deployment & Testing | Planned |

## Documentation

See `Documentation/` folder for full specs.

## Default Login (seed data)

```
Email: superadmin@questiongen.com
Password: Admin@123
```
