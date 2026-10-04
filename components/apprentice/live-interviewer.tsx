"use client"

import * as React from "react"
import {
  ConversationProvider,
  useConversationClientTool,
  useConversationControls,
  useConversationInput,
  useConversationMode,
  useConversationStatus,
  type MessagePayload,
} from "@elevenlabs/react"
import { Mic, MicOff, PhoneOff } from "lucide-react"

interface InterviewerSlot {
  id: string
  q: string
  eventText?: string
  step?: number
  t: number
}

interface InterviewerScreenState {
  state_summary: string
  recent_events: unknown[]
  current_doc: string | null
  elapsed_s: number
}

interface LiveInterviewerProps {
  sessionId: string
  elapsedSeconds: number
  questionCount: number
  offRecord: boolean
  slot: InterviewerSlot | null
  screenState: InterviewerScreenState
  onConnectionChange: (connected: boolean) => void
  onOffRecordChange: (active: boolean) => void
}

async function updateInterviewState(
  sessionId: string,
  action: string,
  parameters: Record<string, unknown>
) {
  const response = await fetch("/api/interviewer/state", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, action, ...parameters }),
  })
  const payload = (await response.json()) as Record<string, unknown>
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Interviewer state update failed."
    )
  }
  return JSON.stringify(payload)
}

export function LiveInterviewer(props: LiveInterviewerProps) {
  const onMessage = React.useCallback(
    (message: MessagePayload) => {
      if (props.offRecord || !message.message.trim()) return
      void fetch("/api/privacy/transcripts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: props.sessionId,
          t: Number(props.elapsedSeconds.toFixed(2)),
          role: message.role === "agent" ? "agent" : "user",
          text: message.message,
        }),
      })
    },
    [props.elapsedSeconds, props.offRecord, props.sessionId]
  )

  return (
    <ConversationProvider onMessage={onMessage}>
      <LiveInterviewerContent {...props} />
    </ConversationProvider>
  )
}

function LiveInterviewerContent({
  sessionId,
  elapsedSeconds,
  questionCount,
  offRecord,
  slot,
  screenState,
  onConnectionChange,
  onOffRecordChange,
}: LiveInterviewerProps) {
  const controls = useConversationControls()
  const { status, message: statusMessage } = useConversationStatus()
  const { mode, isSpeaking } = useConversationMode()
  const { isMuted, setMuted } = useConversationInput()
  const [startError, setStartError] = React.useState<string | null>(null)
  const sentSlot = React.useRef<string | null>(null)
  const offRecordFrom = React.useRef<number | null>(null)

  React.useEffect(() => {
    const connected = status === "connected"
    onConnectionChange(connected)
    return () => onConnectionChange(false)
  }, [onConnectionChange, status])

  React.useEffect(() => {
    if (status === "connected") setMuted(offRecord)
  }, [offRecord, setMuted, status])

  React.useEffect(() => {
    if (status !== "connected" || !slot || sentSlot.current === slot.id) return
    controls.sendContextualUpdate(
      [
        "The deterministic Question Governor granted one slot.",
        `Ask exactly one brief question grounded in this candidate: ${slot.q}`,
        `Screen anchor: ${slot.eventText || "the latest captured event"}.`,
        "Call get_screen_state first, then call log_question after asking.",
      ].join(" "),
      { contextId: `governor-slot-${slot.id}` }
    )
    sentSlot.current = slot.id
  }, [controls, slot, status])

  useConversationClientTool("get_screen_state", () =>
    JSON.stringify(screenState)
  )
  useConversationClientTool("log_question", (parameters) =>
    updateInterviewState(sessionId, "log_question", {
      text: parameters.text,
      anchor: parameters.anchor,
      step_id: parameters.step_id,
      asked_t: elapsedSeconds,
    })
  )
  useConversationClientTool("mark_gap", (parameters) =>
    updateInterviewState(sessionId, "mark_gap", parameters)
  )
  useConversationClientTool("start_debrief", () =>
    updateInterviewState(sessionId, "start_debrief", {})
  )
  useConversationClientTool("submit_teachback_result", (parameters) =>
    updateInterviewState(sessionId, "submit_teachback_result", parameters)
  )
  useConversationClientTool("set_off_record", async (parameters) => {
    const active = parameters.active === true
    const now = Number(elapsedSeconds.toFixed(2))
    const from = active ? Math.max(0, now - 15) : (offRecordFrom.current ?? now)
    if (active) offRecordFrom.current = now
    onOffRecordChange(active)
    const response = await fetch("/api/privacy/purge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, from, to: now }),
    })
    if (!active) offRecordFrom.current = null
    if (!response.ok) throw new Error("Off-record purge failed.")
    return JSON.stringify({ ok: true, off_record: active })
  })

  const start = async () => {
    setStartError(null)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      const response = await fetch("/api/interviewer/session", {
        method: "POST",
      })
      const payload = (await response.json()) as {
        signed_url?: string
        error?: string
        missing?: string[]
      }
      if (!response.ok || !payload.signed_url) {
        throw new Error(
          payload.missing?.length
            ? `Missing ${payload.missing.join(", ")}`
            : payload.error || "Interviewer session is unavailable."
        )
      }
      controls.startSession({
        signedUrl: payload.signed_url,
        dynamicVariables: {
          session_id: sessionId,
          questions_asked: String(questionCount),
        },
      })
    } catch (error) {
      setStartError(
        error instanceof Error ? error.message : "Interviewer failed to start."
      )
    }
  }

  const label =
    status === "connected"
      ? isSpeaking
        ? "Interviewer speaking"
        : mode === "listening"
          ? "Interviewer listening"
          : "Interviewer connected"
      : status === "connecting"
        ? "Connecting…"
        : "Start live Interviewer"

  return (
    <div className="inset stack tight" aria-label="Live ElevenLabs Interviewer">
      <div className="row">
        <strong>Live Interviewer</strong>
        <span className="spacer" />
        <span className="t-cap">
          {status === "connected" ? "ElevenLabs signed session" : "optional"}
        </span>
      </div>
      <p className="t-sec">
        Uses the same deterministic Governor slots. Until vision is connected,
        the evidence and timing signals still come from the recorded synthetic
        session.
      </p>
      <div className="row">
        {status === "connected" ? (
          <>
            <button
              className="btn compact"
              type="button"
              onClick={() => setMuted(!isMuted)}
            >
              {isMuted ? <MicOff size={13} /> : <Mic size={13} />} {label}
            </button>
            <button
              className="btn compact"
              type="button"
              onClick={controls.endSession}
            >
              <PhoneOff size={13} /> End
            </button>
          </>
        ) : (
          <button
            className="btn compact"
            type="button"
            onClick={() => void start()}
            disabled={status === "connecting"}
          >
            <Mic size={13} /> {label}
          </button>
        )}
      </div>
      {(startError || statusMessage) && (
        <p className="t-sec" style={{ color: "var(--critical)" }}>
          {startError ?? statusMessage}
        </p>
      )}
    </div>
  )
}
