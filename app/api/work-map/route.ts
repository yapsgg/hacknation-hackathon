import { NextResponse } from "next/server"

import { recordAudit } from "@/lib/audit"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import type { CaptureEvent, WorkMap, WorkMapGap } from "@/lib/types"
import {
  buildWorkMapDraft,
  type WorkMapAnswer,
  type WorkMapCorrection,
} from "@/lib/work-map-builder"

export const runtime = "nodejs"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EVENT_TYPES = new Set([
  "field_changed",
  "doc_opened",
  "doc_scrolled",
  "value_entered",
  "save_clicked",
  "navigation",
])
const MAX_BODY_BYTES = 512_000

const globalForWorkMap = globalThis as unknown as {
  __dealDeskWorkMaps?: Map<string, WorkMap>
}
const memory = (globalForWorkMap.__dealDeskWorkMaps ??= new Map())

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function validText(value: unknown, max = 2_000): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max
}

function validEvent(value: unknown): value is CaptureEvent {
  if (!isRecord(value)) return false
  return (
    typeof value.t === "number" &&
    value.t >= 0 &&
    typeof value.type === "string" &&
    EVENT_TYPES.has(value.type) &&
    validText(value.object, 1_000) &&
    (value.field === undefined || value.field === null || typeof value.field === "string") &&
    (value.salient_text === undefined ||
      (Array.isArray(value.salient_text) &&
        value.salient_text.length <= 50 &&
        value.salient_text.every((item) => typeof item === "string")))
  )
}

function validAnswer(value: unknown): value is WorkMapAnswer {
  return (
    isRecord(value) &&
    validText(value.id, 200) &&
    Number.isInteger(value.step_id) &&
    Number(value.step_id) > 0 &&
    typeof value.asked_t === "number" &&
    value.asked_t >= 0 &&
    validText(value.answer)
  )
}

function validCorrection(value: unknown): value is WorkMapCorrection {
  return (
    isRecord(value) &&
    Number.isInteger(value.step_id) &&
    Number(value.step_id) > 0 &&
    validText(value.text)
  )
}

function validGap(value: unknown): value is WorkMapGap {
  return (
    isRecord(value) &&
    validText(value.id, 200) &&
    validText(value.question, 1_000) &&
    (value.step_id === undefined ||
      value.step_id === null ||
      (Number.isInteger(value.step_id) && Number(value.step_id) > 0)) &&
    (value.risk === undefined || ["high", "medium", "low"].includes(String(value.risk))) &&
    (value.status === undefined || ["open", "closed", "waived"].includes(String(value.status)))
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
        work_map: memory.get(sessionId) ?? null,
      })
    }
    const result = await supabase
      .from("work_maps")
      .select("data,created_at")
      .eq("session_id", sessionId)
      .eq("is_seed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (result.error) throw new Error(result.error.message)
    return NextResponse.json({
      store: "supabase",
      work_map: result.data?.data ?? null,
      updated_at: result.data?.created_at ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Work Map read failed" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const raw = await request.text()
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Work Map payload too large" }, { status: 413 })
  }

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!isRecord(body) || typeof body.session_id !== "string" || !UUID_RE.test(body.session_id)) {
    return NextResponse.json({ error: "Invalid session_id" }, { status: 422 })
  }

  const events = body.events
  const answers = body.answers ?? []
  const gaps = body.gaps ?? []
  const corrections = body.corrections ?? []
  const confirmedStepIds = body.confirmed_step_ids ?? []
  if (
    !Array.isArray(events) ||
    events.length > 500 ||
    !events.every(validEvent) ||
    !Array.isArray(answers) ||
    answers.length > 100 ||
    !answers.every(validAnswer) ||
    !Array.isArray(gaps) ||
    gaps.length > 100 ||
    !gaps.every(validGap) ||
    !Array.isArray(corrections) ||
    corrections.length > 100 ||
    !corrections.every(validCorrection) ||
    !Array.isArray(confirmedStepIds) ||
    !confirmedStepIds.every((value) => Number.isInteger(value) && Number(value) > 0) ||
    (body.confirmed_by_expert !== undefined && typeof body.confirmed_by_expert !== "boolean") ||
    (body.expert !== undefined && body.expert !== null && !validText(body.expert, 200))
  ) {
    return NextResponse.json({ error: "Invalid Work Map evidence" }, { status: 422 })
  }

  try {
    const workMap = buildWorkMapDraft({
      sessionId: body.session_id,
      events,
      answers,
      gaps,
      corrections,
      confirmedStepIds,
      confirmedByExpert: body.confirmed_by_expert ?? false,
      expert: body.expert ?? null,
    })
    const supabase = await ensureSession(body.session_id)
    if (!supabase) {
      memory.set(body.session_id, workMap)
      return NextResponse.json({ store: "memory", work_map: workMap })
    }
    const inserted = await supabase.from("work_maps").insert({
      session_id: body.session_id,
      data: workMap,
      confirmed_by_expert: workMap.confirmed_by_expert ?? false,
      correction_count: workMap.correction_count ?? 0,
      is_seed: false,
    })
    if (inserted.error) throw new Error(inserted.error.message)
    const auditPersisted = await recordAudit(supabase, {
      sessionId: body.session_id,
      action: "work_map_compiled",
      metadata: {
        event_count: events.length,
        answer_count: answers.length,
        correction_count: corrections.length,
        confirmed_by_expert: workMap.confirmed_by_expert ?? false,
      },
    })
    return NextResponse.json({
      store: "supabase",
      work_map: workMap,
      audit_persisted: auditPersisted,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Work Map build failed" },
      { status: 500 }
    )
  }
}
