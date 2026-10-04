# Client Tool Contract

Shared contract between the frontend (Engineer B) and the agent side (Engineer A). Names and signatures are frozen — both sides code against this file. See `ARCHITECTURE.md` §6 for the agent configuration.

## Interviewer agent

| Tool | Params | Returns | Purpose |
| --- | --- | --- | --- |
| `get_screen_state` | `{}` | `{ state_summary: string, recent_events: CaptureEvent[], current_doc: string \| null, elapsed_s: number }` | Pull the latest screen state right before asking a question. |
| `log_question` | `{ text: string, anchor: string, step_id?: number }` | `{ question_id: string }` | Record a question the agent asked, with the on-screen text it anchored to. |
| `mark_gap` | `{ question: string, step_id?: number, risk: "high"\|"medium"\|"low" }` | `{ gap_id: string }` | Add an open question to the Gap Ledger for the debrief. |
| `start_debrief` | `{}` | `{ gaps: Gap[], required_followups: number }` | Begin the debrief; returns remaining gaps. |
| `submit_teachback_result` | `{ step_id: number, confirmed: boolean, correction?: string }` | `{ ok: boolean, correction_count: number }` | Record the expert's confirmation/correction for one step of the teach-back. |

## Tutor agent

| Tool | Params | Returns | Purpose |
| --- | --- | --- | --- |
| `get_screen_state` | `{}` | same as above | Same state access for the Teach module. |
| `block_commit` | `{ reason: string, step_id: number }` | `{ blocked: true, overlay_id: string }` | Freeze the Save button and show the overlay when the hire violates a mapped rule. |
| `replay_moment` | `{ step_id: number }` | `{ clip: [number, number] \| null, frame: string \| null }` | Play the expert's captured screen moment/clip. |
| `update_mastery` | `{ rule_id: string, state: "unseen"\|"shown"\|"predicted"\|"applied" }` | `{ ok: boolean }` | Advance a rule's mastery state. |
| `lookup_guardrail` | `{ topic: string }` | `{ rules: Guardrail[] }` | Read the approved Work Map guardrails before judging an action. |
| `get_expert_moment` | `{ step_id: number }` | `{ decision: string, reason_quote: string, t: number }` | Fetch the expert's words and screen moment for a step. |
| `set_off_record` | `{ active: boolean }` | `{ ok: boolean, off_record: boolean }` | Pause/resume capture and purge the confidential window. |

## Server / MCP-compatible tools (Tutor only)

| Tool | Params | Returns | Purpose |
| --- | --- | --- | --- |
The browser registers `lookup_guardrail` and `get_expert_moment` as client tools
for the hackathon deployment. They keep the same contract so they can move to
server/MCP tools later without changing the agent prompt.

## Event bus (app → backend)

The sandbox app emits ground-truth `CaptureEvent`s (with `"source": "app"`) on the same channel the vision pipeline publishes to. Consumers must not reveal app events to the agent directly; they exist for scoring vision accuracy and as a demo fallback.

## Types

- `CaptureEvent` → `schemas/event.schema.json`
- `WorkMap`, `Guardrail`, `Gap` → `schemas/work-map.schema.json`
