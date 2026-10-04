import assert from "node:assert/strict"
import test from "node:test"

import { GET as getReadiness } from "../app/api/system/readiness/route"
import { POST as startInterviewer } from "../app/api/interviewer/session/route"
import { getSystemReadiness } from "../lib/system-readiness"

const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PRESIDIO_ANALYZER_URL",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_INTERVIEWER_AGENT_ID",
  "ELEVENLABS_TUTOR_AGENT_ID",
] as const

function withoutServiceEnvironment<T>(run: () => T): T {
  const previous = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]])
  )
  for (const key of ENV_KEYS) delete process.env[key]
  try {
    return run()
  } finally {
    for (const key of ENV_KEYS) {
      const value = previous[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test("readiness distinguishes functional synthetic mode from sensitive-data readiness", async () => {
  await withoutServiceEnvironment(async () => {
    const report = getSystemReadiness()
    assert.equal(report.functional_demo_ready, true)
    assert.equal(report.sensitive_data_ready, false)
    assert.equal(report.mode, "synthetic-demo")
    assert.equal(report.capabilities.deterministic_workflow.state, "live")
    assert.equal(report.capabilities.durable_persistence.state, "demo")
    assert.equal(report.capabilities.authentication.state, "missing")

    const response = getReadiness()
    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.equal(payload.sensitive_data_ready, false)
    assert.equal(JSON.stringify(payload).includes("service_role"), false)
  })
})

test("Interviewer sessions fail closed when private signing is unavailable", async () => {
  await withoutServiceEnvironment(async () => {
    const response = await startInterviewer()
    assert.equal(response.status, 503)
    const payload = await response.json()
    assert.deepEqual(payload.missing.sort(), [
      "ELEVENLABS_API_KEY",
      "ELEVENLABS_INTERVIEWER_AGENT_ID",
    ])
  })
})
