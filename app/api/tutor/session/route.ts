import { NextResponse } from "next/server"

import {
  createSignedConversationSession,
  VoiceConfigurationError,
} from "@/lib/elevenlabs-session"
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit"
import {
  authorizeSessionRequest,
  getSecurityMode,
  sessionAuthorizationResponse,
  validSessionId,
} from "@/lib/security/session-capability"

export const runtime = "nodejs"

export async function POST(request?: Request) {
  const limited = rateLimitResponse(
    checkRateLimit(request, {
      namespace: "tutor-session",
      limit: 10,
      windowMs: 60_000,
    })
  )
  if (limited) return limited

  if (getSecurityMode() === "enforce") {
    const sessionId = request?.headers.get("x-session-id")
    if (!request || !validSessionId(sessionId)) {
      return NextResponse.json(
        { error: "A valid x-session-id is required." },
        { status: 401 }
      )
    }
    const unauthorized = sessionAuthorizationResponse(
      authorizeSessionRequest(request, sessionId)
    )
    if (unauthorized) return unauthorized
  }

  try {
    return NextResponse.json(
      await createSignedConversationSession("ELEVENLABS_TUTOR_AGENT_ID")
    )
  } catch (error) {
    if (error instanceof VoiceConfigurationError) {
      return NextResponse.json(
        { error: "Tutor voice is not configured.", missing: error.missing },
        { status: 503 }
      )
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Tutor session failed.",
      },
      { status: 502 }
    )
  }
}
