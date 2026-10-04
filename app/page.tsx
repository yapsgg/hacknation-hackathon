import { redirect } from "next/navigation"

// The Apprentice app already opens on its landing page, so send the root there
// instead of a second, thinner landing. The Deal Desk sandbox stays at
// /deal-desk for the live voice-tutor demo.
export default function Page() {
  redirect("/apprentice")
}
