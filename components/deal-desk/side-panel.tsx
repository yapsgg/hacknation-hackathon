"use client"

import * as React from "react"
import {
  EyeOff,
  FileSearch,
  MonitorPlay,
  ShieldCheck,
  Square,
  X,
} from "lucide-react"

import { EventFeed } from "@/components/deal-desk/event-feed"
import { useDealDesk } from "@/components/deal-desk/session-provider"
import { TutorPanel } from "@/components/deal-desk/tutor-panel"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { getVdrDoc } from "@/lib/vdr"
import { cn } from "cn"

function TutorCard() {
  const { interjection, setInterjection, openDoc, viewedDocIds } = useDealDesk()
  if (!interjection) return null

  return (
    <section
      aria-label="Tutor interruption"
      className="m-3 animate-in overflow-hidden rounded-xl border border-warning/30 bg-warning-soft shadow-sm duration-200 fade-in slide-in-from-top-1 motion-reduce:animate-none"
    >
      <div className="flex items-start justify-between gap-2 px-3.5 pt-3">
        <div>
          <p className="text-[11px] font-medium text-warning">
            Wait. Before you save.
          </p>
          <h3 className="mt-0.5 text-[13px] leading-snug font-semibold">
            {interjection.headline}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Dismiss"
          onClick={() => setInterjection(null)}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <ol className="mt-2 flex flex-col gap-2 px-3.5 text-[13px] leading-snug">
        {interjection.questions.map((question) => (
          <li key={question} className="flex gap-2">
            <span
              aria-hidden
              className="mt-[7px] size-1 shrink-0 rounded-full bg-warning"
            />
            {question}
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap gap-1.5 px-3.5">
        {interjection.docIds.map((id) => {
          const doc = getVdrDoc(id)
          if (!doc) return null
          return (
            <Button
              key={id}
              variant="outline"
              size="xs"
              className="bg-card"
              onClick={() => openDoc(id)}
            >
              <FileSearch className="size-3" />
              {doc.path.split(" / ").pop()}
              {viewedDocIds.has(id) ? " ✓" : ""}
            </Button>
          )
        })}
      </div>

      <p className="mt-3 border-t border-warning/20 bg-card/50 px-3.5 py-1.5 text-[11px] text-muted-foreground">
        {interjection.origin === "scripted"
          ? "Scripted source-check prompt · deterministic Tutor guardrails remain active"
          : "Agent reported · not verified"}
      </p>
    </section>
  )
}

export function SidePanel() {
  const [privacyStatus, setPrivacyStatus] = React.useState<{
    privacy_ready: boolean
    persistence: "memory" | "supabase"
    redaction: "local-fallback" | "presidio"
    missing: string[]
  } | null>(null)
  const {
    offRecord,
    setOffRecord,
    framesNotStored,
    setFramesNotStored,
    capture,
    purgeStatus,
    privacyWindows,
  } = useDealDesk()
  const capturing = capture.status === "active"

  React.useEffect(() => {
    void fetch("/api/privacy/status", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Privacy status unavailable")
        return response.json()
      })
      .then(setPrivacyStatus)
      .catch(() => setPrivacyStatus(null))
  }, [])

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-[13px] font-semibold">Apprentice</h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full",
              offRecord
                ? "bg-destructive"
                : capturing
                  ? "bg-success"
                  : "bg-muted-foreground/40"
            )}
          />
          {offRecord ? "Off the record" : capturing ? "Watching" : "Idle"}
        </span>
      </div>

      {privacyStatus && !privacyStatus.privacy_ready ? (
        <div className="border-b border-amber-300/40 bg-amber-100/60 px-4 py-2 text-[10px] text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          Synthetic demo mode: {privacyStatus.missing.join(" and ")} missing. Do
          not use real deal data.
        </div>
      ) : privacyStatus?.privacy_ready ? (
        <div className="border-b border-emerald-300/40 bg-emerald-100/50 px-4 py-1.5 text-[10px] text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100">
          Privacy services ready: Presidio redaction + Supabase persistence.
        </div>
      ) : null}

      <TutorCard />

      <div className="flex gap-2 border-b border-border px-4 py-3">
        {capturing ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={capture.stop}
          >
            <Square className="size-3.5" />
            Stop sharing
          </Button>
        ) : (
          <Button
            size="sm"
            className="flex-1"
            onClick={capture.start}
            disabled={capture.status === "requesting"}
          >
            <MonitorPlay className="size-3.5" />
            {capture.status === "requesting" ? "Requesting…" : "Share screen"}
          </Button>
        )}
        <Button
          variant={offRecord ? "destructive" : "outline"}
          size="sm"
          onClick={() => setOffRecord(!offRecord)}
        >
          <EyeOff className="size-3.5" />
          {offRecord ? "Resume" : "Off record"}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <p className="text-[10px] text-muted-foreground">
          {capture.frameCount} sampled · {capture.changedCount} changed
        </p>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            Do not retain frames
          </span>
          <Switch
            size="sm"
            checked={framesNotStored}
            onCheckedChange={setFramesNotStored}
          />
        </div>
      </div>

      {capture.error ? (
        <p className="border-b border-border px-4 py-2 text-[11px] text-destructive">
          {capture.error}
        </p>
      ) : null}

      {offRecord ? (
        <p className="border-b border-border bg-danger-soft px-4 py-2 text-[11px] text-destructive">
          Capture paused.{" "}
          {purgeStatus === "purging" ? "Purging this segment…" : null}
          {purgeStatus === "purged" ? "This segment was purged." : null}
          {purgeStatus === "error"
            ? "Purge needs a retry before publishing."
            : null}
          {purgeStatus === "idle"
            ? "This segment is redacted from the Work Map."
            : null}
        </p>
      ) : null}

      {privacyWindows.length > 0 ? (
        <div className="border-b border-border bg-muted/40 px-4 py-2">
          <p className="text-[10px] font-medium text-muted-foreground">
            Off-record Work Map segments
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {privacyWindows.slice(-3).map((window, index) => (
              <span
                key={`${window.from}-${window.to}-${index}`}
                className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground line-through"
                title={`${window.eventsRemoved} records and ${window.framesRemoved} frames removed`}
              >
                {window.from.toFixed(1)}–{window.to.toFixed(1)}s purged
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <TutorPanel />

      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h3 className="text-xs font-semibold">Activity</h3>
        <span className="font-mono text-[10px] text-muted-foreground">
          vision-primary / app-verify
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <EventFeed />
      </div>
    </div>
  )
}
