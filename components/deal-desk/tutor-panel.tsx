"use client"

import * as React from "react"
import {
  ConversationProvider,
  useConversationClientTool,
  useConversationControls,
  useConversationInput,
  useConversationMode,
  useConversationStatus,
  type MessagePayload,
} from "@elevenlabs/react"
import {
  Check,
  CircleAlert,
  Mic,
  MicOff,
  PhoneOff,
  Play,
  ShieldCheck,
  X,
} from "lucide-react"

import { useDealDesk } from "@/components/deal-desk/session-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { elapsedSeconds, getSessionId } from "@/lib/event-bus"
import { sessionFetch } from "@/lib/session-client"
import { getExpertMoment, lookupGuardrails, TUTOR_RULES } from "@/lib/tutor"
import type { MasteryState } from "@/lib/types"
import { cn } from "cn"

const statusLabel: Record<MasteryState, string> = {
  unseen: "unseen",
  hit: "hit",
  missed: "missed",
  shown: "shown",
  predicted: "predicted",
  applied: "applied",
}

const successStates = new Set<MasteryState>(["hit", "predicted", "applied"])
const warningStates = new Set<MasteryState>(["missed", "shown"])
const validMasteryStates = new Set<MasteryState>([
  "unseen",
  "hit",
  "missed",
  "shown",
  "predicted",
  "applied",
])

export function TutorPanel() {
  const { offRecord } = useDealDesk()

  const onMessage = React.useCallback(
    (message: MessagePayload) => {
      if (offRecord || !message.message.trim()) return
      const sessionId = getSessionId()
      void sessionFetch(sessionId, "/api/privacy/transcripts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          t: Number(elapsedSeconds().toFixed(2)),
          role: message.role === "agent" ? "agent" : "user",
          text: message.message,
        }),
      })
    },
    [offRecord]
  )

  return (
    <ConversationProvider onMessage={onMessage}>
      <TutorPanelContent />
    </ConversationProvider>
  )
}

function TutorPanelContent() {
  const {
    mastery,
    updateMastery,
    activeBlock,
    activeReplay,
    blockCommit,
    dismissBlock,
    replayMoment,
    workMapApproved,
    setWorkMapApproved,
    getScreenState,
    offRecord,
    setOffRecord,
    syncStatus,
  } = useDealDesk()
  const controls = useConversationControls()
  const { status, message: statusMessage } = useConversationStatus()
  const { mode, isSpeaking } = useConversationMode()
  const { isMuted, setMuted } = useConversationInput()
  const [startError, setStartError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (status === "connected") setMuted(offRecord)
  }, [offRecord, setMuted, status])

  React.useEffect(() => {
    if (!workMapApproved && status === "connected") controls.endSession()
  }, [controls, status, workMapApproved])

  useConversationClientTool("get_screen_state", () =>
    JSON.stringify(getScreenState())
  )
  useConversationClientTool("block_commit", (parameters) => {
    const reason =
      typeof parameters.reason === "string"
        ? parameters.reason
        : "Commit blocked."
    const step_id =
      typeof parameters.step_id === "number" ? parameters.step_id : 7
    const ruleId =
      TUTOR_RULES.find((rule) => rule.stepId === step_id)?.id ?? null
    blockCommit(reason, step_id, ruleId)
    return JSON.stringify({ blocked: true, overlay_id: `block-${Date.now()}` })
  })
  useConversationClientTool("replay_moment", (parameters) => {
    const step_id =
      typeof parameters.step_id === "number" ? parameters.step_id : 7
    const moment = getExpertMoment(step_id)
    replayMoment(step_id)
    return JSON.stringify({
      clip: moment?.clip ?? null,
      frame: moment?.frame ?? null,
    })
  })
  useConversationClientTool("update_mastery", (parameters) => {
    const rule_id =
      typeof parameters.rule_id === "string" ? parameters.rule_id : ""
    const state =
      typeof parameters.state === "string" &&
      validMasteryStates.has(parameters.state as MasteryState)
        ? (parameters.state as MasteryState)
        : "unseen"
    updateMastery(rule_id, state)
    return JSON.stringify({ ok: true })
  })
  useConversationClientTool("lookup_guardrail", (parameters) => {
    const topic = typeof parameters.topic === "string" ? parameters.topic : ""
    return JSON.stringify({
      rules: lookupGuardrails(topic).map((rule) => ({
        id: rule.id,
        step_id: rule.stepId,
        rule: rule.rule,
        decision: rule.decision,
      })),
    })
  })
  useConversationClientTool("get_expert_moment", (parameters) => {
    const step_id =
      typeof parameters.step_id === "number" ? parameters.step_id : 7
    return JSON.stringify(getExpertMoment(step_id))
  })
  useConversationClientTool("set_off_record", (parameters) => {
    const active = parameters.active === true
    setOffRecord(active)
    return JSON.stringify({ ok: true, off_record: active })
  })

  const startTutor = async () => {
    setStartError(null)
    if (!workMapApproved) {
      setStartError("The expert must approve the Work Map first.")
      return
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      const sessionId = getSessionId()
      const response = await sessionFetch(sessionId, "/api/tutor/session", {
        method: "POST",
      })
      const config = (await response.json()) as {
        signed_url?: string
        agent_id?: string
        error?: string
        missing?: string[]
      }
      if (!response.ok) {
        throw new Error(
          config.missing?.length
            ? `Missing ${config.missing.join(", ")}`
            : config.error || "Tutor session is unavailable."
        )
      }
      const dynamicVariables = {
        session_id: sessionId,
        case_id: "customer-3",
        mastery_state: JSON.stringify(mastery),
      }
      if (config.signed_url) {
        controls.startSession({
          signedUrl: config.signed_url,
          dynamicVariables,
        })
      } else if (config.agent_id) {
        controls.startSession({ agentId: config.agent_id, dynamicVariables })
      } else {
        throw new Error("Tutor session configuration is incomplete.")
      }
    } catch (error) {
      setStartError(
        error instanceof Error ? error.message : "Tutor failed to start."
      )
    }
  }

  const voiceLabel =
    status === "connected"
      ? isSpeaking
        ? "Tutor speaking"
        : mode === "listening"
          ? "Tutor listening"
          : "Tutor connected"
      : status === "connecting"
        ? "Connecting…"
        : "Start voice tutor"

  return (
    <div className="border-b border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            Tutor / Teach mode
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            ElevenAgents voice tutor grounded in the expert-reviewed Work Map.
          </p>
        </div>
        <Badge variant={workMapApproved ? "default" : "destructive"}>
          {workMapApproved ? "approved" : "review needed"}
        </Badge>
      </div>

      <div className="mt-2 flex gap-1.5">
        {status === "connected" ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 flex-1 text-[10px]"
              onClick={() => setMuted(!isMuted)}
            >
              {isMuted ? (
                <MicOff className="size-3" />
              ) : (
                <Mic className="size-3" />
              )}
              {isMuted ? "Unmute" : voiceLabel}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={controls.endSession}
            >
              <PhoneOff className="size-3" />
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className="h-7 flex-1 text-[10px]"
            onClick={() => void startTutor()}
            disabled={!workMapApproved || status === "connecting"}
          >
            <Mic className="size-3" />
            {voiceLabel}
          </Button>
        )}
      </div>
      {startError || statusMessage ? (
        <p className="mt-1 text-[10px] text-destructive">
          {startError ?? statusMessage}
        </p>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5">
        <span className="text-[10px] text-muted-foreground">
          Tutor access requires expert approval · sync {syncStatus}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => setWorkMapApproved(!workMapApproved)}
        >
          {workMapApproved ? "Revoke" : "Approve"}
        </Button>
      </div>

      {activeBlock ? (
        <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5">
          <div className="flex items-start gap-2">
            <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-destructive">
                Commit blocked
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-destructive/90">
                {activeBlock.reason}
              </p>
              <div className="mt-2 flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10px]"
                  onClick={() =>
                    replayMoment(activeBlock.stepId, activeBlock.ruleId)
                  }
                >
                  <Play className="size-3" /> Replay expert
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px]"
                  onClick={dismissBlock}
                >
                  <X className="size-3" /> Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeReplay ? (
        <div className="mt-2 rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold">
              Expert moment: {activeReplay.title}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5"
              onClick={() => replayMoment(null)}
            >
              <X className="size-3" />
            </Button>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            {activeReplay.decision}
          </p>
          <blockquote className="mt-1 border-l-2 border-blue-500/50 pl-2 text-[10px] text-muted-foreground italic">
            {activeReplay.reasonQuote}
          </blockquote>
          <p className="mt-1 font-mono text-[9px] text-muted-foreground">
            {activeReplay.frame} · clip {activeReplay.clip[0]}–
            {activeReplay.clip[1]}s
          </p>
        </div>
      ) : null}

      <div className="mt-2 space-y-1">
        {TUTOR_RULES.map((rule) => {
          const state = mastery[rule.id] ?? "unseen"
          const success = successStates.has(state)
          const warning = warningStates.has(state)
          return (
            <div
              key={rule.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background px-2 py-1.5"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                {success ? (
                  <Check className="size-3 text-emerald-600" />
                ) : warning ? (
                  <CircleAlert className="size-3 text-destructive" />
                ) : (
                  <span className="size-3 rounded-full border border-muted-foreground/50" />
                )}
                <span className="truncate text-[10px]">{rule.title}</span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-[9px]",
                  success && "border-emerald-500/40 text-emerald-600",
                  warning && "border-destructive/40 text-destructive"
                )}
              >
                {statusLabel[state]}
              </Badge>
            </div>
          )
        })}
      </div>
    </div>
  )
}
