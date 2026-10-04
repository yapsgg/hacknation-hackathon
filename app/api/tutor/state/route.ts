import { NextResponse } from "next/server"

import { recordAudit } from "@/lib/audit"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { INITIAL_MASTERY, TUTOR_RULES } from "@/lib/tutor"
import type { MasteryState } from "@/lib/types"
import {
  authorizeSessionRequest,
  sessionAuthorizationResponse,
} from "@/lib/security/session-capability"

export const runtime = "nodejs"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_STATES = new Set<MasteryState>([
  "unseen",
  "hit",
  "missed",
  "shown",
  "predicted",
  "applied",
])
const VALID_RULES = new Set(TUTOR_RULES.map((rule) => rule.id))

interface MemoryTutorState {
  approved: boolean
  mastery: Record<string, Record<string, MasteryState>>
  audit: Array<Record<string, unknown>>
}

const globalForTutor = globalThis as unknown as {
  __dealDeskTutorState?: MemoryTutorState
}
const memory = (globalForTutor.__dealDeskTutorState ??= {
  approved: true,
  mastery: {},
  audit: [],
})

async function ensureSession(sessionId: string) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null
  const { error } = await supabase
    .from("sessions")
    .upsert({ id: sessionId, mode: "teach" }, { onConflict: "id" })
  if (error) throw new Error(error.message)
  return supabase
}

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id")
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "session_id required" }, { status: 422 })
  }
  const unauthorized = sessionAuthorizationResponse(
    authorizeSessionRequest(request, sessionId)
  )
  if (unauthorized) return unauthorized

  try {
    const supabase = await ensureSession(sessionId)
    if (!supabase) {
      return NextResponse.json({
        store: "memory",
        approved: memory.approved,
        mastery: { ...INITIAL_MASTERY, ...(memory.mastery[sessionId] ?? {}) },
      })
    }

    const [workMap, mastery] = await Promise.all([
      supabase
        .from("work_maps")
        .select("confirmed_by_expert")
        .eq("is_seed", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("mastery")
        .select("rule_id,state")
        .eq("session_id", sessionId),
    ])
    if (workMap.error) throw new Error(workMap.error.message)
    if (mastery.error) throw new Error(mastery.error.message)

    const persisted = Object.fromEntries(
      (mastery.data ?? []).map((row) => [
        row.rule_id,
        row.state as MasteryState,
      ])
    )
    return NextResponse.json({
      store: "supabase",
      approved: workMap.data?.confirmed_by_expert ?? false,
      mastery: { ...INITIAL_MASTERY, ...persisted },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tutor state failed" },
      { status: 500 }
    )
  }
}
export async function PATCH(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const input = (body ?? {}) as Record<string, unknown>
  const sessionId = input.session_id
  if (typeof sessionId !== "string" || !UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session_id" }, { status: 422 })
  }
  const unauthorized = sessionAuthorizationResponse(
    authorizeSessionRequest(request, sessionId)
  )
  if (unauthorized) return unauthorized

  try {
    const supabase = await ensureSession(sessionId)
    if (input.action === "mastery") {
      const ruleId = input.rule_id
      const state = input.state
      if (
        typeof ruleId !== "string" ||
        !VALID_RULES.has(ruleId) ||
        typeof state !== "string" ||
        !VALID_STATES.has(state as MasteryState)
      ) {
        return NextResponse.json(
          { error: "Invalid mastery update" },
          { status: 422 }
        )
      }

      if (!supabase) {
        memory.mastery[sessionId] = {
          ...(memory.mastery[sessionId] ?? {}),
          [ruleId]: state as MasteryState,
        }
        memory.audit.push({
          sessionId,
          action: "mastery_updated",
          ruleId,
          state,
        })
        return NextResponse.json({ ok: true, store: "memory" })
      }

      const updated = await supabase
        .from("mastery")
        .upsert(
          { session_id: sessionId, rule_id: ruleId, state },
          { onConflict: "session_id,rule_id" }
        )
      if (updated.error) throw new Error(updated.error.message)
      const auditPersisted = await recordAudit(supabase, {
        sessionId,
        action: "mastery_updated",
        metadata: { rule_id: ruleId, state },
      })
      return NextResponse.json({ ok: true, store: "supabase", auditPersisted })
    }

    if (input.action === "approval" && typeof input.approved === "boolean") {
      const approved = input.approved
      if (!supabase) {
        memory.approved = approved
        memory.audit.push({
          sessionId,
          action: approved ? "work_map_approved" : "work_map_revoked",
        })
        return NextResponse.json({ ok: true, store: "memory", approved })
      }

      const updated = await supabase
        .from("work_maps")
        .update({ confirmed_by_expert: approved })
        .eq("is_seed", true)
      if (updated.error) throw new Error(updated.error.message)
      const auditPersisted = await recordAudit(supabase, {
        sessionId,
        action: approved ? "work_map_approved" : "work_map_revoked",
        actor: "expert",
      })
      return NextResponse.json({
        ok: true,
        store: "supabase",
        approved,
        auditPersisted,
      })
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 422 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tutor update failed" },
      { status: 500 }
    )
  }
}
