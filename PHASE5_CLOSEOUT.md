# Phase 5 closeout

Phase 5 is code-complete when the automated suite passes. It is deployment-complete only after the live Supabase migration, hosted Presidio service, and browser acceptance run below succeed.

## Local setup

1. Install Node.js 22.22 or newer.
2. Copy `.env.example` to `.env.local`. Never commit `.env.local`.
3. For a synthetic-only local run, the privacy APIs intentionally use process memory and the conservative local redactor when Supabase and Presidio are unset.
4. Install and verify:

   ```powershell
   npm ci
   npm test
   npm run lint
   npm run typecheck
   npm run build
   npm run dev
   ```

5. Open `http://localhost:3000/deal-desk`.

## Required for real data

Configure these server-side values in Vercel Production and Preview:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_FRAMES_BUCKET` (normally `frames`)
- `PRESIDIO_ANALYZER_URL`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_TUTOR_AGENT_ID`

The vision-model key is not required to close Phase 5. It belongs to the Phase 2 capture pipeline.

Apply `supabase/migrations/0001_init.sql` and then `supabase/migrations/0002_phase_4_5.sql` to the target Supabase project. Run `npm run provision:agents` after the ElevenLabs values are present so the Tutor has the current client-tool contract.

The Deal Desk must show “Privacy services ready: Presidio redaction + Supabase persistence.” If it shows synthetic demo mode, do not enter real deal data.

## Live acceptance run

1. Open `/deal-desk` in Chrome on the demo laptop and allow microphone and screen sharing.
2. Confirm “Frames not retained” is on by default. Share the screen and verify changed frames are sampled but not stored.
3. Turn retention on, cause two visible changes, and verify two objects appear under the session prefix in the private `frames` bucket.
4. Turn “Frames not retained” back on. Verify those objects are deleted and a `frame_retention_changed` audit row records the removal count.
5. Start a Tutor conversation containing a test email and phone number. Verify only redacted text is present in `transcripts`; never use real PII for this test.
6. Say “off the record.” Verify capture pauses, the current segment greys out, and the latest 15-second buffer is removed from `events`, `transcripts`, and frame storage.
7. Resume, then verify a `privacy_windows` row and an `off_record_purged` audit row exist with matching counts.
8. Revoke Work Map approval. Verify the Tutor session ends and Save is blocked until an expert approves again.

## Known external blockers

- Vercel Deployment Protection must remain on until the team deliberately opens or bypasses it for judges.
- The live migration and storage deletion cannot be proven from a checkout without the team’s Supabase access.
- Presidio must be hosted separately and reachable from Vercel; the local fallback is for synthetic demos only.
- Voice and screen-share permissions require an interactive Chrome test on the actual demo laptop.

## Dependency note

`shadcn` is a build-time CLI and belongs in `devDependencies`. Any advisory reported only through that CLI is not in the deployed runtime bundle, but the team should still update it when a non-breaking patched release is available.
