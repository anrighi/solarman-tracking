import {
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import type { Readable } from 'node:stream'

export type ArchiveS3Config = {
  accessKeyId: string
  secretAccessKey: string
  endpoint: string
  region: string
  bucket: string
}

export function getArchiveS3Config(): ArchiveS3Config | null {
  const accessKeyId = process.env.CUBBIT_ACCESS_KEY_ID
  const secretAccessKey = process.env.CUBBIT_SECRET_ACCESS_KEY

  if (!accessKeyId || !secretAccessKey) {
    return null
  }

  return {
    accessKeyId,
    secretAccessKey,
    endpoint: process.env.CUBBIT_ENDPOINT ?? 'https://s3.cubbit.eu',
    region: process.env.CUBBIT_REGION ?? 'eu-west-1',
    bucket: process.env.CUBBIT_BUCKET ?? 'solar-tracking-app',
  }
}

export function isArchiveS3Configured() {
  return getArchiveS3Config() !== null
}

function normalizeEndpoint(endpoint: string) {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint
  }

  return `https://${endpoint}`
}

export function createArchiveS3Client(config = getArchiveS3Config()) {
  if (!config) {
    throw new Error('Credenziali Cubbit S3 non configurate')
  }

  return {
    client: new S3Client({
      region: config.region,
      endpoint: normalizeEndpoint(config.endpoint),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    }),
    bucket: config.bucket,
  }
}

async function streamToBuffer(body: Readable | Uint8Array | Blob | undefined) {
  if (!body) {
    return Buffer.alloc(0)
  }

  if (Buffer.isBuffer(body)) {
    return body
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body)
  }

  if (typeof (body as Blob).arrayBuffer === 'function') {
    return Buffer.from(await (body as Blob).arrayBuffer())
  }

  const chunks: Buffer[] = []
  for await (const chunk of body as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}

export async function putObject(input: {
  key: string
  body: Buffer
  contentType?: string
  contentEncoding?: string
}) {
  const { client, bucket } = createArchiveS3Client()

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      ContentEncoding: input.contentEncoding,
    }),
  )
}

export async function getObjectBuffer(key: string) {
  const { client, bucket } = createArchiveS3Client()

  try {
    const result = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    )

    return await streamToBuffer(result.Body as Readable | Uint8Array | undefined)
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }

    throw error
  }
}

export async function getObjectText(key: string) {
  const buffer = await getObjectBuffer(key)
  if (!buffer) {
    return null
  }

  return buffer.toString('utf8')
}

export async function listObjectKeys(prefix: string) {
  const { client, bucket } = createArchiveS3Client()
  const keys: string[] = []
  let continuationToken: string | undefined

  do {
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    )

    for (const item of result.Contents ?? []) {
      if (item.Key) {
        keys.push(item.Key)
      }
    }

    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined
  } while (continuationToken)

  return keys
}

export async function checkArchiveS3Reachable() {
  const config = getArchiveS3Config()
  if (!config) {
    return { configured: false, reachable: null as boolean | null, error: null as string | null }
  }

  try {
    const { client, bucket } = createArchiveS3Client(config)
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
    return { configured: true, reachable: true, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore S3 sconosciuto'
    return { configured: true, reachable: false, error: message }
  }
}

function isNotFoundError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false
  }

  const name = 'name' in error ? String(error.name) : ''
  const code =
    '$metadata' in error &&
    error.$metadata &&
    typeof error.$metadata === 'object' &&
    'httpStatusCode' in error.$metadata
      ? Number(error.$metadata.httpStatusCode)
      : null

  return name === 'NoSuchKey' || name === 'NotFound' || code === 404
}
