"use client"

import { useEvents } from "@/hooks/use-events"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { CaptureEventType } from "@/lib/types"
import { cn } from "cn"

const TYPE_LABEL: Record<CaptureEventType, string> = {
  field_changed: "field",
  doc_opened: "doc",
  doc_scrolled: "scroll",
  value_entered: "value",
  save_clicked: "save",
  navigation: "nav",
}

const TYPE_STYLE: Record<CaptureEventType, string> = {
  field_changed: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  doc_opened: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  doc_scrolled: "bg-muted text-muted-foreground",
  value_entered: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  save_clicked: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  navigation: "bg-muted text-muted-foreground",
}

function formatValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "number") return value.toLocaleString("en-US")
  return value
}

export function EventFeed() {
  const events = useEvents()

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-3">
        {events.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">
            No events yet. Open a document or enter a value.
          </p>
        ) : (
          events
            .slice()
            .reverse()
            .map((event, index) => (
              <div
                key={`${event.t}-${index}`}
                className="rounded-lg border border-border/60 bg-card/40 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "inline-flex h-4 items-center rounded-full px-1.5 text-[10px] font-medium",
                      TYPE_STYLE[event.type]
                    )}
                  >
                    {TYPE_LABEL[event.type]}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {event.t.toFixed(1)}s
                  </span>
                </div>
                <p className="mt-1.5 truncate font-medium">{event.object}</p>
                {event.field && event.type !== "save_clicked" ? (
                  <p className="text-muted-foreground">
                    {event.field}: {formatValue(event.from)} →{" "}
                    <span className="text-foreground">
                      {formatValue(event.to)}
                    </span>
                  </p>
                ) : null}
                {event.salient_text && event.salient_text.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {event.salient_text.slice(0, 3).map((text) => (
                      <Badge
                        key={text}
                        variant="outline"
                        className="max-w-full truncate font-normal"
                      >
                        {text}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
        )}
      </div>
    </ScrollArea>
  )
}
