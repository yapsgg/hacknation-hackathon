# Local development handoff

This guide is the shortest safe path for another developer to run and change the project.

## 1. Install once

- Git
- Node.js 22.22 or newer (`node --version`)
- npm, included with Node.js

Clone the repository into its own project directory. Do not copy another project's `node_modules` or `.env` files into it.

```powershell
git clone https://github.com/yapsgg/hacknation-hackathon.git
cd hacknation-hackathon
git switch main
git pull --ff-only origin main
npm ci
```

`npm ci` installs exactly the versions in `package-lock.json`. Use it instead of `npm install` for a clean checkout.

## 2. Run without keys

```powershell
npm run dev -- --hostname 127.0.0.1
```

Then open:

- `http://localhost:3000/apprentice` — integrated hackathon demo
- `http://localhost:3000/deal-desk` — sandbox Deal Desk
- `http://localhost:3000` — project landing page

The synthetic demo works without `.env.local`. Missing services fall back to deterministic fixtures plus browser/in-process storage. That mode is for fictional demo data only.

For a production-like local check:

```powershell
npm run build
npm start -- --hostname 127.0.0.1 --port 3000
```

## 3. Optional service configuration

Only copy the environment template when testing integrations:

```powershell
Copy-Item .env.example .env.local
```

Fill only the services you are testing:

- Supabase: durable events, Work Maps, state, audit evidence, and private frame storage.
- ElevenLabs: live Interviewer and Tutor voice sessions.
- Vision provider: redacted server-side screen event extraction.
- Presidio: required before any real transcript or deal data is handled.

Keep `.env.local` out of Git. Do not paste service-role keys into issues, pull requests, logs, or chat.

## 4. Work without colliding with teammates

Start from current `main`, then make a narrowly named branch:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feature/short-description
```

Before opening a pull request:

```powershell
git fetch origin
git rebase origin/testing
npm test
npm run validate:fixtures
npm run lint
npm run typecheck
npm run build
```

Open the feature pull request into `testing`. Promote `testing` to `main` only after CI and a browser smoke test pass. Never force-push a shared branch or commit another developer's `.env.local`, `.next`, or `node_modules` files.

## 5. Demo path

1. Open `/apprentice`.
2. For the fastest offline fallback, choose **Load finished session**; this deliberately uses the pre-baked seed.
3. To exercise the compiler, open Map → Debrief, choose **Use the recorded session**, answer all three gaps, and confirm or correct every teach-back line.
4. Confirm the teach-back. The app compiles and stores a session Work Map.
5. Open Work Map and verify that it reports 14 captured events plus the correction count.
6. Open Teach and run the seeded customer-contract and capex cases.
7. Verify an unsafe input is blocked with the expert's approved reasoning.

## 6. Current external blockers

The code can be built and tested without credentials. These checks still need the service owner or demo laptop:

- Vercel project access/redeploy and judge-access configuration.
- A reachable Presidio Analyzer before real data.
- A real ElevenLabs microphone conversation.
- Chrome microphone, screen-share, and spoken “off the record” acceptance testing.
- Vision-model credentials and a privacy-reviewed live extraction run.

If port 3000 is already in use, run `npm run dev -- --hostname 127.0.0.1 --port 3001` and open `http://localhost:3001`.
