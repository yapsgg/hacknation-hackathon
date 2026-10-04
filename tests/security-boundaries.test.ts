import assert from "node:assert/strict"
import test from "node:test"

import { POST as extractVision } from "../app/api/vision/extract/route"
import { checkRateLimit } from "../lib/security/rate-limit"
import {
  authorizeSessionRequest,
  issueSessionCapability,
  sessionCookieName,
  verifySessionCapability,
} from "../lib/security/session-capability"

const sessionId = "22222222-2222-4222-8222-222222222222"

test("session capabilities bind one session and expire", () => {
  const now = Date.UTC(2026, 0, 1)
  const { token } = issueSessionCapability(sessionId, now)
  assert.equal(verifySessionCapability(token, sessionId, now + 1_000), true)
  assert.equal(
    verifySessionCapability(
      token,
      "33333333-3333-4333-8333-333333333333",
      now + 1_000
    ),
    false
  )
  assert.equal(
    verifySessionCapability(token, sessionId, now + 9 * 60 * 60 * 1_000),
    false
  )
})

test("enforced authorization checks origin and matching HttpOnly capability", () => {
  const previousMode = process.env.APP_SECURITY_MODE
  const previousSecret = process.env.APP_SESSION_SECRET
  process.env.APP_SECURITY_MODE = "enforce"
  process.env.APP_SESSION_SECRET =
    "test-secret-that-is-at-least-thirty-two-bytes-long"
  try {
    const { token } = issueSessionCapability(sessionId)
    const allowed = authorizeSessionRequest(
      new Request("https://app.example/api/events", {
        method: "POST",
        headers: {
          origin: "https://app.example",
          cookie: `${sessionCookieName(sessionId)}=${token}`,
        },
      }),
      sessionId
    )
    assert.equal(allowed.ok, true)

    const crossOrigin = authorizeSessionRequest(
      new Request("https://app.example/api/events", {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          cookie: `${sessionCookieName(sessionId)}=${token}`,
        },
      }),
      sessionId
    )
    assert.equal(crossOrigin.status, 403)

    // The framework may rebuild request.url from its bind hostname; the Host
    // header names what the client really addressed.
    const rebuiltUrl = authorizeSessionRequest(
      new Request("http://localhost:3200/api/events", {
        method: "POST",
        headers: {
          origin: "http://127.0.0.1:3200",
          host: "127.0.0.1:3200",
          cookie: `${sessionCookieName(sessionId)}=${token}`,
        },
      }),
      sessionId
    )
    assert.equal(rebuiltUrl.ok, true)

    const proxied = authorizeSessionRequest(
      new Request("http://internal:3000/api/events", {
        method: "POST",
        headers: {
          origin: "https://app.example",
          "x-forwarded-host": "app.example",
          "x-forwarded-proto": "https",
          cookie: `${sessionCookieName(sessionId)}=${token}`,
        },
      }),
      sessionId
    )
    assert.equal(proxied.ok, true)

    const foreignWithHost = authorizeSessionRequest(
      new Request("http://localhost:3200/api/events", {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          host: "127.0.0.1:3200",
          cookie: `${sessionCookieName(sessionId)}=${token}`,
        },
      }),
      sessionId
    )
    assert.equal(foreignWithHost.status, 403)

    const wrongScheme = authorizeSessionRequest(
      new Request("http://localhost:3200/api/events", {
        method: "POST",
        headers: {
          origin: "https://127.0.0.1:3200",
          host: "127.0.0.1:3200",
          cookie: `${sessionCookieName(sessionId)}=${token}`,
        },
      }),
      sessionId
    )
    assert.equal(wrongScheme.status, 403)
  } finally {
    if (previousMode === undefined) delete process.env.APP_SECURITY_MODE
    else process.env.APP_SECURITY_MODE = previousMode
    if (previousSecret === undefined) delete process.env.APP_SESSION_SECRET
    else process.env.APP_SESSION_SECRET = previousSecret
  }
})

test("local rate limiter blocks requests over the configured window", () => {
  const options = {
    namespace: `test-${crypto.randomUUID()}`,
    key: "client",
    limit: 2,
    windowMs: 60_000,
  }
  assert.equal(checkRateLimit(undefined, options).allowed, true)
  assert.equal(checkRateLimit(undefined, options).allowed, true)
  assert.equal(checkRateLimit(undefined, options).allowed, false)
})

test("vision route fails closed before any provider call when redaction is missing", async () => {
  const previousRedactor = process.env.FRAME_REDACTION_URL
  const previousMode = process.env.APP_SECURITY_MODE
  delete process.env.FRAME_REDACTION_URL
  process.env.APP_SECURITY_MODE = "report"
  try {
    const response = await extractVision(
      new Request("http://localhost/api/vision/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          frame_id: "f_0001",
          t: 1,
          data_url: "data:image/jpeg;base64,/9j/2Q==",
        }),
      })
    )
    const result = (await response.json()) as { missing?: string[] }
    assert.equal(response.status, 503)
    assert.deepEqual(result.missing, ["FRAME_REDACTION_URL"])
  } finally {
    if (previousRedactor === undefined) delete process.env.FRAME_REDACTION_URL
    else process.env.FRAME_REDACTION_URL = previousRedactor
    if (previousMode === undefined) delete process.env.APP_SECURITY_MODE
    else process.env.APP_SECURITY_MODE = previousMode
  }
})
