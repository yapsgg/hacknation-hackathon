# Claude Code handoff — AI Apprentice

Last updated: 2026-10-04

Read this file before changing the repository. Also obey `AGENTS.md`. This is
Next.js 16.3.6, so read the relevant guide under `node_modules/next/dist/docs/`
before editing Next.js code; do not rely on older Next.js conventions.

## Mission

AI Apprentice captures a senior private-equity expert's diligence reasoning,
compiles it into a reviewable Work Map, and uses only expert-approved rules to
coach a junior analyst before an unsafe input is saved.

Repository: `https://github.com/yapsgg/hacknation-hackathon`

## Current Git state

- `testing` is the integration source of truth at merge commit
  `6ca51796188265da2ba54660745fb95a84a0add7` when this handoff was written.
- PR #19, **Integrate live Interviewer and production readiness audit**, is
  merged into `testing`.
- PR #20, **Add production security and vision boundaries**, is merged into
  `testing`.
- PR #20 passed the complete GitHub `validate` workflow and GitGuardian.
- The Vercel check is red only because Git author `EROR404-hash` is not an
  authorized member of the existing Vercel project. Local and GitHub builds
  pass. Do not "fix" this by creating another Vercel project.
- `main` was intentionally not updated after these PRs. Promote `testing` only
  after credentialed and human browser acceptance passes.

Always fetch before starting. Do not assume the commit above is still current:

```powershell
git fetch origin
git switch testing
git pull --ff-only origin testing
git switch -c feature/<bounded-task>
```

Feature PRs target `testing`, never `main` directly.

## Verified quality gate

The following passed on the production-boundary integration:

- 27/27 Node tests
- fixture schema validation
- ESLint
- TypeScript
- Next.js production build
- production dependency audit in GitHub CI
- GitGuardian secret scan
- Docker Compose configuration validation for local Presidio

Use Node.js 22.22 or newer. The local machine may expose a Node 20 warning from
Supabase; GitHub CI uses Node 22.22 and is authoritative.

Before opening a PR, run:

```powershell
npm test
npm run validate:fixtures
npm run lint
npm run typecheck
npm run build
npm run audit:prod
```

## What is implemented now

### Capture and Map

- `/apprentice` contains the integrated Capture → Debrief → Map → Teach demo.
- The deterministic Question Governor grants one anchored question slot at a
  time; the model must not decide independently when to interrupt.
- Gap Ledger, debrief, teach-back, corrections, and session-built Work Maps are
  implemented with memory/browser fallbacks and Supabase persistence when
  configured.
- The recorded synthetic session remains a deliberate no-key fallback.
- `/deal-desk` emits ground-truth app events and performs browser screen-share
  frame-difference sampling.

### ElevenLabs / ElevenAgents

- `/apprentice` has a live `@elevenlabs/react` Interviewer bridge with signed
  sessions and client handlers for screen state, question logging, gaps,
  debrief, teach-back, and spoken off-record control.
- `/deal-desk` has the live Tutor bridge, pre-commit blocking, expert replay,
  mastery tracking, Work Map approval, and spoken off-record control.
- Signed session routes fail closed when the ElevenLabs key or agent id is
  missing.
- Provisioning is idempotent through `npm run provision:agents`, but it mutates
  the ElevenLabs account. Do not run it merely to inspect the project.

### Phase 4 and Phase 5

- The seeded PE rules are executable, including supersedes-vs-adds ARR logic,
  recurring legal/relocation costs, and capex escalation.
- Unsafe Save operations are blocked before commit and show expert evidence.
- Transcripts are redacted before storage.
- Off-record windows purge events, transcripts, and retained frames.
- Frame retention is server-authorized and disabling retention deletes stored
  frames.
- Privacy and review actions are audited when Supabase is configured.

### Production boundaries added in PR #20

- Session-scoped clients obtain signed, expiring, HttpOnly, SameSite cookies.
- Sensitive routes support same-origin session enforcement through
  `APP_SECURITY_MODE=enforce`.
- This capability binds a browser to a random session UUID, but it is not human
  authentication and is not a complete IDOR defense.
- Expensive endpoints have bounded per-process rate limits.
- `/api/vision/extract` validates JPEG size and session ownership, calls a
  server-side image redactor first, then sends only the redacted result to
  Gemini, validates structured events, and retains neither image.
- Screen capture now separates low-resolution change detection from readable,
  size-bounded frames for vision.
- Local Presidio Analyzer and image-redactor containers are defined in
  `services/presidio/compose.yml` and bind only to `127.0.0.1`.
- Presidio and vision calls have explicit timeouts and fail closed after a
  configured provider error.
- `hooks/use-session-realtime.ts` contains a session-filtered Supabase Realtime
  subscriber, but it is deliberately disabled until human Auth and secure RLS
  are active.
- `supabase/migrations/0004_session_security.sql` removes global anonymous
  Realtime reads and adds authenticated owner policies.
- `npm run acceptance:local` automates session, readiness, redaction, retention,
  and purge checks, then prints the remaining human media checklist.

Machine-readable runtime truth is available at `GET /api/system/readiness`.
Do not claim production readiness when it reports `sensitive_data_ready=false`.

## Critical security facts

1. The existing live Supabase project reportedly has migrations `0001` through
   `0003`. Verify this; do not assume.
2. Migration `0001` contains broad anonymous read policies for Realtime tables.
   Those are acceptable only for the synthetic hackathon prototype.
3. Do **not** enable `NEXT_PUBLIC_ENABLE_REALTIME` against migration `0001`
   alone.
4. Do **not** apply migration `0004_session_security.sql` until Supabase Auth is
   configured and server-created sessions persist `sessions.owner_id`. Applying
   it earlier will correctly make ownerless rows invisible to browser clients.
5. `APP_SECURITY_MODE=report` is the compatible default. Switch to `enforce`
   only after setting a strong `APP_SESSION_SECRET` and running acceptance.
6. The current limiter is in memory and cannot coordinate multiple Vercel
   instances. It is a local/defense-in-depth limiter, not the final production
   abuse boundary.
7. Never use real deal data while `sensitive_data_ready=false`.

## Local setup without cloud credentials

```powershell
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open:

- `http://127.0.0.1:3000/apprentice`
- `http://127.0.0.1:3000/deal-desk`
- `http://127.0.0.1:3000/api/system/readiness`

The seeded demo and deterministic rules work without keys. Bind to
`127.0.0.1`; do not expose the development server to the LAN by default.

To test local Presidio without an API key:

```powershell
docker compose -f services/presidio/compose.yml up -d
```

Use these local values in the ignored `.env.local`:

```dotenv
PRESIDIO_ANALYZER_URL=http://127.0.0.1:5002
PRESIDIO_TIMEOUT_MS=5000
FRAME_REDACTION_MODE=presidio
FRAME_REDACTION_URL=http://127.0.0.1:5003/redact
FRAME_REDACTION_TIMEOUT_MS=10000
```

Stop the containers with:

```powershell
docker compose -f services/presidio/compose.yml down
```

## Environment variables still needed

Never put values in this file, Git, issues, PRs, chat, or command output.

| Purpose              | Variables                                                                                | Status                                                              |
| -------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Session enforcement  | `APP_SESSION_SECRET`, `APP_SECURITY_MODE=enforce`                                        | No external account required; activate after smoke test             |
| ElevenLabs voice     | `ELEVENLABS_API_KEY`, `ELEVENLABS_INTERVIEWER_AGENT_ID`, `ELEVENLABS_TUTOR_AGENT_ID`     | Reportedly present locally/production; verify without printing      |
| Supabase persistence | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Reportedly configured; verify environments                          |
| Vision               | `GOOGLE_VISION_API_KEY`, `VISION_MODEL`, `NEXT_PUBLIC_ENABLE_VISION=true`                | Key and privacy-reviewed live test still required                   |
| Text redaction       | `PRESIDIO_ANALYZER_URL`                                                                  | Local Docker works; hosted/private URL needed for Vercel            |
| Frame redaction      | `FRAME_REDACTION_URL`, optional `FRAME_REDACTION_TOKEN`                                  | Local Docker works; hosted/private URL needed for Vercel            |
| Realtime             | `NEXT_PUBLIC_ENABLE_REALTIME=true`                                                       | Do not enable until Auth, owner assignment, and migration 0004 pass |

After changing `.env.local`, restart Next.js.

## Remaining work in priority order

### P0 — required before confidential or personal data

1. Add real Supabase human authentication.
2. Make server-side session creation assign the authenticated user to
   `sessions.owner_id`; authorize every resource against that ownership.
3. Apply and verify migration `0004_session_security.sql` in a non-production
   environment first. Prove anonymous reads fail and two signed-in users cannot
   read each other's session rows.
4. Integrate and enable `useSessionRealtime` only after step 3.
5. Replace or supplement the in-memory limiter with a shared Vercel/platform or
   managed Redis-compatible limiter.
6. Deploy Presidio Analyzer and image redactor behind private authenticated
   ingress for Vercel.

### P1 — make the live capture path real

1. Add the Gemini vision key and exercise `/api/vision/extract` against
   synthetic shared-screen frames.
2. Verify redaction visually before judging vision accuracy. Never log or store
   the raw frame during this test.
3. Connect redacted vision events to the primary `/apprentice` Capture path.
   `/deal-desk` already contains the gated frame-to-vision integration; the
   Apprentice presentation still primarily demonstrates deterministic events.
4. Feed real ElevenLabs VAD silence, interaction idle time, scroll state, and
   frame-change state into the existing deterministic Question Governor.
5. Compare vision events against the hidden app event stream and record
   accuracy/latency. Do not silently substitute app events while claiming a
   live vision result.
6. Consider model augmentation of the deterministic Work Map only after
   redacted live inputs are reliable. Preserve schema validation and the
   deterministic fallback.

### P2 — acceptance, deployment, and demo readiness

1. Run `npm run acceptance:local` in report mode, then in enforce mode.
2. In Chrome on the demo laptop, manually approve microphone and screen share.
3. Complete one live Interviewer turn and one Tutor turn using synthetic data.
4. Say the configured off-record phrase; verify capture pauses, the time window
   is purged, and no transcript/frame rows remain for that window.
5. Verify screen share resumes on-record and new events appear without restoring
   purged data.
6. Have the authorized Vercel owner deploy the existing `agent` project. Never
   create a second project or copy secrets into a new Vercel scope.
7. Resolve judge access / Deployment Protection, run two production dry-runs,
   and record a backup demo video.
8. Promote `testing` to `main` only after those checks pass.

## Human-only acceptance checklist

Automation cannot grant browser media permission or prove spoken behavior.

- [ ] Microphone permission approved on the intended origin.
- [ ] Two-way Interviewer conversation succeeds.
- [ ] Two-way Tutor conversation succeeds.
- [ ] Screen-share picker exposes only the selected synthetic surface.
- [ ] Spoken off-record command mutes/pauses capture.
- [ ] Purge evidence shows events, transcripts, and retained frames removed.
- [ ] Returning on-record creates only new data.
- [ ] A second user/browser profile cannot read the first user's session after
      Auth and migration 0004.
- [ ] Vercel preview/production uses the existing project and reports readiness
      without exposing secret values.

## Important files

- `CLAUDE.md` — Claude entry point; delegates here and to `AGENTS.md`.
- `docs/PRODUCTION_BOUNDARIES.md` — activation and security boundary detail.
- `docs/PRODUCTION_REALITY_AUDIT.md` — real vs demo behavior.
- `.env.example` — variable names and safe defaults; never place values there.
- `lib/system-readiness.ts` — readiness truth model.
- `lib/security/session-capability.ts` — signed session capability boundary.
- `lib/security/rate-limit.ts` — bounded single-process limiter.
- `lib/vision.ts` and `app/api/vision/extract/route.ts` — redaction-first vision.
- `services/presidio/` — localhost Presidio services and instructions.
- `hooks/use-session-realtime.ts` — gated browser subscriber.
- `supabase/migrations/0004_session_security.sql` — authenticated ownership RLS.
- `scripts/acceptance.mjs` — automated local acceptance checks.
- `components/apprentice/live-interviewer.tsx` — live Interviewer bridge.
- `components/deal-desk/tutor-panel.tsx` — live Tutor bridge.

## Git and safety rules

- Preserve teammates' work and inspect remote changes before rebasing.
- Keep one bounded feature per branch/worktree.
- Never force-push a shared branch.
- Never commit `.env.local`, `.vercel`, `.next`, `node_modules`, API keys,
  signed URLs, recordings, captured frames, or real deal data.
- Never delete Supabase data wholesale. Target test rows by `session_id`.
- Delete Storage objects through the Supabase Storage API, not direct SQL.
- Do not change agent prompts/tools and run provisioning in the same step without
  reviewing the external ElevenLabs mutation.
- Do not infer that a configured key means an integration is working. Require
  executable-path tests and readiness evidence.
- Treat `CHANGELOG.md` as history. Add a new entry rather than rewriting older
  claims; then regenerate `TODO.md` with `npm run todo` if the changelog changes.

## First actions for the next Claude session

1. Read `AGENTS.md`, this file, `docs/PRODUCTION_BOUNDARIES.md`, and
   `docs/PRODUCTION_REALITY_AUDIT.md`.
2. Fetch and inspect `origin/testing`, open PRs, and the working tree before
   editing.
3. Call or inspect `GET /api/system/readiness`; do not print environment values.
4. Ask the human which P0/P1/P2 item is authorized if the task is ambiguous.
5. Work in a new bounded branch and run the full quality gate before opening a
   PR to `testing`.
