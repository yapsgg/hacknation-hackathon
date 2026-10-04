# Live acceptance runbook (Mac with Docker)

Everything below uses **synthetic, fictional data only**. Do not share a real
screen, real documents, or real people's details at any point. Never paste a
key into chat, a PR, an issue, or a commit; keys live only in `.env.local`
(git-ignored) and in Vercel's environment settings.

Goal: prove the parts that cannot be proven without Docker and a human at a
Chrome window, then record the results in the table at the end.

## Verified on a Mac with Docker (2026-10-04)

- Docker Desktop (aarch64) started both containers; both reported **healthy**.
- `curl /analyze` returned PERSON, EMAIL_ADDRESS and PHONE_NUMBER findings.
- `npm run smoke:redactor` answered in **1.46 s**. Inspection by eye: **name,
  SSN, email and phone are blacked out**; title and Adjusted EBITDA still
  readable. **Salary `$142,000` is NOT covered** (no compensation recognizer) —
  see the known gap in step 3.
- `acceptance.mjs` in **report** mode, vision enabled with the real redactor and
  a real Gemini key: all PASS, including `no synthetic PII reaches the
  extracted events`. Vision round trip 5 to 8 s. `redactor:
  presidio-image-redactor`. The extracted event kept only the file title and
  "Census row 214"; the name/SSN/email/phone were gone.
- `acceptance.mjs` in **enforce** mode (with PR #23's origin fix applied):
  all PASS.
- Browser live capture (`/apprentice` Live session) with a synthetic screen and
  synthetic microphone, real Presidio + real Gemini: a frame produced a screen
  event and the Governor granted a question ("What are you checking in 6.1
  Adjusted EBITDA bridge (management).xlsx?"), granted only at a natural pause.

## Interactive steps still to do (needs a human)

Steps 5 and 6 below (real Chrome microphone and screen-share permission, the
signed ElevenLabs Interviewer, spoken "off the record") were not exercised by
automation. Everything before them has now been run.

## What was already verified without Docker

- Unit tests, lint, typecheck, build, fixture schema validation.
- Session capability and enforce-mode origin checks, redaction of
  email/phone/SSN by the local fallback, retention and purge, in memory mode.
- `/api/vision/extract` with the real Gemini API, a synthetic screen and a
  **pass-through stub** instead of a redactor. It extracted correct events
  (3 to 11 s round trip). The same run showed the PII-leak check catching
  unredacted fictional PII, which is exactly why the real redactor matters.
- The Presidio image-redactor adapter was rewritten to the container's
  published contract (multipart upload, raw image bytes back) and unit-tested
  against a stub. **It has not been run against the real container.** Step 3
  does that.

## 0. Prerequisites

- macOS with Docker Desktop installed and running (Apple Silicon is fine; the
  images publish arm64).
- Node.js 22.22 or newer (`node -v`), Chrome.
- The repo on branch `feature/live-capture-readiness` (or `testing` once it is
  merged): `git fetch && git switch feature/live-capture-readiness`.
- Keys, obtained privately from the project owner (never from chat history):
  Supabase URL/anon/service-role, ElevenLabs key and the two agent ids, a
  Google AI Studio (Gemini) key. For the first pass you can skip Supabase and
  ElevenLabs entirely (memory mode, no voice) and add them later.

```bash
npm ci
cp .env.example .env.local   # then fill in values; do not commit this file
```

## 1. Baseline gates

```bash
npm test && npm run validate:fixtures && npm run lint && npm run typecheck && npm run build
```

All must pass before continuing.

## 2. Start Presidio

```bash
docker compose -f services/presidio/compose.yml up -d
docker compose -f services/presidio/compose.yml ps
curl -s http://127.0.0.1:5003/health     # image redactor: "Presidio Image Redactor service is up"
curl -s -X POST http://127.0.0.1:5002/analyze -H 'content-type: application/json' \
  -d '{"text":"Call Maria Gonzalez on 212-555-0199","language":"en"}'
```

The first start pulls large images and the analyzer loads NLP models, so the
first `/analyze` can take a minute. If a container exits, run
`docker compose -f services/presidio/compose.yml logs` and report the last
lines.

Add to `.env.local`:

```dotenv
PRESIDIO_ANALYZER_URL=http://127.0.0.1:5002
FRAME_REDACTION_MODE=presidio
FRAME_REDACTION_URL=http://127.0.0.1:5003/redact
FRAME_REDACTION_TIMEOUT_MS=30000
GOOGLE_VISION_API_KEY=<your key>
VISION_PROVIDER=google
VISION_MODEL=gemini-flash-latest
```

Leave `NEXT_PUBLIC_ENABLE_VISION=false` for now.

## 3. Look at the redacted frame (the gate for everything vision-related)

```bash
npm run smoke:redactor
```

It sends `fixtures/synthetic-pii-frame.jpg` (a fictional employee row with a
name, SSN, salary, email and phone) to the redactor and prints a file path.
**Open that file and check by eye.**

- Pass: name, SSN, email and phone are covered; the title and the
  "Adjusted EBITDA" line are still readable.
- **Known gap:** the default Presidio image redactor has no salary/compensation
  recognizer, so `$142,000` is **not** covered. This was confirmed against the
  real container on 2026-10-04. If salary must be hidden, add a custom
  recognizer to the image redactor or mask that column before capture; do not
  assume vision is safe for real compensation data.
- Fail: the name, SSN, email or phone is still legible. Stop. Do not enable
  vision. Report which ones leaked. (Presidio's OCR can miss text; the answer
  then is to tighten the redactor or keep vision off, not to proceed.)

Expected arm64 note: the redactor runs OCR (Tesseract) and can take a few
seconds per frame. Record the time it prints.

## 4. Automated acceptance with the redactor on

```bash
npm run build && npm run start -- --hostname 127.0.0.1   # terminal 1
ACCEPTANCE_BASE_URL=http://127.0.0.1:3000 node --env-file=.env.local scripts/acceptance.mjs   # terminal 2
```

(`npm run acceptance:local` does the same against `localhost:3000`.)

Required: every line `PASS`, including `no synthetic PII reaches the extracted
events`. That check sends the fictional PII frame through the real route; with
the redactor working, the name/SSN/email must not appear in the events. If it
fails, the redactor is not doing its job; report it.

Then repeat with enforce mode:

```dotenv
APP_SESSION_SECRET=<64 hex chars: openssl rand -hex 32>
APP_SECURITY_MODE=enforce
```

Restart the server and rerun the script. Report mode and enforce mode should
both pass.

## 5. Live capture in Chrome (needs a human)

Set `NEXT_PUBLIC_ENABLE_VISION=true` (restart; this value is baked in at build
time, so rebuild with `npm run build` if you use `start`). Open
`http://127.0.0.1:3000/apprentice` -> **Open dashboard** -> **Live session**.

Use a screen that shows only synthetic material, for example the app's own
**Source files** page in a second window or another browser profile.

1. Click **Start live capture**. Approve screen sharing (pick that window) and
   the microphone. You should see the Live capture panel with a moving
   microphone meter.
2. Open "3.1 Acme MSA Amendment 2.pdf" in the Source files window. Within
   about 10 seconds, **Screen events** should list an event for it and the
   status line should show frames sent, events, and average round trip.
3. Stay silent for a few seconds. A question should appear in **Questions**
   (and be spoken if Voice preview is on). While you are talking continuously,
   or while the screen is changing, no question may be asked. Try both; this is
   the "never interrupt" claim.
4. Click **Go off the record**. Change the shared window. No event should be
   added. Go back on the record.
5. Click **End live capture**, then **Start the debrief**.

Record the vision stats line (frames, events, errors, average ms, redactor).

## 6. Voice (needs ElevenLabs keys and Supabase env if you want persistence)

1. With the keys set, in Live session click **Start live Interviewer**, allow
   the microphone, and have one two-way exchange. A granted Governor slot
   should reach the Interviewer as a question.
2. Say "off the record". Capture should pause and the time window should be
   purged (the Trust page shows the purge count).
3. Open `http://127.0.0.1:3000/deal-desk`, **Start voice tutor**, change Acme
   ARR to 190000 and Save: the Save must be blocked with the expert's reason.
   Enter 110000 and it passes.

Re-running `npm run provision:agents` changes the ElevenLabs account; do not
run it unless prompts or tools changed.

## 7. Hosted deployment notes (do not do this from a laptop)

Vercel cannot reach `127.0.0.1`. For a deployed demo the redactor and analyzer
need private HTTPS URLs with `FRAME_REDACTION_TOKEN`. Until then, deploy with
vision off (the recorded session and Source files work without it) and keep
live capture for the local demo laptop.

## 8. Report back

| Check | Result (pass / fail / numbers) |
| --- | --- |
| `npm run smoke:redactor` time and visual check | PASS (1.46 s; 4 of 5 covered, salary not) |
| `acceptance:local` report mode, all PASS incl. PII-leak check | PASS |
| `acceptance:local` enforce mode (needs PR #23) | PASS |
| Live capture (synthetic screen/mic, real Presidio + Gemini) | PASS (event + question; 5 to 8 s) |
| No question while talking / while screen changing | |
| Off the record: no event added | |
| Interviewer two-way turn | |
| Spoken "off the record" purge | |
| Deal Desk Tutor blocks 190000 | |
| Chrome version, macOS version, chip | |

Attach screenshots of the redacted file and the Live capture panel. Do not
attach `.env.local` or any key.

## Troubleshooting

- `Vision stopped: not configured (...)` in the panel: a required variable is
  missing; the names are listed.
- `Vision provider returned 503`: Gemini is overloaded; the server retries once
  on `VISION_FALLBACK_MODEL` (default `gemini-flash-lite-latest`). Persistent
  503s: try again later or pin another model in `VISION_MODEL`.
- `Presidio image redactor returned a non-image response`: `FRAME_REDACTION_URL`
  must end in `/redact` and `FRAME_REDACTION_MODE=presidio`.
- 403 "Cross-origin or originless mutation rejected" in enforce mode: open the
  app at the same host you used in the address bar when you claimed the session
  (`127.0.0.1` vs `localhost` are different origins).
- Every acceptance line fails with connection errors: the server is not on the
  base URL you passed.
