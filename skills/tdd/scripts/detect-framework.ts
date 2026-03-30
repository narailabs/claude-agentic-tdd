#!/usr/bin/env npx tsx
import { parseArgs } from "node:util";
import { detectFramework, detectEntryMode } from "../../../src/detection.js";

const { values } = parseArgs({
  options: {
    "working-dir": { type: "string" },
    spec: { type: "string" },
  },
  strict: true,
});

const workingDir = values["working-dir"];
if (!workingDir) {
  console.error("Error: --working-dir is required");
  process.exit(1);
}

const framework = await detectFramework(workingDir);
const entryMode = values.spec ? detectEntryMode(values.spec) : undefined;

const result: Record<string, unknown> = { framework };
if (entryMode !== undefined) {
  result.entryMode = entryMode;
}

console.log(JSON.stringify(result, null, 2));
process.exit(0);
