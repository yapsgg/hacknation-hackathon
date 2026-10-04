import { NextResponse } from "next/server"

import { redactTranscript } from "@/lib/privacy"
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const limited = rateLimitResponse(
    checkRateLimit(request, {
      namespace: "transcript-redact",
      limit: 60,
      windowMs: 60_000,
    })
  )
  if (limited) return limited

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const text = (body as { text?: unknown } | null)?.text
  if (typeof text !== "string" || text.length > 100_000) {
    return NextResponse.json(
      { error: "text must be a string under 100KB" },
      { status: 422 }
    )
  }

  try {
    return NextResponse.json(await redactTranscript(text))
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Redaction failed",
        storage_blocked: true,
      },
      { status: 502 }
    )
  }
}
