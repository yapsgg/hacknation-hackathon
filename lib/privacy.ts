const REDACTIONS: Array<[RegExp, string]> = [
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]"],
  [/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_SSN]"],
  [
    /(?<!\d)(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g,
    "[REDACTED_PHONE]",
  ],
]

export interface RedactionResult {
  text: string
  redactions: number
  provider: "local-fallback" | "presidio"
}

export function redactLocally(text: string): RedactionResult {
  let redactions = 0
  let output = text
  for (const [pattern, replacement] of REDACTIONS) {
    output = output.replace(pattern, () => {
      redactions += 1
      return replacement
    })
  }
  return { text: output, redactions, provider: "local-fallback" }
}

interface PresidioFinding {
  entity_type?: unknown
  start?: unknown
  end?: unknown
  score?: unknown
}

export async function redactTranscript(text: string): Promise<RedactionResult> {
  const baseUrl = process.env.PRESIDIO_ANALYZER_URL?.trim()
  if (!baseUrl) return redactLocally(text)

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, language: "en" }),
    cache: "no-store",
  })
  if (!response.ok) {
    throw new Error(`Presidio returned ${response.status}`)
  }

  const payload = (await response.json()) as PresidioFinding[]
  const findings = (Array.isArray(payload) ? payload : [])
    .filter(
      (item) =>
        typeof item.start === "number" &&
        typeof item.end === "number" &&
        typeof item.entity_type === "string" &&
        item.start >= 0 &&
        item.end > item.start &&
        item.end <= text.length
    )
    .sort((a, b) => (b.start as number) - (a.start as number))

  let output = text
  for (const finding of findings) {
    const start = finding.start as number
    const end = finding.end as number
    const entity = (finding.entity_type as string).replace(/[^A-Z0-9_]/gi, "_")
    output = `${output.slice(0, start)}[REDACTED_${entity}]${output.slice(end)}`
  }
  return { text: output, redactions: findings.length, provider: "presidio" }
}
