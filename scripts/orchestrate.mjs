import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const config = JSON.parse(
  fs.readFileSync(path.join(root, "orchestrator", "roles.json"), "utf8")
)

const args = process.argv.slice(2)
const taskIndex = args.indexOf("--task")
const task = taskIndex >= 0 ? args[taskIndex + 1] : ""
if (!task) {
  console.error('Usage: node scripts/orchestrate.mjs --task "describe the work"')
  process.exit(1)
}

const text = task.toLowerCase()
const hasAny = (words) => words.some((word) => text.includes(word))
const complex = hasAny(config.routing.complexKeywords)
const small = hasAny(config.routing.smallKeywords)

const workerRole = complex ? "implementer" : small ? "fast-worker" : "implementer"
const plan = {
  mode: config.mode,
  task,
  sourceOfTruth: ["CHANGELOG.md", "TODO.md", "schemas/", "fixtures/"],
  routing: {
    planner: { role: "planner", ...config.roles.planner },
    worker: { role: workerRole, ...config.roles[workerRole] },
    reviewer: { role: "reviewer", ...config.roles.reviewer },
  },
  steps: [
    {
      owner: "planner",
      action: "Inspect TODO.md, current branch status, contracts, and affected files; write acceptance criteria and file ownership.",
    },
    {
      owner: workerRole,
      action: "Implement only the bounded task on an isolated branch/worktree; do not publish or change secrets.",
    },
    {
      owner: "reviewer",
      action: "Review the diff for correctness, privacy, conflicts, tests, and changelog/TODO updates.",
    },
  ],
  approvalGates: config.approvalGates,
  validation: ["npm run typecheck", "npm run lint", "npm run build"],
  execution: "plan-only: no model call, file edit, push, merge, or deployment performed",
}

console.log(JSON.stringify(plan, null, 2))
