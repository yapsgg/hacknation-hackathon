import { NextResponse } from "next/server"

import {
  createSignedConversationSession,
  VoiceConfigurationError,
} from "@/lib/elevenlabs-session"

export const runtime = "nodejs"

export async function POST() {
  try {
    return NextResponse.json(
      await createSignedConversationSession("ELEVENLABS_INTERVIEWER_AGENT_ID")
    )
  } catch (error) {
    if (error instanceof VoiceConfigurationError) {
      return NextResponse.json(
        {
          error: "Interviewer voice is not configured.",
          missing: error.missing,
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Interviewer session failed.",
      },
      { status: 502 }
    )
  }
}
