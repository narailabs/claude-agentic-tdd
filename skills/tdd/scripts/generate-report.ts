#!/usr/bin/env npx tsx
import { parseArgs } from "node:util";
import { UnitStatus } from "../../../src/types.js";
import { StateManager } from "../../../src/state.js";
import { generateReport } from "../../../src/report.js";

const { values } = parseArgs({
  options: {
    "working-dir": { type: "string" },
  },
  strict: true,
});

const workingDir = values["working-dir"];
if (!workingDir) {
  console.error("Error: --working-dir is required");
  process.exit(1);
}

const sm = new StateManager(workingDir);
const state = sm.loadExisting();

if (!state) {
  console.log(JSON.stringify({ error: "No state file found" }));
  process.exit(1);
}

const allPending = state.workUnits.every(
  (u) => u.status === UnitStatus.PENDING,
);
if (allPending) {
  console.log(
    JSON.stringify({ error: "All work units are still pending; nothing to report" }),
  );
  process.exit(1);
}

const report = generateReport(state, workingDir);

console.log(
  JSON.stringify({
    reportPath: `${workingDir}/tdd-report.md`,
    reportLength: report.length,
  }),
);
process.exit(0);
