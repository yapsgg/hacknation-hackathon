# AI Apprentice — PE Diligence Edition

AI Apprentice captures a senior private-equity expert's reasoning during a diligence workflow, turns the evidence into a reviewable Work Map, and uses only expert-approved rules to coach a junior analyst before unsafe inputs are committed.

## Run the demo locally

Requirements: Git and Node.js 22.22 or newer.

```powershell
git clone https://github.com/yapsgg/hacknation-hackathon.git
cd hacknation-hackathon
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open [http://localhost:3000/apprentice](http://localhost:3000/apprentice) for the integrated Capture → Map → Teach demo, or [http://localhost:3000/deal-desk](http://localhost:3000/deal-desk) for the sandbox Deal Desk.

No API keys are required for the synthetic seeded demo. It uses deterministic fixtures and in-memory/browser persistence when Supabase, ElevenLabs, vision, and Presidio variables are absent. Never use real deal data in that fallback mode.

See [docs/LOCAL_DEVELOPMENT.md](./docs/LOCAL_DEVELOPMENT.md) for environment variables, validation commands, branch workflow, and troubleshooting.

See [docs/PRODUCTION_REALITY_AUDIT.md](./docs/PRODUCTION_REALITY_AUDIT.md) for the exact boundary between executable product behavior, synthetic fallbacks, and work still required before using sensitive data. The same report is available at `GET /api/system/readiness`.

## Validate a change

```powershell
npm test
npm run validate:fixtures
npm run lint
npm run typecheck
npm run build
npm run audit:prod
```

The authoritative implementation status is [TODO.md](./TODO.md), generated from [CHANGELOG.md](./CHANGELOG.md) with `npm run todo`.

## Safety

- Use only synthetic data unless Supabase and Presidio are configured and the live privacy acceptance checks have passed.
- Keep `.env.local` local. Never commit API keys or service-role credentials.
- Bind development servers to `127.0.0.1` unless the team has deliberately approved LAN access.
- Branch from the latest `main`, keep one feature per branch, and open a pull request into `testing` before promoting tested work to `main`.
