"use client"

import { useSyncExternalStore } from "react"

import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/lib/event-bus"
import type { CaptureEvent } from "@/lib/types"

export function useEvents(): CaptureEvent[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
