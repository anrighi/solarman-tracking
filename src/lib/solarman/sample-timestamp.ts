const SAMPLE_BUCKET_MS = 5 * 60 * 1000

export function normalizeToSampleBucket(date: Date) {
  const bucketStart = Math.floor(date.getTime() / SAMPLE_BUCKET_MS) * SAMPLE_BUCKET_MS
  return new Date(bucketStart)
}

export function isOnSampleBucketBoundary(date: Date) {
  return date.getTime() === normalizeToSampleBucket(date).getTime()
}
