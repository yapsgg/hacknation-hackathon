import { Buffer } from "node:buffer"

import type { CaptureEvent } from "@/lib/types"

const EVENT_TYPES = new Set<CaptureEvent["type"]>([
  "field_changed",
  "doc_opened",
  "doc_scrolled",
  "value_entered",
  "save_clicked",
  "navigation",
])

// Google retires pinned model names for new keys (gemini-2.5-flash already
// returns 404), so default to the maintained alias. Pin VISION_MODEL for a
// reproducible run.
export const DEFAULT_VISION_MODEL = "gemini-flash-latest"
export const DEFAULT_VISION_FALLBACK_MODEL = "gemini-flash-lite-latest"

export class VisionConfigurationError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Vision is not configured: ${missing.join(", ")}`)
  }
}

interface RedactedFrame {
  dataUrl: string
  mimeType: "image/jpeg" | "image/png"
  redactions: number
  provider: string
}

function timeout(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value >= 500 && value <= 60_000
    ? value
    : fallback
}

function imageMimeType(bytes: Buffer): "image/jpeg" | "image/png" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg"
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "image/png"
  return null
}

async function redactFrame(dataUrl: string): Promise<RedactedFrame> {
  const url = process.env.FRAME_REDACTION_URL?.trim()
  if (!url) throw new VisionConfigurationError(["FRAME_REDACTION_URL"])

  const headers: Record<string, string> = {}
  const token = process.env.FRAME_REDACTION_TOKEN?.trim()
  if (token) headers.authorization = `Bearer ${token}`
  const mode = process.env.FRAME_REDACTION_MODE?.trim().toLowerCase()
  const sourceBase64 = dataUrl.slice(dataUrl.indexOf(",") + 1)
  const signal = AbortSignal.timeout(timeout("FRAME_REDACTION_TIMEOUT_MS", 10_000))

  if (mode === "presidio") {
    // The published Presidio image-redactor takes a multipart `image` file and
    // answers with the redacted image's raw bytes as application/octet-stream
    // (its JSON path returns base64 text instead), so identify the image by
    // its magic bytes rather than the content type.
    const form = new FormData()
    form.append(
      "image",
      new Blob([Buffer.from(sourceBase64, "base64")], { type: "image/jpeg" }),
      "frame.jpg"
    )
    const presidio = await fetch(url, {
      method: "POST",
      headers,
      body: form,
      cache: "no-store",
      signal,
    })
    if (!presidio.ok)
      throw new Error(`Frame redactor returned ${presidio.status}`)
    const bytes = Buffer.from(await presidio.arrayBuffer())
    if (bytes.length === 0 || bytes.length > 1_500_000) {
      throw new Error("Presidio image redactor returned an invalid image")
    }
    const mimeType = imageMimeType(bytes)
    if (!mimeType) {
      throw new Error("Presidio image redactor returned a non-image response")
    }
    return {
      dataUrl: `data:${mimeType};base64,${bytes.toString("base64")}`,
      mimeType,
      redactions: 0,
      provider: "presidio-image-redactor",
    }
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ image: dataUrl, mime_type: "image/jpeg" }),
    cache: "no-store",
    signal,
  })
  if (!response.ok)
    throw new Error(`Frame redactor returned ${response.status}`)

  const payload = (await response.json()) as Record<string, unknown>
  const redacted = payload.redacted_data_url
  if (
    typeof redacted !== "string" ||
    !/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(redacted)
  ) {
    throw new Error("Frame redactor returned an invalid JPEG")
  }
  return {
    dataUrl: redacted,
    mimeType: redacted.startsWith("data:image/png")
      ? "image/png"
      : "image/jpeg",
    redactions: typeof payload.redactions === "number" ? payload.redactions : 0,
    provider:
      typeof payload.provider === "string"
        ? payload.provider
        : "frame-redactor",
  }
}

function isCaptureEvent(value: unknown): value is CaptureEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const event = value as Record<string, unknown>
  return (
    typeof event.t === "number" &&
    event.t >= 0 &&
    typeof event.type === "string" &&
    EVENT_TYPES.has(event.type as CaptureEvent["type"]) &&
    typeof event.object === "string" &&
    event.object.length > 0 &&
    event.object.length <= 1_000 &&
    (event.confidence === undefined ||
      event.confidence === null ||
      (typeof event.confidence === "number" &&
        event.confidence >= 0 &&
        event.confidence <= 1)) &&
    (event.salient_text === undefined ||
      (Array.isArray(event.salient_text) &&
        event.salient_text.length <= 20 &&
        event.salient_text.every(
          (item) => typeof item === "string" && item.length <= 500
        )))
  )
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    events: {
      type: "ARRAY",
      maxItems: 1,
      items: {
        type: "OBJECT",
        properties: {
          t: { type: "NUMBER" },
          type: {
            type: "STRING",
            enum: [...EVENT_TYPES],
          },
          object: { type: "STRING" },
          field: { type: "STRING", nullable: true },
          from: { type: "STRING", nullable: true },
          to: { type: "STRING", nullable: true },
          evidence_frame: { type: "STRING" },
          salient_text: { type: "ARRAY", items: { type: "STRING" } },
          confidence: { type: "NUMBER" },
          source: { type: "STRING", enum: ["vision"] },
        },
        required: [
          "t",
          "type",
          "object",
          "evidence_frame",
          "salient_text",
          "confidence",
          "source",
        ],
      },
    },
  },
  required: ["events"],
} as const

async function extractWithGemini(input: {
  frame: RedactedFrame
  frameId: string
  t: number
  previousState?: string
}): Promise<CaptureEvent[]> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY?.trim()
  const model = process.env.VISION_MODEL?.trim() || DEFAULT_VISION_MODEL
  if (!apiKey) throw new VisionConfigurationError(["GOOGLE_VISION_API_KEY"])
  const base64 = input.frame.dataUrl.slice(input.frame.dataUrl.indexOf(",") + 1)
  const prompt = [
    "Extract at most one meaningful UI action from this redacted screen frame.",
    "Return an empty events array when the frame does not prove a state change.",
    `Use t=${input.t}, evidence_frame=${input.frameId}, source=vision.`,
    "Do not infer hidden values or restore redacted content.",
    input.previousState ? `Previous state: ${input.previousState}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  const body = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: input.frame.mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  })
  // Gemini answers 503 "high demand" in bursts. Retry once on a lighter model
  // rather than dropping the frame; both models see only the redacted image.
  const fallback = process.env.VISION_FALLBACK_MODEL?.trim() || DEFAULT_VISION_FALLBACK_MODEL
  const models = fallback && fallback !== model ? [model, fallback] : [model]
  let response: Response | null = null
  for (const [index, name] of models.entries()) {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(name)}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(timeout("VISION_TIMEOUT_MS", 20_000)),
      }
    ).catch((error) => {
      if (index === models.length - 1) throw error
      return null
    })
    if (response?.ok) break
    if (response && ![429, 500, 503].includes(response.status)) break
  }
  if (!response) throw new Error("Vision provider was unreachable")
  if (!response.ok)
    throw new Error(`Vision provider returned ${response.status}`)
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = payload.candidates?.[0]?.content?.parts?.find(
    (part) => typeof part.text === "string"
  )?.text
  if (!text) throw new Error("Vision provider returned no structured output")
  const parsed = JSON.parse(text) as { events?: unknown }
  if (!Array.isArray(parsed.events) || parsed.events.length > 1) {
    throw new Error("Vision provider returned an invalid event envelope")
  }
  if (!parsed.events.every(isCaptureEvent)) {
    throw new Error("Vision provider returned an invalid event")
  }
  return parsed.events.map((event) => ({
    ...event,
    t: input.t,
    evidence_frame: input.frameId,
    source: "vision",
  }))
}

export async function extractRedactedFrame(input: {
  dataUrl: string
  frameId: string
  t: number
  previousState?: string
}) {
  const provider = process.env.VISION_PROVIDER?.trim().toLowerCase() || "google"
  if (provider !== "google") {
    throw new VisionConfigurationError(["VISION_PROVIDER=google"])
  }
  const frame = await redactFrame(input.dataUrl)
  const events = await extractWithGemini({ ...input, frame })
  return {
    events,
    redaction: { provider: frame.provider, redactions: frame.redactions },
    raw_frame_stored: false,
    redacted_frame_stored: false,
  }
}
