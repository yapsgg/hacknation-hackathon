"use client"

import { Check, CircleAlert, Play, ShieldCheck, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useDealDesk } from "@/components/deal-desk/session-provider"
import { TUTOR_RULES } from "@/lib/tutor"
import { cn } from "cn"

const statusLabel = {
  unseen: "unseen",
  hit: "hit",
  missed: "missed",
} as const

export function TutorPanel() {
  const {
    mastery,
    activeBlock,
    activeReplay,
    dismissBlock,
    replayMoment,
    workMapApproved,
    setWorkMapApproved,
  } = useDealDesk()

  return (
    <div className="border-b border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            Tutor / Teach mode
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Deterministic demo tutor using the expert-reviewed Work Map.
          </p>
        </div>
        <Badge variant={workMapApproved ? "default" : "destructive"}>
          {workMapApproved ? "approved" : "review needed"}
        </Badge>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5">
        <span className="text-[10px] text-muted-foreground">
          Tutor access requires expert approval.
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => setWorkMapApproved(!workMapApproved)}
        >
          {workMapApproved ? "Revoke" : "Approve"}
        </Button>
      </div>

      {activeBlock ? (
        <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5">
          <div className="flex items-start gap-2">
            <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-destructive">
                Commit blocked
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-destructive/90">
                {activeBlock.reason}
              </p>
              <div className="mt-2 flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => replayMoment(activeBlock.stepId, activeBlock.ruleId)}
                >
                  <Play className="size-3" />
                  Replay expert
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px]"
                  onClick={dismissBlock}
                >
                  <X className="size-3" />
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeReplay ? (
        <div className="mt-2 rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold">Expert moment: {activeReplay.title}</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5"
              onClick={() => replayMoment(null)}
            >
              <X className="size-3" />
            </Button>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            {activeReplay.decision}
          </p>
          <blockquote className="mt-1 border-l-2 border-blue-500/50 pl-2 text-[10px] italic text-muted-foreground">
            {activeReplay.reasonQuote}
          </blockquote>
          <p className="mt-1 font-mono text-[9px] text-muted-foreground">
            {activeReplay.frame} · clip {activeReplay.clip[0]}–{activeReplay.clip[1]}s
          </p>
        </div>
      ) : null}

      <div className="mt-2 space-y-1">
        {TUTOR_RULES.map((rule) => {
          const state = mastery[rule.id] ?? "unseen"
          return (
            <div
              key={rule.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background px-2 py-1.5"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                {state === "hit" ? (
                  <Check className="size-3 text-emerald-600" />
                ) : state === "missed" ? (
                  <CircleAlert className="size-3 text-destructive" />
                ) : (
                  <span className="size-3 rounded-full border border-muted-foreground/50" />
                )}
                <span className="truncate text-[10px]">{rule.title}</span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-[9px]",
                  state === "hit" && "border-emerald-500/40 text-emerald-600",
                  state === "missed" && "border-destructive/40 text-destructive"
                )}
              >
                {statusLabel[state]}
              </Badge>
            </div>
          )
        })}
      </div>
    </div>
  )
}
