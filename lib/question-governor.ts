export type QuestionKind = "decision_reason" | "guardrail" | "stop_and_ask"

export type GovernorTrigger =
  "value_committed" | "doc_closed" | "amendment_opened" | "addback_accepted"

export interface QuestionCandidate {
  id: string
  text: string
  anchor: string
  kind: QuestionKind
  stepId?: number | null
  revealValue: number
  onScreenAnchor: number
  novelty: number
  screenAnswerablePenalty: number
}

export interface GovernorSignals {
  now: number
  sessionElapsed: number
  voiceSilenceFor: number
  interactionIdleFor: number
  docScrolling: boolean
  lastQuestionAt?: number | null
  questionTimes: number[]
  guardrailQuestionAsked: boolean
  trigger?: { type: GovernorTrigger; at: number } | null
}

export type GovernorDecision =
  | { granted: false; reason: string }
  | {
      granted: true
      reason: "slot_granted"
      candidate: QuestionCandidate
      score: number
    }

const MIN_VOICE_SILENCE = 1.8
const MIN_INTERACTION_IDLE = 1.5
const QUESTION_COOLDOWN = 45
const QUESTION_WINDOW = 600
const MAX_QUESTIONS_PER_WINDOW = 5
const TRIGGER_MAX_AGE = 8
const FORCED_GUARDRAIL_AT = 360

function score(candidate: QuestionCandidate): number {
  return (
    candidate.revealValue * candidate.onScreenAnchor * candidate.novelty -
    candidate.screenAnswerablePenalty
  )
}

export function evaluateQuestionSlot(
  signals: GovernorSignals,
  candidates: QuestionCandidate[]
): GovernorDecision {
  if (signals.voiceSilenceFor < MIN_VOICE_SILENCE) {
    return { granted: false, reason: "expert_speaking" }
  }
  if (signals.interactionIdleFor < MIN_INTERACTION_IDLE) {
    return { granted: false, reason: "expert_active" }
  }
  if (signals.docScrolling) {
    return { granted: false, reason: "document_scrolling" }
  }
  if (
    signals.lastQuestionAt !== null &&
    signals.lastQuestionAt !== undefined &&
    signals.now - signals.lastQuestionAt < QUESTION_COOLDOWN
  ) {
    return { granted: false, reason: "cooldown" }
  }
  const recentQuestions = signals.questionTimes.filter(
    (askedAt) => askedAt >= signals.now - QUESTION_WINDOW
  )
  if (recentQuestions.length >= MAX_QUESTIONS_PER_WINDOW) {
    return { granted: false, reason: "question_budget" }
  }
  if (!signals.trigger || signals.now - signals.trigger.at > TRIGGER_MAX_AGE) {
    return { granted: false, reason: "no_recent_trigger" }
  }

  const forceGuardrail =
    signals.sessionElapsed >= FORCED_GUARDRAIL_AT &&
    !signals.guardrailQuestionAsked
  const eligible = candidates.filter(
    (candidate) =>
      candidate.novelty > 0 &&
      (!forceGuardrail || candidate.kind === "guardrail")
  )
  const ranked = eligible
    .map((candidate) => ({ candidate, score: score(candidate) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  if (!ranked[0]) {
    return {
      granted: false,
      reason: forceGuardrail
        ? "guardrail_candidate_required"
        : "no_useful_question",
    }
  }
  return {
    granted: true,
    reason: "slot_granted",
    candidate: ranked[0].candidate,
    score: ranked[0].score,
  }
}
