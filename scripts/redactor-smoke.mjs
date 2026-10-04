// Sends the synthetic PII frame to the configured image redactor and writes the
// redacted result to disk so a person can LOOK at it before any vision model is
// trusted. Uses the same multipart contract as lib/vision.ts (presidio mode).
//
//   node --env-file=.env.local scripts/redactor-smoke.mjs
import { readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const url = process.env.FRAME_REDACTION_URL?.trim()
if (!url) {
  console.error("FRAME_REDACTION_URL is not set. See docs/LIVE_ACCEPTANCE.md step 3.")
  process.exit(2)
}
const headers = {}
if (process.env.FRAME_REDACTION_TOKEN?.trim()) {
  headers.authorization = `Bearer ${process.env.FRAME_REDACTION_TOKEN.trim()}`
}

const source = await readFile(new URL("../fixtures/synthetic-pii-frame.jpg", import.meta.url))
const form = new FormData()
form.append("image", new Blob([source], { type: "image/jpeg" }), "frame.jpg")

const started = performance.now()
const response = await fetch(url, { method: "POST", headers, body: form, signal: AbortSignal.timeout(60_000) })
const elapsed = Math.round(performance.now() - started)
if (!response.ok) {
  console.error(`FAIL redactor returned ${response.status}: ${(await response.text()).slice(0, 200)}`)
  process.exit(1)
}
const bytes = Buffer.from(await response.arrayBuffer())
const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8
const isPng = bytes[0] === 0x89 && bytes[1] === 0x50
if (!isJpeg && !isPng) {
  console.error("FAIL redactor did not return an image (check FRAME_REDACTION_URL points at /redact)")
  process.exit(1)
}
const out = join(tmpdir(), `redacted-frame.${isPng ? "png" : "jpg"}`)
await writeFile(out, bytes)
console.log(`PASS redactor answered in ${elapsed} ms with ${bytes.length} bytes`)
console.log(`Open this file and check by eye:\n  ${out}`)
console.log("Expected: the name, SSN, salary, email and phone are covered; the title and the")
console.log("Adjusted EBITDA line are still readable. If any PII is still legible, do NOT")
console.log("enable vision (NEXT_PUBLIC_ENABLE_VISION) and report it.")
