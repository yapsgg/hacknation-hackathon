import type { Metadata } from "next"

import App from "@/components/apprentice/ai-apprentice"

export const metadata: Metadata = {
  title: "Redline — Partner-grade skepticism for every analyst",
  description:
    "Redline learns how a senior partner challenges management's numbers, then stops junior analysts before an unverified one reaches the model.",
}

export default function ApprenticePage() {
  return <App />
}
