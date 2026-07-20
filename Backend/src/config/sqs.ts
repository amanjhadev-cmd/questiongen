import { SQSClient } from '@aws-sdk/client-sqs'
import { env } from './env'

// SQS queue URLs look like https://sqs.<region>.amazonaws.com/<account>/<name>
function regionFromQueueUrl(url?: string): string | undefined {
  if (!url) return undefined
  return url.match(/sqs\.([a-z0-9-]+)\.amazonaws\.com/)?.[1]
}

export const SQS_QUEUE_URL = env.SQS_QUEUE_URL ?? ''
const region = env.SQS_REGION ?? regionFromQueueUrl(env.SQS_QUEUE_URL) ?? 'us-east-1'

// Only built when a queue URL is configured; otherwise the SQS sync is disabled.
export const sqsClient = env.SQS_QUEUE_URL
  ? new SQSClient({
      region,
      ...(env.SQS_ACCESS_KEY_ID && env.SQS_SECRET_ACCESS_KEY
        ? { credentials: { accessKeyId: env.SQS_ACCESS_KEY_ID, secretAccessKey: env.SQS_SECRET_ACCESS_KEY } }
        : {}),
    })
  : null
