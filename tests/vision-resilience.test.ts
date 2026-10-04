import assert from "node:assert/strict"
import test from "node:test"

import { extractRedactedFrame } from "../lib/vision"

const PIXEL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="

function geminiOk() {
  return Response.json({
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                events: [
                  {
                    t: 1,
                    type: "doc_opened",
                    object: "VDR / Customers / Acme MSA",
                    evidence_frame: "f_1",
                    salient_text: ["Order Form #1"],
                    confidence: 0.9,
                    source: "vision",
                  },
                ],
              }),
            },
          ],
        },
      },
    ],
  })
}

async function withEnv<T>(env: Record<string, string>, run: () => Promise<T>) {
  const saved = new Map<string, string | undefined>()
  for (const key of Object.keys(env)) saved.set(key, process.env[key])
  Object.assign(process.env, env)
  try {
    return await run()
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test("a 503 from the primary vision model is retried once on the fallback model", async () => {
  const realFetch = globalThis.fetch
  const urls: string[] = []
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    urls.push(url)
    if (url.startsWith("http://redactor.test"))
      return Response.json({ redacted_data_url: PIXEL, redactions: 2, provider: "stub" })
    return urls.filter((u) => u.includes("generativelanguage")).length === 1
      ? new Response("busy", { status: 503 })
      : geminiOk()
  }) as typeof fetch
  try {
    const result = await withEnv(
      {
        FRAME_REDACTION_URL: "http://redactor.test/redact",
        GOOGLE_VISION_API_KEY: "test-key",
        VISION_MODEL: "primary-model",
        VISION_FALLBACK_MODEL: "fallback-model",
      },
      () => extractRedactedFrame({ dataUrl: PIXEL, frameId: "f_1", t: 1 })
    )
    assert.equal(result.events.length, 1)
    assert.equal(result.redaction.redactions, 2)
    assert.equal(result.raw_frame_stored, false)
    const gemini = urls.filter((u) => u.includes("generativelanguage"))
    assert.match(gemini[0], /primary-model/)
    assert.match(gemini[1], /fallback-model/)
  } finally {
    globalThis.fetch = realFetch
  }
})

test("a client error from the vision model is not retried", async () => {
  const realFetch = globalThis.fetch
  let geminiCalls = 0
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).startsWith("http://redactor.test"))
      return Response.json({ redacted_data_url: PIXEL, redactions: 0, provider: "stub" })
    geminiCalls += 1
    return new Response("bad", { status: 400 })
  }) as typeof fetch
  try {
    await assert.rejects(
      withEnv(
        {
          FRAME_REDACTION_URL: "http://redactor.test/redact",
          GOOGLE_VISION_API_KEY: "test-key",
          VISION_MODEL: "primary-model",
        },
        () => extractRedactedFrame({ dataUrl: PIXEL, frameId: "f_1", t: 1 })
      ),
      /400/
    )
    assert.equal(geminiCalls, 1)
  } finally {
    globalThis.fetch = realFetch
  }
})

test("presidio mode posts multipart and accepts the container's octet-stream image bytes", async () => {
  const realFetch = globalThis.fetch
  let sawMultipart = false
  const jpeg = Buffer.from(PIXEL.slice(PIXEL.indexOf(",") + 1), "base64")
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.startsWith("http://redactor.test")) {
      sawMultipart = init?.body instanceof FormData && init.body.has("image")
      return new Response(jpeg, {
        headers: { "content-type": "application/octet-stream" },
      })
    }
    return geminiOk()
  }) as typeof fetch
  try {
    const result = await withEnv(
      {
        FRAME_REDACTION_URL: "http://redactor.test/redact",
        FRAME_REDACTION_MODE: "presidio",
        GOOGLE_VISION_API_KEY: "test-key",
        VISION_MODEL: "primary-model",
      },
      () => extractRedactedFrame({ dataUrl: PIXEL, frameId: "f_1", t: 1 })
    )
    assert.equal(sawMultipart, true)
    assert.equal(result.redaction.provider, "presidio-image-redactor")
  } finally {
    globalThis.fetch = realFetch
  }
})

test("presidio mode rejects a non-image answer instead of forwarding it", async () => {
  const realFetch = globalThis.fetch
  let geminiCalled = false
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).startsWith("http://redactor.test"))
      return new Response("not an image", {
        headers: { "content-type": "application/octet-stream" },
      })
    geminiCalled = true
    return geminiOk()
  }) as typeof fetch
  try {
    await assert.rejects(
      withEnv(
        {
          FRAME_REDACTION_URL: "http://redactor.test/redact",
          FRAME_REDACTION_MODE: "presidio",
          GOOGLE_VISION_API_KEY: "test-key",
        },
        () => extractRedactedFrame({ dataUrl: PIXEL, frameId: "f_1", t: 1 })
      ),
      /non-image/
    )
    assert.equal(geminiCalled, false)
  } finally {
    globalThis.fetch = realFetch
  }
})
