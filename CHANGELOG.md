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
