import assert from "node:assert/strict"
import test from "node:test"

import {
  GET as getInterviewState,
  POST as updateInterviewState,
} from "../app/api/interviewer/state/route"
import {
  GET as getWorkMap,
  POST as createWorkMap,
} from "../app/api/work-map/route"
import eventsFixture from "../fixtures/events.mock.json"
import {
  evaluateQuestionSlot,
  type GovernorSignals,
  type QuestionCandidate,
} from "../lib/question-governor"
import type { CaptureEvent, WorkMap } from "../lib/types"
import { buildWorkMapDraft } from "../lib/work-map-builder"

const sessionId = "22222222-2222-4222-8222-222222222222"

const baseSignals: GovernorSignals = {
  now: 100,
  sessionElapsed: 100,
  voiceSilenceFor: 2,
  interactionIdleFor: 2,
  docScrolling: false,
  lastQuestionAt: 40,
  questionTimes: [40],
  guardrailQuestionAsked: false,
  trigger: { type: "value_committed", at: 96 },
}

const candidates: QuestionCandidate[] = [
  {
    id: "visible-number",
    text: "What number did you enter?",
    anchor: "$110,000",
    kind: "decision_reason",
    revealValue: 0.2,
    onScreenAnchor: 1,
    novelty: 1,
    screenAnswerablePenalty: 0.8,
  },
  {
    id: "why-amendment",
    text: "What in the amendment made you replace the original ARR?",
    anchor: "supersedes and replaces",
    kind: "guardrail",
    stepId: 2,
    revealValue: 1,
    onScreenAnchor: 1,
    novelty: 1,
    screenAnswerablePenalty: 0,
  },
]

function jsonRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/interviewer/state", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, ...body }),
  })
}

test("Question Governor grants only the highest-value anchored question", () => {
  const decision = evaluateQuestionSlot(baseSignals, candidates)
  assert.equal(decision.granted, true)
  if (decision.granted) assert.equal(decision.candidate.id, "why-amendment")
})

test("Question Governor enforces silence, activity, cooldown, budget, and triggers", () => {
  const cases: Array<[Partial<GovernorSignals>, string]> = [
    [{ voiceSilenceFor: 1 }, "expert_speaking"],
    [{ interactionIdleFor: 1 }, "expert_active"],
    [{ docScrolling: true }, "document_scrolling"],
    [{ lastQuestionAt: 80 }, "cooldown"],
    [{ questionTimes: [1, 2, 3, 4, 5] }, "question_budget"],
    [{ trigger: { type: "value_committed", at: 90 } }, "no_recent_trigger"],
  ]
  for (const [overrides, reason] of cases) {
    const decision = evaluateQuestionSlot(
      { ...baseSignals, ...overrides },
      candidates
    )
    assert.deepEqual(decision, { granted: false, reason })
  }
})

test("Question Governor forces guardrail coverage after six minutes", () => {
  const decision = evaluateQuestionSlot(
    {
      ...baseSignals,
      now: 400,
      sessionElapsed: 400,
      trigger: { type: "doc_closed", at: 399 },
    },
    candidates
  )
  assert.equal(decision.granted, true)
  if (decision.granted) assert.equal(decision.candidate.kind, "guardrail")
})

test("Interviewer tools persist questions, gaps, resolutions, and corrections", async () => {
  const questionResponse = await updateInterviewState(
    jsonRequest({
      action: "log_question",
      text: "Why did you replace the original ARR?",
      anchor: "supersedes and replaces",
      step_id: 2,
      asked_t: 100,
    })
  )
  const question = (await questionResponse.json()) as { question_id?: string }
  assert.equal(questionResponse.status, 200)
  assert.ok(question.question_id)

  const gapResponse = await updateInterviewState(
    jsonRequest({
      action: "mark_gap",
      question: "What evidence would make you accept the relocation add-back?",
      step_id: 3,
      risk: "high",
    })
  )
  const gap = (await gapResponse.json()) as { gap_id?: string }
  assert.equal(gapResponse.status, 200)
  assert.ok(gap.gap_id)

  const debriefResponse = await updateInterviewState(
    jsonRequest({ action: "start_debrief" })
  )
  const debrief = (await debriefResponse.json()) as {
    gaps: Array<{ id: string }>
    required_followups: number
  }
  assert.equal(debrief.gaps.length, 1)
  assert.equal(debrief.required_followups, 3)

  const resolveResponse = await updateInterviewState(
    jsonRequest({ action: "resolve_gap", gap_id: gap.gap_id, status: "waived" })
  )
  assert.equal(resolveResponse.status, 200)

  const correctionResponse = await updateInterviewState(
    jsonRequest({
      action: "submit_teachback_result",
      step_id: 3,
      confirmed: false,
      correction: "Escalate recurring costs to QoE before accepting them.",
    })
  )
  const correction = (await correctionResponse.json()) as {
    correction_count: number
  }
  assert.equal(correction.correction_count, 1)

  const stateResponse = await getInterviewState(
    new Request(
      `http://localhost/api/interviewer/state?session_id=${sessionId}`
    )
  )
  const state = (await stateResponse.json()) as {
    questions: unknown[]
    gaps: Array<{ status: string }>
    correction_count: number
  }
  assert.equal(state.questions.length, 1)
  assert.equal(state.gaps[0]?.status, "waived")
  assert.equal(state.correction_count, 1)
})

test("Work Map compiler replaces seeded evidence with captured session evidence", () => {
  const workMap = buildWorkMapDraft({
    sessionId: sessionId,
    events: eventsFixture.events as CaptureEvent[],
    answers: [
      {
        id: "q-acme",
        step_id: 2,
        asked_t: 99,
        answer: "The amendment replaces the original order form.",
      },
    ],
    corrections: [
      {
        step_id: 3,
        text: "Escalate the recurring relocation cost before accepting it.",
      },
    ],
    confirmedStepIds: [1, 2, 4, 5, 6, 7],
    gaps: [],
    expert: "Test Expert",
    createdAt: "2026-10-03T12:00:00.000Z",
  })

  assert.equal(workMap.session_id, sessionId)
  assert.equal(workMap.expert, "Test Expert")
  assert.equal(workMap.steps[1]?.screen_moment?.t, 95.4)
  assert.equal(
    workMap.steps[1]?.reason_quote,
    '"The amendment replaces the original order form."'
  )
  assert.equal(workMap.steps[2]?.status, "corrected")
  assert.equal(workMap.steps[2]?.screen_moment?.t, 150.3)
  assert.equal(workMap.correction_count, 1)
  assert.deepEqual(workMap.open_gaps, [])
})

test("Work Map API validates, stores, and retrieves a compiled map", async () => {
  const workMapSessionId = "33333333-3333-4333-8333-333333333333"
  const createResponse = await createWorkMap(
    new Request("http://localhost/api/work-map", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        session_id: workMapSessionId,
        events: eventsFixture.events,
        confirmed_step_ids: [1, 2, 3, 4, 5, 6, 7],
        confirmed_by_expert: true,
      }),
    })
  )
  const created = (await createResponse.json()) as { work_map?: WorkMap }
  assert.equal(createResponse.status, 200)
  assert.equal(created.work_map?.confirmed_by_expert, true)
  assert.equal(created.work_map?.steps.length, 7)

  const getResponse = await getWorkMap(
    new Request(
      `http://localhost/api/work-map?session_id=${workMapSessionId}`
    )
  )
  const stored = (await getResponse.json()) as { work_map?: WorkMap }
  assert.equal(getResponse.status, 200)
  assert.equal(stored.work_map?.session_id, workMapSessionId)

  const invalidResponse = await createWorkMap(
    new Request("http://localhost/api/work-map", {
      method: "POST",
      body: JSON.stringify({ session_id: "not-a-uuid", events: [] }),
    })
  )
  assert.equal(invalidResponse.status, 422)
})
