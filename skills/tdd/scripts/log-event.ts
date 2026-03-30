#!/usr/bin/env npx tsx
import { parseArgs } from "node:util";
import { SessionLog } from "../../../src/sessionLog.js";

const { values } = parseArgs({
  options: {
    "working-dir": { type: "string" },
    event: { type: "string" },
    "unit-id": { type: "string" },
    "data-json": { type: "string" },
  },
  strict: true,
});

const workingDir = values["working-dir"];
const event = values.event;

if (!workingDir || !event) {
  console.error("Error: --working-dir and --event are required");
  process.exit(1);
}

const log = new SessionLog(workingDir);

const data = values["data-json"]
  ? (JSON.parse(values["data-json"]) as Record<string, unknown>)
  : undefined;

log.append(event, values["unit-id"], data);

console.log(JSON.stringify({ logged: true, event }));
process.exit(0);
