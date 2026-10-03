import type { Metadata } from "next"

import { AppHeader } from "@/components/deal-desk/app-header"
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
      <div className="flex h-svh min-w-[1100px] flex-col overflow-hidden bg-background">
        <AppHeader />
        <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px_340px] divide-x divide-border">
          <section aria-label="Data room" className="min-h-0">
            <VdrViewer />
          </section>
          <section aria-label="LBO inputs" className="min-h-0">
            <LboInputSheet />
          </section>
          <aside aria-label="Apprentice" className="min-h-0">
            <SidePanel />
          </aside>
        </main>
      </div>
    </DealDeskProvider>
  )
}
