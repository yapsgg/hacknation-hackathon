"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { cn } from "cn"

const MODES = [
  { href: "/deal-desk", label: "Analyst" },
  { href: "/deal-desk/debrief", label: "Senior debrief" },
]

export function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="AI Apprentice home"
          className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground"
        >
          A
        </Link>
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px]">
          <span className="text-muted-foreground">Deal desk</span>
          <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden />
          <span className="font-semibold">Project Falcon</span>
          <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden />
          <span className="text-muted-foreground">Seller EBITDA &amp; ARR scrub</span>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div
          role="tablist"
          aria-label="View"
          className="flex rounded-lg bg-muted p-0.5 text-xs font-medium"
        >
          {MODES.map((mode) => {
            const active = pathname === mode.href
            return (
              <Link
                key={mode.href}
                href={mode.href}
                role="tab"
                aria-selected={active}
                className={cn(
                  "rounded-md px-3 py-1 transition-colors",
                  active
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode.label}
              </Link>
            )
          })}
        </div>
        <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground">
          Demo data · fictional company
        </span>
      </div>
    </header>
  )
}
