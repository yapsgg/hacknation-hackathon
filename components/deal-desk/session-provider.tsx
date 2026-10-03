"use client"

import * as React from "react"

import { useScreenCapture, type CapturedFrame } from "@/hooks/use-screen-capture"
import {
  emitAppEvent,
  elapsedSeconds,
  getSessionId,
  purgeEvents,
  setPaused,
  startSession,
} from "@/lib/event-bus"
import {
  evaluateCommit,
  getExpertMoment,
  INITIAL_MASTERY,
  type CommitEvaluation,
  type ExpertMoment,
} from "@/lib/tutor"
import type { MasteryState } from "@/lib/types"
import { getVdrDoc } from "@/lib/vdr"

interface DealDeskContextValue {
  offRecord: boolean
  setOffRecord: (value: boolean) => void
  framesNotStored: boolean
  setFramesNotStored: (value: boolean) => void
  currentDocId: string | null
  openDoc: (id: string) => void
  frames: CapturedFrame[]
  capture: ReturnType<typeof useScreenCapture>
  mastery: Record<string, MasteryState>
  activeBlock: { reason: string; stepId: number; ruleId: string | null } | null
  activeReplay: ExpertMoment | null
  replayMoment: (stepId: number | null, ruleId?: string | null) => void
  dismissBlock: () => void
  interceptCommit: (values: Record<string, string>) => CommitEvaluation
  workMapApproved: boolean
  setWorkMapApproved: (value: boolean) => void
  purgeStatus: "idle" | "purging" | "purged" | "error"
}

const DealDeskContext = React.createContext<DealDeskContextValue | null>(null)

export function DealDeskProvider({ children }: { children: React.ReactNode }) {
  const [offRecord, setOffRecordState] = React.useState(false)
  const [framesNotStored, setFramesNotStored] = React.useState(true)
  const [currentDocId, setCurrentDocId] = React.useState<string | null>(null)
  const [frames, setFrames] = React.useState<CapturedFrame[]>([])
  const [mastery, setMastery] = React.useState<Record<string, MasteryState>>(
    INITIAL_MASTERY
  )
  const [activeBlock, setActiveBlock] = React.useState<{
    reason: string
    stepId: number
    ruleId: string | null
  } | null>(null)
  const [activeReplay, setActiveReplay] = React.useState<ExpertMoment | null>(null)
  const [workMapApproved, setWorkMapApproved] = React.useState(true)
  const [purgeStatus, setPurgeStatus] = React.useState<
    "idle" | "purging" | "purged" | "error"
  >("idle")
  const offRecordFromRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    startSession()
  }, [])

  const handleFrame = React.useCallback((frame: CapturedFrame) => {
    if (framesNotStored) return
    setFrames((prev) => [frame, ...prev].slice(0, 12))
  }, [framesNotStored])

  const capture = useScreenCapture({ fps: 1, onFrame: handleFrame })

  const setOffRecord = React.useCallback((value: boolean) => {
    const now = elapsedSeconds()
    if (value) {
      const from = offRecordFromRef.current ?? 0
      offRecordFromRef.current = now
      setOffRecordState(true)
      setPaused(true)
      setFrames([])
      purgeEvents(from, now)
      setPurgeStatus("purging")
      void fetch("/api/privacy/purge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session_id: getSessionId(), from, to: now }),
      })
        .then((response) => {
          if (!response.ok) throw new Error("Privacy purge failed")
          setPurgeStatus("purged")
        })
        .catch(() => setPurgeStatus("error"))
      return
    }
    offRecordFromRef.current = null
    setOffRecordState(false)
    setPaused(false)
    setPurgeStatus("idle")
  }, [])

  const replayMoment = React.useCallback(
    (stepId: number | null, ruleId?: string | null) => {
      setActiveReplay(stepId === null ? null : getExpertMoment(stepId, ruleId))
    },
    []
  )

  const dismissBlock = React.useCallback(() => {
    setActiveBlock(null)
  }, [])

  const interceptCommit = React.useCallback(
    (values: Record<string, string>): CommitEvaluation => {
      if (!workMapApproved) {
        const blocked = {
          blocked: true,
          reason: "The expert has not approved this Work Map for tutor use.",
          stepId: 7,
          ruleId: "review-before-publish",
          passedRuleIds: [],
        }
        setActiveBlock({ reason: blocked.reason, stepId: blocked.stepId, ruleId: blocked.ruleId })
        return blocked
      }

      const result = evaluateCommit(values)
      if (result.blocked && result.stepId !== null) {
        setActiveBlock({
          reason: result.reason ?? "Commit blocked.",
          stepId: result.stepId,
          ruleId: result.ruleId,
        })
        if (result.ruleId) {
          setMastery((current) => ({ ...current, [result.ruleId!]: "missed" }))
        }
      } else {
        setActiveBlock(null)
        setMastery((current) => {
          const next = { ...current }
          for (const ruleId of result.passedRuleIds) next[ruleId] = "hit"
          return next
        })
      }
      return result
    },
    [workMapApproved]
  )

  const openDoc = React.useCallback((id: string) => {
    const doc = getVdrDoc(id)
    if (!doc) return
    setCurrentDocId(id)
    emitAppEvent({
      type: "doc_opened",
      object: `VDR / ${doc.path}`,
      salient_text: doc.body.slice(0, 3),
    })
  }, [])

  const value = React.useMemo<DealDeskContextValue>(
    () => ({
      offRecord,
      setOffRecord,
      framesNotStored,
      setFramesNotStored,
      currentDocId,
      openDoc,
      frames,
      capture,
      mastery,
      activeBlock,
      activeReplay,
      replayMoment,
      dismissBlock,
      interceptCommit,
      workMapApproved,
      setWorkMapApproved,
      purgeStatus,
    }),
    [
      offRecord,
      setOffRecord,
      framesNotStored,
      currentDocId,
      openDoc,
      frames,
      capture,
      mastery,
      activeBlock,
      activeReplay,
      replayMoment,
      dismissBlock,
      interceptCommit,
      workMapApproved,
      purgeStatus,
    ]
  )

  return (
    <DealDeskContext.Provider value={value}>
      {children}
    </DealDeskContext.Provider>
  )
}

export function useDealDesk(): DealDeskContextValue {
  const context = React.useContext(DealDeskContext)
  if (!context) {
    throw new Error("useDealDesk must be used within a DealDeskProvider")
  }
  return context
}
