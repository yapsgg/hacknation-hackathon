export type LineGroup = "revenue" | "ebitda" | "capex"

export type LineStatus = "unverified" | "source_opened" | "flagged" | "verified"

export interface LboLine {
  id: string
  group: LineGroup
  label: string
  /** Event-bus object name. */
  object: string
  field: string
  suffix: "USD" | "%"
  /** Management's claim shown next to the analyst's input. */
  managementClaim: string
  /** VDR documents that are the primary source for this line. */
  sourceDocIds: string[]
}

export const LINE_GROUPS: { id: LineGroup; label: string; hint: string }[] = [
  { id: "revenue", label: "Revenue · ARR", hint: "Validate against contracts" },
  { id: "ebitda", label: "EBITDA add-backs", hint: "Validate against invoices" },
  { id: "capex", label: "Capex", hint: "Validate against history" },
]

export const LBO_LINES: LboLine[] = [
  {
    id: "arr-acme",
    group: "revenue",
    label: "Acme Corp",
    object: "Customer: Acme",
    field: "ARR input",
    suffix: "USD",
    managementClaim: "$190,000 ARR",
    sourceDocIds: ["acme-msa", "acme-amendment-2"],
  },
  {
    id: "arr-customer-3",
    group: "revenue",
    label: "Customer 3",
    object: "Customer: Customer 3",
    field: "ARR input",
    suffix: "USD",
    managementClaim: "$165,000 ARR",
    sourceDocIds: ["customer-3-order-form", "customer-3-addon"],
  },
  {
    id: "addback-relocation",
    group: "ebitda",
    label: "Relocation (“one-time”)",
    object: "Add-back: Relocation",
    field: "EBITDA add-back input",
    suffix: "USD",
    managementClaim: "$4,000,000 add-back",
    sourceDocIds: ["adjusted-ebitda-bridge", "relocation-invoices"],
  },
  {
    id: "addback-legal",
    group: "ebitda",
    label: "Legal fees (“one-time”)",
    object: "Add-back: Legal Fees",
    field: "EBITDA add-back input",
    suffix: "USD",
    managementClaim: "$600,000 add-back",
    sourceDocIds: ["adjusted-ebitda-bridge", "legal-fees-invoices"],
  },
  {
    id: "capex-ratio",
    group: "capex",
    label: "Maintenance capex / revenue",
    object: "LBO / Maintenance Capex",
    field: "Capex ratio input",
    suffix: "%",
    managementClaim: "1.8% of revenue",
    sourceDocIds: ["capex-history"],
  },
]

export function parseAmount(raw: string): number | null {
  if (raw.trim() === "") return null
  const n = Number(raw.replace(/[,$\s]/g, ""))
  return Number.isNaN(n) ? null : n
}

export function formatAmount(n: number, suffix: "USD" | "%"): string {
  return suffix === "%" ? `${n.toFixed(1)}%` : `$${n.toLocaleString("en-US")}`
}
