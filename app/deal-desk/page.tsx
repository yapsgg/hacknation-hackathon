import type { Metadata } from "next"

import { DealDeskProvider } from "@/components/deal-desk/session-provider"
import { LboInputSheet } from "@/components/deal-desk/lbo-input-sheet"
import { SidePanel } from "@/components/deal-desk/side-panel"
import { VdrViewer } from "@/components/deal-desk/vdr-viewer"

export const metadata: Metadata = {
  title: "Deal Desk — AI Apprentice",
  description: "Sandbox PE deal desk with a mock VDR and LBO input sheet.",
}

export default function DealDeskPage() {
  return (
    <DealDeskProvider>
      <div className="flex h-svh flex-col overflow-hidden bg-background">
        <header className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Deal Desk</span>
            <span className="text-xs text-muted-foreground">
              Project Falcon — Seller EBITDA/ARR scrub
            </span>
          </div>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            synthetic data
          </span>
        </header>

        <main className="grid min-h-0 flex-1 grid-cols-[1fr_300px_340px] divide-x divide-border">
          <section className="min-h-0">
            <VdrViewer />
          </section>
          <section className="min-h-0">
            <LboInputSheet />
          </section>
          <aside className="min-h-0">
            <SidePanel />
          </aside>
        </main>
      </div>
    </DealDeskProvider>
  )
}
