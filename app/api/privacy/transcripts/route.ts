import { NextResponse } from "next/server"

import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { redactTranscript } from "@/lib/privacy"
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit"
import {
  authorizeSessionRequest,
  sessionAuthorizationResponse,
} from "@/lib/security/session-capability"

export const runtime = "nodejs"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const globalForTranscripts = globalThis as unknown as {
  __dealDeskTranscripts?: Array<Record<string, unknown>>
}
const memory = (globalForTranscripts.__dealDeskTranscripts ??= [])

export function purgeMemoryTranscripts(
  sessionId: string,
  from: number,
  to: number
): number {
  const before = memory.length
  const retained = memory.filter((row) => {
    const rowSession = row.session_id
    const rowT = row.t
    return (
      rowSession !== sessionId ||
      typeof rowT !== "number" ||
      rowT < from ||
      rowT > to
    )
  })
  memory.splice(0, memory.length, ...retained)
  return before - memory.length
}

export async function POST(request: Request) {
  const limited = rateLimitResponse(
    checkRateLimit(request, {
      namespace: "transcript-store",
      limit: 120,
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

  const { session_id, t, role, text } = (body ?? {}) as Record<string, unknown>
  if (
    typeof session_id !== "string" ||
    !UUID_RE.test(session_id) ||
    typeof t !== "number" ||
    t < 0 ||
    (role !== "user" && role !== "agent") ||
    typeof text !== "string" ||
    text.length === 0 ||
    text.length > 100_000
  ) {
    return NextResponse.json({ error: "Invalid transcript" }, { status: 422 })
  }

  const unauthorized = sessionAuthorizationResponse(
    authorizeSessionRequest(request, session_id)
  )
  if (unauthorized) return unauthorized

  try {
    const redacted = await redactTranscript(text)
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      memory.push({ session_id, t, role, ...redacted })
      if (memory.length > 500) memory.splice(0, memory.length - 500)
      return NextResponse.json({ ok: true, store: "memory", ...redacted })
    }

    const ensured = await supabase
      .from("sessions")
      .upsert({ id: session_id, mode: "teach" }, { onConflict: "id" })
    if (ensured.error) throw new Error(ensured.error.message)
    const inserted = await supabase.from("transcripts").insert({
      session_id,
      t,
      role,
      redacted_text: redacted.text,
      redaction_count: redacted.redactions,
      redaction_provider: redacted.provider,
    })
    if (inserted.error) throw new Error(inserted.error.message)
    return NextResponse.json({
      ok: true,
      store: "supabase",
      redactions: redacted.redactions,
      provider: redacted.provider,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Transcript storage failed",
        storage_blocked: true,
      },
      { status: 502 }
    )
  }
}
