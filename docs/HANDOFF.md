# Handoff: Supabase, ElevenAgents, Vercel, and integration status

> The original phase handoff below is retained for history. For the current
> security, vision, Presidio, Realtime, and acceptance status, use
> `docs/PRODUCTION_BOUNDARIES.md` and `GET /api/system/readiness`.

No secrets are stored here. Ask the owner for keys through a private channel.

The infrastructure items below were reported complete by the infrastructure owner on 2026-10-03. Re-run the live acceptance checks after the UI integration because the current local account cannot inspect the owner's Vercel team or secrets.

## Reported live — do not recreate blindly

- **Supabase** project `eivlugijbvxtdbmnswjq`: migrations `0001_init.sql` and `0002_phase_4_5.sql` are reported applied. This includes the Phase 4/5 tables, RLS, Realtime on `events`/`questions`/`gaps`, the private `frames` bucket, and `purge_window`. The seven-step seed Work Map is reported present in `work_maps`.
- **ElevenAgents**: Interviewer (`agent_4201m41x08y7ef8s9z8rgsv6dnhv`) and Tutor (`agent_5401m41x0bctfrnt1x99tvj698td`) are reported provisioned with 11 client tools total. The Tutor has seven tools, including `lookup_guardrail`, `get_expert_moment`, and `set_off_record`.
- **Vercel** project `agent` reportedly uses Node 24.x. Production reportedly has the Supabase values, `SUPABASE_FRAMES_BUCKET`, ElevenLabs key, and both agent ids. Preview reportedly has the Supabase values, `SUPABASE_FRAMES_BUCKET`, `ELEVENLABS_API_KEY`, and `ELEVENLABS_TUTOR_AGENT_ID`.
- **Live persistence**: `/api/events` persistence and window-accurate deletion of events, transcripts, and frames were reported verified against Supabase, including `privacy_windows` and `review_audit` rows.

## Next actions, in order

1. **Integrate the latest UI into `testing`.** Create an integration branch from `origin/testing`, then merge `origin/worktree-deal-desk-ui-v2`. Resolve conflicts intentionally. Preserve the newer UI plus the Tutor panel, Save interceptor, approval gate, off-record deletion, retention enforcement, privacy status, and mastery persistence. Do not merge either branch directly into `main` yet.
2. **Run the complete local gate** with Node `>=22.22.0`: `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
3. **Configure local secrets only when needed.** Copy `.env.example` to `.env.local` and obtain values privately. Never commit `.env.local`. The synthetic demo can run without secrets; live Supabase/voice validation requires the Supabase and ElevenLabs values.
4. **Redeploy only after integration passes.** Deploy a Vercel Preview first. Promote to Production only after the combined application passes its browser acceptance run. Use the current Vercel CLI rather than the obsolete global 33.x release.
5. **Re-provision agents only if prompts or tool definitions changed:** run `npm run provision:agents`. It patches the existing agent ids from `.env.local`.
6. **Run the human browser acceptance test.** In Chrome, test one real Tutor conversation, screen sharing, `block_commit`, `replay_moment`, `update_mastery`, and the spoken phrase “off the record.” Confirm the corresponding Supabase deletion and audit evidence.
7. **Configure Presidio before real data.** A hosted `PRESIDIO_ANALYZER_URL` is required before using confidential or real deal data. The local fallback is synthetic-demo-only and covers email, phone, and SSN patterns, but not names or general PII.
8. **Resolve Vercel Deployment Protection.** Keep it protected during development, then disable it or configure a judge-safe bypass before judging.
9. **Rotate secrets after the hackathon.** Rotate the Supabase service-role key and ElevenLabs API key, then update local and Vercel environments.

## Still not built

- Question Governor controlling when the Interviewer may speak.
- Vision loop, vision-model key, and non-interrupting context pusher.
- Browser voice session for the Interviewer with handlers for its five client tools.
- Gap Ledger, generated Work Map builder, and complete debrief/teach-back controller.
- Supabase Realtime subscription in the browser.
- Recorded fallback session, “load saved map” button, pitch deck, and two production dry-runs.

## Already built on `testing`

- Phase 4 Tutor voice bridge and seven Tutor client tools.
- Save interception, expert replay fallback, mastery persistence, and Work Map approval/audit persistence.
- Phase 5 off-record purge, transcript redaction boundary, server-authorized frame retention, deletion-on-disable, and privacy readiness UI.

## Gotchas

- Never delete `storage.objects` rows directly with SQL; use the Supabase Storage API.
- The live database may contain another teammate's test session. Delete test data by `session_id`, never wholesale.
- Green checks on a documentation-only PR do not validate the integrated application.
- Re-add Preview environment values if a key is rotated, and verify them without printing secret values.
