import { NextResponse } from "next/server"

import { recordAudit } from "@/lib/audit"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function PATCH(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const { session_id, retained } = (body ?? {}) as Record<string, unknown>
  if (
    typeof session_id !== "string" ||
    !UUID_RE.test(session_id) ||
    typeof retained !== "boolean"
  ) {
    return NextResponse.json({ error: "Invalid retention update" }, { status: 422 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ ok: true, store: "memory", retained })
  }
  const updated = await supabase
    .from("sessions")
    .upsert(
      { id: session_id, mode: "teach", frames_retained: retained },
      { onConflict: "id" }
    )
  if (updated.error) {
    return NextResponse.json({ error: updated.error.message }, { status: 500 })
  }
  const auditPersisted = await recordAudit(supabase, {
    sessionId: session_id,
    action: "frame_retention_changed",
    metadata: { retained },
  })
  return NextResponse.json({ ok: true, store: "supabase", retained, auditPersisted })
}
