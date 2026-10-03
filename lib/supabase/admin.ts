import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Server-only. Uses the service-role key, which bypasses RLS. Never import this
// from a client component.
let cached: SupabaseClient | null | undefined

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached !== undefined) return cached
  if (!isSupabaseConfigured()) {
    cached = null
    return cached
  }
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  return cached
}
