const baseUrl = (process.env.ACCEPTANCE_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
)

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init)
  let body
  try {
    body = await response.json()
  } catch {
    body = null
  }
  return { response, body }
}

function check(condition, message) {
  if (!condition) throw new Error(message)
  console.log(`PASS ${message}`)
}

const sessionId = crypto.randomUUID()
const issued = await request("/api/security/session", {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ session_id: sessionId }),
})
check(issued.response.ok, "session capability is issued")
const cookie = issued.response.headers.get("set-cookie")?.split(";")[0]
check(Boolean(cookie), "session capability uses an HTTP cookie")

const readiness = await request("/api/system/readiness", { cache: "no-store" })
check(readiness.response.ok, "readiness endpoint responds")
console.log(JSON.stringify(readiness.body, null, 2))

const redaction = await request("/api/privacy/redact", {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ text: "Email analyst@example.com or call 212-555-0199." }),
})
check(redaction.response.ok, "transcript redaction executes")
check(!JSON.stringify(redaction.body).includes("analyst@example.com"), "PII is removed")

const authHeaders = {
  "content-type": "application/json",
  origin: baseUrl,
  cookie: cookie || "",
}
const retained = await request("/api/privacy/retention", {
  method: "PATCH",
  headers: authHeaders,
  body: JSON.stringify({ session_id: sessionId, retained: true }),
})
check(retained.response.ok, "authorized session mutation succeeds")

const purged = await request("/api/privacy/purge", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({ session_id: sessionId, from: 0, to: 1 }),
})
check(purged.response.ok, "off-record purge executes")

// Optional: only meaningful once the redactor and vision key are configured.
{
  const { readFile } = await import("node:fs/promises")
  const frame = await readFile(new URL("../fixtures/synthetic-pii-frame.jpg", import.meta.url))
  const started = performance.now()
  const vision = await request("/api/vision/extract", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      session_id: sessionId,
      frame_id: "acceptance_0001",
      t: 1,
      data_url: `data:image/jpeg;base64,${frame.toString("base64")}`,
    }),
  })
  if (vision.response.status === 503) {
    console.log(`SKIP vision extraction is not configured (${(vision.body?.missing || []).join(", ")})`)
  } else {
    check(vision.response.ok, `vision extraction responds (${Math.round(performance.now() - started)} ms)`)
    check(vision.body?.raw_frame_stored === false && vision.body?.redacted_frame_stored === false, "no frame is stored")
    const text = JSON.stringify(vision.body?.events ?? [])
    console.log(`redactor: ${vision.body?.redaction?.provider}; events: ${text.slice(0, 300)}`)
    check(!/412-55-0193|maria\.gonzalez@/i.test(text), "no synthetic PII reaches the extracted events")
  }
}

console.log("\nMANUAL ACCEPTANCE STILL REQUIRED")
console.log("1. Approve microphone permission and verify a two-way ElevenLabs turn.")
console.log("2. Start screen share and verify the browser-selected surface only.")
console.log("3. Say the off-record phrase; verify capture pauses and purge count is shown.")
console.log("4. Resume on-record; verify new events appear and old window data does not.")
