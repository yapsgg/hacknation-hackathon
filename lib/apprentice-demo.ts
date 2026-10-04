import eventsFixture from "@/fixtures/events.mock.json"
import workMapFixture from "@/fixtures/work-map.mock.json"
import { TUTOR_RULES } from "@/lib/tutor"
import type { WorkMap } from "@/lib/types"

export const APPRENTICE_EXPERT = {
  name: "Sabine R.",
  first: "Sabine",
  role: "Senior partner, PE diligence expert",
  lang: "English",
}

export const APPRENTICE_DEAL = {
  code: "Project Atlas",
  target: "the seeded seller EBITDA and ARR diligence case",
}

export const CANONICAL_WORK_MAP = workMapFixture as WorkMap

const stepFields: Record<number, string | null> = {
  1: "doc",
  2: "arr",
  3: "addback",
  4: "capex",
  5: "doc",
  6: "arr",
  7: "qoe",
}

const cleanQuote = (value: string) => value.replace(/^"|"$/g, "")

export const APPRENTICE_RULES = TUTOR_RULES.map((rule) => ({
  id: rule.id,
  kind: "guardrail",
  step: rule.stepId,
  moment: rule.t,
  text: rule.rule,
  draft: rule.rule,
  draftWrong: false,
  correction: null,
  sources: [`rule-${rule.id}`],
  basis: "Canonical seeded Work Map and Tutor rule",
}))

export const APPRENTICE_RULE = Object.fromEntries(
  APPRENTICE_RULES.map((rule) => [rule.id, rule])
)

export const APPRENTICE_STEPS = CANONICAL_WORK_MAP.steps.map((step) => ({
  n: step.id,
  title: step.title,
  t: step.screen_moment?.t ?? 0,
  field: stepFields[step.id] ?? null,
  decision: step.decision ?? "Awaiting expert decision",
  rules: APPRENTICE_RULES.filter((rule) => rule.step === step.id).map(
    (rule) => rule.id
  ),
  judgment: step.judgment_call ?? false,
}))

export const APPRENTICE_GAPS = (CANONICAL_WORK_MAP.open_gaps ?? []).map(
  (gap) => ({
    id: gap.id,
    step: gap.step_id ?? 1,
    q: gap.question,
    why: `${gap.risk ?? "medium"} risk gap from the canonical Work Map`,
  })
)

const gapAnswers: Record<string, string> = {
  "gap-1":
    "Two prior years is the warning threshold, but the deal team still checks the category and underlying invoices.",
  "gap-2":
    "A documented facility exit, a defined end date, and no comparable charges in prior years could support a genuinely non-recurring adjustment.",
  "gap-3":
    "Request the missing amendment from the bankers and mark the ARR unverified until the source arrives.",
}

export const APPRENTICE_QUOTES = {
  ...Object.fromEntries(
    TUTOR_RULES.map((rule) => [
      `rule-${rule.id}`,
      {
        de: null,
        en: cleanQuote(rule.reasonQuote),
        where: "canonical expert moment",
        t: rule.t,
      },
    ])
  ),
  ...Object.fromEntries(
    APPRENTICE_GAPS.map((gap) => [
      gap.id,
      {
        de: null,
        en: gapAnswers[gap.id] ?? "Escalate this gap to the deal team.",
        where: "recorded debrief answer",
        t: null,
      },
    ])
  ),
  "q-acme": {
    de: null,
    en: cleanQuote(
      TUTOR_RULES.find((rule) => rule.id === "acme-amendment-language")!
        .reasonQuote
    ),
    where: "live question",
    t: 95.4,
  },
  "q-relocation": {
    de: null,
    en: cleanQuote(
      TUTOR_RULES.find((rule) => rule.id === "relocation-recurrence")!
        .reasonQuote
    ),
    where: "live question",
    t: 150.3,
  },
  "q-capex": {
    de: null,
    en: cleanQuote(
      TUTOR_RULES.find((rule) => rule.id === "capex-below-average")!
        .reasonQuote
    ),
    where: "live question",
    t: 199.6,
  },
  "q-save": {
    de: null,
    en:
      "Before this saves, the relocation add-back and capex ratio go to QoE. That is not my call to make alone.",
    where: "live question",
    t: 205.6,
  },
}

export const APPRENTICE_ACTIVITY = [
  { from: 0, to: 20, type: "reading" },
  { from: 40, to: 72, type: "reading" },
  { from: 84, to: 96, type: "typing" },
  { from: 118, to: 154, type: "reading" },
  { from: 178, to: 188, type: "typing" },
  { from: 190, to: 202, type: "reading" },
]

const questionAt: Record<number, object[]> = {
  95.4: [
    {
      id: "q-acme",
      q: "You changed Acme from $190,000 to $110,000. Why not add both contracts?",
      type: "reason",
      score: 0.94,
    },
  ],
  150.3: [
    {
      id: "q-relocation",
      q: "What made the $4 million relocation add-back look recurring?",
      type: "reason",
      score: 0.92,
    },
  ],
  199.6: [
    {
      id: "q-capex",
      q: "When capex is below history, when do you stop and escalate?",
      type: "guardrail",
      score: 0.91,
    },
  ],
  205.6: [
    {
      id: "q-save",
      q: "What must be escalated before these inputs can be committed?",
      type: "guardrail",
      score: 0.95,
    },
  ],
}

const fieldForEvent = (event: (typeof eventsFixture.events)[number]) => {
  const label = `${event.object} ${event.field ?? ""}`.toLowerCase()
  if (label.includes("acme") || label.includes("arr")) return "arr"
  if (label.includes("relocation") || label.includes("add-back")) return "addback"
  if (label.includes("capex")) return "capex"
  if (event.type === "save_clicked") return "qoe"
  if (event.type === "doc_opened" || event.type === "doc_scrolled") return "doc"
  return null
}

const describeEvent = (event: (typeof eventsFixture.events)[number]) => {
  const change =
    event.from !== null || event.to !== null
      ? ` (${String(event.from ?? "empty")} → ${String(event.to ?? "empty")})`
      : ""
  return `${event.object}${event.field ? ` · ${event.field}` : ""}${change}`
}

export const APPRENTICE_SCRIPT = [
  ...eventsFixture.events.map((event) => ({
    t: event.t,
    kind: "screen",
    text: describeEvent(event),
    field: fieldForEvent(event),
    cands: questionAt[event.t] ?? [],
  })),
  { t: 218, kind: "end", text: "Sabine ended the seeded diligence task" },
]

export const APPRENTICE_END_T = 218
export const APPRENTICE_PAUSE_S = 2
export const APPRENTICE_LIVE_BUDGET = 5
