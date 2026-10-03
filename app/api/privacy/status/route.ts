import { NextResponse } from "next/server"

import { getSupabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = getSupabaseAdmin()
  const supabaseConfigured = supabase !== null
  const presidioConfigured = Boolean(process.env.PRESIDIO_ANALYZER_URL?.trim())
  const bucket = process.env.SUPABASE_FRAMES_BUCKET?.trim() || "frames"
  let phase45SchemaReady = false
  let frameBucketReady = false

  if (supabase) {
    const [audit, windows, transcripts, frameBucket] = await Promise.all([
      supabase
        .from("review_audit")
        .select("id", { head: true, count: "exact" }),
      supabase
        .from("privacy_windows")
        .select("id", { head: true, count: "exact" }),
      supabase.from("transcripts").select("id", { head: true, count: "exact" }),
      supabase.storage.from(bucket).list("", { limit: 1 }),
    ])
    phase45SchemaReady = !audit.error && !windows.error && !transcripts.error
    frameBucketReady = !frameBucket.error
  }

  const missing = [
    !supabaseConfigured ? "Supabase server credentials" : null,
    supabaseConfigured && !phase45SchemaReady
      ? "Phase 4/5 Supabase migration"
      : null,
    supabaseConfigured && !frameBucketReady ? "Supabase frames bucket" : null,
    !presidioConfigured ? "PRESIDIO_ANALYZER_URL" : null,
  ].filter((value): value is string => value !== null)

  return NextResponse.json(
    {
      privacy_ready: missing.length === 0,
      synthetic_only: missing.length > 0,
      persistence: supabaseConfigured ? "supabase" : "memory",
      redaction: presidioConfigured ? "presidio" : "local-fallback",
      checks: {
        supabase_credentials: supabaseConfigured,
        phase45_schema: phase45SchemaReady,
        frame_bucket: frameBucketReady,
        presidio_configured: presidioConfigured,
      },
      missing,
    },
    { headers: { "cache-control": "no-store" } }
  )
}
