"use client"

import * as React from "react"

import { useScreenCapture, type CapturedFrame } from "@/hooks/use-screen-capture"
import {
  emitAppEvent,
  setPaused,
  startSession,
} from "@/lib/event-bus"
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
}

const DealDeskContext = React.createContext<DealDeskContextValue | null>(null)

export function DealDeskProvider({ children }: { children: React.ReactNode }) {
  const [offRecord, setOffRecordState] = React.useState(false)
  const [framesNotStored, setFramesNotStored] = React.useState(true)
  const [currentDocId, setCurrentDocId] = React.useState<string | null>(null)
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
    }),
    [
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
