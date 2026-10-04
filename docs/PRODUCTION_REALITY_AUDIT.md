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

## What is still demo or incomplete

- `/apprentice` still uses deterministic captured events and activity signals.
  Browser speech remains available only as the no-key fallback.
- Shared-screen frames are not converted into structured events by a server-side
  vision model. The current live preview records only that a frame changed.
- The Work Map compiler is deterministic and starts from the seeded workflow
  shape. It replaces evidence when captured events and expert answers exist.
- The browser does not subscribe to the existing Supabase Realtime publication.
- In-memory and browser fallbacks are intentionally non-durable.
- No webhook endpoints exist. The ElevenLabs tools are browser client tools, so
  webhooks are not required for the current architecture.

## Security boundary

The app has no user authentication or per-session authorization. API routes use
the Supabase service role after validating payload shape, but possession of a
session UUID is currently enough to read or mutate that session through the
Next.js API. There is also no application-level rate limiter.

Therefore:

- The current deployment is suitable for synthetic hackathon data only.
- Do not enter real deal documents, transcripts, PII, or confidential screens.
- Vercel Deployment Protection is useful during development but is not a
  substitute for application authentication once judge access is opened.

## Remediation order

1. Add a privacy-reviewed server vision extractor that emits the event schema;
   never send raw frames directly from the browser to a model provider.
2. Add user authentication plus session membership/ownership checks to every
   route before allowing sensitive data.
3. Replace global anon Realtime read policies with authenticated, session-scoped
   policies, then add browser subscriptions.
4. Add per-user/IP rate limiting and request-origin/CSRF protections.
5. Host Presidio, run credentialed Supabase deletion tests, and complete the
   microphone/screen-share/off-record browser acceptance run.

Until steps 2, 3, and 6 pass, `sensitive_data_ready` must remain `false`.
