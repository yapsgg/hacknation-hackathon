import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const changelogPath = path.join(root, "CHANGELOG.md")
const outputPath = path.join(root, "TODO.md")
const changelog = fs.readFileSync(changelogPath, "utf8")
const lines = changelog.split(/\r?\n/)

const completedHints = [
  "define shared schemas",
  "client tool contract",
  "mock event stream",
  "vdr viewer",
  "mini lbo input sheet",
  "save / commit button",
  "app event emitter",
  "side panel layout",
  "screen capture",
  "hello-world deploy",
  "block_commit(reason",
  "replay_moment(step_id",
  "mastery checklist",
  "teach cases seeded",
  "off-the-record",
  "frames not stored",
  "review before publish",
  "connect the tutor panel",
  "persist mastery, work map approval",
  "persist approved frame clips",
  "tutor agent",
  "presidio on transcripts",
]

const supersededHints = [
  "create the supabase project",
  "add the same env vars in vercel",
  "elevenagents api key + interviewer/tutor agent ids; vision-model key",
  "production must use supabase",
  "environment + accounts",
]

const normalized = (value) =>
  value
    .toLowerCase()
    .replace(/[`*_()[\]{}:,./]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const isAlreadyComplete = (value) => {
  const text = normalized(value)
  return completedHints.some((hint) => text.includes(normalized(hint)))
}

const isSuperseded = (value) => {
  const text = normalized(value)
  return supersededHints.some((hint) => text.includes(normalized(hint)))
}

const isBlocked = (value, section, subsection) => {
  const context = `${section} ${subsection}`
  return (
    /needs you|blocked on credentials/i.test(context) ||
    /credentials|\bkey\b|vision[- ]model choice|deployment protection|presidio|preview environment|live project|live supabase|deployed preview|rotate.*key|node 22/i.test(
      value
    )
  )
}

const completed = []
const open = []
const blockers = []
let section = ""
let subsection = ""
let inDoneSection = false

for (const line of lines) {
  if (line.startsWith("## ")) {
    section = line.replace(/^## /, "").trim()
    subsection = ""
    inDoneSection = false
  }
  if (line.startsWith("### ")) {
    subsection = line.replace(/^### /, "").trim()
    inDoneSection = /^Done(?: |$)/i.test(subsection)
  }

  const checkbox = line.match(/^- \[([ xX])\] (.+)$/)
  if (checkbox) {
    const text = checkbox[2].trim()
    if (isSuperseded(text)) continue
    const item = `${text} _(source: ${section} / ${subsection})_`
    if (checkbox[1].toLowerCase() === "x" || isAlreadyComplete(text)) {
      completed.push(item)
    } else if (/needs you|still open|known gaps|next steps|phase [0-9]|open risks/i.test(`${section} ${subsection}`)) {
      if (isBlocked(text, section, subsection)) {
        blockers.push(item)
      } else {
        open.push(item)
      }
    }
    continue
  }

  if (inDoneSection && /^- \*\*/.test(line)) {
    completed.push(`${line.replace(/^- /, "")} _(source: ${section} / ${subsection})_`)
  }
}

const unique = (items) => {
  const seen = new Set()
  const result = []
  for (const item of items) {
    const taskText = item.split(" _(source:")[0]
    let key = normalized(taskText)
    if (key.startsWith("lock the exact demo script") || key.startsWith("lock the demo script")) {
      key = "lock demo script"
    }
    if (key.includes("vercel deployment protection")) {
      key = "vercel deployment protection"
    }
    if (key.includes("presidio") && key.includes("analyzer")) {
      key = "configure presidio analyzer"
    }
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}
const completedItems = unique(completed)
const openItems = unique(open).filter((item) => !completedItems.includes(item))
const blockerItems = unique(blockers).filter((item) => !completedItems.includes(item))

const generated = `# AI Apprentice TODO\n\nGenerated from [CHANGELOG.md](./CHANGELOG.md) by npm run todo on ${new Date().toISOString().slice(0, 10)}.\n\nThe generator reconciles old unchecked checklist items against later Done sections. Treat this file as the team work queue; treat the changelog as the historical record.\n\n## Completed\n\n${completedItems.map((item) => `- [x] ${item}`).join("\n") || "- [x] No completed items detected."}\n\n## Open work\n\n${openItems.map((item) => `- [ ] ${item}`).join("\n") || "- [ ] No open work detected."}\n\n## Blocked or credential-dependent\n\n${blockerItems.map((item) => `- [ ] ${item}`).join("\n") || "- [ ] No blockers detected."}\n\n## Recommended execution order\n\n1. Resolve the Supabase, ElevenAgents, Presidio, Vercel, and Node 22 prerequisites.\n2. Connect the deterministic Phase 4 tutor tools to the real ElevenAgents tutor session.\n3. Persist mastery, Work Map approval, and review audit events.\n4. Complete the Phase 3 Map/Debrief handoff and browser Realtime path.\n5. Build the recorded fallback, production dry-runs, and final demo materials.\n6. Re-run npm run todo after every merged phase.\n\n## Orchestrator assignments\n\n- **Planner/reviewer — Sol/high:** architecture, integrations, security, conflict resolution, final review.\n- **Implementer — Sol/medium:** one bounded feature per branch/worktree.\n- **Fast worker — Luna/low:** docs, fixtures, TODO maintenance, formatting, and focused tests.\n- **Human approval required:** secrets, migrations, external writes, branch pushes, PRs, merges, and deploys.\n`

fs.writeFileSync(outputPath, generated)
console.log(`Generated ${path.relative(root, outputPath)}`)
console.log(`Completed: ${completedItems.length}; open: ${openItems.length}; blockers: ${blockerItems.length}`)
