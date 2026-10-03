export type VdrDocKind =
  | "financial"
  | "contract"
  | "invoice"
  | "schedule"
  | "memo"

export interface VdrDoc {
  id: string
  path: string
  title: string
  kind: VdrDocKind
  body: string[]
}

export const VDR_DOCS: VdrDoc[] = [
  {
    id: "adjusted-ebitda-bridge",
    path: "Financials / Adjusted EBITDA Bridge",
    title: "Adjusted EBITDA Bridge (Draft — Management)",
    kind: "financial",
    body: [
      "Reported EBITDA: 18,400,000",
      "Add-backs proposed by management:",
      "  • One-time relocation: 4,000,000",
      "  • Consulting — Non-Recurring: 850,000",
      "  • Legal Fees — One-time: 600,000",
      "Adjusted EBITDA: 23,850,000",
      "",
      "Note (management): relocation is a one-time event tied to the 2024 HQ move.",
    ],
  },
  {
    id: "acme-msa",
    path: "Customers / Acme MSA",
    title: "Master Services Agreement — Acme Corp",
    kind: "contract",
    body: [
      "MASTER SERVICES AGREEMENT",
      "Effective Date: 2022-01-01",
      "Order Form #1",
      "Annual subscription fee: $80,000",
      "Term: 36 months, auto-renewing annually.",
      "",
      "This Agreement may be amended by subsequent Order Forms or Amendments.",
    ],
  },
  {
    id: "acme-amendment-2",
    path: "Customers / Acme MSA Amendment 2",
    title: "Amendment No. 2 — Acme Corp",
    kind: "contract",
    body: [
      "AMENDMENT NO. 2 to the Master Services Agreement",
      "Effective Date: 2023-07-01",
      "",
      "This Amendment supersedes and replaces Order Form #1 in its entirety.",
      "Annual subscription fee: $110,000",
      "",
      "All other terms of the Agreement remain in full force and effect.",
    ],
  },
  {
    id: "relocation-invoices",
    path: "Invoices / Relocation 2021-2023",
    title: "Relocation Expense Invoices",
    kind: "invoice",
    body: [
      "Relocation expense 2021 — Vendor: Northstar Movers — $1,350,000",
      "Relocation expense 2022 — Vendor: Northstar Movers — $1,420,000",
      "Relocation expense 2023 — Vendor: Northstar Movers — $1,230,000",
      "",
      "Total 3-year relocation spend: $4,000,000",
    ],
  },
  {
    id: "capex-history",
    path: "Financials / Capex History",
    title: "Capex / Revenue History",
    kind: "financial",
    body: [
      "Capex / Revenue by year:",
      "  2021: 4.3%",
      "  2022: 4.0%",
      "  2023: 4.0%",
      "3-year average capex ratio: 4.1%",
      "",
      "Management forecast: 1.8%",
    ],
  },
  {
    id: "customer-3-order-form",
    path: "Customers / Customer 3 Order Form",
    title: "Order Form — Customer 3",
    kind: "contract",
    body: [
      "ORDER FORM — Customer 3",
      "Annual subscription fee: $120,000",
      "Term: 24 months.",
    ],
  },
  {
    id: "customer-3-addon",
    path: "Customers / Customer 3 Add-On",
    title: "Add-On — Customer 3",
    kind: "contract",
    body: [
      "ADD-ON to the Customer 3 Order Form",
      "",
      "This Add-On is in addition to the existing Order Form and does not replace it.",
      "Additional annual fee: $45,000",
    ],
  },
  {
    id: "legal-fees-invoices",
    path: "Invoices / Legal Fees 2021-2023",
    title: "Legal Fee Invoices",
    kind: "invoice",
    body: [
      "Legal fees 2021 — $610,000",
      "Legal fees 2022 — $590,000",
      "Legal fees 2023 — $600,000",
      "",
      "Management labels the 2023 $600,000 as 'one-time'.",
    ],
  },
]

export function getVdrDoc(id: string): VdrDoc | undefined {
  return VDR_DOCS.find((doc) => doc.id === id)
}
