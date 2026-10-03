import assert from "node:assert/strict"
import test from "node:test"

import { POST as uploadFrame } from "../app/api/privacy/frames/route"
import { POST as purgePrivacyWindow } from "../app/api/privacy/purge/route"
import { POST as storeTranscript } from "../app/api/privacy/transcripts/route"
import { GET as getTutorState, PATCH as patchTutorState } from "../app/api/tutor/state/route"
import { redactLocally } from "../lib/privacy"
import { evaluateCommit, getExpertMoment, lookupGuardrails } from "../lib/tutor"

const sessionId = "11111111-1111-4111-8111-111111111111"

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

test("Phase 4 allows the two correct ARR interpretations", () => {
  const result = evaluateCommit({
    "arr-acme": "110000",
    "arr-customer-3": "165000",
  })
  assert.equal(result.blocked, false)
  assert.deepEqual(result.passedRuleIds, [
    "acme-amendment-language",
    "customer-3-add-on",
  ])
})

test("Phase 4 blocks the over-learned Customer 3 replacement mistake", () => {
  const result = evaluateCommit({
    "arr-acme": "110000",
    "arr-customer-3": "45000",
  })
  assert.equal(result.blocked, true)
  assert.equal(result.ruleId, "customer-3-add-on")
  assert.match(result.reason ?? "", /in addition to/i)
})

test("Phase 4 blocks recurring legal fees and exposes expert evidence", () => {
  const result = evaluateCommit({ "addback-legal": "600000" })
  assert.equal(result.blocked, true)
  assert.equal(result.ruleId, "legal-fee-recurrence")
  assert.equal(getExpertMoment(3, result.ruleId)?.frame, "f_0161")
  assert.equal(lookupGuardrails("legal").length, 1)
})

test("Phase 5 local fallback redacts common PII", () => {
  const result = redactLocally(
    "Email analyst@example.com, call 212-555-0199, SSN 123-45-6789."
  )
  assert.equal(result.provider, "local-fallback")
  assert.equal(result.redactions, 3)
  assert.doesNotMatch(result.text, /analyst@example\.com|212-555-0199|123-45-6789/)
})

test("Tutor approval and mastery persist in the memory fallback", async () => {
  const masteryResponse = await patchTutorState(
    jsonRequest("http://localhost/api/tutor/state", "PATCH", {
      session_id: sessionId,
      action: "mastery",
      rule_id: "customer-3-add-on",
      state: "applied",
    })
  )
  assert.equal(masteryResponse.status, 200)

  const approvalResponse = await patchTutorState(
    jsonRequest("http://localhost/api/tutor/state", "PATCH", {
      session_id: sessionId,
      action: "approval",
      approved: false,
    })
  )
  assert.equal(approvalResponse.status, 200)

  const stateResponse = await getTutorState(
    new Request(`http://localhost/api/tutor/state?session_id=${sessionId}`)
  )
  const state = (await stateResponse.json()) as {
    approved: boolean
    mastery: Record<string, string>
  }
  assert.equal(state.approved, false)
  assert.equal(state.mastery["customer-3-add-on"], "applied")
})

test("Off-record purge removes retained frames and stored transcripts", async () => {
  const transcriptResponse = await storeTranscript(
    jsonRequest("http://localhost/api/privacy/transcripts", "POST", {
      session_id: sessionId,
      t: 12,
      role: "user",
      text: "analyst@example.com",
    })
  )
  assert.equal(transcriptResponse.status, 200)

  const frameResponse = await uploadFrame(
    jsonRequest("http://localhost/api/privacy/frames", "POST", {
      session_id: sessionId,
      frame_id: "f_0001",
      t: 12,
      data_url: "data:image/jpeg;base64,/9j/2Q==",
    })
  )
  assert.equal(frameResponse.status, 200)

  const purgeResponse = await purgePrivacyWindow(
    jsonRequest("http://localhost/api/privacy/purge", "POST", {
      session_id: sessionId,
      from: 10,
      to: 15,
    })
  )
  const result = (await purgeResponse.json()) as {
    events_removed: number
    frames_removed: number
  }
  assert.equal(purgeResponse.status, 200)
  assert.equal(result.events_removed, 1)
  assert.equal(result.frames_removed, 1)
})
