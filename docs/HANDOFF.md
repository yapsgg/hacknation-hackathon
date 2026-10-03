# Handoff: what is done and what is left on the Supabase / ElevenAgents / Vercel side

No secrets are in this file. Ask the owner for keys over a private channel.

## Already live (do not redo)

- **Supabase** project `eivlugijbvxtdbmnswjq`: `0001_init.sql` and `0002_phase_4_5.sql` are applied (tables, RLS, Realtime on `events`/`questions`/`gaps`, private `frames` bucket, `purge_window`). The 7-step seed Work Map is in `work_maps`.
- **ElevenAgents**: Interviewer (`agent_4201m41x08y7ef8s9z8rgsv6dnhv`) and Tutor (`agent_5401m41x0bctfrnt1x99tvj698td`) exist with 11 client tools. The Tutor has 7 tools incl. `lookup_guardrail`, `get_expert_moment`, `set_off_record`.
- **Vercel** project `agent` (Node 24.x). Production env: Supabase URL/anon/service-role, `SUPABASE_FRAMES_BUCKET`, ElevenLabs key + both agent ids. Preview env: Supabase URL/anon/service-role, `SUPABASE_FRAMES_BUCKET`, `ELEVENLABS_API_KEY`, `ELEVENLABS_TUTOR_AGENT_ID`.
- Verified live: `/api/events` persists to Supabase; off-the-record purge deletes events, transcripts and frames only inside the window and writes `privacy_windows` + `review_audit` rows (tested on `testing` branch code).

## To do, in order

1. **Get env locally.** Copy `.env.example` to `.env.local` and fill it (owner shares the values). Needed: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_FRAMES_BUCKET=frames`, `ELEVENLABS_API_KEY`, `ELEVENLABS_INTERVIEWER_AGENT_ID`, `ELEVENLABS_TUTOR_AGENT_ID`. Use Node 22+.
2. **Merge order.** Merge `testing` into `main` first (clean fast-forward, build/lint/typecheck/tests pass). Then merge `worktree-deal-desk-ui`; it conflicts with `testing` in `components/deal-desk/{lbo-input-sheet,session-provider,side-panel}.tsx`. Keep the new UI and re-add the interceptor / tutor panel wiring. Do this on an integration branch, not directly on `main`.
3. **Redeploy production after the merge** so the new `SUPABASE_FRAMES_BUCKET` and the privacy/tutor routes go live: `npx vercel@latest deploy --prod --yes`. Use `vercel@latest`, the global 33.x CLI is too old.
4. **Re-provision agents if prompts/tools change:** `npm run provision:agents` (idempotent; patches existing agents using the ids in `.env.local`).
5. **Microphone test (needs a human).** On a Vercel Preview of `testing` (or the merged `main`), run one real Tutor voice conversation. Check that `block_commit`, `replay_moment`, `update_mastery` and `set_off_record` fire in the app, then check Supabase for the deletion.
6. **Presidio (optional but recommended).** Host Microsoft Presidio Analyzer and set `PRESIDIO_ANALYZER_URL` in Vercel. Without it only phones and emails are redacted; person names are not.
7. **Vercel Deployment Protection** is ON, so judges need a Vercel login. Turn it off or add a bypass before judging.
8. **Rotate secrets after the hackathon.** The Supabase service-role key and the ElevenLabs API key were shared in chat. Rotate both, then update `.env.local` and the Vercel env (Production, Preview, Development).

## Not built yet (nobody owns it on any branch)

- Question Governor (when the Interviewer may speak).
- Vision loop (Gemini Flash recommended; needs a key) and context pusher.
- Browser voice session for the Interviewer with handlers for its 5 client tools.
- Gap Ledger, Work Map builder, debrief / teach-back controller and Work Map UI.
- Supabase Realtime subscription in the browser.
- Persisting mastery, Work Map approval and audit events (tables exist, the app does not write all of them).
- Recorded fallback session, "load saved map" button, pitch deck, two dry-runs on the production URL.

## Gotchas

- Do not delete rows in `storage.objects` with SQL; use the Storage API (the DB blocks it).
- The live DB may hold another teammate's test session. Delete test data by `session_id`, never wholesale.
- Preview env vars were set for all branches. Re-add them with `vercel env add NAME preview --yes` if you rotate a key.
