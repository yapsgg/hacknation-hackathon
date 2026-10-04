export type CapabilityState = "live" | "demo" | "missing"

export interface SystemCapability {
  state: CapabilityState
  detail: string
}

export interface SystemReadiness {
  functional_demo_ready: boolean
  sensitive_data_ready: boolean
  mode: "synthetic-demo" | "production-candidate"
  capabilities: {
    deterministic_workflow: SystemCapability
    durable_persistence: SystemCapability
    transcript_redaction: SystemCapability
    interviewer_voice: SystemCapability
    tutor_voice: SystemCapability
    screen_capture: SystemCapability
    vision_extraction: SystemCapability
    realtime_updates: SystemCapability
    authentication: SystemCapability
    webhooks: SystemCapability
  }
  blockers: string[]
}

function configured(name: string): boolean {
  return Boolean(process.env[name]?.trim())
}

/**
 * Reports what the deployed code can actually do. This function intentionally
 * does not make network calls and never returns environment-variable values.
 */
export function getSystemReadiness(): SystemReadiness {
  const supabase =
    configured("NEXT_PUBLIC_SUPABASE_URL") &&
    configured("SUPABASE_SERVICE_ROLE_KEY")
  const presidio = configured("PRESIDIO_ANALYZER_URL")
  const elevenLabs = configured("ELEVENLABS_API_KEY")
  const interviewer = configured("ELEVENLABS_INTERVIEWER_AGENT_ID")
  const tutor = configured("ELEVENLABS_TUTOR_AGENT_ID")

  // These integrations are intentionally reported as missing until their
  // executable paths exist. A configured key alone is not an implementation.
  const visionImplemented = false
  const realtimeImplemented = false
  const authenticationImplemented = false

  const blockers = [
    !supabase ? "Durable Supabase persistence is not configured." : null,
    !presidio ? "Hosted Presidio redaction is not configured." : null,
    !(elevenLabs && interviewer)
      ? "The signed ElevenLabs Interviewer is not configured."
      : null,
    !(elevenLabs && tutor)
      ? "The signed ElevenLabs Tutor is not configured."
      : null,
    !visionImplemented
      ? "The screen-share vision extractor is not implemented."
      : null,
    !realtimeImplemented
      ? "Browser Realtime subscriptions are not implemented."
      : null,
    !authenticationImplemented
      ? "Application authentication and per-session authorization are not implemented."
      : null,
  ].filter((value): value is string => value !== null)

  const sensitiveDataReady =
    supabase && presidio && authenticationImplemented && visionImplemented

  return {
    functional_demo_ready: true,
    sensitive_data_ready: sensitiveDataReady,
    mode: sensitiveDataReady ? "production-candidate" : "synthetic-demo",
    capabilities: {
      deterministic_workflow: {
        state: "live",
        detail:
          "Question Governor, Work Map compiler, pre-commit rules, mastery, and privacy controls execute real application logic against synthetic evidence.",
      },
      durable_persistence: {
        state: supabase ? "live" : "demo",
        detail: supabase
          ? "Server routes persist through the configured Supabase service role."
          : "Routes fall back to process memory and browser storage; data is not durable.",
      },
      transcript_redaction: {
        state: presidio ? "live" : "demo",
        detail: presidio
          ? "Transcripts are sent to the configured Presidio Analyzer before storage."
          : "Only the limited local email, phone, and SSN redactor is active.",
      },
      interviewer_voice: {
        state: elevenLabs && interviewer ? "live" : "missing",
        detail:
          elevenLabs && interviewer
            ? "A private signed ElevenLabs Interviewer session can be issued."
            : "The primary Apprentice UI still uses its deterministic/browser-speech fallback.",
      },
      tutor_voice: {
        state: elevenLabs && tutor ? "live" : "missing",
        detail:
          elevenLabs && tutor
            ? "A private signed ElevenLabs Tutor session can be issued."
            : "The Deal Desk Tutor cannot start a private voice session.",
      },
      screen_capture: {
        state: "live",
        detail:
          "Browser screen sharing and local frame-difference sampling are implemented; raw frames remain local unless retention is explicitly enabled in Deal Desk.",
      },
      vision_extraction: {
        state: "missing",
        detail:
          "No server route currently turns shared-screen frames into redacted structured events.",
      },
      realtime_updates: {
        state: "missing",
        detail:
          "Supabase tables are publication-ready, but the browser does not subscribe to them.",
      },
      authentication: {
        state: "missing",
        detail:
          "API routes do not authenticate users or authorize access to a session UUID.",
      },
      webhooks: {
        state: "missing",
        detail:
          "No webhook endpoints are implemented or required by the current browser client-tool architecture.",
      },
    },
    blockers,
  }
}
