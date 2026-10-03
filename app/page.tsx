import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "cn"

export default function Page() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-lg flex-col gap-4">
        <span className="text-xs font-medium text-muted-foreground">
          AI Apprentice — PE Diligence Edition
        </span>
        <h1 className="font-heading text-2xl font-semibold">
          Capture the senior partner. Teach the junior.
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          An AI tutor that watches a PE expert scrub seller EBITDA/ARR, maps
          their reasoning, then coaches a new hire by catching mistakes before
          they are saved.
        </p>
        <div>
          <Link
            href="/deal-desk"
            className={cn(buttonVariants({ size: "lg" }), "w-fit")}
          >
            Open the Deal Desk
          </Link>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          Sandbox VDR · LBO input sheet · live capture event feed
        </p>
      </div>
    </div>
  )
}
