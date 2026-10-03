import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST() {
  const agentId = process.env.ELEVENLABS_TUTOR_AGENT_ID?.trim()
  if (!agentId) {
    return NextResponse.json(
      {
        error: "Tutor voice is not configured.",
        missing: ["ELEVENLABS_TUTOR_AGENT_ID"],
      },
      { status: 503 }
    )
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json({ agent_id: agentId, auth: "public" })
  }

  const url = new URL(
    "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url"
  )
  url.searchParams.set("agent_id", agentId)
  const response = await fetch(url, {
    headers: { "xi-api-key": apiKey },
    cache: "no-store",
  })
  if (!response.ok) {
    const message = await response.text()
    return NextResponse.json(
      { error: `ElevenLabs session failed: ${message.slice(0, 300)}` },
      { status: 502 }
    )
  }

  const payload = (await response.json()) as { signed_url?: unknown }
  if (typeof payload.signed_url !== "string") {
    return NextResponse.json(
      { error: "ElevenLabs did not return a signed URL." },
      { status: 502 }
    )
  }
  return NextResponse.json({ signed_url: payload.signed_url, auth: "signed" })
}
