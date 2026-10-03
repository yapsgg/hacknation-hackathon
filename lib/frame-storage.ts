import type { SupabaseClient } from "@supabase/supabase-js"

const globalForFrameStorage = globalThis as unknown as {
  __dealDeskFramePaths?: Set<string>
  __dealDeskFrameRetention?: Map<string, boolean>
}

const memoryPaths = (globalForFrameStorage.__dealDeskFramePaths ??=
  new Set<string>())
const memoryRetention = (globalForFrameStorage.__dealDeskFrameRetention ??=
  new Map<string, boolean>())

function frameTime(path: string, sessionId: string): number | null {
  if (!path.startsWith(`${sessionId}/`)) return null
  const value = Number(path.slice(sessionId.length + 1).split("-")[0])
  return Number.isFinite(value) ? value : null
}

export function isMemoryFrameRetentionEnabled(sessionId: string): boolean {
  return memoryRetention.get(sessionId) === true
}

export function setMemoryFrameRetention(sessionId: string, retained: boolean) {
  memoryRetention.set(sessionId, retained)
}

export function rememberMemoryFrame(path: string) {
  memoryPaths.add(path)
}

export function purgeMemoryFrames(
  sessionId: string,
  from = 0,
  to = Number.POSITIVE_INFINITY
): number {
  let removed = 0
  for (const path of [...memoryPaths]) {
    const t = frameTime(path, sessionId)
    if (t !== null && t >= from && t <= to) {
      memoryPaths.delete(path)
      removed += 1
    }
  }
  return removed
}

export async function purgeSupabaseFrames(
  supabase: SupabaseClient,
  sessionId: string,
  from = 0,
  to = Number.POSITIVE_INFINITY
): Promise<number> {
  const bucket = process.env.SUPABASE_FRAMES_BUCKET?.trim() || "frames"
  const prefix = `${sessionId}/`
  const limit = 1000
  const paths: string[] = []

  for (let offset = 0; ; offset += limit) {
    const listed = await supabase.storage
      .from(bucket)
      .list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } })
    if (listed.error) throw new Error(listed.error.message)

    const items = listed.data ?? []
    for (const item of items) {
      const t = Number(item.name.split("-")[0])
      if (Number.isFinite(t) && t >= from && t <= to) {
        paths.push(`${prefix}${item.name}`)
      }
    }
    if (items.length < limit) break
  }

  for (let index = 0; index < paths.length; index += 1000) {
    const removed = await supabase.storage
      .from(bucket)
      .remove(paths.slice(index, index + 1000))
    if (removed.error) throw new Error(removed.error.message)
  }
  return paths.length
}
