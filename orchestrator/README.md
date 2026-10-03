# Repository orchestrator

This is an approval-first orchestration layer for the AI Apprentice project.
It does not call a model or change files by itself yet. It creates a reconciled
work queue and a model-routed execution plan so the team can decide what to
delegate before an executable agent runner is added.

## Roles

- **Planner/reviewer (Sol/high)**: primary model. Owns decomposition, architecture,
  cross-file integration, security review, merge-conflict analysis, and final
  acceptance.
- **Implementer (Sol/medium)**: owns one bounded feature on one isolated
  branch/worktree and must run the checks listed in its task.
- **Fast worker (Luna/low)**: low-cost model for narrow documentation, fixture, test,
  formatting, and TODO updates.

The manager should remain responsible for the final plan and review. Specialists
should return artifacts and evidence, not independently publish or merge work.
This follows the manager-plus-specialists pattern in the official OpenAI Docs.

## Commands

From the repository root:

```powershell
npm run todo
node scripts/orchestrate.mjs --task "Connect the ElevenAgents tutor to the Phase 4 client tools"
```

`npm run todo` regenerates `TODO.md` from `CHANGELOG.md`. The generator removes
legacy unchecked items that are already satisfied by later Done sections and
keeps partial or credential-blocked work visible.

The orchestrator command is plan-only. It prints the selected role, model tier,
dependencies, approval gates, and validation steps. An executable Agents SDK
adapter should be added only after the team agrees on credentials, tool scope,
branch/worktree policy, and human approval points.

## Team operating rules

1. Start from `testing` and give every worker a short-lived branch or worktree.
2. Assign one owner per file group. Do not let two workers edit the same file.
3. Keep the manager/reviewer responsible for integration and conflict resolution.
4. Require tests and a diff summary before a worker is considered complete.
5. Keep external writes, secrets, migrations, pushes, PRs, merges, and deploys
   behind a human approval gate.
