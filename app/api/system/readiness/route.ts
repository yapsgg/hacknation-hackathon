import { NextResponse } from "next/server"

import { getSystemReadiness } from "@/lib/system-readiness"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET() {
  return NextResponse.json(getSystemReadiness(), {
    headers: { "cache-control": "no-store" },
  })
}
