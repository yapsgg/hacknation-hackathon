"use client"

import { EyeOff, FileSearch, MonitorPlay, Square, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EventFeed } from "@/components/deal-desk/event-feed"
import { useDealDesk } from "@/components/deal-desk/session-provider"
import { getVdrDoc } from "@/lib/vdr"
import { cn } from "cn"

function TutorCard() {
  const { interjection, setInterjection, openDoc, viewedDocIds } = useDealDesk()
  if (!interjection) return null

  return (
    <section
      aria-label="Tutor interruption"
      className="m-3 overflow-hidden rounded-xl border border-warning/30 bg-warning-soft shadow-sm animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none"
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
        {interjection.questions.map((q) => (
          <li key={q} className="flex gap-2">
            <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-warning" />
            {q}
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
          ? "Scripted demo rule. Live tutor not connected."
          : "Agent reported · not verified"}
      </p>
    </section>
  )
}

export function SidePanel() {
  const { offRecord, setOffRecord, capture } = useDealDesk()
  const capturing = capture.status === "active"

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

      <TutorCard />

      <div className="flex gap-2 border-b border-border px-4 py-3">
        {capturing ? (
          <Button variant="outline" size="sm" className="flex-1" onClick={capture.stop}>
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
      {capture.error ? (
        <p className="border-b border-border px-4 py-2 text-[11px] text-destructive">
          {capture.error}
        </p>
      ) : null}
      {offRecord ? (
        <p className="border-b border-border bg-danger-soft px-4 py-2 text-[11px] text-destructive">
          Capture paused. This segment is purged and shows as a redacted block
          in the work map.
        </p>
      ) : null}

      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <h3 className="text-xs font-semibold">Activity</h3>
        <span className="text-[11px] text-muted-foreground">
          Frames are not retained
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <EventFeed />
      </div>
    </div>
  )
}
