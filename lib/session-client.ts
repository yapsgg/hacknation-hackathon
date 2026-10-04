"use client"

const claimed = new Set<string>()
const pending = new Map<string, Promise<void>>()

export async function ensureSessionCapability(
  sessionId: string
): Promise<void> {
  if (claimed.has(sessionId)) return
  const existing = pending.get(sessionId)
  if (existing) return existing

  const request = fetch("/api/security/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
    credentials: "same-origin",
  }).then(async (response) => {
    if (!response.ok) throw new Error("Session capability could not be issued")
    const body = (await response.json()) as { session_id?: string }
    if (body.session_id !== sessionId)
      throw new Error("Session capability mismatch")
    claimed.add(sessionId)
  })

  pending.set(sessionId, request)
  try {
    await request
  } finally {
    pending.delete(sessionId)
  }
}

export async function sessionFetch(
  sessionId: string,
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  await ensureSessionCapability(sessionId)
  const headers = new Headers(init?.headers)
  headers.set("x-session-id", sessionId)
  return fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  })
}
