#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
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

// Gate: if project has frontend units, qa-test-plan.md must exist
const hasFrontend = state.workUnits.some(
  (u) => (u as { wave?: string }).wave === "frontend" || (u as { wave?: string }).wave === "fullstack",
);

if (hasFrontend) {
  const qaPlanPath = path.resolve(workingDir, "qa-test-plan.md");
  if (!fs.existsSync(qaPlanPath)) {
    console.log(
      JSON.stringify({
        error: "BLOCKED: Project has frontend units but qa-test-plan.md is missing. Run Phase 5b first — generate the QA test plan and run E2E tests before generating the report.",
        fix: "Go back and run Phase 5b: write qa-test-plan.md, then run E2E tests via Chrome if available.",
      }),
    );
    process.exit(1);
  }
}

const report = generateReport(state, workingDir);

console.log(
  JSON.stringify({
    reportPath: `${workingDir}/tdd-report.md`,
    reportLength: report.length,
  }),
);
process.exit(0);
