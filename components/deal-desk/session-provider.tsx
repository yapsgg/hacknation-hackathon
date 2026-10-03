"use client"

import * as React from "react"

import { useScreenCapture, type CapturedFrame } from "@/hooks/use-screen-capture"
import {
  emitAppEvent,
  setPaused,
  startSession,
} from "@/lib/event-bus"
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
}

const DealDeskContext = React.createContext<DealDeskContextValue | null>(null)

export function DealDeskProvider({ children }: { children: React.ReactNode }) {
  const [offRecord, setOffRecordState] = React.useState(false)
  const [framesNotStored, setFramesNotStored] = React.useState(true)
  const [currentDocId, setCurrentDocId] = React.useState<string | null>(null)
  const [viewedDocIds, setViewedDocIds] = React.useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [manual, setManual] = React.useState<Record<string, ManualStatus>>({})
  const [interjection, setInterjection] = React.useState<Interjection | null>(
    null
  )
  const [frames, setFrames] = React.useState<CapturedFrame[]>([])

  React.useEffect(() => {
    startSession()
  }, [])

  const handleFrame = React.useCallback((frame: CapturedFrame) => {
    setFrames((prev) => [frame, ...prev].slice(0, 12))
  }, [])

  const capture = useScreenCapture({ fps: 1, onFrame: handleFrame })

  const setOffRecord = React.useCallback((value: boolean) => {
    setOffRecordState(value)
    setPaused(value)
    if (value) setFrames([])
  }, [])

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
    }),
    [
      interjection,
      viewedDocIds,
      lineStatus,
      setManualStatus,
      offRecord,
      setOffRecord,
      framesNotStored,
      currentDocId,
      openDoc,
      frames,
      capture,
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
