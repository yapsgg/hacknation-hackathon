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

export const QUESTION_GOVERNOR_POLICY = {
  minVoiceSilence: 1.8,
  minInteractionIdle: 1.5,
  questionCooldown: 45,
  questionWindow: 600,
  maxQuestionsPerWindow: 5,
  triggerMaxAge: 8,
  forcedGuardrailAt: 360,
} as const

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
  if (signals.voiceSilenceFor < QUESTION_GOVERNOR_POLICY.minVoiceSilence) {
    return { granted: false, reason: "expert_speaking" }
  }
  if (signals.interactionIdleFor < QUESTION_GOVERNOR_POLICY.minInteractionIdle) {
    return { granted: false, reason: "expert_active" }
  }
  if (signals.docScrolling) {
    return { granted: false, reason: "document_scrolling" }
  }
  if (
    signals.lastQuestionAt !== null &&
    signals.lastQuestionAt !== undefined &&
    signals.now - signals.lastQuestionAt < QUESTION_GOVERNOR_POLICY.questionCooldown
  ) {
    return { granted: false, reason: "cooldown" }
  }
  const recentQuestions = signals.questionTimes.filter(
    (askedAt) => askedAt >= signals.now - QUESTION_GOVERNOR_POLICY.questionWindow
  )
  if (recentQuestions.length >= QUESTION_GOVERNOR_POLICY.maxQuestionsPerWindow) {
    return { granted: false, reason: "question_budget" }
  }
  if (!signals.trigger || signals.now - signals.trigger.at > QUESTION_GOVERNOR_POLICY.triggerMaxAge) {
    return { granted: false, reason: "no_recent_trigger" }
  }

  const forceGuardrail =
    signals.sessionElapsed >= QUESTION_GOVERNOR_POLICY.forcedGuardrailAt &&
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
