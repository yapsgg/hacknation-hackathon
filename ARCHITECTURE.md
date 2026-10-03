# AI Apprentice: PE Diligence Edition — Full Architecture

## 0. Positioning

Your idea fits the brief well because it has real guardrails and a hidden judgment call (supersede vs. add). Two changes will make it score better.

- **Frame the expert as the senior partner or VP doing a QoE scrub, not the junior.** The challenge asks you to capture an expert and teach a new hire. The junior is the Module 3 user, and the "wait, stop" moment from your pitch becomes the Teach demo.
- **Make the guardrail conditional, not a flat "never".** "Never hardcode before checking the source" is too generic for the tutor to teach. The expert's real rules are sharper: "Check amendment language for supersedes vs. in addition to", "A one-time cost that shows up in 2+ prior years' invoices is recurring", "Capex below the 3-yr average ratio needs a reason, or escalate to QoE."

## 1. System Overview

```
┌──────────────────────── BROWSER (Next.js/React) ────────────────────────┐
│  Sandbox "Deal Desk" app        Apprentice side panel                   │
│  ├ Mock VDR (PDF viewer)        ├ ElevenAgents widget (voice)           │
│  ├ Mini LBO input sheet         ├ Live event feed + question log        │
│  └ Save / Commit buttons        └ Off-the-record button + redaction     │
│                                                                         │
│  Capture layer: getDisplayMedia → canvas → frame-diff gate → OCR-redact │
│  Mic → ElevenAgents (Scribe v2 Realtime VAD inside the conversation)    │
└───────────────┬───────────────────────────────────────┬─────────────────┘
          WebSocket (frames/events)              ElevenAgents session
                │                                       │ client tools
┌───────────────▼───────────────────────────────────────▼─────────────────┐
│ BACKEND (FastAPI/Node)                                                  │
│  1. Frame Ingest → Redactor (Presidio + OCR boxes) → Vision Model       │
│  2. Event Normalizer → Session Store (Postgres/SQLite + blob for frames)│
│  3. Context Pusher (contextual updates to the agent)                    │
│  4. Question Governor (pause arbiter, budget, gap scorer)               │
│  5. Gap Ledger (open questions per step)                                │
│  6. Work Map Builder (LLM merge: events + transcript + answers)         │
│  7. Debrief Controller (coverage check, teach-back, correction diff)    │
│  8. Guardrail Store (KB + MCP server) → Tutor                           │
│  9. Pre-Commit Interceptor (Teach mode)                                 │
│ 10. Exporter (Agent-ready instructions JSON/MD)                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key decision:** build your own sandbox app. Vision models read clean UIs far more reliably than a random Excel window, and a self-built Save button is what lets the tutor "catch the error before it's saved." Use vision as the primary event source, as the brief requires. Instrument the app with a ground-truth event log that is never shown to the agent. Use it to score the vision pipeline's accuracy (a nice slide) and as a fallback if vision flakes live.

## 2. Module 1: Capture

### Frame pipeline

- Sample at 1 fps. A perceptual-hash or pixel-diff gate drops unchanged frames, so you only pay for vision calls when something changed (typically 20–30% of frames).
- Before upload: OCR the frame, run Presidio on the text, and black out boxes containing PII. For the demo data this covers names of executives and relocated employees.
- Send the previous state summary plus the new frame to a fast vision model (Gemini Flash or Claude Haiku/Sonnet class) with structured output.

### Event schema

```json
{
  "t": 192.4,
  "type": "field_changed | doc_opened | doc_scrolled | value_entered | save_clicked | navigation",
  "object": "Customer: Acme / MSA Amendment 2",
  "field": "ARR input",
  "from": 80000, "to": 190000,
  "evidence_frame": "f_0192",
  "salient_text": ["supersedes and replaces", "Order Form #1"],
  "confidence": 0.86
}
```

`salient_text` matters because the vision model quotes contract language that is on screen. This lets the agent ask about what is visible rather than something generic.

**Pushing context:** Events are sent to ElevenAgents as non-interrupting contextual updates (a compact rolling summary, not raw JSON). A client tool, `get_screen_state()`, lets the agent pull the latest state when it is about to ask. Verify the exact SDK method names against the quickstart.

### The Question Governor (answers Apprentice Test Q1 and Q2)

The LLM does not decide on its own when to speak. A deterministic arbiter gates it.

**When to ask: all conditions must hold.**

- The expert's voice-activity detector reports silence of at least 1.8 s (Scribe/ElevenAgents turn detection).
- No typing or cursor activity for at least 1.5 s (app-level signal plus frame diff).
- No doc scroll in progress (the expert is reading).
- At least 45 s since the last question, and fewer than 5 questions per 10 minutes.
- A trigger event occurred in the last 8 s: a value committed, a doc closed, an amendment opened, or an add-back accepted.

**What to ask: each candidate question gets a score.**

```
score = reveal_value × on_screen_anchor × novelty − screen_answerable_penalty
```

- `reveal_value` is highest for guardrail probes (limits, exceptions, stop-and-ask) and decision reasons.
- The `screen_answerable_penalty` is applied if the answer is literally visible (e.g., "what is the ARR?").
- `novelty` is checked against the Gap Ledger so the agent doesn't ask the same thing twice.
- Forced coverage: if 6 minutes have passed and no guardrail question has been asked, the next slot is reserved for one.

**Question templates, tied to visible content**

- Decision reason: "You just entered 110,000 instead of 190,000. What in that amendment made you do that?"
- Guardrail: "Is there a dollar threshold on a one-time add-back where you'd stop and escalate?"
- Stop-and-ask: "Who do you go to when the contract language is ambiguous?"

Unasked or unanswered questions go to the Gap Ledger for the debrief.

## 3. Module 2: Map

### Work Map schema

```json
{
  "workflow": "Seller EBITDA/ARR scrub",
  "steps": [{
    "id": 3, "title": "Validate ARR for Customer Acme",
    "screen_moment": {"t": 192.4, "frame": "f_0192", "clip": [188, 200]},
    "decision": "Set ARR to $110k, not $190k",
    "reason_quote": "\"Amendment 2 supersedes the original order form, so it's a replacement.\"",
    "reason_t": 197.1,
    "guardrails": [{
      "rule": "Read amendment for 'supersedes/replaces' vs 'in addition to' before summing.",
      "type": "check",
      "evidence": {"t": 197.1, "quote": "..."},
      "confidence": 0.9
    }],
    "judgment_call": true,
    "status": "confirmed | corrected | unresolved",
    "off_record": false
  }],
  "guardrails_global": [],
  "open_gaps": []
}
```

Every step and guardrail carries `t` and `quote`, which satisfies the "links to screen moment and expert's own words" requirement.

### Debrief engine (answers Q3)

- **Gap analysis.** An LLM compares the Work Map draft against a checklist. Each step needs a decision, a reason, at least one guardrail or an explicit "no guardrail", and an exception case. Anything missing becomes a gap.
- **Ask at least 3 follow-ups** from the Gap Ledger, prioritized by risk (a dollar-limit gap outranks a labeling gap). Examples: "Is the relocation threshold the same for every add-back category?", "What would make you accept the $4M?", "What do you do if the VDR has no amendment?"
- **Teach-back:** the agent explains the process in under a minute, step by step. The expert replies "yes", or corrects, and each correction is diffed into the map and marked corrected.
- **Done criteria:** debrief ends only when (a) all high-risk gaps are closed or explicitly waived, (b) the teach-back gets an explicit confirmation on every step (a UI checklist the expert ticks), and (c) the correction diff is empty on the last pass. The final map shows a "confirmed by expert" badge and a count of corrections. That is your proof of understanding.

## 4. Module 3: Teach (answers Q4)

Tutor agent is a second ElevenAgents agent. The Work Map goes into its knowledge base, and the guardrails are exposed through a small MCP server (`lookup_guardrail(topic)`, `get_expert_moment(step_id)`).

### Loop per case

- **Predict:** before the hire acts, the tutor asks, "What will you check before you enter ARR?"
- **Watch:** the same vision pipeline reads the new hire's screen.
- **Intercept:** the sandbox's Save is routed through a pre-commit hook. When the hire types a value or clicks Save, the interceptor compares it against the map's rules, and the tutor can trigger a client tool, `block_commit(reason, step_id)`, which freezes the button and shows an overlay.
- **Explain:** the tutor answers in the expert's words ("Sabine said…"), calls `replay_moment(step_id)` to play the expert's clip, then lets the hire correct it.
- **Score:** each rule has a mastery state (unseen, shown, predicted correctly, applied unprompted). The end screen shows mastered vs. practice next.

### The case the expert never showed (this is what the judge will test)

- Customer 3: an Order Form plus an Add-On that says "in addition to." The correct answer is to add them. A hire who over-learned "amendments replace" gets caught by the tutor, which shows it teaches the reading discipline and not a memorized answer.
- Backup: a "one-time" legal fee add-back of $600k that also appears in two prior years' invoices. The tutor catches it with the recurrence rule.

## 5. Trust and Privacy (answers Q5)

- **Off the record:** say "off the record" or press the button. Capture pauses, the buffer for that window is purged (not just hidden), and the Work Map shows a greyed "redacted segment" with no content. The agent also stops pushing contextual updates.
- **PII redaction** happens client-side or at ingest, before any frame reaches the vision model: OCR plus Presidio, with boxes blurred in stored frames. Transcripts pass through Presidio before storage. PE angle: deal data is confidential, so also show a "frames are not retained after the session unless the expert approves" toggle.
- **Review before publish:** the expert approves the Work Map before the tutor can use it.

## 6. ElevenAgents Configuration

| Item | Interviewer | Tutor |
| --- | --- | --- |
| Voice | Calm, curious, Expressive Mode | Same voice family, warmer, coaching tone |
| LLM | Strong reasoning model (a Claude Sonnet class model via the agent LLM options) | Same, plus fast model fallback |
| Client tools | `get_screen_state`, `log_question`, `mark_gap`, `start_debrief`, `submit_teachback_result` | `get_screen_state`, `block_commit`, `replay_moment`, `update_mastery` |
| Server/MCP tools | none | `lookup_guardrail`, `get_expert_moment` |
| Knowledge | interviewing rubric, domain primer | Work Map JSON plus guardrail list |
| Dynamic variables | session ID, step count, questions asked, mode | case ID, mastery state |

**System prompt principles for the interviewer:** "Stay silent unless the Governor grants a slot. Ask one short question. Never ask what the screen shows. Prefer why, limit, and when would you stop."

## 7. Seeded Demo Data (sandbox VDR)

- Acme MSA ($80k) plus Amendment 2 ($110k, "supersedes and replaces"). Correct ARR is $110k.
- Relocation add-back of $4M, with 3 years of "relocation" invoices in the VDR (recurring). The expert flags it for QoE.
- Capex ratio: 4.1% of revenue historically vs. 1.8% in management's forecast. The expert escalates.
- Teach case (unseen): Customer 3, Order Form plus "in addition to" Add-On, and a $600k "one-time" legal fee with 2 prior-year repeats.

This yields roughly 7 steps, 3 judgment calls and 4 guardrails, matching the "What Good Looks Like" bar.

## 8. Build Order (hackathon priority)

1. Voice and screen events in context (the brief's tip #1): ElevenAgents session, one screen share, vision events streaming in.
2. Sandbox app with VDR viewer, input sheet and Save hook.
3. Question Governor (the pause rules above). Test with a recorded run of yourself.
4. Work Map builder and debrief with the teach-back checklist UI.
5. Tutor with `block_commit` and replay.
6. Privacy: off-record and Presidio.
7. Stretch: German-language expert session with English tutor (set agent language and translate map quotes while keeping originals), agent-ready export (Work Map to a stop-and-escalate instruction file).

**Fallbacks:** if vision latency spikes, use the app's ground-truth events for the demo and show the vision accuracy comparison offline. If live pause detection misbehaves, add a manual "ask now" hotkey for the operator only as an emergency.

## 9. Moonshot Slide

"Deal memory." Every senior's scrub patterns accumulate into a firm-wide diligence playbook that updates itself and asks only about what is new. Today's Work Map becomes agent-ready: junior-level steps are automated by an agent that halts at the same guardrails (the escalate-to-QoE rule), while humans keep the judgment calls. Later, anonymized across firms, this becomes a library of how diligence is really done.

---

# Can We Build This in 6 Hours? Scope Cut and Two-Engineer Split

Short answer: yes, but only a thin vertical slice of the architecture. The full design above is roughly 3 to 4 days of work for two people. In 6 hours you can hit every "Required" box in the brief if you cut ruthlessly and fake the right things.

## 1. What to cut

| Full architecture | 6-hour version |
| --- | --- |
| Deterministic Question Governor with scoring | Simple rules: 2 s silence + no typing + 45 s cooldown + trigger event. Put the rest in the agent prompt. |
| Presidio + OCR box blur | Skip OCR. Run Presidio on transcripts only, and use fake data with a visible "frames not stored" toggle. Say the rest is on the roadmap. |
| Postgres, blob store | Supabase Postgres + Supabase Storage (see Stack tab). |
| Custom WebSocket backend | Next.js API routes + Supabase Realtime (Vercel serverless can't hold long-lived WebSockets). Separate backend deploy is cut. |
| MCP server | Plain client tools (`lookup_guardrail` as a client tool reading JSON) |
| Mastery state machine | Checklist of 4 rules: unseen / hit / missed |
| Ground-truth event log | Keep it, it's your safety net (see below) |
| Stretch goals (German, export) | Export only if time remains: dump Work Map to a markdown file |

## 2. Critical risk decisions

- **Vision latency is your biggest risk.** Build the sandbox app to emit its own events (value entered, doc opened, save clicked) from the start, and run vision in parallel as a secondary source. If vision lags live, the demo still works. Pitch it as "vision-primary, app events as verification."
- **Pre-bake the Work Map.** Run the full interviewer session once yourselves, save the resulting Work Map JSON, and have a "load saved map" button. The Teach demo must not depend on a live Work Map build succeeding.
- **Seed one recorded fallback session** in case wifi or the mic fails at demo time.
- **Fix the demo script first** (30 min, both engineers together). Everything is built to that exact script.
- **Vercel body-size and duration limits** — verify in the first hour.
- **No persistent WebSockets on Vercel** — use Supabase Realtime.
- **Key leakage** — env vars only, never client-exposed.
- **A late-deploy surprise** — deploy a hello-world to Vercel in hour 1.
- **Supabase hiccups** — keep the ground-truth event log as fallback.
- **A broken deploy right before the demo** — production deploy freeze before dry-runs.

## 3. Team split

**Engineer A: Voice and Intelligence (the agent side)**
Owns ElevenAgents, prompts, the vision pipeline, Work Map generation, the debrief, the API routes, the Supabase schema and the seed script.

**Engineer B: App and Experience (the product side)**
Owns the sandbox Deal Desk app, screen capture, event emission, Work Map UI, Save interceptor, the Vercel project and environment variables, the deploy freeze, and the pitch deck.

**The contract between you (agree in the first 30 min):**

- Event JSON schema (`t`, `type`, `object`, `field`, `from`, `to`, `salient_text`)
- Work Map JSON schema
- Client tool names: `get_screen_state`, `block_commit`, `replay_moment`, `update_mastery`
- One shared repo, a `/schemas` folder, and a mock event stream file so each side can test alone

## 4. Hour-by-hour timeline

| Hour | Engineer A | Engineer B |
| --- | --- | --- |
| 0:00–0:30 | Together: lock demo script, schemas, repo, API keys, infrastructure setup | Together |
| 0:30–1:30 | ElevenAgents interviewer: create agent, prompt, voice, Expressive Mode. Get a voice conversation working in a bare page. | Sandbox app: VDR viewer (3 PDFs/text docs), ARR input, add-back input, Save button. Emits app events to a shared event bus. Deploy hello-world to Vercel. |
| 1:30–2:30 | Vision loop: 1 fps frame, diff gate, vision model returns events. Push rolling summary into the agent as contextual updates. Rules-based pause gate. | Screen capture (`getDisplayMedia`), side panel layout, live event feed, question log, off-the-record button (pauses capture and event push). |
| 2:30–3:15 | Gap Ledger plus Work Map builder (LLM merges events and transcript into JSON). Then the debrief prompt: 3+ follow-ups, teach-back. | Work Map UI: clickable timeline, per-step screen moment, reason quote, guardrails. Teach-back checklist the expert ticks. |
| 3:15–3:30 | Integration checkpoint on the Vercel preview URL: run the full Capture to Map flow end to end. Fix only blockers. | Same |
| 3:30–4:30 | Tutor agent: second agent, Work Map in knowledge base, `block_commit` and `replay_moment` client tools, predict-then-act prompt. | Pre-commit interceptor: Save goes through rules check, overlay UI, replay player, end-screen mastery view. Add Customer 3 and the $600k legal fee case to the sandbox. |
| 4:30–5:15 | Rehearse the expert run, save the Work Map JSON, tune prompts so the three required questions (one on a guardrail) land at natural pauses. | Pitch deck: 5 slides including the moonshot slide, plus the five Apprentice Test answers on one slide. |
| 5:15–5:45 | Together: full demo dry-run twice on the production URL, record a backup video | Together |
| 5:45–6:00 | Buffer, submit | Buffer |

The 360-minute total checks out.

## 5. What to demo, mapped to the five Apprentice Test questions

1. **When to ask:** show the pause gate in the event feed ("gate open: 2.1 s silence, trigger: amendment opened").
2. **What to ask:** the question references on-screen contract language ("supersedes and replaces").
3. **When understood:** teach-back checklist ticked, correction count shown.
4. **New hire learned:** Customer 3 ("in addition to") catches an over-learned rule, and mastery screen shows results.
5. **Trust:** off-the-record button purges the buffer live, and Presidio runs on transcripts.

## 6. Priorities if time slips

Drop in this order: German/export stretch, then the vision accuracy comparison slide, then the mastery end screen polish, then the replay clip (use a static screenshot instead). Frame storage is now third in the drop order. Never drop: voice questions at pauses, the debrief with a teach-back, the Save block with the expert's reasoning, and a working production URL.

## 7. Practical tips

- Use one fast vision model and one agent LLM. Don't compare models.
- Verify ElevenAgents SDK and client-tool method names against the quickstart in the first hour.
- Test the mic and screen share on the actual demo laptop and browser early (Chrome).
- Use fake data only, and keep the "synthetic data" label visible.
- Verify current Vercel and Supabase free-tier limits (function duration, request body size, Realtime connections) in the first hour.

---

# Supabase + Vercel Stack

## Stack

- **Next.js** on **Vercel**
- **Supabase Postgres** (database)
- **Supabase Realtime** (event streaming, replaces custom WebSocket backend)
- **Supabase Storage** (frames bucket)
- **ElevenAgents** (voice interviewer + tutor)
- **One vision model** (Gemini Flash or Claude Haiku/Sonnet class)

## Supabase Schema

Tables: `sessions`, `events`, `questions`, `gaps`, `work_maps`, `mastery`, plus a `frames` storage bucket.

- `events` and `questions` use Realtime.
- Off-the-record deletes rows and stored frames.

## Deploy Checklist

13 items covering the Supabase and Vercel setup, environment variables, the early hello-world deploy, a seed script for the pre-baked Work Map, a production deploy freeze, and final dry-runs. Each has an owner, a target time and a status dropdown.
