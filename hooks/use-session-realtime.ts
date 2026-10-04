"use client"

import { useEffect, useState } from "react"

import { getSupabaseBrowser } from "@/lib/supabase/browser"
import type { CaptureEvent } from "@/lib/types"

export type RealtimeStatus =
  "disabled" | "unconfigured" | "connecting" | "connected" | "error"

function toEvent(row: Record<string, unknown>): CaptureEvent | null {
  if (
    typeof row.t !== "number" ||
    typeof row.type !== "string" ||
    typeof row.object !== "string"
  ) {
    return null
  }
  return {
    t: row.t,
    type: row.type as CaptureEvent["type"],
    object: row.object,
    field: typeof row.field === "string" ? row.field : null,
    from: (row.from_val as number | string | null) ?? null,
    to: (row.to_val as number | string | null) ?? null,
    evidence_frame:
      typeof row.evidence_frame === "string" ? row.evidence_frame : null,
    salient_text: Array.isArray(row.salient_text)
      ? row.salient_text.filter(
          (item): item is string => typeof item === "string"
        )
      : [],
    confidence: typeof row.confidence === "number" ? row.confidence : null,
    source: row.source === "app" ? "app" : "vision",
  }
}

/**
 * Disabled until Supabase Auth and migration 0004 are active. Realtime applies
 * RLS to each row, so the browser cannot rely on the session UUID alone.
 */
export function useSessionRealtime(
  sessionId: string | null,
  onEvent: (event: CaptureEvent) => void
): RealtimeStatus {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_REALTIME === "true"
  const supabase = enabled ? getSupabaseBrowser() : null
  const [connection, setConnection] = useState<{
    sessionId: string | null
    status: RealtimeStatus
  }>({ sessionId: null, status: "connecting" })

  useEffect(() => {
    if (!enabled || !supabase || !sessionId) return
    const channel = supabase
      .channel(`session-events:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const event = toEvent(payload.new)
          if (event) onEvent(event)
        }
      )
      .subscribe((next) => {
        if (next === "SUBSCRIBED") {
          setConnection({ sessionId, status: "connected" })
        } else if (next === "CHANNEL_ERROR" || next === "TIMED_OUT") {
          setConnection({ sessionId, status: "error" })
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [enabled, onEvent, sessionId, supabase])

  if (!enabled) return "disabled"
  if (!supabase || !sessionId) return "unconfigured"
  return connection.sessionId === sessionId ? connection.status : "connecting"
}
