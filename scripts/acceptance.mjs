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

console.log("\nMANUAL ACCEPTANCE STILL REQUIRED")
console.log("1. Approve microphone permission and verify a two-way ElevenLabs turn.")
console.log("2. Start screen share and verify the browser-selected surface only.")
console.log("3. Say the off-record phrase; verify capture pauses and purge count is shown.")
console.log("4. Resume on-record; verify new events appear and old window data does not.")
