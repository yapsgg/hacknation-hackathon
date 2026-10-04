# Production reality audit

This document distinguishes executable product behavior from deterministic demo
behavior. Synthetic data is acceptable for the hackathon; hidden simulation is
not. The machine-readable version is `GET /api/system/readiness`.

## What is real now

- The Question Governor, Work Map compiler, pre-commit guardrails, mastery
  tracking, review-before-publish rule, retention toggle, and purge logic execute
  real application code.
- `/deal-desk` uses the official ElevenLabs React SDK and private signed sessions
  when the Tutor agent id and API key are configured.
- `/apprentice` uses the same SDK for the live Interviewer, registers its client
  tools, and sends Question Governor slots as non-interrupting contextual
  updates. The evidence source remains deterministic until vision is connected.
- `/api/interviewer/session` and `/api/tutor/session` issue private signed URLs;
  they fail closed instead of silently exposing a public agent.
- API routes persist to Supabase when server credentials are configured.
- Transcripts pass through Presidio when it is configured. Presidio failure
  blocks storage instead of falling back after a live-service error.
- Browser screen sharing and local frame-difference sampling work.
- `/apprentice` **live capture** feeds the same Question Governor from real
  signals: microphone level (measured locally, never recorded), screen-change
  sampling, and redacted vision events. Questions are template-built from the
  event, the Governor still decides whether to ask, and screen text is
  sanitised before it reaches the question. Verified end to end against Gemini
  with a synthetic screen and a pass-through redactor stub; **not yet verified
  against the real Presidio image redactor** (see `docs/LIVE_ACCEPTANCE.md`).
- A redaction-first server vision route now accepts changed frames, calls a
  dedicated image redactor, and sends only the returned image to Gemini. It
  validates the model response against the capture-event contract and retains
  neither image. Verified against the real Presidio container: names, SSNs,
  emails and phone numbers are masked, but the default redactor has **no
  salary/compensation recognizer**, so pay figures are not covered.
- Session-scoped clients obtain a signed HttpOnly capability. Sensitive routes
  can enforce session binding and same-origin mutations with
  `APP_SECURITY_MODE=enforce`.
- High-cost endpoints have bounded single-instance rate limits.

## What is still demo or incomplete

- The recorded `/apprentice` session still uses deterministic events and
  activity signals; it is the deliberate no-key and fallback path. Live capture
  needs a microphone, a shared screen, and (for any question to be generated)
  vision configured. Measured vision round trips were 3 to 11 s, so live
  questions can lag the screen. Browser speech remains the no-key fallback.
- Vision remains disabled until an image-redactor URL and vision key are
  configured. Local Presidio image redaction can run without cloud credentials.
- The Work Map compiler is deterministic and starts from the seeded workflow
  shape. It replaces evidence when captured events and expert answers exist.
- A browser Realtime hook exists but remains disabled until Supabase Auth and
  the secure ownership-policy migration are active.
- In-memory and browser fallbacks are intentionally non-durable.
- No webhook endpoints exist. The ElevenLabs tools are browser client tools, so
  webhooks are not required for the current architecture.

## Security boundary

The app now has signed per-session capability authorization, origin checks, and
single-instance rate limiting. This is not human user authentication. The
original Supabase migration's anonymous Realtime policies are unsafe for real
data; migration `0004_session_security.sql` removes them, but requires Supabase
Auth and `sessions.owner_id` assignment first.

Therefore:

- The current deployment is suitable for synthetic hackathon data only.
- Do not enter real deal documents, transcripts, PII, or confidential screens.
- Vercel Deployment Protection is useful during development but is not a
  substitute for application authentication once judge access is opened.

## Remediation order

1. Add Supabase human authentication and persist session ownership.
2. Apply and verify migration `0004_session_security.sql`, then enable Realtime.
3. Replace the local limiter with a shared production limiter.
4. Host Presidio, run credentialed Supabase deletion tests, and complete the
   microphone/screen-share/off-record browser acceptance run.

Until those steps pass, `sensitive_data_ready` must remain `false`.
