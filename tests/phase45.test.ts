import assert from "node:assert/strict"
import test from "node:test"

import { POST as uploadFrame } from "../app/api/privacy/frames/route"
import { POST as purgePrivacyWindow } from "../app/api/privacy/purge/route"
import { PATCH as patchRetention } from "../app/api/privacy/retention/route"
import { GET as getPrivacyStatus } from "../app/api/privacy/status/route"
import { POST as storeTranscript } from "../app/api/privacy/transcripts/route"
import {
  GET as getTutorState,
  PATCH as patchTutorState,
} from "../app/api/tutor/state/route"
import { redactLocally, redactTranscript } from "../lib/privacy"
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
  assert.doesNotMatch(
    result.text,
    /analyst@example\.com|212-555-0199|123-45-6789/
  )
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

  const retentionResponse = await patchRetention(
    jsonRequest("http://localhost/api/privacy/retention", "PATCH", {
      session_id: sessionId,
      retained: true,
    })
  )
  assert.equal(retentionResponse.status, 200)

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

test("Disabling retention deletes all frames and blocks stale uploads", async () => {
  const enabled = await patchRetention(
    jsonRequest("http://localhost/api/privacy/retention", "PATCH", {
      session_id: sessionId,
      retained: true,
    })
  )
  assert.equal(enabled.status, 200)

  for (const [frameId, t] of [
    ["f_retained_1", 20],
    ["f_retained_2", 21],
  ] as const) {
    const response = await uploadFrame(
      jsonRequest("http://localhost/api/privacy/frames", "POST", {
        session_id: sessionId,
        frame_id: frameId,
        t,
        data_url: "data:image/jpeg;base64,/9j/2Q==",
      })
    )
    assert.equal(response.status, 200)
  }

  const disabled = await patchRetention(
    jsonRequest("http://localhost/api/privacy/retention", "PATCH", {
      session_id: sessionId,
      retained: false,
    })
  )
  const result = (await disabled.json()) as { frames_removed: number }
  assert.equal(disabled.status, 200)
  assert.equal(result.frames_removed, 2)

  const staleUpload = await uploadFrame(
    jsonRequest("http://localhost/api/privacy/frames", "POST", {
      session_id: sessionId,
      frame_id: "f_stale",
      t: 22,
      data_url: "data:image/jpeg;base64,/9j/2Q==",
    })
  )
  assert.equal(staleUpload.status, 409)
})

test("Configured Presidio merges overlapping findings without leaking text", async () => {
  const originalUrl = process.env.PRESIDIO_ANALYZER_URL
  const originalFetch = globalThis.fetch
  process.env.PRESIDIO_ANALYZER_URL = "https://presidio.example"
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify([
        { entity_type: "EMAIL_ADDRESS", start: 0, end: 19, score: 0.99 },
        { entity_type: "PERSON", start: 0, end: 7, score: 0.7 },
      ]),
      { status: 200, headers: { "content-type": "application/json" } }
    )

  try {
    const result = await redactTranscript("analyst@example.com")
    assert.equal(result.provider, "presidio")
    assert.equal(result.redactions, 1)
    assert.doesNotMatch(result.text, /analyst|example/i)
  } finally {
    globalThis.fetch = originalFetch
    if (originalUrl === undefined) delete process.env.PRESIDIO_ANALYZER_URL
    else process.env.PRESIDIO_ANALYZER_URL = originalUrl
  }
})

test("Configured Presidio failure blocks transcript storage", async () => {
  const originalUrl = process.env.PRESIDIO_ANALYZER_URL
  const originalFetch = globalThis.fetch
  process.env.PRESIDIO_ANALYZER_URL = "https://presidio.example"
  globalThis.fetch = async () => new Response("unavailable", { status: 503 })

  try {
    const response = await storeTranscript(
      jsonRequest("http://localhost/api/privacy/transcripts", "POST", {
        session_id: sessionId,
        t: 30,
        role: "user",
        text: "analyst@example.com",
      })
    )
    const result = (await response.json()) as { storage_blocked?: boolean }
    assert.equal(response.status, 502)
    assert.equal(result.storage_blocked, true)
  } finally {
    globalThis.fetch = originalFetch
    if (originalUrl === undefined) delete process.env.PRESIDIO_ANALYZER_URL
    else process.env.PRESIDIO_ANALYZER_URL = originalUrl
  }
})

test("Privacy status reports synthetic-only mode without exposing secrets", async () => {
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const originalPresidioUrl = process.env.PRESIDIO_ANALYZER_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  delete process.env.PRESIDIO_ANALYZER_URL

  try {
    const response = await getPrivacyStatus()
    const result = (await response.json()) as {
      privacy_ready: boolean
      synthetic_only: boolean
      missing: string[]
    }
    assert.equal(result.privacy_ready, false)
    assert.equal(result.synthetic_only, true)
    assert.deepEqual(result.missing, [
      "Supabase server credentials",
      "PRESIDIO_ANALYZER_URL",
    ])
    assert.doesNotMatch(JSON.stringify(result), /service_role|api[-_]?key/i)
  } finally {
    if (originalSupabaseUrl === undefined)
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
    if (originalServiceKey === undefined)
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey
    if (originalPresidioUrl === undefined)
      delete process.env.PRESIDIO_ANALYZER_URL
    else process.env.PRESIDIO_ANALYZER_URL = originalPresidioUrl
  }
})
