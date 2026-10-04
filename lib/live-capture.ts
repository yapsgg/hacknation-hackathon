import type { GovernorTrigger } from "@/lib/question-governor"
import type { CaptureEvent } from "@/lib/types"

/**
 * Live Capture inputs for the deterministic Question Governor.
 *
 * Nothing here decides *whether* to ask: that stays in `evaluateQuestionSlot`.
 * This module only turns real-world signals (microphone level, screen change,
 * redacted vision events) into the same inputs the recorded demo feeds the
 * Governor, and turns vision events into template-built candidate questions.
 *
 * Vision output is untrusted text (it is read off a shared screen). Question
 * wording is therefore a fixed template and interpolated values are stripped
 * of control characters and length-capped, so screen content cannot inject
 * instructions into the question that is spoken or sent to the Interviewer.
 */

export const LIVE_POLICY = {
  /** Fraction of pixels that must differ between samples to count as a change. */
  screenChangeThreshold: 0.02,
  /** Microphone RMS (0-1) above which the expert counts as speaking. */
  voiceRmsFloor: 0.02,
  /** Changes inside this window (s) are checked for sustained scrolling. */
  scrollWindow: 4,
  /** Changed samples inside the window that count as scrolling or heavy editing. */
  scrollMinChanges: 3,
  /** Vision events below this confidence never produce a question. */
  minConfidence: 0.6,
  /** Minimum seconds between vision requests, bounded by the route's 20/min limit. */
  visionMinIntervalS: 4,
  /** Longest interpolated value, in characters. */
  maxValueChars: 80,
} as const

export interface LiveSnapshot {
  voiceSilenceFor: number
  interactionIdleFor: number
  docScrolling: boolean
  speaking: boolean
  screenActive: boolean
}

/**
 * Tracks when voice and screen activity last happened, on the session clock
 * (seconds since live capture started).
 */
export class LiveSignalTracker {
  private lastVoiceAt: number | null = null
  private lastInteractionAt: number | null = null
  private changes: number[] = []

  noteVoice(t: number) {
    this.lastVoiceAt = t
  }

  /** A sampled screen frame differed from the previous one. */
  noteScreenChange(t: number) {
    this.lastInteractionAt = t
    this.changes.push(t)
    const cutoff = t - LIVE_POLICY.scrollWindow * 4
    while (this.changes.length > 0 && this.changes[0] < cutoff) {
      this.changes.shift()
    }
  }

  snapshot(now: number): LiveSnapshot {
    const voiceSilenceFor = Math.max(0, now - (this.lastVoiceAt ?? 0))
    const interactionIdleFor = Math.max(0, now - (this.lastInteractionAt ?? 0))
    const recent = this.changes.filter(
      (at) => at > now - LIVE_POLICY.scrollWindow && at <= now
    ).length
    return {
      voiceSilenceFor,
      interactionIdleFor,
      docScrolling: recent >= LIVE_POLICY.scrollMinChanges,
      speaking: voiceSilenceFor < 0.5 && this.lastVoiceAt !== null,
      screenActive: interactionIdleFor < 1,
    }
  }
}

/** Decide, from raw RMS samples, whether the expert is speaking. */
export function isSpeakingRms(rms: number, noiseFloor: number): boolean {
  return rms > Math.max(LIVE_POLICY.voiceRmsFloor, noiseFloor * 3)
}

export function sanitizeScreenText(value: unknown): string {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/["`<>{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return text.length > LIVE_POLICY.maxValueChars
    ? `${text.slice(0, LIVE_POLICY.maxValueChars - 1)}…`
    : text
}

const AMENDMENT_RE = /supersed|replac|in addition to|amendment|add-on|addendum/i
const SUPPORT_RE = /invoice|history|schedule|ledger|capex|relocation|legal/i

export function liveEventTrigger(event: CaptureEvent): GovernorTrigger | null {
  switch (event.type) {
    case "field_changed":
    case "value_entered":
    case "save_clicked":
      return "value_committed"
    case "doc_opened": {
      const text = [event.object, ...(event.salient_text ?? [])].join(" ")
      return AMENDMENT_RE.test(text) ? "amendment_opened" : "doc_closed"
    }
    case "doc_scrolled":
      return "doc_closed"
    default:
      return null
  }
}

export function describeLiveEvent(event: CaptureEvent): string {
  const change =
    event.from != null || event.to != null
      ? ` (${sanitizeScreenText(event.from ?? "empty")} → ${sanitizeScreenText(event.to ?? "empty")})`
      : ""
  const field = event.field ? ` · ${sanitizeScreenText(event.field)}` : ""
  return `${sanitizeScreenText(event.object)}${field}${change}`
}

export function liveEventField(event: CaptureEvent): string | null {
  const label = `${event.object} ${event.field ?? ""}`.toLowerCase()
  if (event.type === "save_clicked") return "qoe"
  if (/arr|acme|customer/.test(label)) return "arr"
  if (/relocation|add-?back/.test(label)) return "addback"
  if (/capex/.test(label)) return "capex"
  if (event.type === "doc_opened" || event.type === "doc_scrolled") return "doc"
  return null
}

export interface LiveCandidate {
  id: string
  step: number | null
  q: string
  type: "reason" | "guardrail"
  trigger: GovernorTrigger
  anchor: string
  revealValue: number
  onScreenAnchor: number
  novelty: number
  screenAnswerablePenalty: number
  eventT: number
  eventText: string
}

/**
 * Build zero or one candidate question from a validated vision event. Wording
 * is fixed; only sanitised screen values are interpolated.
 */
export function liveCandidatesFromEvent(
  event: CaptureEvent,
  askedTexts: ReadonlySet<string> = new Set()
): LiveCandidate[] {
  if ((event.confidence ?? 1) < LIVE_POLICY.minConfidence) return []
  const trigger = liveEventTrigger(event)
  if (!trigger) return []

  const object = sanitizeScreenText(event.object)
  const field = sanitizeScreenText(event.field || event.object)
  const anchor = describeLiveEvent(event)
  const base = {
    trigger,
    anchor,
    onScreenAnchor: 1,
    eventT: event.t,
    eventText: anchor,
    step: null,
  }
  const id = `live-${event.evidence_frame || Math.round(event.t * 10)}`
  let candidate: Omit<LiveCandidate, "novelty"> | null = null

  if (event.type === "field_changed" && event.from != null && event.to != null) {
    candidate = {
      ...base,
      id: `${id}-changed`,
      q: `You changed ${field} from ${sanitizeScreenText(event.from)} to ${sanitizeScreenText(event.to)}. What made you change it?`,
      type: "reason",
      revealValue: 0.92,
      screenAnswerablePenalty: 0,
    }
  } else if (event.type === "value_entered" && event.to != null) {
    candidate = {
      ...base,
      id: `${id}-entered`,
      q: `You entered ${sanitizeScreenText(event.to)} for ${field}. What did you check before entering it?`,
      type: "reason",
      revealValue: 0.84,
      screenAnswerablePenalty: 0,
    }
  } else if (event.type === "doc_opened") {
    const text = [event.object, ...(event.salient_text ?? [])].join(" ")
    if (AMENDMENT_RE.test(text)) {
      candidate = {
        ...base,
        id: `${id}-amendment`,
        q: `You opened ${object}. Does it replace the earlier agreement, or add to it?`,
        type: "reason",
        revealValue: 0.9,
        screenAnswerablePenalty: 0,
      }
    } else if (SUPPORT_RE.test(text)) {
      candidate = {
        ...base,
        id: `${id}-support`,
        q: `What are you checking in ${object}?`,
        type: "reason",
        revealValue: 0.7,
        screenAnswerablePenalty: 0.2,
      }
    }
  } else if (event.type === "save_clicked") {
    candidate = {
      ...base,
      id: `${id}-save`,
      q: "Before these inputs are saved, what would make you stop and escalate?",
      type: "guardrail",
      revealValue: 0.88,
      screenAnswerablePenalty: 0,
    }
  }

  if (!candidate) return []
  return [{ ...candidate, novelty: askedTexts.has(candidate.q) ? 0 : 1 }]
}
