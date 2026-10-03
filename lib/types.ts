export type CaptureEventType =
  | "field_changed"
  | "doc_opened"
  | "doc_scrolled"
  | "value_entered"
  | "save_clicked"
  | "navigation"

export type EventSource = "vision" | "app"

export interface CaptureEvent {
  t: number
  type: CaptureEventType
  object: string
  field?: string | null
  from?: number | string | null
  to?: number | string | null
  evidence_frame?: string | null
  salient_text?: string[]
  confidence?: number | null
  source?: EventSource
}

export type GuardrailType =
  | "check"
  | "limit"
  | "exception"
  | "stop_and_ask"
  | "none"

export interface Guardrail {
  rule: string
  type: GuardrailType
  evidence?: { t?: number | null; quote?: string | null } | null
  confidence?: number | null
}

export interface ScreenMoment {
  t: number
  frame?: string | null
  clip?: [number, number] | null
}

export type StepStatus = "confirmed" | "corrected" | "unresolved"

export interface WorkMapStep {
  id: number
  title: string
  screen_moment?: ScreenMoment | null
  decision?: string | null
  reason_quote?: string | null
  reason_t?: number | null
  guardrails?: Guardrail[]
  judgment_call?: boolean
  status: StepStatus
  off_record?: boolean
}

export type GapRisk = "high" | "medium" | "low"
export type GapStatus = "open" | "closed" | "waived"

export type MasteryState =
  | "unseen"
  | "hit"
  | "missed"
  | "shown"
  | "predicted"
  | "applied"

export interface WorkMapGap {
  id: string
  step_id?: number | null
  question: string
  risk?: GapRisk
  status?: GapStatus
}

export interface WorkMap {
  workflow: string
  session_id?: string | null
  expert?: string | null
  created_at?: string | null
  confirmed_by_expert?: boolean
  correction_count?: number
  steps: WorkMapStep[]
  guardrails_global?: Guardrail[]
  open_gaps?: WorkMapGap[]
}
