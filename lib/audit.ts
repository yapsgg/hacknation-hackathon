import type { SupabaseClient } from "@supabase/supabase-js"

export async function recordAudit(
  supabase: SupabaseClient,
  input: {
    sessionId?: string | null
    action: string
    actor?: string
    metadata?: Record<string, unknown>
  }
): Promise<boolean> {
  const { error } = await supabase.from("review_audit").insert({
    session_id: input.sessionId ?? null,
    action: input.action,
    actor: input.actor ?? "app",
    metadata: input.metadata ?? {},
  })
  return !error
}
