import { NextResponse } from "next/server"

import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit"
import {
  issueSessionCapability,
  SESSION_TTL_SECONDS,
  sessionCookieName,
  validSessionId,
} from "@/lib/security/session-capability"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const limited = rateLimitResponse(
    checkRateLimit(request, {
      namespace: "session-issue",
      limit: 20,
      windowMs: 60_000,
    })
  )
  if (limited) return limited

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const requested = (body as { session_id?: unknown } | null)?.session_id
  const sessionId = requested === undefined ? crypto.randomUUID() : requested
  if (!validSessionId(sessionId)) {
    return NextResponse.json({ error: "Invalid session_id" }, { status: 422 })
  }

  const capability = issueSessionCapability(sessionId)
  const response = NextResponse.json({
    session_id: sessionId,
    authorization: "session-capability",
    expires_at: capability.expiresAt,
  })
  response.cookies.set(sessionCookieName(sessionId), capability.token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    priority: "high",
  })
  return response
}
