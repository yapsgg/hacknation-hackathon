# Claude Code handoff — AI Apprentice

Read this file before changing the repository. Also obey `AGENTS.md`, including the requirement to read the relevant Next.js 16 guide under `node_modules/next/dist/docs/` before editing Next.js code.

## Mission

AI Apprentice captures a senior private-equity expert's diligence reasoning, compiles it into a reviewable Work Map, and uses only expert-approved rules to coach a junior analyst before unsafe inputs are committed.

Repository: `https://github.com/yapsgg/hacknation-hackathon`

## Current verified state

- `main` is current at merge commit `876844487486cedce31c4e35f93a7c475eeaae4e`.
- PR #15 added the session-built Work Map and merged into `testing`.
- PR #16 promoted the same code to `main`.
- Main CI passed on Node 22.22: production audit, fixture schemas, 21 tests, lint, type-check, and production build.
- Browser acceptance passed for recorded capture → three gap answers → five expert confirmations → a compiled seven-step Work Map using 14 captured events.
- The clean continuation branch is `development/live-capture`, initially created directly from the verified main commit above.
- `/apprentice` is the integrated Capture → Map → Teach demonstration. Its voice button still uses browser speech.
- `/deal-desk` already contains the real `@elevenlabs/react` Tutor bridge, signed-session endpoint, client tools, mastery, Work Map approval, and off-record controls.

Before starting work, fetch and compare the remote branches. Do not assume the commit above is still current after another developer has pushed.

## Local setup

Use Node.js 22.22 or newer.

```powershell
git switch development/live-capture
git pull --ff-only origin development/live-capture
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open:

- `http://127.0.0.1:3000/apprentice`
- `http://127.0.0.1:3000/deal-desk`

The seeded demo needs no keys. Bind to `127.0.0.1`; do not expose the development server to the LAN by default.

## Local ElevenLabs testing

Vercel is not required. Next.js serves the signed-session endpoint locally and the browser connects from localhost directly to ElevenLabs.

1. Create an ElevenLabs API key in the ElevenLabs dashboard. Never paste it into chat, source files, shell history, issues, or pull requests.
2. Create the ignored environment file:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Set these values in `.env.local`:

   ```dotenv
   ELEVENLABS_API_KEY=your_private_key
   ELEVENLABS_INTERVIEWER_AGENT_ID=
   ELEVENLABS_TUTOR_AGENT_ID=
   NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
   ```

4. If this ElevenLabs account does not already contain the project's agents, provision them:

   ```powershell
   npm run provision:agents
   ```

   `scripts/provision-agents.mjs` creates or updates the client tools and the Interviewer/Tutor agents, then writes both agent IDs back to `.env.local`. It is idempotent by tool name and existing agent ID, but it mutates the ElevenLabs account. Review the prompt/tool definitions before running it against a shared account.

5. Restart `npm run dev` after changing `.env.local`.
6. Verify the server boundary without printing the returned signed URL:

   ```powershell
   $result = Invoke-RestMethod -Method POST -Uri http://127.0.0.1:3000/api/tutor/session
   $result.auth
   ```

   Expected result with a private agent and API key: `signed`.

7. Open `/deal-desk`, keep the Work Map approved, click **Start voice tutor**, and allow microphone access for localhost. End the session after a short synthetic-data test to conserve credits.

Important behavior:

- The API key stays server-side in `app/api/tutor/session/route.ts`.
- The browser receives only a temporary signed URL. ElevenLabs documents signed URLs as expiring after 15 minutes.
- `/deal-desk` is the currently working live Tutor surface.
- `/apprentice` does not yet start the live Interviewer or Tutor; its sidebar explicitly says browser speech is standing in for ElevenAgents.
- Use only synthetic data until Presidio and the live privacy acceptance checks are complete.

Official references:

- ElevenLabs React SDK: `https://elevenlabs.io/docs/eleven-agents/libraries/react`
- Agent authentication: `https://elevenlabs.io/docs/eleven-agents/customization/authentication`

## Vercel issue and allowed resolution

There is no legitimate code-level bypass for the current blocked deployment. Vercel is rejecting Git-triggered builds because the commit author is not authorized for the existing project/team. Vercel documents this as an identity/team-membership check.

Keep using the existing project only:

- Project: `agent`
- Team/scope: `abdibrokhims-projects`

Safe resolution options:

1. The existing Vercel owner deploys the latest `main` from the project dashboard.
2. The owner links their GitHub identity to Vercel and makes the commit author an allowed team member. Hobby-team restrictions may require the owner to perform deployments.
3. The authorized owner checks out current `main`, explicitly links the local directory to the existing `agent` project, verifies `.vercel/project.json`, and runs `vercel deploy --prod`.

Do not create another Vercel project. If the CLI asks to create a project instead of selecting the existing `agent` project, stop. Do not copy production environment values into a new scope.

Official references:

- Git deployment identity rules: `https://vercel.com/docs/git`
- Existing-project CLI deployment: `https://vercel.com/docs/projects/deploy-from-cli`

## Next implementation workload

Work in this order unless the human owner changes priorities:

1. Add a real Interviewer session endpoint parallel to `app/api/tutor/session/route.ts`.
2. Add an `@elevenlabs/react` Interviewer provider/controller to `/apprentice` Capture.
3. Register client handlers for `get_screen_state`, `log_question`, `mark_gap`, `start_debrief`, and `submit_teachback_result` against the existing APIs.
4. Feed real voice activity, interaction idle time, document-scroll state, and frame-change state into the existing deterministic Question Governor. The agent must remain silent unless the Governor grants a slot.
5. Send compact, non-interrupting screen context updates to the Interviewer; never send raw unredacted frames from the browser.
6. Add the privacy-safe server-side vision extractor and compare extracted events with ground-truth app events.
7. Add optional Supabase Realtime subscriptions for events, questions, and gaps while preserving the no-key fallback.
8. Run the Chrome microphone, screen-share, and spoken “off the record” acceptance flow.

Likely files:

- `components/apprentice/ai-apprentice.jsx`
- `app/api/interviewer/state/route.ts`
- new `app/api/interviewer/session/route.ts`
- `lib/question-governor.ts`
- `lib/apprentice-demo.ts`
- `scripts/provision-agents.mjs`
- `schemas/client-tools.md`
- `tests/phase23.test.ts`

Do not replace the Question Governor with model judgment. Do not let the agent ask a question solely because it detects silence.

## Git workflow

- Preserve other developers' work and inspect the remote before rebasing.
- Keep one bounded feature per branch/worktree.
- Feature PRs target `testing`.
- Promote `testing` to `main` only after CI and browser smoke testing.
- Never force-push a shared branch.
- Never commit `.env.local`, `.vercel`, `.next`, `node_modules`, API keys, signed URLs, microphone recordings, or real deal data.

Before opening a PR, run:

```powershell
npm test
npm run validate:fixtures
npm run lint
npm run typecheck
npm run build
npm run audit:prod
```

Treat `CHANGELOG.md` as the historical record and regenerate `TODO.md` with `npm run todo` after completing a phase.
