import { NextResponse } from "next/server"

import { purgeMemoryEvents } from "@/app/api/events/route"
import { purgeMemoryFrames } from "@/app/api/privacy/frames/route"
import { purgeMemoryTranscripts } from "@/app/api/privacy/transcripts/route"
import { recordAudit } from "@/lib/audit"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { session_id, from, to } = (body ?? {}) as {
    session_id?: unknown
    from?: unknown
    to?: unknown
  }
  if (
    typeof session_id !== "string" ||
    !UUID_RE.test(session_id) ||
    typeof from !== "number" ||
    typeof to !== "number" ||
    from < 0 ||
    to < from
  ) {
    return NextResponse.json({ error: "Invalid purge window" }, { status: 422 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    const eventsRemoved =
      purgeMemoryEvents(session_id, from, to) +
      purgeMemoryTranscripts(session_id, from, to)
    return NextResponse.json({
      ok: true,
      store: "memory",
      events_removed: eventsRemoved,
      frames_removed: purgeMemoryFrames(session_id, from, to),
    })
  }

  const purged = await supabase.rpc("purge_window", {
    p_session: session_id,
    p_from: from,
    p_to: to,
  })
  if (purged.error) {
    return NextResponse.json({ error: purged.error.message }, { status: 500 })
  }

  let framesRemoved = 0
  const bucket = process.env.SUPABASE_FRAMES_BUCKET
  if (bucket) {
    const prefix = `${session_id}/`
    const listed = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
    if (listed.error) {
      return NextResponse.json({ error: listed.error.message }, { status: 500 })
    }
    const names = (listed.data ?? [])
      .filter((item) => {
        const frameT = Number(item.name.split("-")[0])
        return Number.isFinite(frameT) && frameT >= from && frameT <= to
      })
      .map((item) => `${prefix}${item.name}`)
    if (names.length > 0) {
      const removed = await supabase.storage.from(bucket).remove(names)
      if (removed.error) {
        return NextResponse.json({ error: removed.error.message }, { status: 500 })
      }
      framesRemoved = names.length
    }
  }

  const privacyWindow = await supabase.from("privacy_windows").insert({
    session_id,
    from_t: from,
    to_t: to,
    events_removed: Number(purged.data ?? 0),
    frames_removed: framesRemoved,
  })
  const auditPersisted = await recordAudit(supabase, {
    sessionId: session_id,
    action: "off_record_purged",
    metadata: {
      from,
      to,
      events_removed: Number(purged.data ?? 0),
      frames_removed: framesRemoved,
    },
  })

  return NextResponse.json({
    ok: true,
    store: "supabase",
    events_removed: Number(purged.data ?? 0),
    frames_removed: framesRemoved,
    privacy_window_persisted: !privacyWindow.error,
    audit_persisted: auditPersisted,
  })
}
