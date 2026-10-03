# AI Apprentice TODO

Generated from [CHANGELOG.md](./CHANGELOG.md) by npm run todo on 2026-10-03.

The generator reconciles old unchecked checklist items against later Done sections. Treat this file as the team work queue; treat the changelog as the historical record.

## Completed

- [x] **Repo initialized** — Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 scaffold. _(source: [0.0.1] — 2026-10-04 / Done)_
- [x] **shadcn/ui installed** — full component library under `components/ui/` (button, dialog, sheet, sidebar, table, tabs, chart, etc.) with `components.json` config and `lib/utils.ts` (`cn` helper). _(source: [0.0.1] — 2026-10-04 / Done)_
- [x] **Theming** — `components/theme-provider.tsx` wired with `next-themes`; dark-mode toggle supported. _(source: [0.0.1] — 2026-10-04 / Done)_
- [x] **Docs** _(source: [0.0.1] — 2026-10-04 / Done)_
- [x] **Remote** — pushed to `github.com/yapsgg/hacknation-hackathon` (`main`). _(source: [0.0.1] — 2026-10-04 / Done)_
- [x] **`schemas/event.schema.json`** — JSON Schema (draft 2020-12) for a single `CaptureEvent` (`t`, `type`, `object`, `field`, `from`, `to`, `evidence_frame`, `salient_text`, `confidence`, `source`). _(source: [0.0.2] — 2026-10-04 / Done (Phase 0 — Foundation, partial))_
- [x] **`schemas/work-map.schema.json`** — JSON Schema for the `WorkMap` (`steps`, `guardrails`, `screen_moment`, `open_gaps`) with `$defs` for `step`, `guardrail`, `screenMoment`, `gap`. _(source: [0.0.2] — 2026-10-04 / Done (Phase 0 — Foundation, partial))_
- [x] **`schemas/client-tools.md`** — frozen client-tool contract for the interviewer and tutor agents, plus the server/MCP tools and the app→backend event bus rule. _(source: [0.0.2] — 2026-10-04 / Done (Phase 0 — Foundation, partial))_
- [x] **`fixtures/events.mock.json`** — realistic mock capture stream for the seeded demo run (Acme ARR, relocation add-back, capex ratio, save). _(source: [0.0.2] — 2026-10-04 / Done (Phase 0 — Foundation, partial))_
- [x] **`fixtures/work-map.mock.json`** — pre-baked Work Map (7 steps, 4 guardrails, 3 judgment calls, 3 open gaps) for developing the tutor without a live session. _(source: [0.0.2] — 2026-10-04 / Done (Phase 0 — Foundation, partial))_
- [x] **`.env.example`** — Supabase, ElevenLabs/ElevenAgents, vision-model, and app env vars; `.gitignore` updated to allow committing it. _(source: [0.0.2] — 2026-10-04 / Done (Phase 0 — Foundation, partial))_
- [x] **`/deal-desk` page** — 3-pane layout: VDR viewer, LBO input sheet, Apprentice side panel. "synthetic data" label visible. _(source: [0.0.3] — 2026-10-04 / Done (Phase 1 — Sandbox "Deal Desk" app))_
- [x] **Mock VDR** (`lib/vdr.ts`) — 8 seeded docs: EBITDA bridge, Acme MSA + Amendment 2 ("supersedes and replaces"), relocation invoices (3 years), capex history (4.1% vs 1.8%), Customer 3 Order Form + Add-On ("in addition to"), legal fee invoices (2 prior-year repeats). _(source: [0.0.3] — 2026-10-04 / Done (Phase 1 — Sandbox "Deal Desk" app))_
- [x] **LBO input sheet** — ARR (Acme, Customer 3), add-backs (Relocation, Legal), capex ratio. Commit on blur/Enter emits `value_entered` (first entry) or `field_changed` (from → to). _(source: [0.0.3] — 2026-10-04 / Done (Phase 1 — Sandbox "Deal Desk" app))_
- [x] **Save button** — emits `save_clicked`; routed through a pre-commit interceptor stub (always allows; Phase 4 swaps in the tutor's `block_commit`). _(source: [0.0.3] — 2026-10-04 / Done (Phase 1 — Sandbox "Deal Desk" app))_
- [x] **Event bus** (`lib/event-bus.ts`, `hooks/use-events.ts`) — in-memory store via `useSyncExternalStore`; app events tagged `source: "app"`; each event also POSTed to the API. _(source: [0.0.3] — 2026-10-04 / Done (Phase 1 — Sandbox "Deal Desk" app))_
- [x] **`/api/events` route handler** — validates and stores events in memory (POST/GET). Placeholder until Supabase. _(source: [0.0.3] — 2026-10-04 / Done (Phase 1 — Sandbox "Deal Desk" app))_
- [x] **Screen capture hook** (`hooks/use-screen-capture.ts`) — `getDisplayMedia`, 1 fps sampling, grayscale frame-diff gate; vision call is not wired yet. _(source: [0.0.3] — 2026-10-04 / Done (Phase 1 — Sandbox "Deal Desk" app))_
- [x] **Side panel** — share-screen control, off-the-record toggle (pauses event emission, clears frames, shows redaction banner), "frames not retained" switch, live event feed. _(source: [0.0.3] — 2026-10-04 / Done (Phase 1 — Sandbox "Deal Desk" app))_
- [x] **Landing page** linking to the Deal Desk. _(source: [0.0.3] — 2026-10-04 / Done (Phase 1 — Sandbox "Deal Desk" app))_
- [x] **Types** (`lib/types.ts`) mirroring `schemas/`. _(source: [0.0.3] — 2026-10-04 / Done (Phase 1 — Sandbox "Deal Desk" app))_
- [x] **Lint/type fixes** — `use-mobile.ts` rewritten with `useSyncExternalStore`; targeted eslint-disable in `carousel.tsx`. `npm run lint`, `typecheck`, and `build` all pass. _(source: [0.0.3] — 2026-10-04 / Done (Phase 1 — Sandbox "Deal Desk" app))_
- [x] **Verified in browser:** doc open, value entered, field changed, save, off-record, and API receipt of events. _(source: [0.0.3] — 2026-10-04 / Done (Phase 1 — Sandbox "Deal Desk" app))_
- [x] **`supabase/migrations/0001_init.sql`** — tables `sessions`, `events`, `questions`, `gaps`, `work_maps`, `mastery`; RLS on; anon is read-only on `events`/`questions`/`gaps`; those three added to the `supabase_realtime` publication; private `frames` storage bucket; `purge_window()` function for off-the-record deletes (service role only). Idempotent. _(source: [0.0.4] — 2026-10-04 / Done (Phase 1 leftovers: Supabase wiring + Vercel deploy))_
- [x] **`lib/supabase/admin.ts`** (service role, server only) and **`lib/supabase/browser.ts`** (anon, read-only). Both return `null` when env is missing. _(source: [0.0.4] — 2026-10-04 / Done (Phase 1 leftovers: Supabase wiring + Vercel deploy))_
- [x] **`/api/events`** now persists to Supabase when configured, otherwise falls back to memory. Contract changed: `POST { session_id, event }` (uuid required); `GET ?session_id=`. Invalid session/event rejected with 422. _(source: [0.0.4] — 2026-10-04 / Done (Phase 1 leftovers: Supabase wiring + Vercel deploy))_
- [x] **Client session id** — `event-bus` generates a uuid per session and sends it with every event. _(source: [0.0.4] — 2026-10-04 / Done (Phase 1 leftovers: Supabase wiring + Vercel deploy))_
- [x] **`npm run seed`** (`scripts/seed.mjs`) — loads `fixtures/work-map.mock.json` into `work_maps` as the pre-baked seed (idempotent). _(source: [0.0.4] — 2026-10-04 / Done (Phase 1 leftovers: Supabase wiring + Vercel deploy))_
- [x] **Vercel** — project `agent` created under `abdibrokhims-projects`; first deploy is live at https://agent-nine-lake.vercel.app (verified `/deal-desk` and `/api/events` via `vercel curl`). Use `npx vercel@latest` (global CLI 33.4.1 is too old). _(source: [0.0.4] — 2026-10-04 / Done (Phase 1 leftovers: Supabase wiring + Vercel deploy))_
- [x] **Tutor rules** — `lib/tutor.ts` implements the seeded PE guardrails, including the Customer 3 “in addition to” exception, recurring relocation/legal costs, and capex-below-average escalation. _(source: [0.0.5] — 2026-10-04 / Done (Phase 4/5 demo slice — feature branch))_
- [x] **Pre-commit interceptor** — the LBO Save action now evaluates the Work Map rules, blocks unsafe commits, shows the reason, and links to the relevant expert moment. _(source: [0.0.5] — 2026-10-04 / Done (Phase 4/5 demo slice — feature branch))_
- [x] **Expert replay fallback** — replay cards show the seeded decision, quote, frame id, and clip interval until real frame clips are available. _(source: [0.0.5] — 2026-10-04 / Done (Phase 4/5 demo slice — feature branch))_
- [x] **Mastery checklist** — the Tutor panel tracks each rule as `unseen`, `hit`, or `missed`. _(source: [0.0.5] — 2026-10-04 / Done (Phase 4/5 demo slice — feature branch))_
- [x] **Review before publish** — Tutor access can be revoked until the expert-reviewed Work Map is approved. _(source: [0.0.5] — 2026-10-04 / Done (Phase 4/5 demo slice — feature branch))_
- [x] **Off-the-record purge** — the browser clears local events and frames, while `/api/privacy/purge` removes memory events or Supabase events and session-prefixed stored frames. _(source: [0.0.5] — 2026-10-04 / Done (Phase 4/5 demo slice — feature branch))_
- [x] **Transcript privacy boundary** — `/api/privacy/redact` provides a conservative local fallback and reports its provider explicitly; a hosted Presidio Analyzer can be added later. _(source: [0.0.5] — 2026-10-04 / Done (Phase 4/5 demo slice — feature branch))_
- [x] **`TODO.md` generator** — `npm run todo` reconciles historical Done sections with legacy unchecked lists and produces one current work queue. _(source: [0.0.6] — 2026-10-04 / Done (orchestration foundation — feature branch))_
- [x] **Model-routing plan** — `scripts/orchestrate.mjs` assigns planner, implementer, fast-worker, and reviewer roles without executing model calls or file changes. _(source: [0.0.6] — 2026-10-04 / Done (orchestration foundation — feature branch))_
- [x] **Approval-first policy** — `orchestrator/roles.json` records model tiers, ownership boundaries, and gates for secrets, migrations, external writes, PRs, merges, and deployments. _(source: [0.0.6] — 2026-10-04 / Done (orchestration foundation — feature branch))_
- [x] **Supabase connected** — project `eivlugijbvxtdbmnswjq`. Schema from `0001_init.sql` verified in place via the Supabase MCP (6 tables, RLS, Realtime on `events`/`questions`/`gaps`, private `frames` bucket, `purge_window`). `npm run seed` loaded the 7-step Work Map into `work_maps`. _(source: [0.0.7] — 2026-10-04 / Done (Supabase live + ElevenAgents provisioned))_
- [x] **Persistence verified end to end** — `POST /api/events` returned `store: "supabase"` locally and on the production deploy; rows landed in `sessions`/`events` (test rows deleted afterwards). _(source: [0.0.7] — 2026-10-04 / Done (Supabase live + ElevenAgents provisioned))_
- [x] **Env** — `.env.local` (git-ignored) holds the Supabase URL/keys and the ElevenLabs key + agent ids. Supabase URL/anon key, service-role key, ElevenLabs key and both agent ids were added to Vercel (Production; Supabase vars also in Development). Preview environment was not set. _(source: [0.0.7] — 2026-10-04 / Done (Supabase live + ElevenAgents provisioned))_
- [x] **Production redeployed** to https://agent-nine-lake.vercel.app with the Supabase env. _(source: [0.0.7] — 2026-10-04 / Done (Supabase live + ElevenAgents provisioned))_
- [x] **`scripts/provision-agents.mjs`** + **`npm run provision:agents`** — creates/updates the ElevenAgents client tools and both agents via the API. Idempotent: tools matched by name, agents patched when an id is already in `.env.local`. _(source: [0.0.7] — 2026-10-04 / Done (Supabase live + ElevenAgents provisioned))_
- [x] **Define shared schemas** — create `/schemas/` with `event.schema.json` and `work-map.schema.json` exactly as specified in `ARCHITECTURE.md` §2–3. _(source: Next Steps (to finish the app) / Phase 0 — Foundation (0:00–0:30))_
- [x] **Client tool contract** — agree on names and signatures: `get_screen_state`, `log_question`, `mark_gap`, `start_debrief`, `submit_teachback_result`, `block_commit`, `replay_moment`, `update_mastery`, `lookup_guardrail`, `get_expert_moment`. _(source: Next Steps (to finish the app) / Phase 0 — Foundation (0:00–0:30))_
- [x] **Mock event stream** — `fixtures/events.mock.json` so each engineer can develop independently. _(source: Next Steps (to finish the app) / Phase 0 — Foundation (0:00–0:30))_
- [x] **VDR viewer** — mock virtual data room with 3 documents: Acme MSA, Amendment 2 ("supersedes and replaces"), relocation invoices, and Customer 3 Order Form + Add-On ("in addition to"). _(source: Next Steps (to finish the app) / Phase 1 — Sandbox "Deal Desk" app (0:30–2:30))_
- [x] **Mini LBO input sheet** — ARR input, add-back input, capex ratio input; controlled React state. _(source: Next Steps (to finish the app) / Phase 1 — Sandbox "Deal Desk" app (0:30–2:30))_
- [x] **Save / Commit button** — routes through the pre-commit interceptor (stubbed in Phase 1, enforced in Phase 4). _(source: Next Steps (to finish the app) / Phase 1 — Sandbox "Deal Desk" app (0:30–2:30))_
- [x] **App event emitter** — emit ground-truth events (`value_entered`, `doc_opened`, `save_clicked`, `navigation`) to a shared event bus; this is the safety net for vision latency. _(source: Next Steps (to finish the app) / Phase 1 — Sandbox "Deal Desk" app (0:30–2:30))_
- [x] **Side panel layout** — ElevenAgents widget slot, live event feed, question log, off-the-record button. _(source: Next Steps (to finish the app) / Phase 1 — Sandbox "Deal Desk" app (0:30–2:30))_
- [x] **Screen capture** — `getDisplayMedia` → canvas → 1 fps sampling with a frame-diff gate. _(source: Next Steps (to finish the app) / Phase 1 — Sandbox "Deal Desk" app (0:30–2:30))_
- [x] **Hello-world deploy to Vercel** — prove the deploy path in hour 1. _(source: Next Steps (to finish the app) / Phase 1 — Sandbox "Deal Desk" app (0:30–2:30))_
- [x] **`block_commit(reason, step_id)`** — pre-commit interceptor freezes Save and shows an overlay. _(source: Next Steps (to finish the app) / Phase 4 — Teach / Tutor (3:30–4:30))_
- [x] **`replay_moment(step_id)`** — replay the expert's clip (fallback: static screenshot). _(source: Next Steps (to finish the app) / Phase 4 — Teach / Tutor (3:30–4:30))_
- [x] **Mastery checklist** — unseen / hit / missed per rule; end-screen mastery view. _(source: Next Steps (to finish the app) / Phase 4 — Teach / Tutor (3:30–4:30))_
- [x] **Teach cases seeded** — Customer 3 ("in addition to") and the $600k "one-time" legal fee with prior-year repeats. _(source: Next Steps (to finish the app) / Phase 4 — Teach / Tutor (3:30–4:30))_
- [x] **Off-the-record** — button/voice trigger pauses capture, purges the buffer (deletes rows + stored frames), greys the segment in the Work Map. _(source: Next Steps (to finish the app) / Phase 5 — Trust & Privacy (4:30–5:15))_
- [x] **"Frames not stored" toggle** — explicit retention control for confidential deal data. _(source: Next Steps (to finish the app) / Phase 5 — Trust & Privacy (4:30–5:15))_
- [x] **Review before publish** — expert approves the Work Map before the tutor can use it. _(source: Next Steps (to finish the app) / Phase 5 — Trust & Privacy (4:30–5:15))_

## Open work

- [ ] Lock the exact demo script (dialog-level). _(source: [0.0.2] — 2026-10-04 / Still open in Phase 0)_
- [ ] Validate fixtures against the schemas in CI (needs an ajv 8 dev dependency or a script). _(source: [0.0.2] — 2026-10-04 / Still open in Phase 0)_
- [ ] Connect the Tutor panel to the real ElevenAgents tutor session and client tools. _(source: [0.0.5] — 2026-10-04 / Still open for Phase 4/5)_
- [ ] Persist mastery, Work Map approval, and review audit events to Supabase. _(source: [0.0.5] — 2026-10-04 / Still open for Phase 4/5)_
- [ ] Persist approved frame clips only when the retention toggle permits it. _(source: [0.0.5] — 2026-10-04 / Still open for Phase 4/5)_
- [ ] Persist task runs, worker artifacts, test evidence, and reviewer decisions. _(source: [0.0.6] — 2026-10-04 / Still open for orchestration)_
- [ ] Add CI validation that rejects a task when its claimed files overlap another active task. _(source: [0.0.6] — 2026-10-04 / Still open for orchestration)_
- [ ] **ElevenAgents interviewer** — create agent, set voice + Expressive Mode, write the interviewer system prompt (`ARCHITECTURE.md` §6), get a bare-page voice conversation working. _(source: Next Steps (to finish the app) / Phase 2 — Capture intelligence (0:30–2:30, Engineer A))_
- [ ] **Vision loop** — send previous-state summary + new frame to the vision model with structured output matching the event schema; extract `salient_text`. _(source: Next Steps (to finish the app) / Phase 2 — Capture intelligence (0:30–2:30, Engineer A))_
- [ ] **Context pusher** — push a compact rolling summary to the agent as non-interrupting contextual updates. _(source: Next Steps (to finish the app) / Phase 2 — Capture intelligence (0:30–2:30, Engineer A))_
- [ ] **`get_screen_state()` client tool** — lets the agent pull the latest state before asking. _(source: Next Steps (to finish the app) / Phase 2 — Capture intelligence (0:30–2:30, Engineer A))_
- [ ] **Question Governor** — deterministic pause gate (2 s silence + no typing 1.5 s + 45 s cooldown + trigger event), plus question scoring and forced guardrail coverage. _(source: Next Steps (to finish the app) / Phase 2 — Capture intelligence (0:30–2:30, Engineer A))_
- [ ] **Event normalizer + session store** — persist `sessions` and `events` to Supabase; stream via Supabase Realtime. _(source: Next Steps (to finish the app) / Phase 3 — Map + Debrief (2:30–3:15, Engineer A))_
- [ ] **Gap Ledger** — track open/unanswered questions per step. _(source: Next Steps (to finish the app) / Phase 3 — Map + Debrief (2:30–3:15, Engineer A))_
- [ ] **Work Map builder** — LLM merges events + transcript + answers into the Work Map JSON; each step carries `t`, `quote`, `judgment_call`, `status`. _(source: Next Steps (to finish the app) / Phase 3 — Map + Debrief (2:30–3:15, Engineer A))_
- [ ] **Debrief controller** — gap analysis, ≥3 risk-prioritized follow-ups, teach-back, correction diff, done criteria. _(source: Next Steps (to finish the app) / Phase 3 — Map + Debrief (2:30–3:15, Engineer A))_
- [ ] **Work Map UI** (Engineer B) — clickable timeline, per-step screen moment, reason quote, guardrails; teach-back checklist the expert ticks. _(source: Next Steps (to finish the app) / Phase 3 — Map + Debrief (2:30–3:15, Engineer A))_
- [ ] **Tutor agent** — second ElevenAgents agent; Work Map JSON in knowledge base; `lookup_guardrail` client tool reading the guardrail list. _(source: Next Steps (to finish the app) / Phase 4 — Teach / Tutor (3:30–4:30))_
- [ ] **Presidio on transcripts** — redact PII before storage. _(source: Next Steps (to finish the app) / Phase 5 — Trust & Privacy (4:30–5:15))_
- [ ] **Pre-bake the Work Map** — run one full session, save JSON, add a "load saved map" button so Teach never depends on a live build. _(source: Next Steps (to finish the app) / Phase 6 — Polish, Export & Rehearsal (4:30–6:00))_
- [ ] **Recorded fallback session** — for wifi/mic failure at demo time. _(source: Next Steps (to finish the app) / Phase 6 — Polish, Export & Rehearsal (4:30–6:00))_
- [ ] **Pitch deck** — 5 slides incl. moonshot + the five Apprentice Test answers on one slide. _(source: Next Steps (to finish the app) / Phase 6 — Polish, Export & Rehearsal (4:30–6:00))_
- [ ] **Deploy checklist** — Supabase + Vercel env vars, seed script, production deploy freeze, final dry-runs (see `ARCHITECTURE.md` Deploy Checklist). _(source: Next Steps (to finish the app) / Phase 6 — Polish, Export & Rehearsal (4:30–6:00))_
- [ ] **Dry-run twice on the production URL** + record backup video. _(source: Next Steps (to finish the app) / Phase 6 — Polish, Export & Rehearsal (4:30–6:00))_
- [ ] **Stretch (drop first if time slips):** German expert session with English tutor; Work Map export to a stop-and-escalate instruction file (JSON/MD). _(source: Next Steps (to finish the app) / Phase 6 — Polish, Export & Rehearsal (4:30–6:00))_
- [ ] Exact ElevenAgents SDK + client-tool method names (verify against quickstart). _(source: Open Risks / Verify in the First Hour / )_
- [ ] Vercel function duration and request body-size limits. _(source: Open Risks / Verify in the First Hour / )_
- [ ] Supabase free-tier limits (Realtime connections, storage). _(source: Open Risks / Verify in the First Hour / )_
- [ ] Vision-model latency during live screen share. _(source: Open Risks / Verify in the First Hour / )_
- [ ] Mic + screen share on the actual demo laptop/browser (Chrome). _(source: Open Risks / Verify in the First Hour / )_

## Blocked or credential-dependent

- [ ] Decide on Vercel **Deployment Protection**: it is ON, so the URL needs a Vercel login. Turn it off (or add a bypass) before the demo/judging. _(source: [0.0.4] — 2026-10-04 / Needs you (blocked on credentials))_
- [ ] Replace the local redaction fallback with a configured Presidio Analyzer service before handling real deal data. _(source: [0.0.5] — 2026-10-04 / Still open for Phase 4/5)_
- [ ] Add an executable Agents SDK adapter after the team approves credentials, tools, branch/worktree policy, and human approval flow. _(source: [0.0.6] — 2026-10-04 / Still open for orchestration)_
- [ ] Vision model choice + key (recommendation: Gemini Flash). _(source: [0.0.7] — 2026-10-04 / Needs you)_
- [ ] **Rotate** the Supabase service-role key and the ElevenLabs key after the hackathon (both were shared in chat). _(source: [0.0.7] — 2026-10-04 / Needs you)_

## Recommended execution order

1. Resolve the Supabase, ElevenAgents, Presidio, Vercel, and Node 22 prerequisites.
2. Connect the deterministic Phase 4 tutor tools to the real ElevenAgents tutor session.
3. Persist mastery, Work Map approval, and review audit events.
4. Complete the Phase 3 Map/Debrief handoff and browser Realtime path.
5. Build the recorded fallback, production dry-runs, and final demo materials.
6. Re-run npm run todo after every merged phase.

## Orchestrator assignments

- **Planner/reviewer — Sol/high:** architecture, integrations, security, conflict resolution, final review.
- **Implementer — Sol/medium:** one bounded feature per branch/worktree.
- **Fast worker — Luna/low:** docs, fixtures, TODO maintenance, formatting, and focused tests.
- **Human approval required:** secrets, migrations, external writes, branch pushes, PRs, merges, and deploys.
