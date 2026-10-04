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

interface RedactionSpan {
  start: number
  end: number
  entities: Set<string>
}

function mergeFindings(
  text: string,
  payload: PresidioFinding[]
): RedactionSpan[] {
  const valid = payload
    .filter(
      (item) =>
        typeof item.start === "number" &&
        typeof item.end === "number" &&
        typeof item.entity_type === "string" &&
        item.start >= 0 &&
        item.end > item.start &&
        item.end <= text.length
    )
    .map((item) => ({
      start: item.start as number,
      end: item.end as number,
      entity: (item.entity_type as string).replace(/[^A-Z0-9_]/gi, "_"),
    }))
    .sort((a, b) => a.start - b.start || b.end - a.end)

  const spans: RedactionSpan[] = []
  for (const finding of valid) {
    const previous = spans.at(-1)
    if (previous && finding.start <= previous.end) {
      previous.end = Math.max(previous.end, finding.end)
      previous.entities.add(finding.entity)
      continue
    }
    spans.push({
      start: finding.start,
      end: finding.end,
      entities: new Set([finding.entity]),
    })
  }
  return spans
}

export async function redactTranscript(text: string): Promise<RedactionResult> {
  const baseUrl = process.env.PRESIDIO_ANALYZER_URL?.trim()
  if (!baseUrl) return redactLocally(text)

  const configuredTimeout = Number(process.env.PRESIDIO_TIMEOUT_MS)
  const timeoutMs =
    Number.isFinite(configuredTimeout) &&
    configuredTimeout >= 500 &&
    configuredTimeout <= 30_000
      ? configuredTimeout
      : 5_000

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, language: "en" }),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) {
    throw new Error(`Presidio returned ${response.status}`)
  }

  const payload = (await response.json()) as PresidioFinding[]
  const findings = mergeFindings(text, Array.isArray(payload) ? payload : [])

  let output = text
  for (const finding of [...findings].reverse()) {
    const entity = [...finding.entities].sort().join("_")
    output = `${output.slice(0, finding.start)}[REDACTED_${entity}]${output.slice(finding.end)}`
  }
  return { text: output, redactions: findings.length, provider: "presidio" }
}
