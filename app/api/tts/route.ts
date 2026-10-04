import { NextResponse } from "next/server"

import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit"
import {
  authorizeSessionRequest,
  sessionAuthorizationResponse,
  validSessionId,
} from "@/lib/security/session-capability"

export const runtime = "nodejs"

const DEFAULT_VOICE_ID = "eXpIbVcVbLo8ZJQDlDnl" // the Interviewer agent's voice
const DEFAULT_MODEL = "eleven_turbo_v2_5"
const MAX_TEXT = 600

/**
 * Server-side ElevenLabs text-to-speech for the spoken debrief and the capture
 * fallback, so the apprentice speaks with the same voice as the live
 * Interviewer instead of the browser's robotic voice. Fails closed (503) when
 * the key is missing; the client then falls back to browser speech.
 */
export async function POST(request: Request) {
  const limited = rateLimitResponse(
    checkRateLimit(request, { namespace: "tts", limit: 60, windowMs: 60_000 })
  )
  if (limited) return limited

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const { session_id, text } = (body ?? {}) as Record<string, unknown>
  if (
    !validSessionId(session_id) ||
    typeof text !== "string" ||
    text.trim().length === 0 ||
    text.length > MAX_TEXT
  ) {
    return NextResponse.json({ error: "Invalid TTS request" }, { status: 422 })
  }
  const unauthorized = sessionAuthorizationResponse(
    authorizeSessionRequest(request, session_id)
  )
  if (unauthorized) return unauthorized

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs voice is not configured.", missing: ["ELEVENLABS_API_KEY"] },
      { status: 503 }
    )
  }
  const voiceId =
    process.env.ELEVENLABS_TTS_VOICE_ID?.trim() || DEFAULT_VOICE_ID
  const model = process.env.ELEVENLABS_TTS_MODEL?.trim() || DEFAULT_MODEL

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({ text, model_id: model }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    }
  ).catch(() => null)
  if (!response || !response.ok) {
    return NextResponse.json(
      { error: "Voice synthesis failed" },
      { status: 502 }
    )
  }
  const audio = await response.arrayBuffer()
  if (audio.byteLength === 0) {
    return NextResponse.json({ error: "Empty audio" }, { status: 502 })
  }
  return new NextResponse(audio, {
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": "no-store",
    },
  })
}
