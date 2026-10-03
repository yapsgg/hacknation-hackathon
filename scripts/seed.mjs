// Seeds the pre-baked Work Map into Supabase.
// Usage: npm run seed   (reads .env.local)
import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  )
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })
const data = JSON.parse(
  readFileSync(new URL("../fixtures/work-map.mock.json", import.meta.url), "utf8")
)

// Idempotent: replace any previous seed row.
const del = await supabase.from("work_maps").delete().eq("is_seed", true)
if (del.error) throw del.error

const ins = await supabase.from("work_maps").insert({
  session_id: null,
  data,
  confirmed_by_expert: data.confirmed_by_expert ?? false,
  correction_count: data.correction_count ?? 0,
  is_seed: true,
})
if (ins.error) throw ins.error

console.log(`Seeded work map "${data.workflow}" (${data.steps.length} steps).`)
