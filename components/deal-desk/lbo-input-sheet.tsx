"use client"

import * as React from "react"
import { Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { emitAppEvent } from "@/lib/event-bus"
import { useDealDesk } from "@/components/deal-desk/session-provider"
import { cn } from "cn"

interface InputField {
  id: string
  label: string
  object: string
  field: string
  suffix?: string
  placeholder: string
}

const FIELDS: InputField[] = [
  {
    id: "arr-acme",
    label: "ARR — Customer: Acme",
    object: "Customer: Acme",
    field: "ARR input",
    suffix: "USD",
    placeholder: "0",
  },
  {
    id: "arr-customer-3",
    label: "ARR — Customer 3",
    object: "Customer: Customer 3",
    field: "ARR input",
    suffix: "USD",
    placeholder: "0",
  },
  {
    id: "addback-relocation",
    label: "EBITDA add-back — Relocation",
    object: "Add-back: Relocation",
    field: "EBITDA add-back input",
    suffix: "USD",
    placeholder: "0",
  },
  {
    id: "addback-legal",
    label: "EBITDA add-back — Legal Fees",
    object: "Add-back: Legal Fees",
    field: "EBITDA add-back input",
    suffix: "USD",
    placeholder: "0",
  },
  {
    id: "capex-ratio",
    label: "Maintenance capex ratio",
    object: "LBO / Maintenance Capex",
    field: "Capex ratio input",
    suffix: "%",
    placeholder: "0.0",
  },
]

export function LboInputSheet() {
  const { interceptCommit } = useDealDesk()
  const [values, setValues] = React.useState<Record<string, string>>({})
  const committedRef = React.useRef<Record<string, number | null>>({})
  const [saveState, setSaveState] = React.useState<"idle" | "saved" | "blocked">(
    "idle"
  )
  const [blockReason, setBlockReason] = React.useState<string | null>(null)

  const commit = (input: InputField) => {
    const raw = values[input.id] ?? ""
    if (raw.trim() === "") return
    const numeric = Number(raw.replace(/,/g, ""))
    if (Number.isNaN(numeric)) return

    const previous = committedRef.current[input.id] ?? null
    if (previous === numeric) return

    if (previous === null) {
      emitAppEvent({
        type: "value_entered",
        object: input.object,
        field: input.field,
        from: null,
        to: numeric,
        salient_text: [input.label, String(numeric)],
      })
    } else {
      emitAppEvent({
        type: "field_changed",
        object: input.object,
        field: input.field,
        from: previous,
        to: numeric,
      })
    }
    committedRef.current[input.id] = numeric
    setSaveState("idle")
  }

  const onSave = () => {
    const interceptor = interceptCommit(values)
    emitAppEvent({
      type: "save_clicked",
      object: "Deal Desk / Inputs",
      field: "Save",
      salient_text: [
        "Save inputs to model",
        interceptor.blocked ? "blocked by tutor" : "allowed by tutor",
      ],
    })
    if (interceptor.blocked) {
      setSaveState("blocked")
      setBlockReason(interceptor.reason)
    } else {
      setSaveState("saved")
      setBlockReason(null)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
        LBO Input Sheet
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
        {FIELDS.map((input) => (
          <div key={input.id} className="flex flex-col gap-1.5">
            <Label htmlFor={input.id} className="text-xs">
              {input.label}
            </Label>
            <div className="relative">
              <Input
                id={input.id}
                inputMode="decimal"
                placeholder={input.placeholder}
                value={values[input.id] ?? ""}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    [input.id]: event.target.value,
                  }))
                }
                onBlur={() => commit(input)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commit(input)
                    event.currentTarget.blur()
                  }
                }}
                className="pr-12"
              />
              {input.suffix ? (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] font-medium text-muted-foreground">
                  {input.suffix}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-4">
        <Button className="w-full" onClick={onSave}>
          <Save className="size-4" />
          Save inputs to model
        </Button>
        <p
          className={cn(
            "mt-2 text-center text-[10px] text-muted-foreground",
            saveState === "saved" && "text-emerald-600 dark:text-emerald-400",
            saveState === "blocked" && "text-destructive"
          )}
        >
          {saveState === "saved"
            ? "Inputs saved. Tutor checks passed."
            : saveState === "blocked"
              ? (blockReason ?? "Commit blocked.")
              : "Tutor pre-commit checks are active."}
        </p>
      </div>
    </div>
  )
}
