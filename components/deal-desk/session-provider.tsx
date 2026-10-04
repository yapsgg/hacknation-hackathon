"use client"

import * as React from "react"

import {
  useScreenCapture,
  type CapturedFrame,
} from "@/hooks/use-screen-capture"
import {
  emitAppEvent,
  elapsedSeconds,
  getSessionId,
  getSnapshot,
  purgeEvents,
  setPaused,
  startSession,
} from "@/lib/event-bus"
import {
  evaluateCommit,
  getExpertMoment,
  INITIAL_MASTERY,
  TUTOR_RULES,
  type CommitEvaluation,
  type ExpertMoment,
} from "@/lib/tutor"
import type { CaptureEvent, MasteryState } from "@/lib/types"
import { LBO_LINES, type LineStatus } from "@/lib/lbo"
import { getVdrDoc } from "@/lib/vdr"

export interface Interjection {
  id: string
  /** "scripted" = local demo rule; "agent" = live tutor reply. */
  origin: "scripted" | "agent"
  lineId: string
  headline: string
  questions: string[]
  /** VDR documents the tutor wants the analyst to open before saving. */
  docIds: string[]
}

type ManualStatus = Extract<LineStatus, "flagged" | "verified">

export interface PrivacyWindow {
  from: number
  to: number
  eventsRemoved: number
  framesRemoved: number
}

export interface ScreenState {
  state_summary: string
  recent_events: CaptureEvent[]
  current_doc: string | null
  elapsed_s: number
}

interface DealDeskContextValue {
  interjection: Interjection | null
  setInterjection: (value: Interjection | null) => void
  viewedDocIds: ReadonlySet<string>
  lineStatus: (lineId: string) => LineStatus
  setManualStatus: (lineId: string, status: ManualStatus | null) => void
  offRecord: boolean
  setOffRecord: (value: boolean) => void
  framesNotStored: boolean
  setFramesNotStored: (value: boolean) => void
  currentDocId: string | null
  openDoc: (id: string) => void
  frames: CapturedFrame[]
  capture: ReturnType<typeof useScreenCapture>
  mastery: Record<string, MasteryState>
  updateMastery: (ruleId: string, state: MasteryState) => void
  activeBlock: { reason: string; stepId: number; ruleId: string | null } | null
  blockCommit: (reason: string, stepId: number, ruleId?: string | null) => void
  activeReplay: ExpertMoment | null
  replayMoment: (stepId: number | null, ruleId?: string | null) => void
  dismissBlock: () => void
  interceptCommit: (values: Record<string, string>) => CommitEvaluation
  workMapApproved: boolean
  setWorkMapApproved: (value: boolean) => void
  purgeStatus: "idle" | "purging" | "purged" | "error"
  privacyWindows: PrivacyWindow[]
  getScreenState: () => ScreenState
  syncStatus: "loading" | "ready" | "error"
}

const DealDeskContext = React.createContext<DealDeskContextValue | null>(null)

async function patchTutorState(body: Record<string, unknown>) {
  const response = await fetch("/api/tutor/state", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ session_id: getSessionId(), ...body }),
  })
  if (!response.ok) throw new Error("Tutor state persistence failed")
  const result = (await response.json()) as {
    store?: string
    auditPersisted?: boolean
  }
  if (result.store === "supabase" && result.auditPersisted === false) {
    throw new Error("Tutor state saved without its audit record")
  }
}

export function DealDeskProvider({ children }: { children: React.ReactNode }) {
  const [offRecord, setOffRecordState] = React.useState(false)
  const [framesNotStored, setFramesNotStoredState] = React.useState(true)
  const [currentDocId, setCurrentDocId] = React.useState<string | null>(null)
  const [viewedDocIds, setViewedDocIds] = React.useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [manual, setManual] = React.useState<Record<string, ManualStatus>>({})
  const [interjection, setInterjection] = React.useState<Interjection | null>(
    null
  )
  const [frames, setFrames] = React.useState<CapturedFrame[]>([])
  const [mastery, setMastery] =
    React.useState<Record<string, MasteryState>>(INITIAL_MASTERY)
  const [activeBlock, setActiveBlock] = React.useState<{
    reason: string
    stepId: number
    ruleId: string | null
  } | null>(null)
  const [activeReplay, setActiveReplay] = React.useState<ExpertMoment | null>(
    null
  )
  const [workMapApproved, setWorkMapApprovedState] = React.useState(true)
  const [purgeStatus, setPurgeStatus] = React.useState<
    "idle" | "purging" | "purged" | "error"
  >("idle")
  const [privacyWindows, setPrivacyWindows] = React.useState<PrivacyWindow[]>(
    []
  )
  const [syncStatus, setSyncStatus] = React.useState<
    "loading" | "ready" | "error"
  >("loading")

  const offRecordFromRef = React.useRef<number | null>(null)
  const offRecordRef = React.useRef(false)
  const framesNotStoredRef = React.useRef(true)
  const frameRetentionReadyRef = React.useRef(false)
  const workMapApprovedRef = React.useRef(true)

  React.useEffect(() => {
    startSession()
    const sessionId = getSessionId()
    void fetch(`/api/tutor/state?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Tutor state load failed")
        return response.json() as Promise<{
          approved?: boolean
          mastery?: Record<string, MasteryState>
        }>
      })
      .then((state) => {
        if (typeof state.approved === "boolean") {
          workMapApprovedRef.current = state.approved
          setWorkMapApprovedState(state.approved)
        }
        if (state.mastery) setMastery({ ...INITIAL_MASTERY, ...state.mastery })
        setSyncStatus("ready")
      })
      .catch(() => setSyncStatus("error"))
  }, [])

  const updateMastery = React.useCallback(
    (ruleId: string, state: MasteryState) => {
      if (!TUTOR_RULES.some((rule) => rule.id === ruleId)) return
      setMastery((current) => ({ ...current, [ruleId]: state }))
      void patchTutorState({ action: "mastery", rule_id: ruleId, state }).catch(
        () => setSyncStatus("error")
      )
    },
    []
  )

  const handleFrame = React.useCallback((frame: CapturedFrame) => {
    if (
      framesNotStoredRef.current ||
      !frameRetentionReadyRef.current ||
      offRecordRef.current ||
      !workMapApprovedRef.current
    ) {
      return
    }
    const normalized = { ...frame, t: Number(elapsedSeconds().toFixed(2)) }
    setFrames((prev) => [normalized, ...prev].slice(0, 12))
    if (!normalized.dataUrl) return
    void fetch("/api/privacy/frames", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        session_id: getSessionId(),
        frame_id: normalized.id,
        t: normalized.t,
        data_url: normalized.dataUrl,
      }),
    })
      .then((response) => {
        if (!response.ok && response.status !== 409) {
          throw new Error("Frame storage failed")
        }
      })
      .catch(() => setSyncStatus("error"))
  }, [])

  const capture = useScreenCapture({ fps: 1, onFrame: handleFrame })

  const purgeWindow = React.useCallback(async (from: number, to: number) => {
    purgeEvents(from, to)
    const response = await fetch("/api/privacy/purge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session_id: getSessionId(), from, to }),
    })
    if (!response.ok) throw new Error("Privacy purge failed")
    const result = (await response.json()) as {
      events_removed?: number
      records_removed?: number
      frames_removed?: number
    }
    setPrivacyWindows((current) => [
      ...current,
      {
        from,
        to,
        eventsRemoved: Number(
          result.records_removed ?? result.events_removed ?? 0
        ),
        framesRemoved: Number(result.frames_removed ?? 0),
      },
    ])
  }, [])

  const setOffRecord = React.useCallback(
    (value: boolean) => {
      const now = Number(elapsedSeconds().toFixed(2))
      setPurgeStatus("purging")
      setPaused(true)
      setFrames([])

      if (value) {
        offRecordFromRef.current = now
        offRecordRef.current = true
        setOffRecordState(true)
        const bufferFrom = Math.max(0, now - 15)
        void purgeWindow(bufferFrom, now)
          .then(() => setPurgeStatus("purged"))
          .catch(() => setPurgeStatus("error"))
        return
      }

      const from = offRecordFromRef.current ?? now
      offRecordFromRef.current = null
      void purgeWindow(from, now)
        .then(() => {
          offRecordRef.current = false
          setOffRecordState(false)
          setPaused(false)
          setPurgeStatus("idle")
        })
        .catch(() => setPurgeStatus("error"))
    },
    [purgeWindow]
  )

  const setFramesNotStored = React.useCallback((value: boolean) => {
    framesNotStoredRef.current = value
    frameRetentionReadyRef.current = false
    setFramesNotStoredState(value)
    if (value) setFrames([])
    void fetch("/api/privacy/retention", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session_id: getSessionId(), retained: !value }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Frame retention update failed")
        const result = (await response.json()) as {
          store?: string
          audit_persisted?: boolean
        }
        if (result.store === "supabase" && result.audit_persisted === false) {
          throw new Error("Retention changed without its audit record")
        }
        frameRetentionReadyRef.current = !value
        setSyncStatus("ready")
      })
      .catch(() => setSyncStatus("error"))
  }, [])

  const replayMoment = React.useCallback(
    (stepId: number | null, ruleId?: string | null) => {
      setActiveReplay(stepId === null ? null : getExpertMoment(stepId, ruleId))
    },
    []
  )

  const blockCommit = React.useCallback(
    (reason: string, stepId: number, ruleId: string | null = null) => {
      setActiveBlock({ reason, stepId, ruleId })
      if (ruleId) updateMastery(ruleId, "missed")
    },
    [updateMastery]
  )

  const dismissBlock = React.useCallback(() => setActiveBlock(null), [])

  const setWorkMapApproved = React.useCallback((value: boolean) => {
    workMapApprovedRef.current = value
    setWorkMapApprovedState(value)
    if (!value) setActiveBlock(null)
    void patchTutorState({ action: "approval", approved: value }).catch(() =>
      setSyncStatus("error")
    )
  }, [])

  const interceptCommit = React.useCallback(
    (values: Record<string, string>): CommitEvaluation => {
      if (!workMapApprovedRef.current) {
        const blocked = {
          blocked: true,
          reason: "The expert has not approved this Work Map for tutor use.",
          stepId: 7,
          ruleId: "review-before-publish",
          passedRuleIds: [],
        }
        setActiveBlock({
          reason: blocked.reason,
          stepId: blocked.stepId,
          ruleId: blocked.ruleId,
        })
        return blocked
      }

      const result = evaluateCommit(values)
      if (result.blocked && result.stepId !== null) {
        blockCommit(
          result.reason ?? "Commit blocked.",
          result.stepId,
          result.ruleId
        )
      } else {
        setActiveBlock(null)
        for (const ruleId of result.passedRuleIds) updateMastery(ruleId, "hit")
      }
      return result
    },
    [blockCommit, updateMastery]
  )

  const openDoc = React.useCallback((id: string) => {
    const doc = getVdrDoc(id)
    if (!doc) return
    setCurrentDocId(id)
    setViewedDocIds((prev) => new Set(prev).add(id))
    emitAppEvent({
      type: "doc_opened",
      object: `VDR / ${doc.path}`,
      salient_text: doc.body.slice(0, 3),
    })
  }, [])

  const getScreenState = React.useCallback((): ScreenState => {
    const doc = currentDocId ? getVdrDoc(currentDocId) : null
    const recent = getSnapshot().slice(-8)
    return {
      state_summary: doc
        ? `Viewing ${doc.title}; ${recent.length} recent app events.`
        : `No document open; ${recent.length} recent app events.`,
      recent_events: recent,
      current_doc: doc?.title ?? null,
      elapsed_s: Number(elapsedSeconds().toFixed(1)),
    }
  }, [currentDocId])

  const setManualStatus = React.useCallback(
    (lineId: string, status: ManualStatus | null) => {
      setManual((prev) => {
        const next = { ...prev }
        if (status === null) delete next[lineId]
        else next[lineId] = status
        return next
      })
    },
    []
  )

  const lineStatus = React.useCallback(
    (lineId: string): LineStatus => {
      const override = manual[lineId]
      if (override) return override
      const line = LBO_LINES.find((l) => l.id === lineId)
      if (line && line.sourceDocIds.every((id) => viewedDocIds.has(id))) {
        return "source_opened"
      }
      return "unverified"
    },
    [manual, viewedDocIds]
  )

  const value = React.useMemo<DealDeskContextValue>(
    () => ({
      interjection,
      setInterjection,
      viewedDocIds,
      lineStatus,
      setManualStatus,
      offRecord,
      setOffRecord,
      framesNotStored,
      setFramesNotStored,
      currentDocId,
      openDoc,
      frames,
      capture,
      mastery,
      updateMastery,
      activeBlock,
      blockCommit,
      activeReplay,
      replayMoment,
      dismissBlock,
      interceptCommit,
      workMapApproved,
      setWorkMapApproved,
      purgeStatus,
      privacyWindows,
      getScreenState,
      syncStatus,
    }),
    [
      interjection,
      viewedDocIds,
      lineStatus,
      setManualStatus,
      offRecord,
      setOffRecord,
      framesNotStored,
      setFramesNotStored,
      currentDocId,
      openDoc,
      frames,
      capture,
      mastery,
      updateMastery,
      activeBlock,
      blockCommit,
      activeReplay,
      replayMoment,
      dismissBlock,
      interceptCommit,
      workMapApproved,
      setWorkMapApproved,
      purgeStatus,
      privacyWindows,
      getScreenState,
      syncStatus,
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
  if (!context)
    throw new Error("useDealDesk must be used within a DealDeskProvider")
  return context
}
