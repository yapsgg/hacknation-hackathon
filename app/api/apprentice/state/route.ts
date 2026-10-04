import { NextResponse } from "next/server"

import { recordAudit } from "@/lib/audit"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_BODY_BYTES = 256_000
const PAGES = new Set([
  "overview",
  "capture",
  "debrief",
  "map",
  "teach",
  "results",
  "export",
  "trust",
])

interface StoredState {
  version: 1
  page: string
  cap: Record<string, unknown>
  gaps: Record<string, unknown>
  claims: Record<string, unknown>
  signed: boolean
  struck: Record<string, unknown>
  custom: Record<string, unknown>
  mapStep: number
  teach: Record<string, unknown>
  settings: Record<string, unknown>
}

const memory = new Map<string, StoredState>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasBoundedArray(value: unknown, key: string, max: number): boolean {
  if (!isRecord(value) || value[key] === undefined) return true
  return Array.isArray(value[key]) && value[key].length <= max
}

function validState(value: unknown): value is StoredState {
  if (!isRecord(value)) return false
  if (value.version !== 1 || typeof value.page !== "string" || !PAGES.has(value.page)) {
    return false
  }
  if (
    !isRecord(value.cap) ||
    !isRecord(value.gaps) ||
    !isRecord(value.claims) ||
    typeof value.signed !== "boolean" ||
    !isRecord(value.struck) ||
    !isRecord(value.custom) ||
    !Number.isInteger(value.mapStep) ||
    Number(value.mapStep) < 1 ||
    !isRecord(value.teach) ||
    !isRecord(value.settings)
  ) {
    return false
  }
  return (
    hasBoundedArray(value.cap, "events", 500) &&
    hasBoundedArray(value.cap, "transcript", 500) &&
    hasBoundedArray(value.cap, "asked", 100) &&
    hasBoundedArray(value.teach, "log", 500)
  )
}

async function ensureSession(sessionId: string) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null
  const { error } = await supabase
    .from("sessions")
    .upsert({ id: sessionId, mode: "interview" }, { onConflict: "id" })
  if (error) throw new Error(error.message)
  return supabase
}

function sessionIdFrom(request: Request): string | null {
  const sessionId = new URL(request.url).searchParams.get("session_id")
  return sessionId && UUID_RE.test(sessionId) ? sessionId : null
}

export async function GET(request: Request) {
  const sessionId = sessionIdFrom(request)
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 422 })
  }

  try {
    const supabase = await ensureSession(sessionId)
    if (!supabase) {
      return NextResponse.json({
        store: "memory",
        state: memory.get(sessionId) ?? null,
      })
    }

    const result = await supabase
      .from("apprentice_states")
      .select("state,updated_at")
      .eq("session_id", sessionId)
      .maybeSingle()
    if (result.error) throw new Error(result.error.message)
    return NextResponse.json({
      store: "supabase",
      state: result.data?.state ?? null,
      updated_at: result.data?.updated_at ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Apprentice state failed",
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  const sessionId = sessionIdFrom(request)
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 422 })
  }

  const raw = await request.text()
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "State payload too large" }, { status: 413 })
  }

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const state = isRecord(body) ? body.state : null
  if (!validState(state)) {
    return NextResponse.json({ error: "Invalid Apprentice state" }, { status: 422 })
  }

  try {
    const supabase = await ensureSession(sessionId)
    if (!supabase) {
      memory.set(sessionId, state)
      return NextResponse.json({ ok: true, store: "memory" })
    }

    const saved = await supabase.from("apprentice_states").upsert(
      {
        session_id: sessionId,
        state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    )
    if (saved.error) throw new Error(saved.error.message)
    const auditPersisted = await recordAudit(supabase, {
      sessionId,
      action: "apprentice_state_saved",
      metadata: { version: state.version, page: state.page },
    })
    return NextResponse.json({
      ok: true,
      store: "supabase",
      audit_persisted: auditPersisted,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Apprentice state failed",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const sessionId = sessionIdFrom(request)
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 422 })
  }

  try {
    const supabase = await ensureSession(sessionId)
    if (!supabase) {
      memory.delete(sessionId)
      return NextResponse.json({ ok: true, store: "memory" })
    }
    const removed = await supabase
      .from("apprentice_states")
      .delete()
      .eq("session_id", sessionId)
    if (removed.error) throw new Error(removed.error.message)
    const auditPersisted = await recordAudit(supabase, {
      sessionId,
      action: "apprentice_state_deleted",
      actor: "user",
    })
    return NextResponse.json({
      ok: true,
      store: "supabase",
      audit_persisted: auditPersisted,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Apprentice state failed",
      },
      { status: 500 }
    )
  }
}
