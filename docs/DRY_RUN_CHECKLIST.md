# Dry-run and deploy checklist

## Before each dry run

- [ ] `testing` (or the release branch) is green in CI and deployed to the
      **existing** Vercel `agent` project by an authorized member. Do not create
      another project.
- [ ] Deployment Protection is off or a judge-safe bypass exists; open the
      production URL in a private window to confirm.
- [ ] `GET /api/system/readiness` on production: note `sensitive_data_ready`
      (expected false) and that the Trust page says the same.
- [ ] Env on Vercel Production *and* Preview: Supabase trio, `SUPABASE_FRAMES_BUCKET`,
      ElevenLabs key + both agent ids. Vision vars only if a hosted redactor
      exists (otherwise leave vision off).
- [ ] Chrome on the demo laptop: microphone and screen-share permissions
      approved for the production origin; Voice preview audible.
- [ ] Synthetic data only on screen; the "Demo data · fictional deals" tag visible.

## Two full dry runs on the production URL

Follow `docs/DEMO_SCRIPT.md`, timed. For each run record: date, who, browser,
total time, anything that hesitated or failed.

- [ ] Run 1
- [ ] Run 2

## Fallbacks rehearsed once each

- [ ] No mic / no keys: recorded session (**Play demo session**, **Skip to end**).
- [ ] No network: `npm run dev` locally; the recorded flow needs no network.
- [ ] Broken Capture: **Overview > Load finished session**.

## Backup video

- [ ] Record the full flow once at 1080p with audio, store it somewhere that
      works offline (laptop + one cloud copy).

## Freeze and submit

- [ ] Production deploy freeze after the last dry run (no merges).
- [ ] Rotate the Supabase service-role key, the ElevenLabs key and the Gemini
      key after the event, and update local and Vercel env.
