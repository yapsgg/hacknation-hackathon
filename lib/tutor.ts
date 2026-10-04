import type { MasteryState } from "./types"

export interface TutorRule {
  id: string
  stepId: number
  fieldId: string
  title: string
  rule: string
  decision: string
  reasonQuote: string
  t: number
  frame: string
  clip: [number, number]
  evaluate: (values: Record<string, string>) => TutorCheckResult
}

export interface TutorCheckResult {
  blocked: boolean
  reason?: string
}

export interface CommitEvaluation {
  blocked: boolean
  reason: string | null
  stepId: number | null
  ruleId: string | null
  passedRuleIds: string[]
}

export interface ExpertMoment {
  stepId: number
  title: string
  decision: string
  reasonQuote: string
  t: number
  frame: string
  clip: [number, number]
}

function numericValue(values: Record<string, string>, key: string): number | null {
  const raw = values[key]?.replace(/,/g, "").trim()
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export const TUTOR_RULES: TutorRule[] = [
  {
    id: "acme-amendment-language",
    stepId: 2,
    fieldId: "arr-acme",
    title: "Acme amendment language",
    rule: "Read for ‘supersedes/replaces’ versus ‘in addition to’ before summing contract values.",
    decision: "Set Acme ARR to $110k, not $190k.",
    reasonQuote:
      '"Amendment 2 supersedes and replaces the original order form, so it is a replacement, not an addition."',
    t: 95.4,
    frame: "f_0063",
    clip: [60, 100],
    evaluate: (values) => {
      const value = numericValue(values, "arr-acme")
      if (value === null) return { blocked: false }
      return value === 110000
        ? { blocked: false }
        : {
            blocked: true,
            reason:
              "Acme ARR is not supported by the amendment. Amendment 2 says it supersedes and replaces Order Form #1; use $110,000 and replay the expert moment.",
          }
    },
  },
  {
    id: "customer-3-add-on",
    stepId: 2,
    fieldId: "arr-customer-3",
    title: "Customer 3 add-on exception",
    rule: "An add-on that says ‘in addition to’ is added to the existing order form.",
    decision: "Set Customer 3 ARR to $165k ($120k + $45k).",
    reasonQuote:
      '"This Add-On is in addition to the existing Order Form and does not replace it."',
    t: 76.2,
    frame: "f_customer3",
    clip: [72, 82],
    evaluate: (values) => {
      const value = numericValue(values, "arr-customer-3")
      if (value === null) return { blocked: false }
      return value === 165000
        ? { blocked: false }
        : {
            blocked: true,
            reason:
              "Customer 3 is the exception case: the Add-On is ‘in addition to’ the existing order form. Use $165,000, not just one of the two fees.",
          }
    },
  },
  {
    id: "relocation-recurrence",
    stepId: 3,
    fieldId: "addback-relocation",
    title: "Recurring relocation cost",
    rule: "A one-time cost appearing in two or more prior years is recurring and goes to QoE.",
    decision: "Do not accept the $4M relocation expense as non-recurring.",
    reasonQuote:
      '"A one-time cost that shows up in two or more prior years’ invoices is recurring."',
    t: 152.8,
    frame: "f_0150",
    clip: [145, 165],
    evaluate: (values) => {
      const value = numericValue(values, "addback-relocation")
      if (value === null || value === 0) return { blocked: false }
      return {
        blocked: true,
        reason:
          "Relocation appears in invoices for 2021, 2022, and 2023. Do not accept it as a non-recurring add-back without QoE review.",
      }
    },
  },
  {
    id: "legal-fee-recurrence",
    stepId: 3,
    fieldId: "addback-legal",
    title: "Recurring legal fee",
    rule: "A ‘one-time’ cost that repeats in prior-year invoices is not automatically non-recurring.",
    decision: "Escalate the $600k legal fee before accepting it as an add-back.",
    reasonQuote:
      '"The 2023 legal fee is labeled one-time, but prior-year invoices show the same pattern."',
    t: 161.4,
    frame: "f_0161",
    clip: [156, 168],
    evaluate: (values) => {
      const value = numericValue(values, "addback-legal")
      if (value === null || value === 0) return { blocked: false }
      return {
        blocked: true,
        reason:
          "Legal fees also appear in 2021 and 2022. Escalate the $600,000 add-back before committing it as one-time.",
      }
    },
  },
  {
    id: "capex-below-average",
    stepId: 4,
    fieldId: "capex-ratio",
    title: "Capex below three-year average",
    rule: "Capex below the 3-year average requires a documented reason or QoE escalation.",
    decision: "Challenge 1.8% against the 4.1% three-year average.",
    reasonQuote:
      '"Capex below the 3-year average ratio needs a reason, or it goes to QoE."',
    t: 200.5,
    frame: "f_0199",
    clip: [180, 205],
    evaluate: (values) => {
      const value = numericValue(values, "capex-ratio")
      if (value === null || value >= 4.1) return { blocked: false }
      return {
        blocked: true,
        reason:
          "The entered capex ratio is below the 4.1% three-year average. Add evidence for the reduction or escalate to QoE before saving.",
      }
    },
  },
]

export function evaluateCommit(values: Record<string, string>): CommitEvaluation {
  const passedRuleIds: string[] = []

  for (const rule of TUTOR_RULES) {
    const result = rule.evaluate(values)
    if (result.blocked) {
      return {
        blocked: true,
        reason: result.reason ?? "The tutor found a rule violation.",
        stepId: rule.stepId,
        ruleId: rule.id,
        passedRuleIds,
      }
    }

    if (values[rule.fieldId]?.trim()) {
      passedRuleIds.push(rule.id)
    }
  }

  return {
    blocked: false,
    reason: null,
    stepId: null,
    ruleId: null,
    passedRuleIds: [...new Set(passedRuleIds)],
  }
}

export function getExpertMoment(stepId: number, ruleId?: string | null): ExpertMoment | null {
  const rule = TUTOR_RULES.find(
    (item) => item.stepId === stepId && (!ruleId || item.id === ruleId)
  )
  if (!rule) return null
  return {
    stepId,
    title: rule.title,
    decision: rule.decision,
    reasonQuote: rule.reasonQuote,
    t: rule.t,
    frame: rule.frame,
    clip: rule.clip,
  }
}

const searchable = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()

// The Tutor agent often passes a rule id or a loose phrase, so match the id,
// then the whole phrase, then any distinctive word, before reporting no rule.
export function lookupGuardrails(topic: string): TutorRule[] {
  const normalized = searchable(topic)
  if (!normalized) return TUTOR_RULES
  const byId = TUTOR_RULES.filter((rule) => searchable(rule.id) === normalized)
  if (byId.length) return byId
  const haystack = (rule: TutorRule) =>
    searchable(`${rule.id} ${rule.title} ${rule.rule}`)
  const byPhrase = TUTOR_RULES.filter((rule) => haystack(rule).includes(normalized))
  if (byPhrase.length) return byPhrase
  const words = normalized.split(" ").filter((word) => word.length >= 5)
  return TUTOR_RULES.filter((rule) =>
    words.some((word) => haystack(rule).includes(word))
  )
}

export const INITIAL_MASTERY: Record<string, MasteryState> = Object.fromEntries(
  TUTOR_RULES.map((rule) => [rule.id, "unseen"])
) as Record<string, MasteryState>
