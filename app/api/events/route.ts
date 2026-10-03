import { NextResponse } from "next/server"

import { getSupabaseAdmin } from "@/lib/supabase/admin"
import type { CaptureEvent } from "@/lib/types"

export const runtime = "nodejs"

const MAX_MEMORY_EVENTS = 500
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// In-memory fallback used when Supabase env vars are not set. Lost on restart,
// and not shared across serverless instances.
const globalForEvents = globalThis as unknown as {
  __dealDeskEvents?: { session_id: string; event: CaptureEvent }[]
}
const memory = (globalForEvents.__dealDeskEvents ??= [])

const VALID_TYPES = new Set<CaptureEvent["type"]>([
  "field_changed",
  "doc_opened",
  "doc_scrolled",
  "value_entered",
  "save_clicked",
  "navigation",
])

function isValidEvent(value: unknown): value is CaptureEvent {
  if (typeof value !== "object" || value === null) return false
  const event = value as Record<string, unknown>
  return (
    typeof event.t === "number" &&
    event.t >= 0 &&
    typeof event.type === "string" &&
    VALID_TYPES.has(event.type as CaptureEvent["type"]) &&
    typeof event.object === "string"
  )
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { session_id, event } = (body ?? {}) as {
    session_id?: unknown
    event?: unknown
  }
  if (typeof session_id !== "string" || !UUID_RE.test(session_id)) {
    return NextResponse.json({ error: "Invalid session_id" }, { status: 422 })
  }
  if (!isValidEvent(event)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 422 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    memory.push({ session_id, event })
    if (memory.length > MAX_MEMORY_EVENTS) {
      memory.splice(0, memory.length - MAX_MEMORY_EVENTS)
    }
    return NextResponse.json({ ok: true, store: "memory" })
  }

  const ensured = await supabase
    .from("sessions")
    .upsert({ id: session_id }, { onConflict: "id", ignoreDuplicates: true })
  if (ensured.error) {
    return NextResponse.json({ error: ensured.error.message }, { status: 500 })
  }

  const inserted = await supabase.from("events").insert({
    session_id,
    t: event.t,
    type: event.type,
    object: event.object,
    field: event.field ?? null,
    from_val: event.from ?? null,
    to_val: event.to ?? null,
    evidence_frame: event.evidence_frame ?? null,
    salient_text: event.salient_text ?? [],
    confidence: event.confidence ?? null,
    source: event.source ?? "app",
  })
  if (inserted.error) {
    return NextResponse.json({ error: inserted.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, store: "supabase" })
}

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id")
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    const rows = memory.filter((m) => !sessionId || m.session_id === sessionId)
    return NextResponse.json({
      store: "memory",
      events: rows.map((m) => m.event),
    })
  }

  if (!sessionId || !UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "session_id required" }, { status: 422 })
  }

  const { data, error } = await supabase
    .from("events")
    .select("t,type,object,field,from_val,to_val,evidence_frame,salient_text,confidence,source")
    .eq("session_id", sessionId)
    .order("t", { ascending: true })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const events: CaptureEvent[] = (data ?? []).map((row) => ({
    t: Number(row.t),
    type: row.type,
    object: row.object,
    field: row.field,
    from: row.from_val,
    to: row.to_val,
    evidence_frame: row.evidence_frame,
    salient_text: row.salient_text,
    confidence: row.confidence === null ? null : Number(row.confidence),
    source: row.source,
  }))
  return NextResponse.json({ store: "supabase", events })
}
