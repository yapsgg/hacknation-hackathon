import assert from "node:assert/strict"
import test from "node:test"

import {
  DELETE as deleteState,
  GET as getState,
  PUT as putState,
} from "../app/api/apprentice/state/route"
import {
  APPRENTICE_GAPS,
  APPRENTICE_QUOTES,
  APPRENTICE_RULES,
  APPRENTICE_SCRIPT,
  APPRENTICE_STEPS,
  CANONICAL_WORK_MAP,
} from "../lib/apprentice-demo"
import { TUTOR_RULES } from "../lib/tutor"
import {
  evaluateQuestionSlot,
  type GovernorTrigger,
  type QuestionKind,
} from "../lib/question-governor"

const sessionId = "11111111-1111-4111-8111-111111111111"
const url = `http://localhost/api/apprentice/state?session_id=${sessionId}`
const state = {
  version: 1,
  page: "map",
  cap: { events: [], transcript: [], asked: [] },
  gaps: { "gap-1": "answered" },
  claims: { "acme-amendment-language": { status: "confirmed" } },
  signed: true,
  struck: {},
  custom: {},
  mapStep: 2,
  teach: { log: [] },
  settings: { theme: "system" },
}

test("Apprentice state round-trips through the memory fallback", async () => {
  const saved = await putState(
    new Request(url, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state }),
    })
  )
  assert.equal(saved.status, 200)
  assert.equal((await saved.json()).store, "memory")

  const loaded = await getState(new Request(url))
  assert.equal(loaded.status, 200)
  assert.deepEqual((await loaded.json()).state, state)

  const removed = await deleteState(new Request(url, { method: "DELETE" }))
  assert.equal(removed.status, 200)
  const empty = await getState(new Request(url))
  assert.equal((await empty.json()).state, null)
})

test("Apprentice state accepts every page the UI can persist", async () => {
  // PAGES-list drift broke saving on the landing page and Source files (422).
  for (const page of [
    "landing",
    "overview",
    "files",
    "capture",
    "debrief",
    "map",
    "teach",
    "results",
    "export",
    "trust",
  ]) {
    const saved = await putState(
      new Request(url, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: { ...state, page } }),
      })
    )
    assert.equal(saved.status, 200, `page ${page} should be accepted`)
  }
})

test("Apprentice state rejects invalid sessions and malformed state", async () => {
  const badSession = await getState(
    new Request("http://localhost/api/apprentice/state?session_id=not-a-uuid")
  )
  assert.equal(badSession.status, 422)

  const badState = await putState(
    new Request(url, {
      method: "PUT",
      body: JSON.stringify({ state: { version: 1, page: "unknown" } }),
    })
  )
  assert.equal(badState.status, 422)
})

test("Apprentice UI model stays aligned with canonical Work Map and Tutor rules", () => {
  assert.deepEqual(
    APPRENTICE_STEPS.map(({ n, title, decision }) => ({ n, title, decision })),
    CANONICAL_WORK_MAP.steps.map((step) => ({
      n: step.id,
      title: step.title,
      decision: step.decision,
    }))
  )
  assert.deepEqual(
    APPRENTICE_RULES.map((rule) => rule.id),
    TUTOR_RULES.map((rule) => rule.id)
  )
  assert.deepEqual(
    APPRENTICE_GAPS.map((gap) => gap.id),
    CANONICAL_WORK_MAP.open_gaps?.map((gap) => gap.id)
  )
})

test("Seeded Capture candidates pass through the shared Question Governor", () => {
  const candidates = APPRENTICE_SCRIPT.flatMap((event) =>
    "cands" in event
      ? event.cands.map((candidate) => ({ ...candidate, eventT: event.t }))
      : []
  )
  assert.equal(candidates.length, 4)

  for (const candidate of candidates) {
    const decision = evaluateQuestionSlot(
      {
        now: candidate.eventT + 2,
        sessionElapsed: candidate.eventT + 2,
        voiceSilenceFor: 2,
        interactionIdleFor: 2,
        docScrolling: false,
        lastQuestionAt: null,
        questionTimes: [],
        guardrailQuestionAsked: false,
        trigger: {
          type: candidate.trigger as GovernorTrigger,
          at: candidate.eventT,
        },
      },
      [
        {
          id: candidate.id,
          text: candidate.q,
          anchor: candidate.anchor,
          kind: (candidate.type === "guardrail"
            ? "guardrail"
            : "decision_reason") as QuestionKind,
          revealValue: candidate.revealValue,
          onScreenAnchor: candidate.onScreenAnchor,
          novelty: candidate.novelty,
          screenAnswerablePenalty: candidate.screenAnswerablePenalty,
        },
      ]
    )
    assert.equal(decision.granted, true, candidate.id)
  }
})

test("Every Work Map step carries the expert reason quote and a guardrail", () => {
  for (const step of APPRENTICE_STEPS) {
    assert.ok(step.reasonQuote.trim().length > 0, `step ${step.n} reasonQuote`)
    assert.ok(!step.reasonQuote.startsWith('"'), `step ${step.n} quote unwrapped`)
    assert.ok(step.guardrails.length >= 1, `step ${step.n} guardrails`)
    const quote = (APPRENTICE_QUOTES as Record<string, { en: string }>)[
      `step-${step.n}`
    ]
    assert.ok(quote?.en, `step-${step.n} quote`)
  }
})
