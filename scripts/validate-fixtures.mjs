import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));

async function readJson(relativePath) {
  const url = new URL(relativePath, import.meta.url);

  try {
    return JSON.parse(await readFile(url, "utf8"));
  } catch (error) {
    console.error(`Unable to read valid JSON from ${relativePath}: ${error.message}`);
    process.exitCode = 1;
    return null;
  }
}

function reportErrors(label, validate) {
  if (!validate.errors?.length) return;

  for (const error of validate.errors) {
    const location = error.instancePath || "/";
    console.error(`${label}${location}: ${error.message}`);
  }
}

const [eventSchema, workMapSchema, eventFixture, workMapFixture] = await Promise.all([
  readJson("../schemas/event.schema.json"),
  readJson("../schemas/work-map.schema.json"),
  readJson("../fixtures/events.mock.json"),
  readJson("../fixtures/work-map.mock.json"),
]);

if ([eventSchema, workMapSchema, eventFixture, workMapFixture].some((value) => value === null)) {
  process.exit(1);
}

const ajv = new Ajv2020({ allErrors: true, allowUnionTypes: true, strict: true });
addFormats(ajv);

let validateEvent;
let validateWorkMap;

try {
  validateEvent = ajv.compile(eventSchema);
  validateWorkMap = ajv.compile(workMapSchema);
} catch (error) {
  console.error(`Schema compilation failed: ${error.message}`);
  process.exit(1);
}

let valid = true;

if (!Array.isArray(eventFixture.events)) {
  console.error("fixtures/events.mock.json/events: must be an array");
  valid = false;
} else {
  eventFixture.events.forEach((event, index) => {
    if (!validateEvent(event)) {
      valid = false;
      reportErrors(`fixtures/events.mock.json/events/${index}`, validateEvent);
    }
  });

  for (let index = 1; index < eventFixture.events.length; index += 1) {
    if (eventFixture.events[index].t < eventFixture.events[index - 1].t) {
      console.error(
        `fixtures/events.mock.json/events/${index}/t: timestamps must be monotonic`,
      );
      valid = false;
    }
  }
}

if (!validateWorkMap(workMapFixture)) {
  valid = false;
  reportErrors("fixtures/work-map.mock.json", validateWorkMap);
}

const stepIds = workMapFixture.steps?.map((step) => step.id) ?? [];
if (new Set(stepIds).size !== stepIds.length) {
  console.error("fixtures/work-map.mock.json/steps: step ids must be unique");
  valid = false;
}

if (!valid) process.exit(1);

console.log(
  `Validated ${eventFixture.events.length} capture events and ${workMapFixture.steps.length} Work Map steps against the canonical schemas.`,
);
console.log(`Repository: ${repoRoot}`);
