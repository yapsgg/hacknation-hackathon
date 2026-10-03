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
  provider: "local-fallback"
}

export function redactTranscript(text: string): RedactionResult {
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
