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
- [ ] Validate fixtures against the schemas in CI (needs an ajv 8 dev dependency or a script).

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
- [ ] **Question Governor** — deterministic pause gate (2 s silence + no typing 1.5 s + 45 s cooldown + trigger event), plus question scoring and forced guardrail coverage.
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
