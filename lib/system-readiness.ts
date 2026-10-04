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
    rate_limiting: SystemCapability
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
  const frameRedactor = configured("FRAME_REDACTION_URL")
  const visionProvider = configured("GOOGLE_VISION_API_KEY")
  const visionEnabled = process.env.NEXT_PUBLIC_ENABLE_VISION === "true"
  const sessionSecret =
    (process.env.APP_SESSION_SECRET?.trim().length ?? 0) >= 32
  const sessionEnforced = process.env.APP_SECURITY_MODE === "enforce"
  const realtimeEnabled = process.env.NEXT_PUBLIC_ENABLE_REALTIME === "true"
  const supabaseBrowser =
    configured("NEXT_PUBLIC_SUPABASE_URL") &&
    configured("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  const elevenLabs = configured("ELEVENLABS_API_KEY")
  const interviewer = configured("ELEVENLABS_INTERVIEWER_AGENT_ID")
  const tutor = configured("ELEVENLABS_TUTOR_AGENT_ID")

  // These integrations are intentionally reported as missing until their
  // executable paths exist. A configured key alone is not an implementation.
  const realtimeImplemented = true
  const authenticationImplemented = false
  const sessionAuthorizationReady = sessionSecret && sessionEnforced
  const visionReady = frameRedactor && visionProvider && visionEnabled

  const blockers = [
    !supabase ? "Durable Supabase persistence is not configured." : null,
    !presidio ? "Hosted Presidio redaction is not configured." : null,
    !(elevenLabs && interviewer)
      ? "The signed ElevenLabs Interviewer is not configured."
      : null,
    !(elevenLabs && tutor)
      ? "The signed ElevenLabs Tutor is not configured."
      : null,
    !visionReady
      ? "Vision needs FRAME_REDACTION_URL, GOOGLE_VISION_API_KEY, and NEXT_PUBLIC_ENABLE_VISION=true."
      : null,
    !(realtimeImplemented && realtimeEnabled && supabaseBrowser)
      ? "Realtime is gated until Supabase browser credentials, Auth, secure RLS, and NEXT_PUBLIC_ENABLE_REALTIME=true are ready."
      : null,
    !authenticationImplemented
      ? "Signed session capabilities are implemented, but human user authentication and Supabase ownership are still required."
      : null,
    !sessionAuthorizationReady
      ? "Set a strong APP_SESSION_SECRET and APP_SECURITY_MODE=enforce after clients are migrated."
      : null,
  ].filter((value): value is string => value !== null)

  const sensitiveDataReady =
    supabase && presidio && authenticationImplemented && visionReady

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
          "Browser screen sharing, local change detection and microphone-level voice activity feed the Question Governor in /apprentice live capture. Frames leave the browser only when explicit retention or the gated redaction-first vision pipeline is enabled; the microphone is measured locally and never recorded.",
      },
      vision_extraction: {
        state: visionReady ? "live" : "demo",
        detail: visionReady
          ? "Changed frames go to a server-side redactor before Gemini returns schema-validated events; neither raw nor redacted frames are retained by this route."
          : "The redaction-first server route and schema validation are implemented but remain disabled until both services are configured.",
      },
      realtime_updates: {
        state:
          realtimeEnabled && supabaseBrowser && authenticationImplemented
            ? "live"
            : "demo",
        detail:
          "A session-filtered browser subscription and ownership-RLS migration exist. They stay gated because secure Realtime also requires a signed-in Supabase user.",
      },
      authentication: {
        state: sessionAuthorizationReady ? "demo" : "missing",
        detail: sessionAuthorizationReady
          ? "Session-scoped routes enforce a signed HttpOnly capability that binds browser requests to one session. This is not human user authentication."
          : "Session capability code exists in report mode; configure its secret and enforce mode after the frontend migration. Human login is still missing.",
      },
      rate_limiting: {
        state: "demo",
        detail:
          "High-cost routes use bounded per-process limits. A shared platform or managed limiter is still required across production instances.",
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
