import { NextResponse } from "next/server"

import type { CaptureEvent } from "@/lib/types"

export const runtime = "nodejs"

const MAX_EVENTS = 500

interface EventStore {
  events: CaptureEvent[]
}

const globalForEvents = globalThis as unknown as {
  __dealDeskEvents?: EventStore
}

const store: EventStore =
  globalForEvents.__dealDeskEvents ??
  (globalForEvents.__dealDeskEvents = { events: [] })

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
    typeof event.type === "string" &&
    VALID_TYPES.has(event.type as CaptureEvent["type"]) &&
    typeof event.object === "string"
  )
}

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!isValidEvent(payload)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 422 })
  }

  store.events.push(payload)
  if (store.events.length > MAX_EVENTS) {
    store.events.splice(0, store.events.length - MAX_EVENTS)
  }

  return NextResponse.json({ ok: true, count: store.events.length })
}

export async function GET() {
  return NextResponse.json({ events: store.events })
}
