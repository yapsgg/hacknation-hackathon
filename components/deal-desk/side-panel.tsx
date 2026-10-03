"use client"

import {
  EyeOff,
  Mic,
  MonitorPlay,
  ShieldCheck,
  Square,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { EventFeed } from "@/components/deal-desk/event-feed"
import { useDealDesk } from "@/components/deal-desk/session-provider"
import { cn } from "cn"

export function SidePanel() {
  const {
    offRecord,
    setOffRecord,
    framesNotStored,
    setFramesNotStored,
    frames,
    capture,
  } = useDealDesk()

  const capturing = capture.status === "active"

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Mic className="size-3.5" />
          Apprentice
        </div>
        <Badge
          variant={capturing && !offRecord ? "default" : "secondary"}
          className="font-normal"
        >
          {offRecord
            ? "off the record"
            : capturing
              ? "capturing"
              : "idle"}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="flex gap-2">
          {capturing ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={capture.stop}
            >
              <Square className="size-3.5" />
              Stop share
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
          <p className="text-[10px] text-destructive">{capture.error}</p>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            {capture.frameCount} frames sampled · {capture.changedCount} changed
            (frame-diff gate)
          </p>
        )}

        <div className="flex items-center justify-between rounded-lg border border-border/60 px-2.5 py-1.5">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-muted-foreground" />
            <span className="text-[11px]">Frames not retained</span>
          </div>
          <Switch
            size="sm"
            checked={framesNotStored}
            onCheckedChange={(checked) => setFramesNotStored(checked)}
          />
        </div>
      </div>

      {offRecord ? (
        <div className="border-b border-border bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
          Capture paused. This segment is purged and will appear as a redacted
          block in the Work Map.
        </div>
      ) : null}

      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">
          Live event feed
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          vision-primary / app-verify
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <EventFeed />
      </div>

      {frames.length > 0 && !offRecord ? (
        <div className="border-t border-border p-3">
          <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
            Changed frames
          </p>
          <div className="flex gap-1.5">
            {frames.slice(0, 4).map((frame) => (
              <span
                key={frame.id}
                className={cn(
                  "rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                )}
              >
                {frame.id}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
