# Production boundaries: implementation and activation

This is the credential handoff for the security and live-capture follow-up.
No secret values belong in this file or in Git.

## Implemented without credentials

| Boundary              | Implemented behavior                                                                                                                       | Default state        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| Session authorization | Signed, expiring, HttpOnly, SameSite session capability; session-scoped routes verify it and reject cross-origin mutations in enforce mode | `report`             |
| Rate limiting         | Bounded in-memory windows on capability issuance, voice signing, transcripts, frames, events, and vision                                   | active, one instance |
| Frame redaction       | Redaction-first server adapter; local Presidio image-redactor support; raw/redacted frame is not retained by the extraction route          | disabled             |
| Vision extraction     | Gemini image request with structured response schema, strict event validation, timeouts, and fail-closed errors                            | disabled             |
| Text redaction        | Local fallback plus timeout-protected Presidio Analyzer; configured Presidio failure blocks storage                                        | local fallback       |
| Realtime              | Session-filtered browser hook and migration that removes global anonymous reads and adds authenticated owner policies                      | disabled             |
| Acceptance            | Automated readiness, capability, redaction, retention, and purge checks; explicit manual media checklist                                   | available            |

The capability binds a browser request to a random session UUID and blocks
accidental cross-session use. Because the current claim endpoint does not prove
human identity, it is not a complete IDOR defense. `sensitive_data_ready`
intentionally remains false until Supabase Auth associates a signed-in user with
`sessions.owner_id`.

## Local activation order

1. Use Node 22.22 or newer and copy `.env.example` to `.env.local`.
2. Generate a random `APP_SESSION_SECRET` of at least 32 bytes. Keep
   `APP_SECURITY_MODE=report` for the first smoke test.
3. Start local Presidio:

   ```powershell
   docker compose -f services/presidio/compose.yml up -d
   ```

4. Configure `PRESIDIO_ANALYZER_URL`, `FRAME_REDACTION_MODE=presidio`, and
   `FRAME_REDACTION_URL` as shown in `services/presidio/README.md`.
5. Add `GOOGLE_VISION_API_KEY`, verify the model name, then set
   `NEXT_PUBLIC_ENABLE_VISION=true`.
6. Run the app and `npm run acceptance:local`. Complete the four printed manual
   microphone/screen-share/off-record checks.
7. Set `APP_SECURITY_MODE=enforce`, restart, and repeat acceptance.

## Supabase Auth and Realtime activation

Do not enable Realtime against migration `0001` alone: that migration contains
hackathon-wide anonymous read policies.

1. Configure a Supabase Auth provider and add the browser URL/anon key plus the
   server service-role key.
2. Update session creation to persist the signed-in user's id as
   `sessions.owner_id`.
3. Apply `0004_session_security.sql`; verify anonymous selects fail and two
   signed-in test users cannot read each other's rows.
4. Set `NEXT_PUBLIC_ENABLE_REALTIME=true`, restart, and verify reconnect and
   row filtering in two separate browser profiles.

The hook is deliberately gated until steps 1–3 exist. Enabling it earlier is
not a security shortcut.

## Still requires infrastructure or a human

- A hosted/private Presidio deployment for Vercel; localhost containers are for
  local testing only.
- A shared rate-limit store or hosting-platform limiter. The current limiter
  cannot coordinate separate serverless instances.
- Supabase Auth provider configuration and server-side owner assignment.
- Google vision credentials and a privacy-reviewed real-frame test.
- Human approval of microphone and screen-share browser permissions, followed
  by a spoken off-record acceptance run.
- A production redeploy by a Vercel-authorized repository member.
