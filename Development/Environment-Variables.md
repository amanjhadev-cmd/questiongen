# Environment Variables

## Backend (.env)

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | Yes | API server port (default: 4000) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | Yes | e.g. `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Yes | e.g. `7d` |
| `R2_ENDPOINT` | Yes | Cloudflare R2 endpoint URL |
| `R2_ACCESS_KEY_ID` | Yes | R2 API access key |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 API secret |
| `R2_BUCKET_NAME` | Yes | R2 bucket name |
| `R2_PUBLIC_URL` | Yes | Public URL prefix for R2 assets |
| `N8N_WEBHOOK_URL` | Yes | n8n webhook URL for generation trigger |
| `N8N_SECRET_HEADER` | Yes | Shared secret for n8n webhook auth |
| `FRONTEND_URL` | Yes | Frontend URL (for CORS) |

## Frontend (.env.local)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL |

## Rules

- Never commit `.env` files. They are in `.gitignore`.
- `.env.example` files (with placeholder values) ARE committed.
- Local dev uses `.env.local` (loaded by Next.js) and `.env` (loaded by dotenv in backend).
- Production env vars are set directly on the server, not in files.
