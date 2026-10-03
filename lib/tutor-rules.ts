import type { Interjection } from "@/components/deal-desk/session-provider"

export interface TutorContext {
  values: Record<string, number | null>
  viewedDocIds: ReadonlySet<string>
  lineStatus: Record<string, string>
}

/**
 * Scripted stand-in for the live tutor. Each rule mirrors one senior
 * guardrail from the work map; returns the first interjection that applies.
 */
export function evaluateTutorRules(ctx: TutorContext): Interjection | null {
  const acme = ctx.values["arr-acme"]
  if (
    acme !== null &&
    acme !== undefined &&
    acme > 110_000 &&
    ctx.lineStatus["arr-acme"] !== "verified"
  ) {
    return {
      id: "acme-supersede",
      origin: "scripted",
      lineId: "arr-acme",
      headline: "A senior partner would flag this ARR total.",
      questions: [
        "Does the new software agreement add to the original, or replace it?",
        "Which clause tells you which one controls?",
      ],
      docIds: ["acme-msa", "acme-amendment-2"],
    }
  }

  const relocation = ctx.values["addback-relocation"]
  if (
    relocation !== null &&
    relocation !== undefined &&
    relocation >= 1_000_000 &&
    !ctx.viewedDocIds.has("relocation-invoices") &&
    ctx.lineStatus["addback-relocation"] !== "flagged"
  ) {
    return {
      id: "relocation-recurring",
      origin: "scripted",
      lineId: "addback-relocation",
      headline: "Hold on before accepting this add-back.",
      questions: [
        "Which historical invoices would you check before accepting this as truly non-recurring?",
        "How many prior years show the same spend?",
      ],
      docIds: ["relocation-invoices"],
    }
  }

  return null
}
