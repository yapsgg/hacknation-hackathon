import workMapFixture from "@/fixtures/work-map.mock.json"
import type {
  CaptureEvent,
  GapRisk,
  GapStatus,
  WorkMap,
  WorkMapGap,
} from "@/lib/types"

const template = workMapFixture as WorkMap

export interface WorkMapAnswer {
  id: string
  step_id: number
  asked_t: number
  answer: string
}

export interface WorkMapCorrection {
  step_id: number
  text: string
}

export interface BuildWorkMapInput {
  sessionId: string
  events: CaptureEvent[]
  answers?: WorkMapAnswer[]
  gaps?: WorkMapGap[]
  confirmedStepIds?: number[]
  corrections?: WorkMapCorrection[]
  confirmedByExpert?: boolean
  expert?: string | null
  createdAt?: string
}

const STEP_TERMS: Record<number, string[]> = {
  1: ["adjusted ebitda bridge", "management adjusted ebitda"],
  2: ["acme", "amendment 2", "supersedes", "110,000"],
  3: ["relocation", "2021", "2022", "2023", "4,000,000"],
  4: ["capex", "4.1%", "1.8%"],
  5: ["customers", "msa", "contract"],
  6: ["arr input", "customer: acme", "190,000"],
  7: ["save inputs", "save", "deal desk / inputs"],
}

function eventText(event: CaptureEvent): string {
  return [
    event.type,
    event.object,
    event.field,
    event.from,
    event.to,
    ...(event.salient_text ?? []),
  ]
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase()
}

function eventScore(stepId: number, event: CaptureEvent): number {
  const text = eventText(event)
  let score = (STEP_TERMS[stepId] ?? []).reduce(
    (total, term) => total + (text.includes(term) ? 3 : 0),
    0
  )
  if (stepId === 1 && event.type === "doc_opened") score += 2
  if (stepId === 2 && event.type === "field_changed") score += 4
  if (stepId === 3 && event.type === "doc_opened") score += 2
  if (stepId === 4 && event.type === "doc_scrolled") score += 3
  if (stepId === 5 && event.type === "doc_opened") score += 1
  if (stepId === 6 && event.type === "value_entered") score += 3
  if (stepId === 7 && event.type === "save_clicked") score += 10
  return score
}

function bestEvent(stepId: number, events: CaptureEvent[]): CaptureEvent | null {
  let best: CaptureEvent | null = null
  let bestScore = 0
  for (const event of events) {
    const score = eventScore(stepId, event)
    if (score > bestScore || (score === bestScore && best && event.t > best.t)) {
      best = event
      bestScore = score
    }
  }
  return bestScore > 0 ? best : null
}

function quote(value: string): string {
  const trimmed = value.trim().replace(/^"|"$/g, "")
  return `"${trimmed}"`
}

function normalizedGap(gap: WorkMapGap): WorkMapGap {
  const risk: GapRisk = gap.risk ?? "medium"
  const status: GapStatus = gap.status ?? "open"
  return {
    id: gap.id,
    step_id: gap.step_id ?? null,
    question: gap.question,
    risk,
    status,
  }
}

/**
 * Deterministic, no-key Work Map compiler. The seeded map supplies the agreed
 * workflow shape and guardrails; session evidence replaces its timestamps,
 * quotes, decisions, gaps, and review status wherever evidence is available.
 */
export function buildWorkMapDraft(input: BuildWorkMapInput): WorkMap {
  const confirmed = new Set(input.confirmedStepIds ?? [])
  const answers = new Map(
    (input.answers ?? []).map((answer) => [answer.step_id, answer])
  )
  const corrections = new Map(
    (input.corrections ?? []).map((correction) => [
      correction.step_id,
      correction,
    ])
  )

  const steps = template.steps.map((step) => {
    const event = bestEvent(step.id, input.events)
    const answer = answers.get(step.id)
    const correction = corrections.get(step.id)
    const t = event?.t ?? step.screen_moment?.t ?? 0
    const status = correction
      ? ("corrected" as const)
      : input.confirmedByExpert || confirmed.has(step.id)
        ? ("confirmed" as const)
        : ("unresolved" as const)

    return {
      ...step,
      screen_moment: {
        t,
        frame: event?.evidence_frame ?? step.screen_moment?.frame ?? null,
        clip: event
          ? ([Math.max(0, t - 2), t + 8] as [number, number])
          : (step.screen_moment?.clip ?? null),
      },
      decision: correction?.text ?? step.decision ?? null,
      reason_quote: answer ? quote(answer.answer) : step.reason_quote ?? null,
      reason_t: answer?.asked_t ?? step.reason_t ?? null,
      status,
    }
  })

  return {
    workflow: template.workflow,
    session_id: input.sessionId,
    expert: input.expert ?? template.expert ?? null,
    created_at: input.createdAt ?? new Date().toISOString(),
    confirmed_by_expert: input.confirmedByExpert ?? false,
    correction_count: corrections.size,
    steps,
    guardrails_global: template.guardrails_global ?? [],
    open_gaps: (input.gaps ?? template.open_gaps ?? []).map(normalizedGap),
  }
}
