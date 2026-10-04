// Creates (or updates) the ElevenAgents client tools + Interviewer + Tutor agents.
// Usage: npm run provision:agents   (reads .env.local)
// Idempotent: tools are matched by name; agents are updated if an id is in env.
// Contract: schemas/client-tools.md. Config: ARCHITECTURE.md section 6.
import { readFileSync, writeFileSync } from "node:fs"

const API = "https://api.elevenlabs.io/v1/convai"
const KEY = process.env.ELEVENLABS_API_KEY
if (!KEY) {
  console.error("Missing ELEVENLABS_API_KEY in .env.local")
  process.exit(1)
}

const LLM = process.env.ELEVENLABS_LLM || "claude-sonnet-4-6"
const VOICE_INTERVIEWER =
  process.env.ELEVENLABS_INTERVIEWER_VOICE_ID || "cjVigY5qzO86Huf0OWal"
const VOICE_TUTOR = process.env.ELEVENLABS_TUTOR_VOICE_ID || VOICE_INTERVIEWER

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "xi-api-key": KEY, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok)
    throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 600)}`)
  return text ? JSON.parse(text) : {}
}

const str = (description) => ({ type: "string", description })
const num = (description) => ({ type: "number", description })
const obj = (properties, required = []) => ({
  type: "object",
  properties,
  required,
})

// ------------------------------------------------------------ client tools
const TOOLS = {
  get_screen_state: {
    description:
      "Pull the latest on-screen state (current document, recent events, elapsed time). Call this right before asking a question or judging an action, so you refer to what is actually on screen.",
    parameters: obj({}),
  },
  log_question: {
    description:
      "Record a question you just asked, together with the on-screen text it was anchored to.",
    parameters: obj(
      {
        text: str("The question you asked, verbatim."),
        anchor: str("The on-screen text or event the question refers to."),
        step_id: num("Work Map step this relates to, if known."),
      },
      ["text", "anchor"]
    ),
  },
  mark_gap: {
    description:
      "Add an open question to the Gap Ledger when the expert's reasoning is still unclear. These are revisited in the debrief.",
    parameters: obj(
      {
        question: str("The unanswered question."),
        step_id: num("Related Work Map step, if known."),
        risk: {
          type: "string",
          description: "Risk if left unanswered.",
          enum: ["high", "medium", "low"],
        },
      },
      ["question", "risk"]
    ),
  },
  start_debrief: {
    description:
      "Begin the debrief. Returns the remaining open gaps and how many follow-ups are still required.",
    parameters: obj({}),
  },
  submit_teachback_result: {
    description:
      "Record whether the expert confirmed or corrected one step of the teach-back summary.",
    parameters: obj(
      {
        step_id: num("The step being confirmed or corrected."),
        confirmed: {
          type: "boolean",
          description: "True if the expert confirmed it as stated.",
        },
        correction: str("The expert's correction, in their words, if any."),
      },
      ["step_id", "confirmed"]
    ),
  },
  block_commit: {
    description:
      "Freeze the Save button and show an overlay when the new hire is about to violate a mapped rule. Use before they commit an unverified value.",
    parameters: obj(
      {
        reason: str(
          "One sentence on why, in the expert's words where possible."
        ),
        step_id: num("The Work Map step whose rule is being violated."),
      },
      ["reason", "step_id"]
    ),
  },
  replay_moment: {
    description:
      "Play the expert's captured screen moment for a step, so the hire sees what the expert did.",
    parameters: obj({ step_id: num("The Work Map step to replay.") }, [
      "step_id",
    ]),
  },
  update_mastery: {
    description: "Advance the mastery state of one rule for this hire.",
    parameters: obj(
      {
        rule_id: str("Identifier of the rule."),
        state: {
          type: "string",
          description: "New mastery state.",
          enum: ["unseen", "shown", "predicted", "applied"],
        },
      },
      ["rule_id", "state"]
    ),
  },
  lookup_guardrail: {
    description:
      "Read the approved Work Map guardrails for a topic before judging the hire's action.",
    parameters: obj(
      { topic: str("Document, field, or judgment topic to look up.") },
      ["topic"]
    ),
  },
  get_expert_moment: {
    description:
      "Fetch the expert's decision, reason quote, timestamp, frame, and clip for a Work Map step.",
    parameters: obj({ step_id: num("The Work Map step to retrieve.") }, [
      "step_id",
    ]),
  },
  set_off_record: {
    description:
      "Pause or resume capture and purge the confidential buffer when the user asks to go off the record.",
    parameters: obj(
      {
        active: {
          type: "boolean",
          description: "True to go off record; false to resume.",
        },
      },
      ["active"]
    ),
  },
}

async function ensureTools() {
  const existing = await api("GET", "/tools?page_size=100")
  const byName = new Map(
    (existing.tools ?? []).map((t) => [t.tool_config?.name, t.id])
  )
  const ids = {}
  for (const [name, def] of Object.entries(TOOLS)) {
    const tool_config = {
      type: "client",
      name,
      description: def.description,
      parameters: def.parameters,
      expects_response: true,
      response_timeout_secs: 10,
    }
    if (byName.has(name)) {
      await api("PATCH", `/tools/${byName.get(name)}`, { tool_config })
      ids[name] = byName.get(name)
      console.log(`tool updated: ${name}`)
    } else {
      const r = await api("POST", "/tools", { tool_config })
      ids[name] = r.id
      console.log(`tool created: ${name}`)
    }
  }
  return ids
}

// ----------------------------------------------------------------- prompts
const INTERVIEWER_PROMPT = `You are the Interviewer in AI Apprentice, a tool that learns how a senior private-equity diligence expert really works by watching their screen and asking about it. You are calm, curious and brief. Your only job is to understand WHY the expert makes each judgment, so it can later be taught to a junior analyst.

## Context
- Session: {{session_id}}. Questions asked so far: {{questions_asked}}. Workflow under study: seller EBITDA / ARR scrub in a mock deal data room.
- You receive non-interrupting context updates describing what is on the expert's screen. You can also call get_screen_state.

## When to speak
- Stay silent by default. The expert is working; do not narrate or fill silence.
- A deterministic Question Governor decides when you may ask. You may only ask a question when a message says a slot is granted. Otherwise listen.
- When a slot is granted, the app sends a short message that starts with "[Governor]". It comes from the app, not the expert: do not acknowledge it, do not thank anyone, and do not mention the Governor. Immediately call get_screen_state and ask your one question out loud.
- Ask exactly ONE short question (under 25 words) per slot, then stop and wait.

## What to ask
- Call get_screen_state first, then anchor the question to specific on-screen text you can quote (a clause, a figure, a document name).
- NEVER ask what the screen already shows ("what is this number?"). The expert will find that insulting.
- Prefer: why (what made you trust or distrust it), limit (what is the threshold), stop (when would you not proceed / escalate).
- Prefer questions about judgment calls: replace vs add, recurring vs one-time, accept vs escalate.
- After asking, call log_question with the question text and the anchor. If the answer is vague or you could not follow it, call mark_gap with a risk rating.

## Off the record
- If the expert says "off the record", immediately call set_off_record with active true, acknowledge in three words, and say nothing further about that content.
- When they say they are back on the record, call set_off_record with active false, then continue.

## Debrief
- When told to start the debrief, call start_debrief. It returns the open gaps and required_followups, the minimum number of follow-up questions you must ask.
- Ask at least required_followups questions, one at a time, and wait for each answer. Start with the open gaps. If there are fewer open gaps than required, ask about other judgment calls you saw during the session (an edge case, a threshold, when they would escalate) until the minimum is met. If an answer is still unclear, call mark_gap.
- Then read back a short teach-back, ONE step at a time, in the expert's own words, and end each step with "Is that right?". Stop and wait for the expert's reply.
- Only after the expert replies, call submit_teachback_result for that step: confirmed true only if they clearly agree; if they change anything, confirmed false with their correction in their words. Never submit a step before the expert has answered it. Then move straight to the next step; do not ask the same step again. Corrections are valuable: thank them briefly, never argue.
- submit_teachback_result is ONLY for answers to your own "Is that right?" teach-back readings. Never call it after a live question, a follow-up question or any other answer.

## Style
Plain spoken English, no jargon you were not given, no praise, no filler like "great question". Never invent facts about the documents; if unsure, call get_screen_state.`

const TUTOR_PROMPT = `You are the Tutor in AI Apprentice. You coach a junior private-equity analyst through a diligence case, in the voice and reasoning of a senior expert (Sabine) whose Work Map you hold. You teach the reading discipline behind her rules, not memorized answers.

## Context
- Case: {{case_id}}. Mastery so far: {{mastery_state}}.
- The Work Map and its guardrails are in your knowledge base. Use them; do not invent rules.
- Call get_screen_state to see what the hire is looking at before you comment.

## Loop for each case
1. PREDICT: before the hire acts, ask one question: "What will you check before you enter this number?" Wait for the answer. Call update_mastery with state "predicted" if they name the right check.
2. WATCH: use get_screen_state as they work. Stay quiet while they are reading.
3. INTERCEPT: if they are about to enter or save a value that breaks a mapped rule (an unverified management figure, an amendment read as additive when it says "supersedes and replaces", a "one-time" cost that repeats across years, capex below the historical ratio with no reason), call block_commit with a one-sentence reason and the step_id.
4. EXPLAIN: answer in the expert's words ("Sabine said..."), call replay_moment for that step, then let the hire correct it themselves. Do not just give the answer.
5. SCORE: when they apply a rule unprompted, call update_mastery with "applied"; when you only showed it, "shown".

## Important
- Rules are conditional. If a document actually says "in addition to", the correct move is to ADD. Do not block a correct action because it resembles a past mistake. Check the wording on screen first.
- Before judging a new topic, call lookup_guardrail with a short plain keyword such as "amendment", "add-on", "relocation", "legal" or "capex". Use get_expert_moment before explaining or replaying the expert's reasoning.
- If the user says "off the record", call set_off_record with active true immediately. When they clearly resume, call it with active false.
- Be warm and brief. One idea per turn. No lecturing, no praise inflation.
- If you do not have a rule for what the hire is doing, say so and recommend escalating to QoE rather than guessing.`

function agentBody(
  name,
  prompt,
  toolNames,
  ids,
  voice,
  firstMessage,
  vars,
  expressive
) {
  return {
    name,
    tags: ["ai-apprentice"],
    conversation_config: {
      agent: {
        first_message: firstMessage,
        language: "en",
        dynamic_variables: { dynamic_variable_placeholders: vars },
        prompt: {
          prompt,
          llm: LLM,
          temperature: 0.3,
          tool_ids: toolNames.map((n) => ids[n]),
        },
      },
      tts: {
        voice_id: voice,
        model_id: expressive ? "eleven_v3_conversational" : "eleven_flash_v2",
        expressive_mode: expressive,
      },
      turn: { turn_eagerness: "patient", turn_timeout: 20 },
      conversation: { max_duration_seconds: 1800 },
    },
  }
}

async function upsertAgent(envName, body, hasId) {
  if (hasId) {
    await api("PATCH", `/agents/${hasId}`, body)
    console.log(`agent updated: ${body.name} (${hasId})`)
    return hasId
  }
  const r = await api("POST", "/agents/create", body)
  console.log(`agent created: ${body.name} (${r.agent_id})`)
  return r.agent_id
}

function writeEnv(updates) {
  let text = readFileSync(".env.local", "utf8")
  for (const [k, v] of Object.entries(updates)) {
    const re = new RegExp(`^${k}=.*$`, "m")
    text = re.test(text)
      ? text.replace(re, `${k}=${v}`)
      : text.replace(/\n*$/, `\n${k}=${v}\n`)
  }
  writeFileSync(".env.local", text)
}

const ids = await ensureTools()

const interviewerId = await upsertAgent(
  "ELEVENLABS_INTERVIEWER_AGENT_ID",
  agentBody(
    "AI Apprentice - Interviewer",
    INTERVIEWER_PROMPT,
    [
      "get_screen_state",
      "log_question",
      "mark_gap",
      "start_debrief",
      "submit_teachback_result",
      "set_off_record",
    ],
    ids,
    VOICE_INTERVIEWER,
    "Hi, I'll stay quiet while you work and only ask when something is worth understanding. Go ahead whenever you're ready.",
    { session_id: "unset", questions_asked: "0" },
    true
  ),
  process.env.ELEVENLABS_INTERVIEWER_AGENT_ID
)

const tutorId = await upsertAgent(
  "ELEVENLABS_TUTOR_AGENT_ID",
  agentBody(
    "AI Apprentice - Tutor",
    TUTOR_PROMPT,
    [
      "get_screen_state",
      "block_commit",
      "replay_moment",
      "update_mastery",
      "lookup_guardrail",
      "get_expert_moment",
      "set_off_record",
    ],
    ids,
    VOICE_TUTOR,
    "Hi. Before you touch any inputs, tell me: what will you check first?",
    { case_id: "customer-3", mastery_state: "{}" },
    true
  ),
  process.env.ELEVENLABS_TUTOR_AGENT_ID
)

writeEnv({
  ELEVENLABS_INTERVIEWER_AGENT_ID: interviewerId,
  ELEVENLABS_TUTOR_AGENT_ID: tutorId,
})
console.log("Wrote agent ids to .env.local")
