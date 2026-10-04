# Changelog

All notable changes to this project are documented here, plus the remaining work to finish the app.

## Project: AI Apprentice — PE Diligence Edition

An AI tutor that captures a senior PE expert's QoE/diligence reasoning during a live screen-share, maps it into a structured Work Map, then coaches a junior analyst by intercepting mistakes before they are saved.

See [`IDEA.md`](./IDEA.md) for the pitch and [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full technical design.

---

## [0.0.1] — 2026-10-04

### Done

- **Repo initialized** — Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 scaffold.
- **shadcn/ui installed** — full component library under `components/ui/` (button, dialog, sheet, sidebar, table, tabs, chart, etc.) with `components.json` config and `lib/utils.ts` (`cn` helper).
- **Theming** — `components/theme-provider.tsx` wired with `next-themes`; dark-mode toggle supported.
- **Docs**
  - `IDEA.md` — problem statement, unwritten expert knowledge, guardrail, demo flow, and the PE analyst workflow.
  - `ARCHITECTURE.md` — full architecture: Capture / Map / Teach modules, event + Work Map JSON schemas, Question Governor, ElevenAgents config, seeded demo data, moonshot; the 6-hour scope cut with two-engineer split and hour-by-hour timeline; and the Supabase + Vercel stack plan.
- **Remote** — pushed to `github.com/yapsgg/hacknation-hackathon` (`main`).

### Current state

- `app/page.tsx` is still the default starter page (placeholder).
- No backend, database, agent integration, or capture pipeline implemented yet.
- `components/`, `hooks/`, `lib/` contain only the scaffold + UI primitives.

---

## [0.0.2] — 2026-10-04

### Done (Phase 0 — Foundation, partial)

- **`schemas/event.schema.json`** — JSON Schema (draft 2020-12) for a single `CaptureEvent` (`t`, `type`, `object`, `field`, `from`, `to`, `evidence_frame`, `salient_text`, `confidence`, `source`).
- **`schemas/work-map.schema.json`** — JSON Schema for the `WorkMap` (`steps`, `guardrails`, `screen_moment`, `open_gaps`) with `$defs` for `step`, `guardrail`, `screenMoment`, `gap`.
- **`schemas/client-tools.md`** — frozen client-tool contract for the interviewer and tutor agents, plus the server/MCP tools and the app→backend event bus rule.
- **`fixtures/events.mock.json`** — realistic mock capture stream for the seeded demo run (Acme ARR, relocation add-back, capex ratio, save).
- **`fixtures/work-map.mock.json`** — pre-baked Work Map (7 steps, 4 guardrails, 3 judgment calls, 3 open gaps) for developing the tutor without a live session.
- **`.env.example`** — Supabase, ElevenLabs/ElevenAgents, vision-model, and app env vars; `.gitignore` updated to allow committing it.
- All JSON fixtures parse cleanly.

### Still open in Phase 0

- [ ] Lock the exact demo script (dialog-level).
- [x] Validate fixtures against the schemas in CI. Completed in `0.0.15` with AJV 8 and the GitHub Actions quality gate.

---

## [0.0.3] — 2026-10-04

### Done (Phase 1 — Sandbox "Deal Desk" app)

- **`/deal-desk` page** — 3-pane layout: VDR viewer, LBO input sheet, Apprentice side panel. "synthetic data" label visible.
- **Mock VDR** (`lib/vdr.ts`) — 8 seeded docs: EBITDA bridge, Acme MSA + Amendment 2 ("supersedes and replaces"), relocation invoices (3 years), capex history (4.1% vs 1.8%), Customer 3 Order Form + Add-On ("in addition to"), legal fee invoices (2 prior-year repeats).
- **LBO input sheet** — ARR (Acme, Customer 3), add-backs (Relocation, Legal), capex ratio. Commit on blur/Enter emits `value_entered` (first entry) or `field_changed` (from → to).
- **Save button** — emits `save_clicked`; routed through a pre-commit interceptor stub (always allows; Phase 4 swaps in the tutor's `block_commit`).
- **Event bus** (`lib/event-bus.ts`, `hooks/use-events.ts`) — in-memory store via `useSyncExternalStore`; app events tagged `source: "app"`; each event also POSTed to the API.
- **`/api/events` route handler** — validates and stores events in memory (POST/GET). Placeholder until Supabase.
- **Screen capture hook** (`hooks/use-screen-capture.ts`) — `getDisplayMedia`, 1 fps sampling, grayscale frame-diff gate; vision call is not wired yet.
- **Side panel** — share-screen control, off-the-record toggle (pauses event emission, clears frames, shows redaction banner), "frames not retained" switch, live event feed.
- **Landing page** linking to the Deal Desk.
- **Types** (`lib/types.ts`) mirroring `schemas/`.
- **Lint/type fixes** — `use-mobile.ts` rewritten with `useSyncExternalStore`; targeted eslint-disable in `carousel.tsx`. `npm run lint`, `typecheck`, and `build` all pass.
- **Verified in browser:** doc open, value entered, field changed, save, off-record, and API receipt of events.

### Known gaps / not done yet

- No ElevenAgents widget slot yet (side panel has no voice).
- No question log panel.
- `doc_scrolled` events are not emitted.
- Capture frames are sampled but not sent anywhere (no vision model).
- Events are in memory only (no Supabase); lost on server restart.
- Not yet deployed to Vercel.
- Event feed `salient_text` badges truncate long lines; minor styling.

---

## [0.0.4] — 2026-10-04

### Done (Phase 1 leftovers: Supabase wiring + Vercel deploy)

- **`supabase/migrations/0001_init.sql`** — tables `sessions`, `events`, `questions`, `gaps`, `work_maps`, `mastery`; RLS on; anon is read-only on `events`/`questions`/`gaps`; those three added to the `supabase_realtime` publication; private `frames` storage bucket; `purge_window()` function for off-the-record deletes (service role only). Idempotent.
- **`lib/supabase/admin.ts`** (service role, server only) and **`lib/supabase/browser.ts`** (anon, read-only). Both return `null` when env is missing.
- **`/api/events`** now persists to Supabase when configured, otherwise falls back to memory. Contract changed: `POST { session_id, event }` (uuid required); `GET ?session_id=`. Invalid session/event rejected with 422.
- **Client session id** — `event-bus` generates a uuid per session and sends it with every event.
- **`npm run seed`** (`scripts/seed.mjs`) — loads `fixtures/work-map.mock.json` into `work_maps` as the pre-baked seed (idempotent).
- **Vercel** — project `agent` created under `abdibrokhims-projects`; first deploy is live at https://agent-nine-lake.vercel.app (verified `/deal-desk` and `/api/events` via `vercel curl`). Use `npx vercel@latest` (global CLI 33.4.1 is too old).
- Verified: lint, typecheck, memory-fallback API (valid / bad session / bad event), and UI -> API payload.

### Needs you (blocked on credentials)

- [ ] Create the Supabase project, run `supabase/migrations/0001_init.sql` in the SQL Editor, fill `.env.local`, run `npm run seed`. The Supabase path is **untested** against a real project.
- [ ] Add the same env vars in Vercel (Project Settings -> Environment Variables).
- [ ] Decide on Vercel **Deployment Protection**: it is ON, so the URL needs a Vercel login. Turn it off (or add a bypass) before the demo/judging.
- [ ] ElevenAgents API key + interviewer/tutor agent IDs; vision-model key.
- [ ] Vercel serverless can't hold WebSockets and the memory fallback isn't shared across instances; production must use Supabase.

## [0.0.5] — 2026-10-04

### Done (Phase 4/5 demo slice — feature branch)

- **Tutor rules** — `lib/tutor.ts` implements the seeded PE guardrails, including the Customer 3 “in addition to” exception, recurring relocation/legal costs, and capex-below-average escalation.
- **Pre-commit interceptor** — the LBO Save action now evaluates the Work Map rules, blocks unsafe commits, shows the reason, and links to the relevant expert moment.
- **Expert replay fallback** — replay cards show the seeded decision, quote, frame id, and clip interval until real frame clips are available.
- **Mastery checklist** — the Tutor panel tracks each rule as `unseen`, `hit`, or `missed`.
- **Review before publish** — Tutor access can be revoked until the expert-reviewed Work Map is approved.
- **Off-the-record purge** — the browser clears local events and frames, while `/api/privacy/purge` removes memory events or Supabase events and session-prefixed stored frames.
- **Transcript privacy boundary** — `/api/privacy/redact` provides a conservative local fallback and reports its provider explicitly; a hosted Presidio Analyzer can be added later.

### Still open for Phase 4/5

- [ ] Connect the Tutor panel to the real ElevenAgents tutor session and client tools.
- [ ] Replace the local redaction fallback with a configured Presidio Analyzer service before handling real deal data.
- [ ] Persist mastery, Work Map approval, and review audit events to Supabase.
- [ ] Persist approved frame clips only when the retention toggle permits it.

## [0.0.6] — 2026-10-04

### Done (orchestration foundation — feature branch)

- **`TODO.md` generator** — `npm run todo` reconciles historical Done sections with legacy unchecked lists and produces one current work queue.
- **Model-routing plan** — `scripts/orchestrate.mjs` assigns planner, implementer, fast-worker, and reviewer roles without executing model calls or file changes.
- **Approval-first policy** — `orchestrator/roles.json` records model tiers, ownership boundaries, and gates for secrets, migrations, external writes, PRs, merges, and deployments.

### Still open for orchestration

- [ ] Add an executable Agents SDK adapter after the team approves credentials, tools, branch/worktree policy, and human approval flow.
- [ ] Persist task runs, worker artifacts, test evidence, and reviewer decisions.
- [ ] Add CI validation that rejects a task when its claimed files overlap another active task.

### Known gaps

- Off-the-record now calls the privacy purge route; real frame persistence is still gated until the capture storage path is implemented.
- Browser Realtime subscription (`getSupabaseBrowser`) is not wired into the UI yet.

---

## [0.0.7] — 2026-10-04

### Done (Supabase live + ElevenAgents provisioned)

- **Supabase connected** — project `eivlugijbvxtdbmnswjq`. Schema from `0001_init.sql` verified in place via the Supabase MCP (6 tables, RLS, Realtime on `events`/`questions`/`gaps`, private `frames` bucket, `purge_window`). `npm run seed` loaded the 7-step Work Map into `work_maps`.
- **Persistence verified end to end** — `POST /api/events` returned `store: "supabase"` locally and on the production deploy; rows landed in `sessions`/`events` (test rows deleted afterwards).
- **Env** — `.env.local` (git-ignored) holds the Supabase URL/keys and the ElevenLabs key + agent ids. Supabase URL/anon key, service-role key, ElevenLabs key and both agent ids were added to Vercel (Production; Supabase vars also in Development). Preview environment was not set.
- **Production redeployed** to https://agent-nine-lake.vercel.app with the Supabase env.
- **`scripts/provision-agents.mjs`** + **`npm run provision:agents`** — creates/updates the ElevenAgents client tools and both agents via the API. Idempotent: tools matched by name, agents patched when an id is already in `.env.local`.
  - 8 client tools matching `schemas/client-tools.md`: `get_screen_state`, `log_question`, `mark_gap`, `start_debrief`, `submit_teachback_result` (Interviewer); `get_screen_state`, `block_commit`, `replay_moment`, `update_mastery` (Tutor).
  - **Interviewer** (`agent_4201m41x08y7ef8s9z8rgsv6dnhv`): silent unless the Governor grants a slot, one short anchored question, never asks what the screen shows, off-the-record handling, debrief + teach-back flow.
  - **Tutor** (`agent_5401m41x0bctfrnt1x99tvj698td`): predict / watch / intercept / explain / score loop; rules are conditional (adds when the document says "in addition to") so the Customer 3 case is not over-blocked.
  - Both: `claude-sonnet-4-6`, default voice, Expressive Mode (`eleven_v3_conversational`), patient turn-taking, 30 min cap, dynamic variables (`session_id`, `questions_asked`, `case_id`, `mastery_state`).

### Needs you

- [ ] Vision model choice + key (recommendation: Gemini Flash).
- [ ] Decide on Vercel **Deployment Protection** (still ON; judges need a Vercel login).
- [ ] **Rotate** the Supabase service-role key and the ElevenLabs key after the hackathon (both were shared in chat).

### Known gaps

- Tutor MCP tools (`lookup_guardrail`, `get_expert_moment`) not built; Work Map not yet in the Tutor's knowledge base.
- No voice widget / client-tool handlers in the Deal Desk yet; agents are not connected to the app.
- Question Governor, vision loop, off-the-record purge and Realtime UI subscription still open (see below).
- Supabase advisor notes: `public.rls_auto_enable()` is executable by `anon`/`authenticated` (Supabase-provided, not ours); `sessions`/`work_maps`/`mastery` have RLS with no policies on purpose (service role only).

---

## [0.0.8] — 2026-10-04

### Done (Phase 4 — Teach / Tutor implementation complete)

- **Live Tutor bridge** — official `@elevenlabs/react` SDK, microphone controls, signed-session endpoint, dynamic session/case/mastery variables, and a clear missing-configuration state.
- **Tutor client tools** — `get_screen_state`, `block_commit`, `replay_moment`, `update_mastery`, `lookup_guardrail`, `get_expert_moment`, and voice-controlled `set_off_record` are registered against live Deal Desk state.
- **Work Map grounding** — guardrail and expert-moment lookups expose only the approved seeded Work Map; revoking expert approval ends the voice session and blocks Save.
- **Persistent tutor state** — mastery and approval are stored through `/api/tutor/state`, with Supabase persistence and a memory fallback.
- **Agent provisioning updated** — the Tutor prompt/tool set now includes Work Map lookup and off-record control.
- **Acceptance tests** — correct Acme/Customer 3 values pass; the over-learned replacement mistake and recurring legal fee are blocked with expert evidence.

### Deployment action required for Phase 4

- [x] Run `supabase/migrations/0002_phase_4_5.sql` on the live project. Reported complete by the infrastructure owner on 2026-10-03; recheck after integration.
- [x] Add the required Preview environment variables and run `npm run provision:agents` with the ElevenLabs key so the remote Tutor receives the three new tools. Reported complete on 2026-10-03.
- [ ] Exercise one real microphone conversation on the deployed preview; local automated tests cannot authenticate without the team credentials.

---

## [0.0.9] — 2026-10-04

### Done (Phase 5 — Trust & Privacy implementation complete)

- **Transcript privacy boundary** — live Tutor messages are sent to `/api/privacy/transcripts`, redacted before storage, and rejected if a configured Presidio service fails.
- **Presidio integration** — `/api/privacy/redact` and transcript storage call the Analyzer `/analyze` API when configured; the explicit regex fallback remains available for synthetic/local demos.
- **Retention enforcement** — changed frames upload only when retention is enabled, the Work Map is approved, and the session is on-record.
- **Window-accurate purge** — off-record removes events, redacted transcripts, and only frame objects whose timestamps fall in the requested window.
- **Privacy evidence** — purge windows are persisted, audit actions are recorded, and the UI shows greyed/struck off-record timeline segments with removal counts.
- **Automated privacy tests** — local PII redaction, transcript storage, retained-frame storage, and off-record deletion pass through the memory fallback.

### Deployment action required for Phase 5

- [ ] Provide `PRESIDIO_ANALYZER_URL` for the deployed Analyzer service before using real data.
- [x] Verify the new migration, storage bucket access, and off-record deletion against live Supabase. Reported complete by the infrastructure owner on 2026-10-03; repeat after UI integration.
- [ ] Test microphone/screen-share permissions and the voice phrase “off the record” in Chrome on the demo laptop.

---

## [0.0.10] — 2026-10-04

### Done (Phase 5 closeout hardening)

- **Retention is server-authorized** — frame uploads are rejected unless the session has explicitly enabled retention; a stale browser request can no longer turn retention back on.
- **Disable means delete** — switching to “frames not retained” first disables future uploads and then removes all stored frames for that session, including paginated Supabase objects.
- **Safer Presidio spans** — overlapping analyzer findings are merged before replacement so nested findings cannot corrupt offsets or leak part of a detected value.
- **Readiness visibility** — `/api/privacy/status` reports Supabase/Presidio readiness without returning secrets, and the Deal Desk clearly labels synthetic-only mode.
- **Operational closeout** — `PHASE5_CLOSEOUT.md` records the exact environment, migration, and live acceptance steps. Node `>=22.22.0` is now declared.
- **Expanded privacy tests** — retention deletion, stale-upload rejection, overlapping Presidio findings, fail-closed transcript storage, and no-secret readiness reporting are covered.

### Still requires deployed infrastructure

- [x] Apply `supabase/migrations/0002_phase_4_5.sql` to the live Supabase project. Reported complete on 2026-10-03.
- [ ] Configure a reachable `PRESIDIO_ANALYZER_URL` in Vercel before any real data is used.
- [ ] Run the live acceptance script in `PHASE5_CLOSEOUT.md` with Chrome microphone and screen-share permissions.

---

## [0.0.11] — 2026-10-04

### Done (infrastructure handoff reconciliation)

- **Infrastructure handoff** — the owner reported the Phase 4/5 migration, Preview environment, current ElevenAgents tools, and live Supabase purge evidence complete on 2026-10-03.
- **Safe integration order** — the latest UI must be integrated from `worktree-deal-desk-ui-v2` into a branch based on `testing`; only the validated combined branch may later move to `main`.
- **Canonical status corrected** — mastery, Work Map approval, and audit persistence are already implemented on `testing`; Presidio remains required before real data.

### Still requires human or credentialed verification

- [ ] Repeat the live deletion check after the UI integration is deployed.
- [ ] Configure a reachable `PRESIDIO_ANALYZER_URL` before using real data.
- [ ] Run the microphone, screen-share, and spoken off-record flow in Chrome.
- [ ] Configure judge access around Vercel Deployment Protection.

---

## [0.0.12] — 2026-10-04

### Done (latest Deal Desk UI integrated with Phase 4/5)

- **Conflict-safe integration** — merged `worktree-deal-desk-ui-v2` into a branch based on current `testing`, keeping the Phase 4/5 privacy, Tutor, mastery, approval, and audit behavior as the behavioral source of truth.
- **Updated Deal Desk** — the new three-pane analyst workspace, source-aware LBO input groups, document verification states, scripted source-check cards, activity feed, and Senior Debrief route now run on the current backend.
- **Real approval flow** — editing the Senior Debrief revokes Tutor approval; completing all seven reviews and resolving the three gaps enables publish, which restores the persisted approval state.
- **Privacy controls preserved** — synthetic-only readiness, frame-retention authorization, capture counts, off-record purge windows, and deletion counts remain visible in the redesigned Apprentice panel.
- **Integrated acceptance pass** — wrong Acme ARR was blocked, corrected ARR values saved, off-record purged the active window, and the seven-step debrief published successfully in the local browser with no console errors.
- **Validation** — tests, lint, typecheck, and production build pass; focused tests cover the new source-check prompt suppression after evidence is reviewed.

### Still requires deployed or hardware verification

- [ ] Deploy the combined branch to Preview and repeat the live Supabase deletion check.
- [ ] Configure a reachable `PRESIDIO_ANALYZER_URL` before using real deal data.
- [ ] Run the microphone, screen-share, and spoken off-record flow in Chrome on the demo laptop.
- [ ] Configure judge access around Vercel Deployment Protection.

---

## [0.0.13] — 2026-10-04

### Done (Phase 2/3 deterministic foundation)

- **Question Governor core** — deterministic slot evaluation now enforces voice silence, app inactivity, no active document scrolling, a 45-second cooldown, five questions per ten minutes, and a recent trigger event.
- **Question scoring** — candidates are ranked by reveal value, visible anchoring, novelty, and screen-answerable penalty; after six minutes the next available slot is reserved for an unasked guardrail.
- **Interviewer state API** — the frozen `log_question`, `mark_gap`, `start_debrief`, and `submit_teachback_result` contracts now have validated server persistence through Supabase with an explicit memory fallback.
- **Gap lifecycle** — open gaps can be closed or waived, debrief startup returns risk-prioritized outstanding work and enforces the three-follow-up minimum, and teach-back corrections increment the Work Map correction count and revoke approval.
- **Regression coverage** — the Windows-compatible test command now runs both Phase 2/3 and Phase 4/5 suites; 15 tests, lint, typecheck, and the production build pass.

### Still open before Phase 2/3 is complete

- [ ] Feed real ElevenAgents VAD silence, app interaction idle time, document scroll state, and frame-change state into the Question Governor.
- [ ] Add the Interviewer voice UI, register its client-tool handlers, and send granted slots plus compact screen summaries with `sendContextualUpdate`.
- [ ] Add the vision-model event extractor and compare its output with the app event stream.
- [ ] Stream events, questions, and gaps into the browser through Supabase Realtime.
- [ ] Build the Work Map draft from events, redacted transcripts, answers, and gaps instead of relying only on the seeded fixture.

---

## [0.0.14] — 2026-10-04

### Done (`frontend_ui` integration)

- **Friend's latest UI applied** — merged the three `frontend_ui` commits onto current `testing` without replacing the validated `/deal-desk` flow.
- **New `/apprentice` experience** — added the full Capture → Debrief → Work Map → Teach → Results prototype and linked it from the landing page.
- **React 19 cleanup** — repaired ref updates during render, effect dependencies, dynamically declared navigation components, JSX text lint failures, and unused callback parameters.
- **Privacy boundary preserved** — removed the prototype's direct browser-to-Anthropic frame upload. Live screen sampling now stays local and emits only generic frame-change events until OCR/PII masking and the server-side vision path are ready.
- **Acceptance pass** — loaded the completed demo, opened Debrief and Teach, and confirmed an unsafe `$190,000` Crestline ARR is blocked before the debt schedule with the expert's grounded reasoning.
- **Validation** — all 15 tests, lint, typecheck, production build, and browser console checks pass.

### Still open for the imported prototype

- [ ] Replace browser speech preview with the provisioned ElevenAgents Interviewer and Tutor sessions.
- [ ] Connect redacted server-side vision events to the Capture screen; the Phase 2 Question Governor is now wired to the seeded no-key stream.
- [x] Persist the prototype's debrief, Work Map, and Teach state through `/api/apprentice/state`, with browser, memory, and Supabase storage. Completed in `0.0.16`.
- [x] Reconcile the prototype's rule fixtures with the canonical seeded Work Map before making `/apprentice` the primary demo route. Completed in `0.0.16`.

---

## [0.0.15] — 2026-10-04

### Done (schema contracts + continuous integration)

- **Fixture contract validation** — `npm run validate:fixtures` compiles both draft 2020-12 schemas and validates every mock capture event plus the seeded Work Map.
- **Semantic fixture checks** — validation also rejects out-of-order event timestamps and duplicate Work Map step ids.
- **GitHub CI gate** — pull requests and pushes to `testing` or `main` now validate fixtures, run all tests, lint, type-check, and produce a production build on Node 22.22.

---

## [0.0.16] — 2026-10-03

### Done (canonical Apprentice model + durable UI state)

- **One source of truth** — `/apprentice` now derives its seven steps, three gaps, capture events, expert evidence, and five Tutor rules from the canonical fixtures and `TUTOR_RULES` instead of a separate `R1`–`R9` scenario.
- **Consistent demo** — the Capture screen, Work Map, Debrief, and Teach checks now use the same Acme, relocation, capex, and QoE facts as the validated Deal Desk.
- **Durable UI state** — `/api/apprentice/state` validates and stores the complete integrated UI session, with local browser recovery, an in-process fallback, Supabase persistence, and reset/delete behavior.
- **Private persistence migration** — `0003_apprentice_state.sql` adds a service-role-only state table; no anonymous database write policy is introduced.
- **Regression coverage** — canonical mapping and state round-trip/validation tests increase the suite from 15 to 18 tests.

### Still open for deployment

- [ ] Apply `supabase/migrations/0003_apprentice_state.sql` to the live Supabase project to enable cross-device `/apprentice` restoration. Until then, the browser fallback remains functional.

---

## [0.0.17] — 2026-10-03

### Done (Question Governor in the integrated Capture UI)

- **Shared gate, not a UI imitation** — `/apprentice` Capture now calls the Phase 2 `evaluateQuestionSlot` implementation for every candidate instead of maintaining a second inline pause-and-score algorithm.
- **All deterministic gates active** — voice silence, interaction idle time, document scrolling, 45-second cooldown, five-question budget, recent triggers, and guardrail coverage control the seeded interview.
- **Scored evidence in the UI** — each granted question records its Governor score and trigger, while held candidates expose the current gate reason.
- **No-key fallback retained** — the validated fixture stream supplies deterministic activity and screen events today; live Scribe and redacted vision signals can replace those inputs without changing the gate.
- **Regression coverage** — all four seeded Capture candidates are checked against the shared Governor contract.

### Still open for live capture

- [ ] Feed real ElevenAgents VAD, user-interaction idle time, document-scroll state, and redacted server-side vision events into the same Capture signal adapter.

---

## Next Steps (to finish the app)

Ordered by the build priority in `ARCHITECTURE.md` §8. Each item lists concrete deliverables and a definition of done.

### Phase 0 — Foundation (0:00–0:30)

- [ ] **Lock the demo script** — write the exact end-to-end run both engineers build toward (Acme ARR → relocation add-back → capex ratio → debrief → teach-back → Customer 3 teach case).
- [ ] **Define shared schemas** — create `/schemas/` with `event.schema.json` and `work-map.schema.json` exactly as specified in `ARCHITECTURE.md` §2–3.
- [ ] **Client tool contract** — agree on names and signatures: `get_screen_state`, `log_question`, `mark_gap`, `start_debrief`, `submit_teachback_result`, `block_commit`, `replay_moment`, `update_mastery`, `lookup_guardrail`, `get_expert_moment`.
- [ ] **Mock event stream** — `fixtures/events.mock.json` so each engineer can develop independently.
- [ ] **Environment + accounts** — Supabase project, Vercel project, ElevenLabs/ElevenAgents key, vision-model API key. Add `.env.local` (git-ignored) and an `.env.example`.
- **Done when:** schemas committed, mock stream committed, both devs can run `npm run dev` and read the contract.

### Phase 1 — Sandbox "Deal Desk" app (0:30–2:30)

- [ ] **VDR viewer** — mock virtual data room with 3 documents: Acme MSA, Amendment 2 ("supersedes and replaces"), relocation invoices, and Customer 3 Order Form + Add-On ("in addition to").
- [ ] **Mini LBO input sheet** — ARR input, add-back input, capex ratio input; controlled React state.
- [ ] **Save / Commit button** — routes through the pre-commit interceptor (stubbed in Phase 1, enforced in Phase 4).
- [ ] **App event emitter** — emit ground-truth events (`value_entered`, `doc_opened`, `save_clicked`, `navigation`) to a shared event bus; this is the safety net for vision latency.
- [ ] **Side panel layout** — ElevenAgents widget slot, live event feed, question log, off-the-record button.
- [ ] **Screen capture** — `getDisplayMedia` → canvas → 1 fps sampling with a frame-diff gate.
- [ ] **Hello-world deploy to Vercel** — prove the deploy path in hour 1.
- **Done when:** an analyst can open a doc, type ARR, and click Save, and every action appears in the event feed.

### Phase 2 — Capture intelligence (0:30–2:30, Engineer A)

- [ ] **ElevenAgents interviewer** — create agent, set voice + Expressive Mode, write the interviewer system prompt (`ARCHITECTURE.md` §6), get a bare-page voice conversation working.
- [ ] **Vision loop** — send previous-state summary + new frame to the vision model with structured output matching the event schema; extract `salient_text`.
- [ ] **Context pusher** — push a compact rolling summary to the agent as non-interrupting contextual updates.
- [ ] **`get_screen_state()` client tool** — lets the agent pull the latest state before asking.
- [x] **Question Governor** — deterministic pause gate (1.8 s voice silence + 1.5 s interaction idle + no scrolling + 45 s cooldown + trigger event), question scoring, five-per-ten-minute budget, and forced guardrail coverage are integrated into `/apprentice` Capture.
- **Done when:** with a recorded run, the agent asks at least 3 relevant questions at natural pauses, one of them about a guardrail, referencing on-screen text.

### Phase 3 — Map + Debrief (2:30–3:15, Engineer A)

- [ ] **Event normalizer + session store** — persist `sessions` and `events` to Supabase; stream via Supabase Realtime.
- [ ] **Gap Ledger** — track open/unanswered questions per step.
- [ ] **Work Map builder** — LLM merges events + transcript + answers into the Work Map JSON; each step carries `t`, `quote`, `judgment_call`, `status`.
- [ ] **Debrief controller** — gap analysis, ≥3 risk-prioritized follow-ups, teach-back, correction diff, done criteria.
- [ ] **Work Map UI** (Engineer B) — clickable timeline, per-step screen moment, reason quote, guardrails; teach-back checklist the expert ticks.
- **Done when:** a full run produces a Work Map with "confirmed by expert" badge and correction count.

### Phase 4 — Teach / Tutor (3:30–4:30)

- [ ] **Tutor agent** — second ElevenAgents agent; Work Map JSON in knowledge base; `lookup_guardrail` client tool reading the guardrail list.
- [ ] **`block_commit(reason, step_id)`** — pre-commit interceptor freezes Save and shows an overlay.
- [ ] **`replay_moment(step_id)`** — replay the expert's clip (fallback: static screenshot).
- [ ] **Mastery checklist** — unseen / hit / missed per rule; end-screen mastery view.
- [ ] **Teach cases seeded** — Customer 3 ("in addition to") and the $600k "one-time" legal fee with prior-year repeats.
- **Done when:** the tutor catches an over-learned "amendments replace" mistake on Customer 3 and blocks the commit with the expert's reasoning.

### Phase 5 — Trust & Privacy (4:30–5:15)

- [ ] **Off-the-record** — button/voice trigger pauses capture, purges the buffer (deletes rows + stored frames), greys the segment in the Work Map.
- [ ] **Presidio on transcripts** — redact PII before storage.
- [ ] **"Frames not stored" toggle** — explicit retention control for confidential deal data.
- [ ] **Review before publish** — expert approves the Work Map before the tutor can use it.
- **Done when:** off-record demonstrably deletes the window's data live.

### Phase 6 — Polish, Export & Rehearsal (4:30–6:00)

- [ ] **Pre-bake the Work Map** — run one full session, save JSON, add a "load saved map" button so Teach never depends on a live build.
- [ ] **Recorded fallback session** — for wifi/mic failure at demo time.
- [ ] **Pitch deck** — 5 slides incl. moonshot + the five Apprentice Test answers on one slide.
- [ ] **Deploy checklist** — Supabase + Vercel env vars, seed script, production deploy freeze, final dry-runs (see `ARCHITECTURE.md` Deploy Checklist).
- [ ] **Dry-run twice on the production URL** + record backup video.
- [ ] **Stretch (drop first if time slips):** German expert session with English tutor; Work Map export to a stop-and-escalate instruction file (JSON/MD).
- **Done when:** two clean end-to-end dry-runs on the production URL and a backup recording exist.

---

## Open Risks / Verify in the First Hour

- [ ] Exact ElevenAgents SDK + client-tool method names (verify against quickstart).
- [ ] Vercel function duration and request body-size limits.
- [ ] Supabase free-tier limits (Realtime connections, storage).
- [ ] Vision-model latency during live screen share.
- [ ] Mic + screen share on the actual demo laptop/browser (Chrome).

## Drop Order if Time Slips

German/export stretch → vision accuracy comparison slide → mastery end-screen polish → replay clip (use static screenshot).

**Never drop:** voice questions at pauses, the debrief with teach-back, the Save block with the expert's reasoning, and a working production URL.
