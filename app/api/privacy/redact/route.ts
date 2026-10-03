import { NextResponse } from "next/server"

import { redactTranscript } from "@/lib/privacy"

export const runtime = "nodejs"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const text = (body as { text?: unknown } | null)?.text
  if (typeof text !== "string" || text.length > 100_000) {
    return NextResponse.json({ error: "text must be a string under 100KB" }, { status: 422 })
  }

  return NextResponse.json(redactTranscript(text))
}
