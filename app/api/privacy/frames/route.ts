import { Buffer } from "node:buffer"
import { NextResponse } from "next/server"

import {
  isMemoryFrameRetentionEnabled,
  rememberMemoryFrame,
} from "@/lib/frame-storage"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATA_URL_RE = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { session_id, frame_id, t, data_url } = (body ?? {}) as Record<
    string,
    unknown
  >
  const match =
    typeof data_url === "string" ? data_url.match(DATA_URL_RE) : null
  if (
    typeof session_id !== "string" ||
    !UUID_RE.test(session_id) ||
    typeof frame_id !== "string" ||
    !/^[A-Za-z0-9_-]{1,80}$/.test(frame_id) ||
    typeof t !== "number" ||
    t < 0 ||
    !match
  ) {
    return NextResponse.json({ error: "Invalid frame" }, { status: 422 })
  }

  const bytes = Buffer.from(match[1], "base64")
  if (bytes.length > 250_000) {
    return NextResponse.json({ error: "Frame exceeds 250KB" }, { status: 413 })
  }

  const path = `${session_id}/${t.toFixed(3)}-${frame_id}.jpg`
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    if (!isMemoryFrameRetentionEnabled(session_id)) {
      return NextResponse.json(
        { error: "Frame retention is disabled.", storage_blocked: true },
        { status: 409 }
      )
    }
    rememberMemoryFrame(path)
    return NextResponse.json({ ok: true, store: "memory", path })
  }

  const session = await supabase
    .from("sessions")
    .select("frames_retained")
    .eq("id", session_id)
    .maybeSingle()
  if (session.error) {
    return NextResponse.json({ error: session.error.message }, { status: 500 })
  }
  if (session.data?.frames_retained !== true) {
    return NextResponse.json(
      { error: "Frame retention is disabled.", storage_blocked: true },
      { status: 409 }
    )
  }

  const bucket = process.env.SUPABASE_FRAMES_BUCKET || "frames"
  const uploaded = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: "image/jpeg",
    upsert: true,
  })
  if (uploaded.error) {
    return NextResponse.json({ error: uploaded.error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, store: "supabase", path })
}
