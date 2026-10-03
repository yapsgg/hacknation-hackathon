"use client"

import * as React from "react"
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  PencilLine,
  Play,
  Quote,
  ShieldAlert,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import workMapFixture from "@/fixtures/work-map.mock.json"
import type {
  GapStatus,
  StepStatus,
  WorkMap,
  WorkMapGap,
  WorkMapStep,
} from "@/lib/types"
import { cn } from "cn"

const WORK_MAP = workMapFixture as WorkMap

const GUARDRAIL_LABEL: Record<string, string> = {
  check: "Check",
  limit: "Limit",
  exception: "Exception",
  stop_and_ask: "Stop and ask",
  none: "Note",
}

const STATUS_ICON: Record<StepStatus, typeof Circle> = {
  confirmed: CheckCircle2,
  corrected: PencilLine,
  unresolved: Circle,
}

const STATUS_COLOR: Record<StepStatus, string> = {
  confirmed: "text-success",
  corrected: "text-info",
  unresolved: "text-muted-foreground",
}

function formatT(t: number) {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

export function DebriefView() {
  // The agent proposes; the senior decides. Start every step unresolved so the
  // review is an explicit act, not a pre-ticked box.
  const [status, setStatus] = React.useState<Record<number, StepStatus>>(() =>
    Object.fromEntries(WORK_MAP.steps.map((s) => [s.id, "unresolved"]))
  )
  const [notes, setNotes] = React.useState<Record<number, string>>({})
  const [correcting, setCorrecting] = React.useState(false)
  const [gaps, setGaps] = React.useState<Record<string, GapStatus>>(() =>
    Object.fromEntries((WORK_MAP.open_gaps ?? []).map((g) => [g.id, "open"]))
  )
  const [published, setPublished] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState(WORK_MAP.steps[0].id)

  const step = WORK_MAP.steps.find((s) => s.id === selectedId) as WorkMapStep
  const done = Object.values(status).filter((s) => s !== "unresolved").length
  const openGaps = (WORK_MAP.open_gaps ?? []).filter(
    (g) => gaps[g.id] === "open"
  )
  const ready = done === WORK_MAP.steps.length

  const resolve = (next: StepStatus) => {
    setStatus((prev) => ({ ...prev, [step.id]: next }))
    setCorrecting(false)
    setPublished(false)
    const idx = WORK_MAP.steps.findIndex((s) => s.id === step.id)
    const following = WORK_MAP.steps[idx + 1]
    if (following) setSelectedId(following.id)
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_320px] divide-x divide-border">
      <aside aria-label="Workflow steps" className="flex min-h-0 flex-col bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[13px] font-semibold">{WORK_MAP.workflow}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            What the Apprentice observed. Confirm each step or correct it.
          </p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-success transition-[width] duration-300"
              style={{ width: `${(done / WORK_MAP.steps.length) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">
            {done} of {WORK_MAP.steps.length} steps reviewed
          </p>
        </div>
        <ol className="min-h-0 flex-1 overflow-auto p-2">
          {WORK_MAP.steps.map((s) => {
            const Icon = STATUS_ICON[status[s.id]]
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(s.id)
                    setCorrecting(false)
                  }}
                  aria-current={selectedId === s.id}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted",
                    selectedId === s.id && "bg-muted"
                  )}
                >
                  <Icon
                    className={cn("mt-0.5 size-4 shrink-0", STATUS_COLOR[status[s.id]])}
                    aria-label={status[s.id]}
                  />
                  <span className="min-w-0">
                    <span className="block text-[11px] text-muted-foreground tabular-nums">
                      Step {s.id}
                      {s.judgment_call ? " · judgment call" : ""}
                    </span>
                    <span className="block text-[13px] leading-snug font-medium">
                      {s.title}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </aside>

      <section aria-label="Step detail" className="min-h-0 overflow-auto">
        <div className="mx-auto flex max-w-[640px] flex-col gap-5 px-8 py-7">
          <div>
            <p className="text-xs text-muted-foreground">
              Step {step.id} of {WORK_MAP.steps.length}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.015em]">
              {step.title}
            </h2>
          </div>

          {step.screen_moment ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
              <span className="flex size-8 items-center justify-center rounded-md bg-muted">
                <Play className="size-3.5" aria-hidden />
              </span>
              <div className="text-xs">
                <p className="font-medium">
                  Screen moment at {formatT(step.screen_moment.t)}
                </p>
                <p className="text-muted-foreground">
                  Frame {step.screen_moment.frame ?? "n/a"}. Playback is not
                  connected in this build.
                </p>
              </div>
            </div>
          ) : null}

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground">
              What you did
            </h3>
            <p className="mt-1 text-[15px] leading-relaxed">{step.decision}</p>
          </div>

          {step.reason_quote ? (
            <figure className="rounded-lg border-l-2 border-info bg-info-soft px-4 py-3">
              <Quote className="mb-1 size-3.5 text-info" aria-hidden />
              <blockquote className="text-[14px] leading-relaxed">
                {step.reason_quote.replace(/^"|"$/g, "")}
              </blockquote>
              {step.reason_t ? (
                <figcaption className="mt-1.5 text-[11px] text-muted-foreground">
                  Your words at {formatT(step.reason_t)} · agent transcript, not
                  verified
                </figcaption>
              ) : null}
            </figure>
          ) : null}

          {step.guardrails && step.guardrails.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground">
                Rule the tutor will teach from this step
              </h3>
              <ul className="mt-1.5 flex flex-col gap-2">
                {step.guardrails.map((g) => (
                  <li
                    key={g.rule}
                    className="flex gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5"
                  >
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                    <div>
                      <p className="text-[13px] leading-snug">{g.rule}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {GUARDRAIL_LABEL[g.type] ?? g.type}
                        {g.confidence != null
                          ? ` · agent confidence ${Math.round(g.confidence * 100)}%`
                          : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {status[step.id] === "corrected" && notes[step.id] ? (
            <div className="rounded-lg border border-info/30 bg-info-soft px-3 py-2.5 text-[13px]">
              <p className="text-[11px] font-medium text-info">Your correction</p>
              {notes[step.id]}
            </div>
          ) : null}

          {correcting ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="correction" className="text-xs font-semibold">
                What should the tutor say instead?
              </label>
              <Textarea
                id="correction"
                autoFocus
                rows={3}
                value={notes[step.id] ?? ""}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, [step.id]: e.target.value }))
                }
                placeholder="e.g. Only treat it as a replacement if the amendment says so in writing."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={(notes[step.id] ?? "").trim() === ""}
                  onClick={() => resolve("corrected")}
                >
                  Save correction
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCorrecting(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 border-t border-border pt-4">
              <Button onClick={() => resolve("confirmed")}>
                <CheckCircle2 className="size-4" />
                That is right
              </Button>
              <Button variant="outline" onClick={() => setCorrecting(true)}>
                <PencilLine className="size-4" />
                Correct this
              </Button>
            </div>
          )}
        </div>
      </section>

      <aside aria-label="Open questions" className="flex min-h-0 flex-col bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[13px] font-semibold">Open questions</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Things the agent could not infer from your session.
          </p>
        </div>
        <ul className="min-h-0 flex-1 overflow-auto p-3">
          {(WORK_MAP.open_gaps ?? []).map((gap: WorkMapGap) => (
            <li
              key={gap.id}
              className="mb-2 rounded-lg border border-border px-3 py-2.5"
            >
              <p
                className={cn(
                  "flex items-center gap-1 text-[11px] font-medium",
                  gap.risk === "high" ? "text-destructive" : "text-warning"
                )}
              >
                <AlertCircle className="size-3" aria-hidden />
                {gap.risk === "high" ? "High risk" : "Medium risk"} · Step{" "}
                {gap.step_id}
              </p>
              <p
                className={cn(
                  "mt-1 text-[13px] leading-snug",
                  gaps[gap.id] !== "open" && "text-muted-foreground line-through"
                )}
              >
                {gap.question}
              </p>
              <div className="mt-2 flex gap-1.5">
                {gaps[gap.id] === "open" ? (
                  <>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setGaps((p) => ({ ...p, [gap.id]: "closed" }))}
                    >
                      Answered
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setGaps((p) => ({ ...p, [gap.id]: "waived" }))}
                    >
                      Waive
                    </Button>
                  </>
                ) : (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setGaps((p) => ({ ...p, [gap.id]: "open" }))}
                  >
                    Reopen ({gaps[gap.id]})
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t border-border p-3">
          <Button
            className="w-full"
            disabled={!ready || openGaps.length > 0}
            onClick={() => setPublished(true)}
          >
            Publish to tutor
          </Button>
          <p
            role="status"
            className={cn(
              "mt-2 text-center text-[11px] text-muted-foreground",
              published && "text-success"
            )}
          >
            {published
              ? "Marked ready. Saving the work map to the backend is not wired yet."
              : !ready
                ? `${WORK_MAP.steps.length - done} steps still to review.`
                : openGaps.length > 0
                  ? `${openGaps.length} open questions left. Answer or waive them.`
                  : "Ready to publish."}
          </p>
        </div>
      </aside>
    </div>
  )
}
