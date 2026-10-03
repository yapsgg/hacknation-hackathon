import type { Metadata } from "next"

import App from "@/components/apprentice/ai-apprentice"

export const metadata: Metadata = {
  title: "Apprentice — AI Apprentice",
  description:
    "Capture, debrief, work map, and coaching flow for the AI Apprentice.",
}

export default function ApprenticePage() {
  return <App />
}
