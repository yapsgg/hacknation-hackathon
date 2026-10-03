import type { Metadata } from "next"

import { AppHeader } from "@/components/deal-desk/app-header"
import { DebriefView } from "@/components/deal-desk/debrief-view"

export const metadata: Metadata = {
  title: "Senior debrief — AI Apprentice",
  description: "Review and correct the workflow the Apprentice observed.",
}

export default function DebriefPage() {
  return (
    <div className="flex h-svh min-w-[1100px] flex-col overflow-hidden bg-background">
      <AppHeader />
      <DebriefView />
    </div>
  )
}
