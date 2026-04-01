import * as fs from "node:fs";
import * as path from "node:path";
import {
  type TDDState,
  type WorkUnit,
  UnitStatus,
  UnitType,
  EntryMode,
} from "./types.js";

// ── Helpers ────────────────────────────────────────────────────────────

function statusEmoji(status: UnitStatus): string {
  switch (status) {
    case UnitStatus.COMPLETED:
      return "\u2705";
    case UnitStatus.FAILED:
      return "\u274C";
    default:
      return "\u23F3";
  }
}

function statusLabel(status: UnitStatus): string {
  switch (status) {
    case UnitStatus.PENDING:
      return "Pending";
    case UnitStatus.TEST_WRITING:
      return "Test Writing";
    case UnitStatus.RED_VERIFICATION:
      return "RED Verification";
    case UnitStatus.CODE_WRITING:
      return "Code Writing";
    case UnitStatus.GREEN_VERIFICATION:
      return "GREEN Verification";
    case UnitStatus.SPEC_REVIEW:
      return "Spec Review";
    case UnitStatus.ADVERSARIAL_REVIEW:
      return "Adversarial Review";
    case UnitStatus.CODE_QUALITY_REVIEW:
      return "Code Quality Review";
    case UnitStatus.COMPLETED:
      return "Completed";
    case UnitStatus.FAILED:
      return "Failed";
  }
}

function entryModeLabel(mode: EntryMode): string {
  switch (mode) {
    case EntryMode.NATURAL_LANGUAGE:
      return "natural-language-spec";
    case EntryMode.EXISTING_CODEBASE:
      return "existing-codebase";
    case EntryMode.USER_PROVIDED_TEST:
      return "user-provided-test";
    case EntryMode.PLAN_EXECUTION:
      return "plan-execution";
  }
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

function countTotalRetries(units: WorkUnit[]): number {
  let total = 0;
  for (const u of units) {
    total += Math.max(0, u.testWriterAttempts - 1);
    total += Math.max(0, u.codeWriterAttempts - 1);
  }
  return total;
}

function countAntiCheatViolations(units: WorkUnit[]): number {
  let count = 0;
  for (const u of units) {
    count += u.redVerification?.antiPatterns?.length ?? 0;
    count += u.greenVerification?.skipMarkersFound?.length ?? 0;
    if (u.greenVerification && !u.greenVerification.testFilesUnchanged) count++;
  }
  return count;
}

function countTotalTests(units: WorkUnit[]): number {
  return units.reduce(
    (sum, u) => sum + (u.redVerification?.failureCount ?? 0),
    0,
  );
}

function countTotalAssertions(units: WorkUnit[]): number {
  return units.reduce(
    (sum, u) => sum + (u.redVerification?.assertionCount ?? 0),
    0,
  );
}

// ── Unit Section ───────────────────────────────────────────────────────

function buildUnitSection(unit: WorkUnit): string {
  const lines: string[] = [];

  lines.push(
    `### ${unit.name} -- ${statusEmoji(unit.status)} ${statusLabel(unit.status)}`,
  );
  lines.push("");
  lines.push(`**Spec**: ${truncate(unit.specContract, 200)}`);
  lines.push("");
  lines.push("| Phase | Status | Attempts | Notes |");
  lines.push("|-------|--------|----------|-------|");

  if (unit.unitType === UnitType.CODE) {
    lines.push(
      `| Test Writer | ${unit.testWriterAttempts > 0 ? "done" : "pending"} | ${unit.testWriterAttempts} | |`,
    );
    lines.push(
      `| RED Verification | ${unit.redVerification?.status ?? "pending"} | -- | ${unit.redVerification?.failureCount ?? 0} failures, ${unit.redVerification?.assertionCount ?? 0} assertions |`,
    );
    lines.push(
      `| Code Writer | ${unit.codeWriterAttempts > 0 ? "done" : "pending"} | ${unit.codeWriterAttempts} | |`,
    );
    lines.push(
      `| GREEN Verification | ${unit.greenVerification?.status ?? "pending"} | -- | ${unit.greenVerification?.testsPassed ? "pass" : "fail"} |`,
    );
  }

  lines.push(
    `| Spec Compliance | ${unit.specCompliance?.status ?? "pending"} | -- | ${unit.specCompliance?.requirementsCovered ?? 0}/${unit.specCompliance?.requirementsTotal ?? 0} requirements covered |`,
  );

  if (unit.unitType === UnitType.CODE) {
    lines.push(
      `| Adversarial Review | ${unit.adversarial?.status ?? "pending"} | -- | ${unit.adversarial?.status === "passed" ? "pass" : "fail"} |`,
    );
  }

  lines.push(
    `| Code Quality | ${unit.codeQuality?.status ?? "pending"} | -- | ${unit.codeQuality?.issues?.length ?? 0} issues |`,
  );

  lines.push("");
  lines.push("**Files created**:");

  if (unit.testFiles.length > 0) {
    lines.push(`- Tests: ${unit.testFiles.join(", ")}`);
  }
  if (unit.implFiles.length > 0) {
    lines.push(`- Implementation: ${unit.implFiles.join(", ")}`);
  }

  // Reviewer findings
  const findings: string[] = [];
  if ((unit.adversarial?.findings?.length ?? 0) > 0) {
    findings.push(...unit.adversarial!.findings);
  }
  if ((unit.codeQuality?.issues?.length ?? 0) > 0) {
    findings.push(...unit.codeQuality!.issues);
  }
  if ((unit.specCompliance?.missingRequirements?.length ?? 0) > 0) {
    findings.push(
      ...unit.specCompliance!.missingRequirements.map((r) => `Missing: ${r}`),
    );
  }

  if (findings.length > 0) {
    lines.push("");
    lines.push("**Reviewer findings**:");
    for (const f of findings) {
      lines.push(`- ${f}`);
    }
  }

  lines.push("");
  lines.push("---");

  return lines.join("\n");
}

// ── Anti-Cheat Log ─────────────────────────────────────────────────────

function buildAntiCheatLog(units: WorkUnit[]): string {
  const rows: string[] = [];

  for (const u of units) {
    for (const ap of u.redVerification?.antiPatterns ?? []) {
      rows.push(`| ${u.id} | RED Verification | ${ap} | re-prompted |`);
    }
    for (const sm of u.greenVerification?.skipMarkersFound ?? []) {
      rows.push(`| ${u.id} | GREEN Verification | Skip marker: ${sm} | re-prompted |`);
    }
    if (u.greenVerification && !u.greenVerification.testFilesUnchanged) {
      rows.push(
        `| ${u.id} | GREEN Verification | Test files modified: ${u.greenVerification.changedFiles.join(", ")} | re-prompted |`,
      );
    }
  }

  if (rows.length === 0) {
    return "No anti-cheat violations detected.";
  }

  const lines = [
    "| Unit | Phase | Violation | Resolution |",
    "|------|-------|-----------|------------|",
    ...rows,
  ];

  return lines.join("\n");
}

// ── Spec Gaps ──────────────────────────────────────────────────────────

function buildSpecGaps(units: WorkUnit[]): string {
  const gaps: string[] = [];
  let gapNum = 1;

  for (const u of units) {
    for (const sc of u.specCompliance?.scopeCreep ?? []) {
      gaps.push(
        `| ${gapNum} | ${sc} | Spec Review / ${u.id} | Flagged as scope creep | Review spec for completeness |`,
      );
      gapNum++;
    }
    for (const mr of u.specCompliance?.missingRequirements ?? []) {
      gaps.push(
        `| ${gapNum} | ${mr} | Spec Review / ${u.id} | Not covered | Add to specification |`,
      );
      gapNum++;
    }
  }

  if (gaps.length === 0) {
    return "No spec gaps identified.";
  }

  const lines = [
    "| # | Gap | Where Found | Assumption Made | Recommendation |",
    "|---|-----|-------------|-----------------|----------------|",
    ...gaps,
  ];

  return lines.join("\n");
}

// ── Public API ─────────────────────────────────────────────────────────

export function generateReport(
  state: TDDState,
  workingDir: string,
): string {
  const completedCount = state.workUnits.filter(
    (u) => u.status === UnitStatus.COMPLETED,
  ).length;
  const totalCount = state.workUnits.length;
  const adversarialPassed = state.workUnits.filter(
    (u) => u.adversarial?.status === "passed",
  ).length;
  const adversarialTotal = state.workUnits.filter(
    (u) => u.unitType === UnitType.CODE,
  ).length;

  const lines: string[] = [];

  // Header
  lines.push("# TDD Session Report");
  lines.push("");
  lines.push(`**Date**: ${state.updatedAt}`);
  lines.push(`**Specification**: ${truncate(state.spec, 200)}`);
  lines.push(
    `**Framework**: ${state.framework?.language ?? "unknown"} / ${state.framework?.testRunner ?? "unknown"}`,
  );
  lines.push(`**Entry Point**: ${entryModeLabel(state.entryMode)}`);
  lines.push("");

  // Summary table
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Work units | ${completedCount}/${totalCount} |`);
  lines.push(`| Tests written | ${countTotalTests(state.workUnits)} |`);
  lines.push(`| Assertions | ${countTotalAssertions(state.workUnits)} |`);
  lines.push(
    `| Anti-cheat violations | ${countAntiCheatViolations(state.workUnits)} |`,
  );
  lines.push(
    `| Adversarial reviews | ${adversarialPassed}/${adversarialTotal} |`,
  );
  lines.push(`| Retries | ${countTotalRetries(state.workUnits)} |`);
  lines.push("");

  // Work Units
  lines.push("## Work Units");
  lines.push("");
  for (const unit of state.workUnits) {
    lines.push(buildUnitSection(unit));
    lines.push("");
  }

  // Anti-Cheat Log
  lines.push("## Anti-Cheat Log");
  lines.push("");
  lines.push(buildAntiCheatLog(state.workUnits));
  lines.push("");

  // Final Integration Check (placeholder filled by orchestrator)
  lines.push("## Final Integration Check");
  lines.push("");
  lines.push("[See Phase 5 output above]");
  lines.push("");

  // Spec Gaps
  lines.push("## Spec Gaps");
  lines.push("");
  lines.push(buildSpecGaps(state.workUnits));
  lines.push("");

  const report = lines.join("\n");

  // Write to disk
  const reportPath = path.join(workingDir, "tdd-report.md");
  fs.writeFileSync(reportPath, report, "utf-8");

  return report;
}
