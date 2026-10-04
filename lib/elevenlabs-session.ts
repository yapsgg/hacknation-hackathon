interface SignedSessionResult {
  signed_url: string
  auth: "signed"
}

export class VoiceConfigurationError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Missing ${missing.join(", ")}`)
    this.name = "VoiceConfigurationError"
  }
}

export async function createSignedConversationSession(
  agentEnvironmentName:
    "ELEVENLABS_INTERVIEWER_AGENT_ID" | "ELEVENLABS_TUTOR_AGENT_ID"
): Promise<SignedSessionResult> {
  const agentId = process.env[agentEnvironmentName]?.trim()
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim()
  const missing = [
    !agentId ? agentEnvironmentName : null,
    !apiKey ? "ELEVENLABS_API_KEY" : null,
  ].filter((value): value is string => value !== null)

  if (missing.length > 0 || !agentId || !apiKey) {
    throw new VoiceConfigurationError(missing)
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
    throw new Error(`ElevenLabs session failed: ${message.slice(0, 300)}`)
  }

  const payload = (await response.json()) as { signed_url?: unknown }
  if (typeof payload.signed_url !== "string") {
    throw new Error("ElevenLabs did not return a signed URL.")
  }
  return { signed_url: payload.signed_url, auth: "signed" }
}
