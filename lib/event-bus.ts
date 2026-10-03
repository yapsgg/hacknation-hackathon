import type { CaptureEvent } from "./types"

type Listener = () => void

const listeners = new Set<Listener>()
let events: CaptureEvent[] = []
let startedAt = Date.now()
let paused = false
let frameSeq = 0
let sessionId: string = newId()

function newId(): string {
  return globalThis.crypto.randomUUID()
}

export function getSessionId(): string {
  return sessionId
}

function notify() {
  for (const listener of listeners) listener()
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot(): CaptureEvent[] {
  return events
}

export function getServerSnapshot(): CaptureEvent[] {
  return EMPTY
}

const EMPTY: CaptureEvent[] = []

export function startSession(): void {
  events = []
  startedAt = Date.now()
  frameSeq = 0
  paused = false
  sessionId = newId()
  notify()
}

export function elapsedSeconds(): number {
  return (Date.now() - startedAt) / 1000
}

export function setPaused(value: boolean): void {
  paused = value
}

export function isPaused(): boolean {
  return paused
}

export function nextFrameId(): string {
  frameSeq += 1
  return `f_${String(frameSeq).padStart(4, "0")}`
}

export interface AppEventInput {
  type: CaptureEvent["type"]
  object: string
  field?: string | null
  from?: number | string | null
  to?: number | string | null
  salient_text?: string[]
  evidence_frame?: string | null
}

export function emitAppEvent(input: AppEventInput): CaptureEvent | null {
  if (paused) return null

  const event: CaptureEvent = {
    t: Number(elapsedSeconds().toFixed(1)),
    type: input.type,
    object: input.object,
    field: input.field ?? null,
    from: input.from ?? null,
    to: input.to ?? null,
    evidence_frame: input.evidence_frame ?? null,
    salient_text: input.salient_text ?? [],
    confidence: 1,
    source: "app",
  }

  events = [...events, event]
  notify()
  void publish(event)
  return event
}

async function publish(event: CaptureEvent): Promise<void> {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, event }),
      keepalive: true,
    })
  } catch {
    // Fire-and-forget: the in-memory bus remains the source of truth for the demo.
  }
}
