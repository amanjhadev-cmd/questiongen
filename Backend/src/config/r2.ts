import { S3Client } from '@aws-sdk/client-s3'
import { env } from './env'

// Region: 'auto' works for Cloudflare R2; AWS S3 needs the bucket's real region
// (SigV4 signing requires it). Parse it from the endpoint if not set explicitly.
function regionFromEndpoint(endpoint?: string): string | undefined {
  if (!endpoint) return undefined
  return endpoint.match(/s3[.-]([a-z0-9-]+)\.amazonaws\.com/)?.[1]
}

const region = env.R2_REGION ?? regionFromEndpoint(env.R2_ENDPOINT) ?? 'auto'

export const r2Client = env.R2_ENDPOINT
  ? new S3Client({
      region,
      endpoint: env.R2_ENDPOINT,
      forcePathStyle: env.R2_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? '',
      },
    })
  : null

export const R2_BUCKET = env.R2_BUCKET_NAME ?? ''
export const R2_PUBLIC_URL = env.R2_PUBLIC_URL ?? ''
