#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import { parseArgs } from "node:util";
import { StateManager } from "../../../src/state.js";
import { Verifier } from "../../../src/verification.js";
import { UnitStatus } from "../../../src/types.js";

const { values } = parseArgs({
  options: {
    "working-dir": { type: "string" },
  },
  strict: true,
});

const workingDir = values["working-dir"];

if (!workingDir) {
  console.log(JSON.stringify({ error: "Missing required argument: --working-dir" }));
  process.exit(1);
}

const mgr = new StateManager(workingDir);
const state = mgr.loadExisting();

if (state === null) {
  console.log(JSON.stringify({ error: "No state file found in working directory" }));
  process.exit(1);
}

const verifier = new Verifier(workingDir);
const violations: string[] = [];

for (const unit of state.workUnits) {
  const isCompleted = unit.status === UnitStatus.COMPLETED;

  // Check 1: Completed units must have test files and impl files that exist on disk
  if (isCompleted) {
    if (unit.testFiles.length > 0) {
      const testExistence = verifier.filesExist(unit.testFiles);
      if (!testExistence.allExist) {
        violations.push(
          `Unit "${unit.id}": missing test files on disk: ${testExistence.missing.join(", ")}`,
        );
      }
    }

    if (unit.implFiles.length > 0) {
      const implExistence = verifier.filesExist(unit.implFiles);
      if (!implExistence.allExist) {
        violations.push(
          `Unit "${unit.id}": missing impl files on disk: ${implExistence.missing.join(", ")}`,
        );
      }
    }
  }

  // Check 2: Units with GREEN passed must have checksums that still match RED checksums
  if (unit.greenVerification.status === "passed" && unit.redVerification.status === "passed") {
    const redChecksums = unit.redVerification.testFileChecksums;
    if (Object.keys(redChecksums).length > 0) {
      const checksumResult = verifier.verifyChecksumsUnchanged(
        redChecksums,
        Object.keys(redChecksums),
      );
      if (!checksumResult.allMatch) {
        violations.push(
          `Unit "${unit.id}": test file checksums changed since RED: ${checksumResult.changed.join(", ")}`,
        );
      }
    }
  }

  // Check 3: No unit should be COMPLETED without both RED and GREEN data
  if (isCompleted) {
    if (unit.redVerification.status === "pending") {
      violations.push(
        `Unit "${unit.id}": marked COMPLETED but RED verification is still pending`,
      );
    }
    if (unit.greenVerification.status === "pending") {
      violations.push(
        `Unit "${unit.id}": marked COMPLETED but GREEN verification is still pending`,
      );
    }
  }
}

// Check 4: If any unit has wave "frontend" or "fullstack", qa-test-plan.md must exist
const hasFrontend = state.workUnits.some(
  (u) => (u as { wave?: string }).wave === "frontend" || (u as { wave?: string }).wave === "fullstack",
);

if (hasFrontend) {
  const qaPlanPath = path.resolve(workingDir, "qa-test-plan.md");
  if (!fs.existsSync(qaPlanPath)) {
    violations.push(
      "Project has frontend units but qa-test-plan.md is missing — Phase 5b was skipped",
    );
  }
}

const consistent = violations.length === 0;

console.log(JSON.stringify({ consistent, violations }));
process.exit(consistent ? 0 : 1);
