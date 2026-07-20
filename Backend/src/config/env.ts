import 'dotenv/config'
import { z } from 'zod'

// An optional URL that treats empty string / whitespace as "not set" so a blank
// placeholder in .env (e.g. `R2_ENDPOINT=`) doesn't crash startup.
const optionalUrl = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().url().optional(),
)

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  R2_ENDPOINT: optionalUrl,
  R2_REGION: z.string().optional(),  // 'auto' for Cloudflare R2; real region (e.g. ap-south-1) for AWS S3
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: optionalUrl,
  R2_FORCE_PATH_STYLE: z.enum(['true', 'false']).optional(),  // set true for some S3-compatible/MinIO setups
  N8N_WEBHOOK_URL: optionalUrl,
  N8N_SECRET_HEADER: z.string().optional(),
  // AWS SQS (alternative to n8n for pushing the final JSON to production)
  SQS_QUEUE_URL: optionalUrl,
  SQS_REGION: z.string().optional(),
  SQS_ACCESS_KEY_ID: z.string().optional(),
  SQS_SECRET_ACCESS_KEY: z.string().optional(),
  FRONTEND_URL: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().url().default('http://localhost:3000'),
  ),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
