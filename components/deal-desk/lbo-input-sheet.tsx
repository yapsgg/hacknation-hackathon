"use client"

import * as React from "react"
import {
  CheckCircle2,
  Circle,
  FileSearch,
  Flag,
  PauseCircle,
  Save,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDealDesk } from "@/components/deal-desk/session-provider"
import { emitAppEvent } from "@/lib/event-bus"
import {
  LBO_LINES,
  LINE_GROUPS,
  formatAmount,
  parseAmount,
  type LboLine,
  type LineStatus,
} from "@/lib/lbo"
import { evaluateTutorRules } from "@/lib/tutor-rules"
import { getVdrDoc } from "@/lib/vdr"
import { cn } from "cn"

const STATUS_META: Record<
  LineStatus,
  { label: string; icon: typeof Circle; className: string }
> = {
  unverified: {
    label: "Unverified",
    icon: Circle,
    className: "bg-muted text-muted-foreground",
  },
  source_opened: {
    label: "Source opened",
    icon: FileSearch,
    className: "bg-info-soft text-info",
  },
  flagged: {
    label: "Flagged for QoE",
    icon: Flag,
    className: "bg-warning-soft text-warning",
  },
  verified: {
    label: "Verified",
    icon: CheckCircle2,
    className: "bg-success-soft text-success",
  },
}

function StatusChip({ status }: { status: LineStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium",
        meta.className
      )}
    >
      <Icon className="size-3" aria-hidden />
      {meta.label}
    </span>
  )
}

export function LboInputSheet() {
  const {
    activeBlock,
    interceptCommit,
    interjection,
    setInterjection,
    viewedDocIds,
    lineStatus,
    setManualStatus,
    openDoc,
    currentDocId,
  } = useDealDesk()
  const [values, setValues] = React.useState<Record<string, string>>({})
  const committedRef = React.useRef<Record<string, number | null>>({})
  const [saved, setSaved] = React.useState(false)

  const numeric = (id: string) => parseAmount(values[id] ?? "")

  const commit = (line: LboLine) => {
    const next = numeric(line.id)
    if (next === null) return
    const previous = committedRef.current[line.id] ?? null
    if (previous === next) return

    emitAppEvent(
      previous === null
        ? {
            type: "value_entered",
            object: line.object,
            field: line.field,
            from: null,
            to: next,
            salient_text: [line.label, String(next)],
          }
        : {
            type: "field_changed",
            object: line.object,
            field: line.field,
            from: previous,
            to: next,
          }
    )
    committedRef.current[line.id] = next
    setSaved(false)
  }

  const onSave = () => {
    const interceptor = interceptCommit(values)
    const held = evaluateTutorRules({
      values: Object.fromEntries(LBO_LINES.map((l) => [l.id, numeric(l.id)])),
      viewedDocIds,
      lineStatus: Object.fromEntries(
        LBO_LINES.map((l) => [l.id, lineStatus(l.id)])
      ),
    })
    const blocked = interceptor.blocked || held !== null
    emitAppEvent({
      type: "save_clicked",
      object: "Deal Desk / Inputs",
      field: "Save",
      salient_text: [
        "Save inputs to model",
        blocked ? "blocked by tutor" : "allowed by tutor",
      ],
    })
    setInterjection(held)
    if (blocked) {
      setSaved(false)
      return
    }
    setSaved(true)
  }

  const groupTotal = (group: LboLine["group"]) =>
    LBO_LINES.filter((l) => l.group === group).reduce(
      (sum, l) => sum + (numeric(l.id) ?? 0),
      0
    )

  const resolved = LBO_LINES.filter((l) => {
    const s = lineStatus(l.id)
    return s === "verified" || s === "flagged"
  }).length

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-[13px] font-semibold">LBO inputs</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {resolved} of {LBO_LINES.length} resolved
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {LINE_GROUPS.map((group) => {
          const lines = LBO_LINES.filter((l) => l.group === group.id)
          const total = groupTotal(group.id)
          return (
            <section key={group.id} aria-label={group.label}>
              <div className="sticky top-0 z-10 flex items-baseline justify-between border-b border-border bg-muted/80 px-4 py-1.5 backdrop-blur">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-xs font-semibold">{group.label}</h3>
                  <span className="text-[11px] text-muted-foreground">
                    {group.hint}
                  </span>
                </div>
                {group.id !== "capex" ? (
                  <span className="text-xs font-medium tabular-nums">
                    {formatAmount(total, "USD")}
                  </span>
                ) : null}
              </div>

              <ul className="divide-y divide-border">
                {lines.map((line) => {
                  const status = lineStatus(line.id)
                  const held = interjection?.lineId === line.id
                  return (
                    <li
                      key={line.id}
                      className={cn(
                        "flex flex-col gap-2 px-4 py-3 transition-colors",
                        held && "bg-warning-soft/60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <label
                            htmlFor={line.id}
                            className="block truncate text-[13px] font-medium"
                          >
                            {line.label}
                          </label>
                          <p className="text-[11px] text-muted-foreground">
                            Management: {line.managementClaim}
                          </p>
                        </div>
                        <StatusChip status={status} />
                      </div>

                      <div className="relative">
                        <Input
                          id={line.id}
                          inputMode="decimal"
                          placeholder="Your figure"
                          value={values[line.id] ?? ""}
                          onChange={(e) =>
                            setValues((prev) => ({
                              ...prev,
                              [line.id]: e.target.value,
                            }))
                          }
                          onBlur={() => commit(line)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              commit(line)
                              e.currentTarget.blur()
                            }
                          }}
                          className="pr-12 tabular-nums"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-medium text-muted-foreground">
                          {line.suffix}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {line.sourceDocIds.map((docId) => {
                          const doc = getVdrDoc(docId)
                          if (!doc) return null
                          const opened = viewedDocIds.has(docId)
                          return (
                            <button
                              key={docId}
                              type="button"
                              onClick={() => openDoc(docId)}
                              aria-current={currentDocId === docId}
                              className={cn(
                                "inline-flex h-6 max-w-[150px] items-center gap-1 rounded-md border border-border px-1.5 text-[11px] transition-colors hover:bg-muted active:scale-[0.97]",
                                opened && "border-info/30 text-info"
                              )}
                            >
                              <FileSearch
                                className="size-3 shrink-0"
                                aria-hidden
                              />
                              <span className="truncate">
                                {doc.path.split(" / ").pop()}
                              </span>
                            </button>
                          )
                        })}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={status === "unverified"}
                          title={
                            status === "unverified"
                              ? "Open the source document first"
                              : undefined
                          }
                          onClick={() =>
                            setManualStatus(
                              line.id,
                              status === "verified" ? null : "verified"
                            )
                          }
                        >
                          {status === "verified" ? "Undo" : "Verify"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() =>
                            setManualStatus(
                              line.id,
                              status === "flagged" ? null : "flagged"
                            )
                          }
                        >
                          {status === "flagged" ? "Unflag" : "Flag for QoE"}
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      <div className="border-t border-border p-3">
        <Button className="w-full" onClick={onSave}>
          {interjection || activeBlock ? (
            <PauseCircle className="size-4" />
          ) : (
            <Save className="size-4" />
          )}
          Save inputs to model
        </Button>
        <p
          role="status"
          className={cn(
            "mt-2 text-center text-[11px] text-muted-foreground",
            saved && "text-success",
            interjection && "text-warning"
          )}
        >
          {activeBlock
            ? activeBlock.reason
            : interjection
              ? "Held for review. See the Apprentice panel."
              : saved
                ? "Inputs saved to model."
                : "Open each source before you verify a line."}
        </p>
      </div>
    </div>
  )
}
