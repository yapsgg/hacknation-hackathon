interface Bucket {
  count: number
  resetsAt: number
}

export interface RateLimitOptions {
  namespace: string
  limit: number
  windowMs: number
  key?: string
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetSeconds: number
}

const MAX_BUCKETS = 5_000
const globalRateLimits = globalThis as unknown as {
  __hacknationRateLimits?: Map<string, Bucket>
}
const buckets = (globalRateLimits.__hacknationRateLimits ??= new Map())

function requestIdentity(request?: Request): string {
  if (!request) return "internal-test"
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim()
  return forwarded || request.headers.get("x-real-ip") || "unknown-client"
}

function prune(now: number) {
  if (buckets.size < MAX_BUCKETS) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetsAt <= now) buckets.delete(key)
  }
  while (buckets.size >= MAX_BUCKETS) {
    const oldest = buckets.keys().next().value as string | undefined
    if (!oldest) break
    buckets.delete(oldest)
  }
}

/** Single-instance limiter. Production readiness still requires a shared store. */
export function checkRateLimit(
  request: Request | undefined,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  prune(now)
  const id = options.key || requestIdentity(request)
  const bucketKey = `${options.namespace}:${id}`
  let bucket = buckets.get(bucketKey)
  if (!bucket || bucket.resetsAt <= now) {
    bucket = { count: 0, resetsAt: now + options.windowMs }
    buckets.set(bucketKey, bucket)
  }
  bucket.count += 1
  const remaining = Math.max(0, options.limit - bucket.count)
  return {
    allowed: bucket.count <= options.limit,
    limit: options.limit,
    remaining,
    resetSeconds: Math.max(1, Math.ceil((bucket.resetsAt - now) / 1000)),
  }
}

export function rateLimitResponse(result: RateLimitResult): Response | null {
  if (result.allowed) return null
  return Response.json(
    { error: "Rate limit exceeded", retry_after_seconds: result.resetSeconds },
    {
      status: 429,
      headers: {
        "retry-after": String(result.resetSeconds),
        "x-ratelimit-limit": String(result.limit),
        "x-ratelimit-remaining": "0",
      },
    }
  )
}
