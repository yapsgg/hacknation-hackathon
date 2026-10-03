import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Browser client: anon key, read-only (RLS). Returns null when env is missing so
// the app keeps working off the in-memory event bus.
let cached: SupabaseClient | null | undefined

export function getSupabaseBrowser(): SupabaseClient | null {
  if (cached !== undefined) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  cached = url && key ? createClient(url, key) : null
  return cached
}
