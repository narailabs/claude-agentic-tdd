#!/usr/bin/env npx tsx
import { parseArgs } from "node:util";
import { StateManager } from "../../../src/state.js";
import {
  UnitStatus,
  type RedVerification,
  type GreenVerification,
  type SpecComplianceResult,
  type AdversarialResult,
  type CodeQualityResult,
} from "../../../src/types.js";

const UNIT_STATUS_MAP: Record<string, UnitStatus> = {
  PENDING: UnitStatus.PENDING,
  TEST_WRITING: UnitStatus.TEST_WRITING,
  RED_VERIFICATION: UnitStatus.RED_VERIFICATION,
  CODE_WRITING: UnitStatus.CODE_WRITING,
  GREEN_VERIFICATION: UnitStatus.GREEN_VERIFICATION,
  SPEC_REVIEW: UnitStatus.SPEC_REVIEW,
  ADVERSARIAL_REVIEW: UnitStatus.ADVERSARIAL_REVIEW,
  CODE_QUALITY_REVIEW: UnitStatus.CODE_QUALITY_REVIEW,
  COMPLETED: UnitStatus.COMPLETED,
  FAILED: UnitStatus.FAILED,
};

const { values } = parseArgs({
  options: {
    "working-dir": { type: "string" },
    "unit-id": { type: "string" },
    status: { type: "string" },
    "red-json": { type: "string" },
    "green-json": { type: "string" },
    "spec-compliance-json": { type: "string" },
    "adversarial-json": { type: "string" },
    "code-quality-json": { type: "string" },
    "test-files": { type: "string" },
    "impl-files": { type: "string" },
  },
  strict: true,
});

const workingDir = values["working-dir"];
const unitId = values["unit-id"];

if (!workingDir || !unitId) {
  console.log(
    JSON.stringify({ error: "Missing required arguments: --working-dir, --unit-id" }),
  );
  process.exit(1);
}

const mgr = new StateManager(workingDir);
const state = mgr.loadExisting();

if (state === null) {
  console.log(JSON.stringify({ error: "No state file found in working directory" }));
  process.exit(1);
}

const unit = state.workUnits.find((u) => u.id === unitId);

if (!unit) {
  console.log(JSON.stringify({ error: `Work unit not found: ${unitId}` }));
  process.exit(1);
}

// Apply updates
if (values.status !== undefined) {
  const mapped = UNIT_STATUS_MAP[values.status];
  if (mapped === undefined) {
    console.log(
      JSON.stringify({
        error: `Unknown status: ${values.status}. Expected one of: ${Object.keys(UNIT_STATUS_MAP).join(", ")}`,
      }),
    );
    process.exit(1);
  }
  unit.status = mapped;
}

if (values["red-json"] !== undefined) {
  unit.redVerification = JSON.parse(values["red-json"]) as RedVerification;
}

if (values["green-json"] !== undefined) {
  unit.greenVerification = JSON.parse(values["green-json"]) as GreenVerification;
}

if (values["spec-compliance-json"] !== undefined) {
  unit.specCompliance = JSON.parse(values["spec-compliance-json"]) as SpecComplianceResult;
}

if (values["adversarial-json"] !== undefined) {
  unit.adversarial = JSON.parse(values["adversarial-json"]) as AdversarialResult;
}

if (values["code-quality-json"] !== undefined) {
  unit.codeQuality = JSON.parse(values["code-quality-json"]) as CodeQualityResult;
}

if (values["test-files"] !== undefined) {
  unit.testFiles = values["test-files"].split(",").map((f) => f.trim());
}

if (values["impl-files"] !== undefined) {
  unit.implFiles = values["impl-files"].split(",").map((f) => f.trim());
}

mgr.save(state);

// Compute session-wide progress for context-independent guidance
const totalUnits = state.workUnits.length;
const completedUnits = state.workUnits.filter(
  (u) => u.status === UnitStatus.COMPLETED,
).length;
const failedUnits = state.workUnits.filter(
  (u) => u.status === UnitStatus.FAILED,
).length;
const allDone = completedUnits + failedUnits === totalUnits;
const hasFrontend = state.workUnits.some(
  (u) => (u as { wave?: string }).wave === "frontend" || (u as { wave?: string }).wave === "fullstack",
);

const output: Record<string, unknown> = {
  updated: true,
  unitId: unit.id,
  status: unit.status,
  updatedAt: state.updatedAt,
  progress: `${completedUnits}/${totalUnits} completed${failedUnits > 0 ? `, ${failedUnits} failed` : ""}`,
};

// When all units are done, emit next-phase guidance so the model knows
// what to do even if the original SKILL.md instructions were compacted
if (allDone) {
  if (hasFrontend) {
    output.allUnitsComplete = true;
    output.nextPhase = "Phase 5: Run full test suite, then Phase 5b: Generate qa-test-plan.md AND run E2E tests via Chrome (MANDATORY for frontend projects). Fix any bugs found before proceeding to Phase 6.";
  } else {
    output.allUnitsComplete = true;
    output.nextPhase = "Phase 5: Run full test suite and holistic spec review, then Phase 6: check-state.ts followed by generate-report.ts.";
  }
}

console.log(JSON.stringify(output));
process.exit(0);
