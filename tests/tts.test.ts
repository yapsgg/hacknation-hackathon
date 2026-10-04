import assert from "node:assert/strict"
import test from "node:test"

import { POST as tts } from "../app/api/tts/route"

const sessionId = "44444444-4444-4444-8444-444444444444"
const url = "http://localhost/api/tts"

async function withEnv<T>(env: Record<string, string | undefined>, run: () => Promise<T>) {
  const saved = new Map<string, string | undefined>()
  for (const key of Object.keys(env)) saved.set(key, process.env[key])
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    return await run()
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

const post = (body: unknown) =>
  tts(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost" },
      body: JSON.stringify(body),
    })
  )

test("TTS rejects invalid sessions and text", async () => {
  assert.equal((await post({ session_id: "nope", text: "hi" })).status, 422)
  assert.equal((await post({ session_id: sessionId, text: "" })).status, 422)
  assert.equal(
    (await post({ session_id: sessionId, text: "x".repeat(700) })).status,
    422
  )
})

test("TTS fails closed when ElevenLabs is not configured", async () => {
  const response = await withEnv(
    { ELEVENLABS_API_KEY: undefined, ELEVENLABS_TTS_VOICE_ID: undefined },
    () => post({ session_id: sessionId, text: "Let me explain it back." })
  )
  assert.equal(response.status, 503)
  assert.deepEqual((await response.json()).missing, ["ELEVENLABS_API_KEY"])
})

test("TTS returns synthesized audio from ElevenLabs", async () => {
  const realFetch = globalThis.fetch
  let calledUrl = ""
  let body: { model_id?: string } = {}
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calledUrl = String(input)
    body = JSON.parse(String(init?.body ?? "{}"))
    return new Response(new Uint8Array([0xff, 0xfb, 0x90, 0x00]), {
      headers: { "content-type": "audio/mpeg" },
    })
  }) as typeof fetch
  try {
    const response = await withEnv(
      { ELEVENLABS_API_KEY: "test-key", ELEVENLABS_TTS_VOICE_ID: "voice_test" },
      () => post({ session_id: sessionId, text: "Let me explain it back." })
    )
    assert.equal(response.status, 200)
    assert.equal(response.headers.get("content-type"), "audio/mpeg")
    assert.ok((await response.arrayBuffer()).byteLength > 0)
    assert.match(calledUrl, /text-to-speech\/voice_test/)
    assert.equal(body.model_id, "eleven_turbo_v2_5")
  } finally {
    globalThis.fetch = realFetch
  }
})
