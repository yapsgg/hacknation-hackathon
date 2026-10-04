"use client";

import { useState } from "react";

const COLS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const row = (cells, flag = "") => ({
  cells,
  hl: flag.includes("h"),
  total: flag.includes("t"),
});

function xlsx(file) {
  return { ...file, kind: "xlsx" };
}
function pdf(file) {
  return { ...file, kind: "pdf" };
}

// Project Atlas working set. Every figure below mirrors lib/vdr.ts, fixtures/events.mock.json
// and the seeded Tutor rules in lib/tutor.ts. Do not invent numbers here; change the source first.
export const ATLAS_FILES = [
  xlsx({
    id: "a-bridge",
    name: "6.1 Adjusted EBITDA bridge (management).xlsx",
    folder: "6 Financials",
    dateLabel: "02 Mar 2025",
    sort: 20250302,
    person: "Seller finance team",
    deal: "Project Atlas",
    used: "Capture · EBITDA bridge",
    sheets: [
      {
        name: "Bridge",
        formula: "B8 = B2+B5+B6+B7",
        cols: ["Line", "Amount ($)", "Management note"],
        rows: [
          row(["Reported EBITDA", "18,400,000", "Audited"]),
          row(["", "", ""]),
          row(["Add-backs proposed by management", "", ""]),
          row(["One-time relocation", "4,000,000", "Tied to the 2024 HQ move"], "h"),
          row(["Consulting — Non-Recurring", "850,000", ""]),
          row(["Legal Fees — One-time", "600,000", "FY23 matter"], "h"),
          row(["Adjusted EBITDA", "23,850,000", "Draft — Management"], "t"),
        ],
      },
      {
        name: "QoE flags",
        formula: "C2 = 'Open the invoices, do not hardcode'",
        cols: ["Item", "Seller label", "Source to open", "Status"],
        rows: [
          row(["Relocation $4.0M", "One-time", "Invoices 2021–2023", "Open"], "h"),
          row(["Legal fees $0.6M", "One-time", "Invoices 2021–2023", "Open"], "h"),
          row(["Consulting $0.85M", "Non-recurring", "GL detail", "Not opened"]),
        ],
      },
    ],
  }),
  xlsx({
    id: "a-addbacks",
    name: "6.1 Management Add-Backs.xlsx",
    folder: "6 Financials",
    dateLabel: "02 Mar 2025",
    sort: 20250302,
    person: "Seller finance team",
    deal: "Project Atlas",
    used: "Capture · relocation add-back",
    sheets: [
      {
        name: "Add-backs",
        formula: "B5 = SUM(B2:B4)",
        cols: ["Add-back", "FY24 ($)", "Seller label"],
        rows: [
          row(["One-time relocation", "4,000,000", "One-time"], "h"),
          row(["Consulting — Non-Recurring", "850,000", "Non-recurring"]),
          row(["Legal Fees — One-time", "600,000", "One-time"], "h"),
          row(["Total proposed", "5,450,000", "Prepared by management"], "t"),
        ],
      },
    ],
  }),
  pdf({
    id: "a-msa",
    name: "3.1 Acme MSA.pdf",
    folder: "3 Customer contracts",
    dateLabel: "03 Jan 2022",
    sort: 20220103,
    person: "Acme signatory",
    deal: "Project Atlas",
    used: "Capture · Acme ARR",
    pdf: {
      kicker: "Confidential · Project Atlas data room",
      title: "Master Services Agreement",
      subtitle: "Acme Corp",
      meta: [
        ["Effective", "1 January 2022"],
        ["Term", "36 months, auto-renewing annually"],
        ["Order form", "Order Form #1"],
        ["Index", "Customers / Acme MSA"],
      ],
      clauses: [
        { label: "Order Form #1", text: "Annual subscription fee: $80,000.", hl: true },
        { label: "Amendment", text: "This Agreement may be amended by subsequent Order Forms or Amendments." },
      ],
      footer: "Executed · 3 Jan 2022",
    },
  }),
  pdf({
    id: "a-amd",
    name: "3.1 Acme MSA Amendment 2.pdf",
    folder: "3 Customer contracts",
    dateLabel: "05 Jul 2023",
    sort: 20230705,
    person: "Acme signatory",
    deal: "Project Atlas",
    used: "Capture · Acme ARR",
    pdf: {
      kicker: "Confidential · Project Atlas data room",
      title: "Amendment No. 2",
      subtitle: "to the Master Services Agreement · Acme Corp",
      meta: [
        ["Effective", "1 July 2023"],
        ["Replaces", "Order Form #1"],
        ["Index", "Customers / Acme MSA Amendment 2"],
      ],
      clauses: [
        { label: "Replacement", text: "This Amendment supersedes and replaces Order Form #1 in its entirety.", hl: true },
        { label: "Fees", text: "Annual subscription fee: $110,000.", hl: true },
        { label: "Other terms", text: "All other terms of the Agreement remain in full force and effect." },
      ],
      footer: "Executed · 5 Jul 2023",
    },
  }),
  pdf({
    id: "a-c3-order",
    name: "3.3 Customer 3 Order Form.pdf",
    folder: "3 Customer contracts",
    dateLabel: "10 Mar 2023",
    sort: 20230310,
    person: "Customer 3 signatory",
    deal: "Project Atlas",
    used: "Tutor · Customer 3 exception",
    pdf: {
      kicker: "Confidential · Project Atlas data room",
      title: "Order Form",
      subtitle: "Customer 3",
      meta: [
        ["Term", "24 months"],
        ["Index", "Customers / Customer 3 Order Form"],
      ],
      clauses: [{ label: "Fees", text: "Annual subscription fee: $120,000.", hl: true }],
      footer: "Executed · 10 Mar 2023",
    },
  }),
  pdf({
    id: "a-c3-addon",
    name: "3.3 Customer 3 Add-On.pdf",
    folder: "3 Customer contracts",
    dateLabel: "20 Feb 2024",
    sort: 20240220,
    person: "Customer 3 signatory",
    deal: "Project Atlas",
    used: "Tutor · Customer 3 exception",
    pdf: {
      kicker: "Confidential · Project Atlas data room",
      title: "Add-On",
      subtitle: "to the Customer 3 Order Form",
      meta: [["Index", "Customers / Customer 3 Add-On"]],
      clauses: [
        { label: "Scope", text: "This Add-On is in addition to the existing Order Form and does not replace it.", hl: true },
        { label: "Fees", text: "Additional annual fee: $45,000.", hl: true },
      ],
      footer: "Executed · 20 Feb 2024",
    },
  }),
  xlsx({
    id: "a-arr",
    name: "4.1 Top-20 customer ARR.xlsx",
    folder: "4 Revenue",
    dateLabel: "01 Mar 2025",
    sort: 20250301,
    person: "Seller finance team",
    deal: "Project Atlas",
    used: "Capture · revenue build",
    sheets: [
      {
        name: "Top 20",
        formula: "D2 = IF(supersedes, C2, B2+C2)",
        cols: ["Customer", "Original", "Later paper", "Seller ARR", "Read"],
        rows: [
          row(["Acme Corp", "80,000", "110,000", "190,000", "Adds both"], "h"),
          row(["Customer 3", "120,000", "45,000", "165,000", "Add-on, in addition"]),
          row(["Other top 20 (18)", "", "", "13,275,000", ""]),
          row(["Top-20 ARR, seller", "", "", "13,630,000", ""], "t"),
          row(["Acme if Amendment 2 replaces", "—", "110,000", "110,000", "Replacement"], "h"),
          row(["Top-20 ARR, corrected", "", "", "13,550,000", "−80,000"], "t"),
        ],
      },
    ],
  }),
  xlsx({
    id: "a-reloc",
    name: "5.2 Relocation invoices 2021–2023.xlsx",
    folder: "5 Accounting",
    dateLabel: "20 Feb 2025",
    sort: 20250220,
    person: "Seller finance team",
    deal: "Project Atlas",
    used: "Capture · relocation recurrence",
    sheets: [
      {
        name: "Invoices",
        formula: "C5 = SUM(C2:C4)",
        cols: ["Year", "Vendor", "Amount ($)", "Memo"],
        rows: [
          row(["2021", "Northstar Movers", "1,350,000", "Relocation expense 2021"]),
          row(["2022", "Northstar Movers", "1,420,000", "Relocation expense 2022"]),
          row(["2023", "Northstar Movers", "1,230,000", "Relocation expense 2023"], "h"),
          row(["3-year total", "Same vendor every year", "4,000,000", "Not a single event"], "ht"),
        ],
      },
    ],
  }),
  xlsx({
    id: "a-legal",
    name: "5.3 Legal fee invoices 2021–2023.xlsx",
    folder: "5 Accounting",
    dateLabel: "18 Feb 2025",
    sort: 20250218,
    person: "Seller finance team",
    deal: "Project Atlas",
    used: "Tutor · legal fee recurrence",
    sheets: [
      {
        name: "Legal fees",
        formula: "C4 = 'Management: one-time'",
        cols: ["Year", "Amount ($)", "Seller label"],
        rows: [
          row(["2021", "610,000", ""]),
          row(["2022", "590,000", ""]),
          row(["2023", "600,000", "One-time"], "h"),
        ],
      },
    ],
  }),
  xlsx({
    id: "a-capex",
    name: "7.3 Capex history.xlsx",
    folder: "7 Operations",
    dateLabel: "28 Feb 2025",
    sort: 20250228,
    person: "Seller finance team",
    deal: "Project Atlas",
    used: "Capture · maintenance capex",
    sheets: [
      {
        name: "History",
        formula: "B5 = AVERAGE(B2:B4)",
        cols: ["Year", "Capex / revenue"],
        rows: [
          row(["2021", "4.3%"]),
          row(["2022", "4.0%"]),
          row(["2023", "4.0%"]),
          row(["3-year average", "4.1%"], "ht"),
          row(["Management forecast", "1.8%"], "h"),
        ],
      },
    ],
  }),
];

export const BEACON_FILES = [
  xlsx({
    id: "arr",
    name: "4.2 ARR schedule (management).xlsx",
    folder: "4 Revenue",
    dateLabel: "03 Mar 2025",
    sort: 20250303,
    person: "Helen Cho, CFO",
    deal: "Project Beacon",
    used: "Coaching · Crestline ARR",
    sheets: [
      {
        name: "ARR",
        formula: "E8 = C8+D8",
        cols: ["Customer", "Logo", "Contract A", "Contract B", "Seller ARR", "Start"],
        rows: [
          row(["Northshore Dental", "2019", "420,000", "—", "420,000", "MSA"]),
          row(["Crestline Health", "2023", "80,000", "110,000", "190,000", "Both added"], "h"),
          row(["Harbor Pediatric", "2021", "260,000", "40,000", "300,000", "Add-on"]),
          row(["Lumen Clinics", "2020", "510,000", "—", "510,000", "MSA"]),
          row(["Other logos (2,396)", "", "", "", "28,400,000", ""]),
          row(["ARR, seller tape", "", "", "", "29,820,000", ""], "t"),
          row(["Crestline if §1.2 replaces", "", "—", "110,000", "110,000", "2025 agreement"], "h"),
        ],
      },
      {
        name: "Bridge to model",
        formula: "C6 = ARR!E8",
        cols: ["Line", "Seller", "Note"],
        rows: [
          row(["Crestline Health", "190,000", "MSA + software agreement"], "h"),
          row(["Prepared by", "Management", "March 2025"]),
          row(["Primary documents", "3.1 MSA, 3.1 Software", "Not linked"]),
        ],
      },
    ],
  }),
  pdf({
    id: "msa",
    name: "3.1 Crestline Health MSA (Feb 2023).pdf",
    folder: "3 Customer contracts",
    dateLabel: "09 Feb 2023",
    sort: 20230209,
    person: "Helen Cho, CFO",
    deal: "Project Beacon",
    used: "Coaching · Crestline ARR",
    pdf: {
      kicker: "Confidential · Project Beacon data room",
      title: "Master Services Agreement",
      subtitle: "Crestline Health System and Beacon Practice Software, Inc.",
      meta: [
        ["Effective", "9 February 2023"],
        ["Sites", "38 dental clinics"],
        ["Term", "3 years, renews automatically"],
        ["Index", "3.1 / MSA"],
      ],
      clauses: [
        { label: "1. Scope", text: "Practice-management software, eligibility checks and the patient-reminder module for the clinics listed in Schedule A." },
        { label: "Schedule A", text: "Annual fees: $80,000, invoiced annually in advance. Fee covers the 38 clinics named on the signature page.", hl: true },
        { label: "9. Amendment", text: "A later written agreement controls over this MSA only if it states that it supersedes or replaces this MSA or a schedule." },
      ],
      footer: "Page 1 of 11 · 9 Feb 2023",
    },
  }),
  pdf({
    id: "sw25",
    name: "3.1 Crestline Health Software Agreement (Jan 2025).pdf",
    folder: "3 Customer contracts",
    dateLabel: "16 Jan 2025",
    sort: 20250116,
    person: "Helen Cho, CFO",
    deal: "Project Beacon",
    used: "Coaching · superseding clause",
    pdf: {
      kicker: "Confidential · Project Beacon data room",
      title: "Software Agreement",
      subtitle: "Crestline Health System · replaces the 2023 MSA",
      meta: [
        ["Effective", "1 January 2025"],
        ["Sites", "46 dental clinics"],
        ["Product", "Beacon Core + billing"],
        ["Index", "3.1 / Software Agreement"],
      ],
      clauses: [
        { label: "§1.1", text: "Supplier will provide the Beacon practice platform to the clinics in Exhibit 1, including the clinics that were on the 2023 MSA." },
        { label: "§1.2", text: "This Agreement supersedes and replaces the Master Services Agreement dated 9 February 2023, including Schedule A. From the Effective Date that MSA is of no further force.", hl: true },
        { label: "§4. Fees", text: "Annual fees: $110,000. This is the entire annual fee. Do not add the 2023 Schedule A fee.", hl: true },
        { label: "§4.3", text: "Implementation of the eight new clinics is included. There is no separate implementation invoice." },
      ],
      footer: "Page 2 of 9 · Signed 16 Jan 2025",
    },
  }),
  xlsx({
    id: "bridge",
    name: "6.1 Adjusted EBITDA bridge (management).xlsx",
    folder: "6 Financials",
    dateLabel: "02 Mar 2025",
    sort: 20250302,
    person: "Helen Cho, CFO",
    deal: "Project Beacon",
    used: "Coaching · relocation add-back",
    sheets: [
      {
        name: "Bridge",
        formula: "D10 = D5+D8",
        cols: ["", "FY22A", "FY23A", "FY24A", "Seller note"],
        rows: [
          row(["Revenue", "78.0", "89.4", "104.6", ""]),
          row(["Reported EBITDA", "22.4", "26.8", "31.2", "Audited"]),
          row(["Margin", "28.7%", "30.0%", "29.8%", ""]),
          row(["", "", "", "", ""]),
          row(["Relocation, one-time", "—", "—", "4.0", "HQ and clinic moves"], "h"),
          row(["Other add-backs", "0.6", "0.4", "0.3", "Small, tied"]),
          row(["Adjusted EBITDA", "23.0", "27.2", "35.2", "Seller case"], "t"),
          row(["Entry at 11.0× on $35.2", "", "", "387.2", "If the add-back is taken"]),
          row(["Entry at 11.0× on $31.2", "", "", "343.2", "If relocation is refused"], "h"),
        ],
      },
    ],
  }),
  xlsx({
    id: "gl",
    name: "5.2 GL detail 2022–2024, facilities.xlsx",
    folder: "5 Accounting",
    dateLabel: "21 Feb 2025",
    sort: 20250221,
    person: "Helen Cho, CFO",
    deal: "Project Beacon",
    used: "Coaching · relocation invoices",
    sheets: [
      {
        name: "Facilities",
        formula: "E9 = SUM(B6:D6)",
        cols: ["Account", "FY22", "FY23", "FY24", "Vendor"],
        rows: [
          row(["7200 Occupancy — moves", "1.40", "1.90", "1.60", "Summit Relocation Group"], "h"),
          row(["  Clinic build-out", "0.80", "1.10", "0.90", "Summit"]),
          row(["  HQ / back office", "0.40", "0.50", "0.45", "Summit"]),
          row(["  IT closet moves", "0.20", "0.30", "0.25", "Summit"]),
          row(["Same vendor, three years", "Yes", "Yes", "Yes", "Not a single event"], "h"),
          row(["Seller add-back taken", "—", "—", "4.00", "Labels FY24 only"]),
          row(["3-year cash cost", "", "", "4.90", "Above the add-back"], "t"),
        ],
      },
      {
        name: "Invoices",
        formula: "C12 = COUNT of Summit",
        cols: ["Date", "Invoice", "Amount", "Memo"],
        rows: [
          row(["12 Mar 2022", "SR-1044", "0.46", "Clinic 12 fit-out"]),
          row(["02 Aug 2022", "SR-1188", "0.52", "Clinic 19 fit-out"]),
          row(["19 May 2023", "SR-1402", "0.71", "Regional office"]),
          row(["11 Nov 2023", "SR-1510", "0.64", "Two clinic merges"]),
          row(["07 Apr 2024", "SR-1661", "0.58", "New HQ floor"], "h"),
          row(["22 Oct 2024", "SR-1720", "0.49", "Clinic 40–41"], "h"),
        ],
      },
    ],
  }),
  xlsx({
    id: "plan",
    name: "7.3 Capex plan (management case).xlsx",
    folder: "7 Operations",
    dateLabel: "27 Feb 2025",
    sort: 20250227,
    person: "Helen Cho, CFO",
    deal: "Project Beacon",
    used: "Coaching · LBO capex",
    sheets: [
      {
        name: "Plan",
        formula: "C8 = 1.6% * revenue",
        cols: ["", "FY26E", "FY27E", "FY28E", "FY29E", "FY30E"],
        rows: [
          row(["Revenue", "118", "132", "147", "162", "178"]),
          row(["Maintenance capex", "1.89", "2.11", "2.35", "2.59", "2.85"]),
          row(["% of revenue", "1.6%", "1.6%", "1.6%", "1.6%", "1.6%"], "h"),
          row(["Growth capex", "3.2", "2.4", "1.8", "1.5", "1.2"]),
          row(["Note", "“Efficiency program”", "", "", "", ""], "h"),
          row(["Document behind 1.6%", "None in room", "", "", "", ""]),
        ],
      },
    ],
  }),
  xlsx({
    id: "far",
    name: "7.5 Fixed asset register, history.xlsx",
    folder: "7 Operations",
    dateLabel: "19 Feb 2025",
    sort: 20250219,
    person: "Helen Cho, CFO",
    deal: "Project Beacon",
    used: "Coaching · capex history",
    sheets: [
      {
        name: "History",
        formula: "C10 = AVERAGE(C5:C8)",
        cols: ["Year", "Revenue", "Maintenance capex", "% of revenue"],
        rows: [
          row(["FY21A", "61.0", "2.32", "3.8%"]),
          row(["FY22A", "78.0", "3.28", "4.2%"]),
          row(["FY23A", "89.4", "3.49", "3.9%"]),
          row(["FY24A", "104.6", "4.29", "4.1%"]),
          row(["Average", "", "", "4.0%"], "ht"),
          row(["Mgmt plan", "", "", "1.6%"], "h"),
        ],
      },
      {
        name: "Register",
        formula: "D6 = replacement cycle",
        cols: ["Class", "Gross", "NBV", "Life", "Last refresh"],
        rows: [
          row(["Clinic hardware", "18.4", "7.2", "5 yrs", "Rolling"]),
          row(["Imaging", "6.1", "2.4", "7 yrs", "FY22–24"]),
          row(["Leasehold improvements", "9.8", "6.1", "10 yrs", "Ongoing moves"]),
          row(["Warranty covering replacement", "—", "—", "—", "Not in room"], "h"),
        ],
      },
    ],
  }),
  pdf({
    id: "deck",
    name: "2.1 Management presentation.pdf",
    folder: "2 CIM and presentations",
    dateLabel: "05 Mar 2025",
    sort: 20250305,
    person: "Helen Cho, CFO",
    deal: "Project Beacon",
    used: "Coaching · unsupported capex claim",
    pdf: {
      kicker: "Management presentation · not a contract",
      title: "Project Beacon",
      subtitle: "Dental practice software · March 2025",
      meta: [
        ["Slide", "37 · Capital plan"],
        ["Claim", "Lower maintenance"],
        ["Attached lease", "No"],
        ["Attached warranty", "No"],
      ],
      clauses: [
        { label: "Slide 37", text: "“Modernized equipment requires less maintenance. We underwrite 1.6% of revenue from 2026.”", hl: true },
        { label: "Missing", text: "No lease, warranty or vendor terms are attached. The fixed-asset register still shows a 4.0% historical maintenance ratio.", hl: true },
        { label: "Slide 12", text: "Seller adjusted EBITDA of $35.2 million includes a $4.0 million relocation add-back described as one-time." },
      ],
      footer: "Page 37 of 48 · Discussion materials",
    },
  }),
  xlsx({
    id: "conc",
    name: "4.4 Customer concentration.xlsx",
    folder: "4 Revenue",
    dateLabel: "03 Mar 2025",
    sort: 20250303,
    person: "Helen Cho, CFO",
    deal: "Project Beacon",
    used: "Coaching · IC memo risk",
    sheets: [
      {
        name: "Concentration",
        formula: "C8 = top5 / ARR",
        cols: ["Cohort", "ARR", "% of ARR", "Gross retention"],
        rows: [
          row(["Top 5 logos", "11.33", "38%", "96%"], "h"),
          row(["Top 10", "15.10", "51%", "95%"]),
          row(["Rest of base", "14.72", "49%", "91%"]),
          row(["Total ARR", "29.82", "100%", "92%"], "t"),
        ],
      },
    ],
  }),
];

export const SOURCE_FILES = [...ATLAS_FILES, ...BEACON_FILES];

export function fileById(id) {
  return SOURCE_FILES.find((file) => file.id === id);
}

function isNum(value) {
  return typeof value === "string" && /[0-9]/.test(value) && /^[\s$€()0-9,.\-%+—–/]+$/.test(value);
}

export function DocFace({ file, initialSheet, redactPerson = false }) {
  const sheets = file?.sheets ?? [];
  const [tab, setTab] = useState(initialSheet || sheets[0]?.name || "");
  if (!file) return null;
  const active = sheets.find((sheet) => sheet.name === tab) ?? sheets[0];

  if (file.kind === "pdf") {
    const doc = file.pdf;
    return (
      <div className="file-face">
        <article className="pdf-page">
          <div className="pdf-banner"><span>{doc.kicker}</span><span>PDF</span></div>
          <h3 className="pdf-title">{doc.title}</h3>
          <p className="pdf-sub">{doc.subtitle}</p>
          <dl className="pdf-meta">
            {doc.meta.map(([k, v]) => (
              <span key={k} style={{ display: "contents" }}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </span>
            ))}
          </dl>
          {doc.clauses.map((clause) => (
            <p key={clause.label} className={"pdf-clause" + (clause.hl ? " hl" : "")}>
              <strong>{clause.label}. </strong>
              {clause.text}
            </p>
          ))}
          <div className="pdf-foot">
            <span>
              Signed: {redactPerson ? <span className="redact">Name redacted</span> : file.person}
            </span>
            <span>{doc.footer}</span>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="file-face">
      <div className="xl-chrome">
        <span>Excel</span>
        <span style={{ fontWeight: 500, opacity: 0.9 }}>{file.name}</span>
      </div>
      <div className="xl-formula">
        <div className="xl-name">{active?.name}</div>
        <div className="xl-fx">{active?.formula}</div>
      </div>
      <div className="xl-wrap">
        <table className="xl">
          <thead>
            <tr>
              <th className="rn" />
              {active.cols.map((col, i) => (
                <th key={col || i}>{COLS[i]}</th>
              ))}
            </tr>
            <tr>
              <th className="rn">1</th>
              {active.cols.map((col, i) => (
                <th key={col || i} style={{ textAlign: "left" }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {active.rows.map((line, i) => (
              <tr key={i} className={(line.hl ? "hl " : "") + (line.total ? "total" : "")}>
                <td className="rn">{i + 2}</td>
                {active.cols.map((_, c) => (
                  <td key={c} className={isNum(line.cells[c]) ? "num" : undefined}>
                    {line.cells[c] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sheets.length > 1 && (
        <div className="xl-tabs" role="tablist" aria-label="Worksheets">
          {sheets.map((sheet) => (
            <button key={sheet.name} type="button" role="tab" aria-selected={sheet.name === active.name} onClick={() => setTab(sheet.name)}>
              {sheet.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
