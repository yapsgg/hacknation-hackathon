import { Buffer } from "node:buffer"
import { NextResponse } from "next/server"

import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit"
import {
  authorizeSessionRequest,
  sessionAuthorizationResponse,
  validSessionId,
} from "@/lib/security/session-capability"
import { extractRedactedFrame, VisionConfigurationError } from "@/lib/vision"

export const runtime = "nodejs"

const DATA_URL_RE = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/

export async function POST(request: Request) {
  const limited = rateLimitResponse(
    checkRateLimit(request, {
      namespace: "vision-extract",
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
  const { session_id, frame_id, t, data_url, previous_state } = (body ??
    {}) as Record<string, unknown>
  const match =
    typeof data_url === "string" ? data_url.match(DATA_URL_RE) : null
  if (
    !validSessionId(session_id) ||
    typeof frame_id !== "string" ||
    !/^[A-Za-z0-9_-]{1,80}$/.test(frame_id) ||
    typeof t !== "number" ||
    t < 0 ||
    !match ||
    (previous_state !== undefined &&
      (typeof previous_state !== "string" || previous_state.length > 4_000))
  ) {
    return NextResponse.json({ error: "Invalid vision frame" }, { status: 422 })
  }
  if (Buffer.from(match[1], "base64").length > 250_000) {
    return NextResponse.json({ error: "Frame exceeds 250KB" }, { status: 413 })
  }
  const unauthorized = sessionAuthorizationResponse(
    authorizeSessionRequest(request, session_id)
  )
  if (unauthorized) return unauthorized

  try {
    return NextResponse.json(
      await extractRedactedFrame({
        dataUrl: data_url as string,
        frameId: frame_id,
        t,
        previousState: previous_state as string | undefined,
      })
    )
  } catch (error) {
    if (error instanceof VisionConfigurationError) {
      return NextResponse.json(
        {
          error: "Vision extraction is not configured.",
          missing: error.missing,
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Vision extraction failed",
        frame_discarded: true,
      },
      { status: 502 }
    )
  }
}
