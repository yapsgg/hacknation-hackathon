import { NextResponse } from "next/server"

import { recordAudit } from "@/lib/audit"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import type { GapRisk, GapStatus } from "@/lib/types"

export const runtime = "nodejs"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const RISKS = new Set<GapRisk>(["high", "medium", "low"])
const STATUSES = new Set<GapStatus>(["open", "closed", "waived"])

interface QuestionRow {
  id: string
  session_id: string
  text: string
  anchor: string
  step_id: number | null
  asked_t: number
  answer: string | null
}

interface GapRow {
  id: string
  session_id: string
  question: string
  step_id: number | null
  risk: GapRisk
  status: GapStatus
}

interface InterviewMemory {
  questions: QuestionRow[]
  gaps: GapRow[]
  corrections: Record<string, number>
}

const globalForInterview = globalThis as unknown as {
  __dealDeskInterviewState?: InterviewMemory
}
const memory = (globalForInterview.__dealDeskInterviewState ??= {
  questions: [],
  gaps: [],
  corrections: {},
})

function validStep(value: unknown): value is number | undefined {
  return value === undefined || (Number.isInteger(value) && Number(value) > 0)
}

function shortText(value: unknown, max: number): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= max
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

async function readState(sessionId: string) {
  const supabase = await ensureSession(sessionId)
  if (!supabase) {
    return {
      store: "memory" as const,
      questions: memory.questions.filter((row) => row.session_id === sessionId),
      gaps: memory.gaps.filter((row) => row.session_id === sessionId),
      correction_count: memory.corrections[sessionId] ?? 0,
    }
  }

  const [questions, gaps, workMap] = await Promise.all([
    supabase
      .from("questions")
      .select("id,session_id,text,anchor,step_id,asked_t,answer")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    supabase
      .from("gaps")
      .select("id,session_id,question,step_id,risk,status")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    supabase
      .from("work_maps")
      .select("correction_count")
      .eq("is_seed", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  if (questions.error) throw new Error(questions.error.message)
  if (gaps.error) throw new Error(gaps.error.message)
  if (workMap.error) throw new Error(workMap.error.message)
  return {
    store: "supabase" as const,
    questions: questions.data ?? [],
    gaps: gaps.data ?? [],
    correction_count: Number(workMap.data?.correction_count ?? 0),
  }
}

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id")
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "session_id required" }, { status: 422 })
  }
  try {
    return NextResponse.json(await readState(sessionId))
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Interview state failed",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
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

  try {
    const supabase = await ensureSession(sessionId)
    if (input.action === "log_question") {
      if (
        !shortText(input.text, 500) ||
        !shortText(input.anchor, 500) ||
        !validStep(input.step_id) ||
        (input.asked_t !== undefined &&
          (typeof input.asked_t !== "number" || input.asked_t < 0))
      ) {
        return NextResponse.json({ error: "Invalid question" }, { status: 422 })
      }
      const row = {
        session_id: sessionId,
        text: input.text.trim(),
        anchor: input.anchor.trim(),
        step_id: input.step_id ?? null,
        asked_t: input.asked_t ?? 0,
      }
      if (!supabase) {
        const question = { id: crypto.randomUUID(), ...row, answer: null }
        memory.questions.push(question)
        return NextResponse.json({ question_id: question.id, store: "memory" })
      }
      const inserted = await supabase
        .from("questions")
        .insert(row)
        .select("id")
        .single()
      if (inserted.error) throw new Error(inserted.error.message)
      return NextResponse.json({
        question_id: inserted.data.id,
        store: "supabase",
      })
    }

    if (input.action === "mark_gap") {
      if (
        !shortText(input.question, 500) ||
        !validStep(input.step_id) ||
        typeof input.risk !== "string" ||
        !RISKS.has(input.risk as GapRisk)
      ) {
        return NextResponse.json({ error: "Invalid gap" }, { status: 422 })
      }
      const row = {
        session_id: sessionId,
        question: input.question.trim(),
        step_id: input.step_id ?? null,
        risk: input.risk as GapRisk,
        status: "open" as const,
      }
      if (!supabase) {
        const gap = { id: crypto.randomUUID(), ...row }
        memory.gaps.push(gap)
        return NextResponse.json({ gap_id: gap.id, store: "memory" })
      }
      const inserted = await supabase
        .from("gaps")
        .insert(row)
        .select("id")
        .single()
      if (inserted.error) throw new Error(inserted.error.message)
      return NextResponse.json({ gap_id: inserted.data.id, store: "supabase" })
    }

    if (input.action === "start_debrief") {
      const state = await readState(sessionId)
      const gaps = state.gaps.filter((gap) => gap.status === "open")
      return NextResponse.json({
        store: state.store,
        gaps,
        required_followups: Math.max(3, gaps.length),
      })
    }

    if (input.action === "submit_teachback_result") {
      if (
        !validStep(input.step_id) ||
        input.step_id === undefined ||
        typeof input.confirmed !== "boolean" ||
        (!input.confirmed && !shortText(input.correction, 1_000))
      ) {
        return NextResponse.json(
          { error: "Invalid teach-back result" },
          { status: 422 }
        )
      }
      if (!supabase) {
        if (!input.confirmed) {
          memory.corrections[sessionId] =
            (memory.corrections[sessionId] ?? 0) + 1
        }
        return NextResponse.json({
          ok: true,
          store: "memory",
          correction_count: memory.corrections[sessionId] ?? 0,
        })
      }
      const action = input.confirmed
        ? "teachback_confirmed"
        : "teachback_corrected"
      const auditPersisted = await recordAudit(supabase, {
        sessionId,
        action,
        actor: "expert",
        metadata: {
          step_id: input.step_id,
          correction: input.confirmed ? null : input.correction,
        },
      })
      const state = await readState(sessionId)
      let correctionCount = state.correction_count
      if (!input.confirmed) {
        correctionCount += 1
        const updated = await supabase
          .from("work_maps")
          .update({
            correction_count: correctionCount,
            confirmed_by_expert: false,
          })
          .eq("is_seed", true)
        if (updated.error) throw new Error(updated.error.message)
      }
      return NextResponse.json({
        ok: true,
        store: "supabase",
        correction_count: correctionCount,
        audit_persisted: auditPersisted,
      })
    }

    if (input.action === "resolve_gap") {
      if (
        typeof input.gap_id !== "string" ||
        typeof input.status !== "string" ||
        !STATUSES.has(input.status as GapStatus) ||
        input.status === "open"
      ) {
        return NextResponse.json(
          { error: "Invalid gap resolution" },
          { status: 422 }
        )
      }
      if (!supabase) {
        const gap = memory.gaps.find(
          (row) => row.id === input.gap_id && row.session_id === sessionId
        )
        if (!gap)
          return NextResponse.json({ error: "Gap not found" }, { status: 404 })
        gap.status = input.status as GapStatus
        return NextResponse.json({ ok: true, store: "memory" })
      }
      const updated = await supabase
        .from("gaps")
        .update({ status: input.status })
        .eq("id", input.gap_id)
        .eq("session_id", sessionId)
        .select("id")
      if (updated.error) throw new Error(updated.error.message)
      if (!updated.data?.length) {
        return NextResponse.json({ error: "Gap not found" }, { status: 404 })
      }
      return NextResponse.json({ ok: true, store: "supabase" })
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 422 })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Interview update failed",
      },
      { status: 500 }
    )
  }
}
