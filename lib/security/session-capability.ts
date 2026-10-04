import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

export const SESSION_COOKIE = "hn_session_capability"
export const SESSION_TTL_SECONDS = 8 * 60 * 60

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const globalSecurity = globalThis as unknown as {
  __hacknationDevSessionSecret?: string
}

export type SecurityMode = "report" | "enforce"

export interface SessionAuthorization {
  ok: boolean
  status?: 401 | 403 | 503
  error?: string
  enforced: boolean
}

export function validSessionId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

export function sessionCookieName(sessionId: string): string {
  if (!validSessionId(sessionId)) throw new Error("Invalid session id")
  return `${SESSION_COOKIE}_${sessionId}`
}

export function getSecurityMode(): SecurityMode {
  return process.env.APP_SECURITY_MODE?.trim().toLowerCase() === "enforce"
    ? "enforce"
    : "report"
}

export function hasPersistentSessionSecret(): boolean {
  return (process.env.APP_SESSION_SECRET?.trim().length ?? 0) >= 32
}

function signingSecret(): string {
  const configured = process.env.APP_SESSION_SECRET?.trim()
  if (configured) return configured
  return (globalSecurity.__hacknationDevSessionSecret ??=
    randomBytes(32).toString("base64url"))
}

function signature(value: string): string {
  return createHmac("sha256", signingSecret()).update(value).digest("base64url")
}

export function issueSessionCapability(
  sessionId: string,
  now = Date.now()
): { token: string; expiresAt: string } {
  if (!validSessionId(sessionId)) throw new Error("Invalid session id")
  const expires = Math.floor(now / 1000) + SESSION_TTL_SECONDS
  const value = `${sessionId}.${expires}`
  return {
    token: `${value}.${signature(value)}`,
    expiresAt: new Date(expires * 1000).toISOString(),
  }
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie")
  if (!header) return null
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=")
    if (key === name) return decodeURIComponent(value.join("="))
  }
  return null
}

export function verifySessionCapability(
  token: string | null,
  expectedSessionId: string,
  now = Date.now()
): boolean {
  if (!token || !validSessionId(expectedSessionId)) return false
  const [sessionId, expiresText, supplied] = token.split(".")
  const expires = Number(expiresText)
  if (
    sessionId !== expectedSessionId ||
    !Number.isInteger(expires) ||
    expires <= Math.floor(now / 1000) ||
    !supplied
  ) {
    return false
  }
  const expected = signature(`${sessionId}.${expires}`)
  const left = Buffer.from(supplied)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

function firstHeaderValue(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim()
  return first ? first : null
}

// Browsers always send an honest Origin and Host on same-site requests, so the
// request is same-origin when Origin names the host the client actually
// addressed. `request.url` alone is not reliable: the framework can rebuild it
// from its bind hostname (for example localhost while the client used
// 127.0.0.1), which would reject every legitimate mutation.
function hasAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return process.env.ALLOW_ORIGINLESS_API === "true"
  try {
    const parsed = new URL(origin)
    const requestUrl = new URL(request.url)
    if (parsed.origin === requestUrl.origin) return true
    const host =
      firstHeaderValue(request.headers.get("x-forwarded-host")) ??
      firstHeaderValue(request.headers.get("host"))
    const protocol = `${(
      firstHeaderValue(request.headers.get("x-forwarded-proto")) ??
      requestUrl.protocol.replace(":", "")
    ).toLowerCase()}:`
    return host !== null && parsed.host === host && parsed.protocol === protocol
  } catch {
    return false
  }
}

/**
 * Session UUIDs are bearer capabilities, not human identity. In report mode
 * this records the boundary without breaking the existing hackathon demo. In
 * enforce mode every session-scoped route must carry a matching signed cookie.
 */
export function authorizeSessionRequest(
  request: Request,
  sessionId: string
): SessionAuthorization {
  const enforced = getSecurityMode() === "enforce"
  if (!enforced) return { ok: true, enforced: false }
  if (!hasPersistentSessionSecret()) {
    return {
      ok: false,
      status: 503,
      error:
        "Session authorization is enabled but APP_SESSION_SECRET is not configured.",
      enforced,
    }
  }
  if (request.method !== "GET" && !hasAllowedOrigin(request)) {
    return {
      ok: false,
      status: 403,
      error: "Cross-origin or originless mutation rejected.",
      enforced,
    }
  }
  const token = readCookie(request, sessionCookieName(sessionId))
  if (!verifySessionCapability(token, sessionId)) {
    return {
      ok: false,
      status: 401,
      error: "A valid capability for this session is required.",
      enforced,
    }
  }
  return { ok: true, enforced }
}

export function sessionAuthorizationResponse(
  authorization: SessionAuthorization
): Response | null {
  if (authorization.ok) return null
  return Response.json(
    { error: authorization.error, authorization_required: true },
    { status: authorization.status ?? 401 }
  )
}
