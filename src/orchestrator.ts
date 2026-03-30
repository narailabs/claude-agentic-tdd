import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import {
  type TDDState,
  type TDDConfig,
  type WorkUnit,
  type ModelAssignment,
  EntryMode,
  UnitStatus,
  UnitType,
  Complexity,
  ModelTier,
  createDefaultState,
} from "./types.js";
import { StateManager } from "./state.js";
import { SessionLog } from "./sessionLog.js";
import { Verifier } from "./verification.js";
import { detectEntryMode, detectFramework } from "./detection.js";
import { decomposeSpec } from "./agents/decomposer.js";
import { runDesignGate } from "./agents/designGate.js";
import { dispatchTestWriter } from "./agents/testWriter.js";
import { dispatchCodeWriter } from "./agents/codeWriter.js";
import {
  dispatchSpecComplianceReview,
  dispatchAdversarialReview,
  dispatchCodeQualityReview,
  dispatchFinalSpecReview,
} from "./agents/reviewers.js";
import { dispatchImplementer } from "./agents/implementer.js";
import { generateReport } from "./report.js";

// ── Console formatting ────────────────────────────────────────────────

const GREEN_CHECK = "\x1b[32m\u2713\x1b[0m";
const RED_X = "\x1b[31m\u2717\x1b[0m";

function phaseHeader(num: number, name: string): void {
  console.log(`\n=== Phase ${num}: ${name} ===\n`);
}

function unitLog(unitId: string, message: string): void {
  console.log(`  [${unitId}] ${message}`);
}

// ── Readline helper ───────────────────────────────────────────────────

function createRl(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// ── Model assignment ──────────────────────────────────────────────────

function assignModelTier(
  strategy: TDDConfig["modelStrategy"],
  complexity: Complexity,
): ModelAssignment {
  if (strategy === "capable") {
    return {
      testWriter: ModelTier.OPUS,
      codeWriter: ModelTier.OPUS,
      reviewer: ModelTier.OPUS,
    };
  }

  if (strategy === "standard") {
    return {
      testWriter: ModelTier.SONNET,
      codeWriter: ModelTier.SONNET,
      reviewer: ModelTier.SONNET,
    };
  }

  // auto: scale by complexity
  switch (complexity) {
    case Complexity.ARCHITECTURE:
      return {
        testWriter: ModelTier.OPUS,
        codeWriter: ModelTier.OPUS,
        reviewer: ModelTier.OPUS,
      };
    case Complexity.STANDARD:
      return {
        testWriter: ModelTier.SONNET,
        codeWriter: ModelTier.SONNET,
        reviewer: ModelTier.SONNET,
      };
    case Complexity.MECHANICAL:
      return {
        testWriter: ModelTier.SONNET,
        codeWriter: ModelTier.SONNET,
        reviewer: ModelTier.SONNET,
      };
  }
}

// ── Orchestrator ──────────────────────────────────────────────────────

export interface OrchestratorOptions {
  resume?: boolean;
}

export class Orchestrator {
  private stateMgr: StateManager;
  private log: SessionLog;
  private verifier: Verifier;
  private state: TDDState;
  private resumeMode: boolean;

  constructor(
    spec: string,
    private config: TDDConfig,
    private workingDir: string,
    options?: OrchestratorOptions,
  ) {
    this.stateMgr = new StateManager(workingDir);
    this.log = new SessionLog(workingDir);
    this.verifier = new Verifier(workingDir);
    this.state = createDefaultState(spec, config);
    this.resumeMode = options?.resume ?? false;
  }

  async run(): Promise<boolean> {
    try {
      await this.phase0();
      await this.phase1();
      await this.phase2();
      await this.phase3();
      await this.phase4();
      await this.phase5();
      await this.phase6();
      await this.phase7();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n${RED_X} Orchestrator error: ${message}`);
      this.log.append("session.error", undefined, { error: message });
      this.stateMgr.save(this.state);
      return false;
    }
  }

  // ── Phase 0: Design Gate ────────────────────────────────────────────

  private async phase0(): Promise<void> {
    phaseHeader(0, "Design Gate");

    this.state.entryMode = detectEntryMode(this.state.spec);
    console.log(`  Entry mode: ${EntryMode[this.state.entryMode]}`);

    const shouldRunDesign = this.shouldRunDesignGate();
    if (!shouldRunDesign) {
      console.log(`  ${GREEN_CHECK} Design gate skipped`);
      return;
    }

    const designSummary = await runDesignGate(
      this.state.spec,
      this.config,
      this.workingDir,
    );

    if (designSummary === null) {
      console.log(`  Design gate returned no summary. Proceeding without.`);
    } else {
      this.state.designSummary = designSummary;
      console.log(`  ${GREEN_CHECK} Design summary captured`);
    }

    this.stateMgr.save(this.state);
  }

  private shouldRunDesignGate(): boolean {
    if (this.config.skipDesign) return false;
    if (this.config.forceDesign) return true;

    // Skip for user-provided test mode (spec is already concrete)
    if (this.state.entryMode === EntryMode.USER_PROVIDED_TEST) return false;

    // Default: run for natural language and plan execution, skip for existing codebase
    return (
      this.state.entryMode === EntryMode.NATURAL_LANGUAGE ||
      this.state.entryMode === EntryMode.PLAN_EXECUTION
    );
  }

  // ── Phase 1: Framework Detection ───────────────────────────────────

  private async phase1(): Promise<void> {
    phaseHeader(1, "Framework Detection");

    const framework = await detectFramework(this.workingDir);

    if (framework === null) {
      console.log(
        "  No test framework detected automatically.",
      );
      const rl = createRl();
      try {
        const testCommand = await ask(
          rl,
          "  Enter your test command (e.g. 'npx vitest run'): ",
        );
        this.state.framework = {
          language: "unknown",
          testRunner: "custom",
          testCommand: testCommand.trim(),
          testFilePattern: "**/*.test.*",
          sourceDir: "src/",
          testDir: "src/",
        };
      } finally {
        rl.close();
      }
    } else {
      this.state.framework = framework;
    }

    console.log(
      `  ${GREEN_CHECK} Framework: ${this.state.framework.language} / ${this.state.framework.testRunner}`,
    );
    console.log(`  Test command: ${this.state.framework.testCommand}`);

    this.stateMgr.save(this.state);
  }

  // ── Phase 2: Work Decomposition ────────────────────────────────────

  private async phase2(): Promise<void> {
    phaseHeader(2, "Work Decomposition");

    console.log("  Decomposing specification into work units...");

    const units = await decomposeSpec(
      this.state.spec,
      this.state.entryMode,
      this.state.framework,
      this.state.designSummary,
      this.config,
      this.workingDir,
    );

    // Assign model tiers
    for (const unit of units) {
      unit.modelAssignment = assignModelTier(
        this.config.modelStrategy,
        unit.complexity,
      );
    }

    this.state.workUnits = units;

    this.log.append("decomposition.complete", undefined, {
      units: units.map((u) => ({
        id: u.id,
        name: u.name,
        dependsOn: u.dependsOn,
      })),
    });

    // Present work plan
    console.log("\n  Work Plan:");
    console.log(
      "  " +
        "-".repeat(72),
    );
    console.log(
      `  ${"ID".padEnd(10)} ${"Name".padEnd(30)} ${"Type".padEnd(8)} ${"Complexity".padEnd(14)} ${"Deps"}`,
    );
    console.log(
      "  " +
        "-".repeat(72),
    );
    for (const u of units) {
      console.log(
        `  ${u.id.padEnd(10)} ${u.name.padEnd(30)} ${u.unitType.padEnd(8)} ${u.complexity.padEnd(14)} ${u.dependsOn.join(", ") || "none"}`,
      );
    }
    console.log(
      "  " +
        "-".repeat(72),
    );
    console.log(`  Total: ${units.length} work units`);
    console.log(
      `  Max parallel pairs: ${this.config.maxParallelPairs}`,
    );

    // User confirmation
    const rl = createRl();
    try {
      const choice = await ask(
        rl,
        "\n  Proceed? (confirm/modify/cancel): ",
      );
      const normalized = choice.trim().toLowerCase();

      if (normalized === "cancel" || normalized === "q") {
        throw new Error("User cancelled work plan.");
      }

      if (normalized === "modify" || normalized === "m") {
        console.log(
          "  Modification of work units is not yet supported. Proceeding with current plan.",
        );
      }

      this.log.append("user.confirmed", undefined, {
        unitCount: units.length,
      });
      console.log(`  ${GREEN_CHECK} Work plan confirmed`);
    } finally {
      rl.close();
    }

    this.stateMgr.save(this.state);
  }

  // ── Phase 3: State Initialization ──────────────────────────────────

  private async phase3(): Promise<void> {
    phaseHeader(3, "State Initialization");

    // Check for existing state (resume support)
    if (this.resumeMode && this.stateMgr.stateFileExists()) {
      const existing = this.stateMgr.loadExisting();
      if (existing !== null) {
        const completedIds = existing.workUnits
          .filter((u) => u.status === UnitStatus.COMPLETED)
          .map((u) => u.id);
        console.log(
          `  Resuming session. ${completedIds.length} units already completed.`,
        );

        // Merge: keep completed units from disk, reset others
        for (const unit of this.state.workUnits) {
          const existingUnit = existing.workUnits.find(
            (eu) => eu.id === unit.id,
          );
          if (existingUnit && existingUnit.status === UnitStatus.COMPLETED) {
            Object.assign(unit, existingUnit);
          }
        }

        this.log.append("session.resume", undefined, {
          completedUnits: completedIds.length,
          pendingUnits:
            this.state.workUnits.length - completedIds.length,
        });
      }
    } else {
      // Initialize fresh log
      this.log.initialize();
      this.log.append("session.start", undefined, {
        spec: this.state.spec,
        entryPoint: EntryMode[this.state.entryMode],
        framework: this.state.framework?.testRunner ?? "unknown",
      });
    }

    // Save state
    this.stateMgr.save(this.state);

    // Add state file and session log to .gitignore
    this.ensureGitignore();

    // ASSERT both files exist
    if (!this.stateMgr.stateFileExists()) {
      throw new Error(
        "State file was not created. Cannot proceed.",
      );
    }
    if (!this.log.logFileExists()) {
      throw new Error(
        "Session log file was not created. Cannot proceed.",
      );
    }

    console.log(`  ${GREEN_CHECK} State file: ${this.stateMgr.stateFilePath}`);
    console.log(`  ${GREEN_CHECK} Session log: ${this.log.logFilePath}`);
  }

  private ensureGitignore(): void {
    const gitignorePath = path.join(this.workingDir, ".gitignore");
    const entries = [".tdd-state.json", "tdd-session.jsonl", "tdd-report.md"];

    let content = "";
    if (fs.existsSync(gitignorePath)) {
      content = fs.readFileSync(gitignorePath, "utf-8");
    }

    const linesToAdd: string[] = [];
    for (const entry of entries) {
      if (!content.includes(entry)) {
        linesToAdd.push(entry);
      }
    }

    if (linesToAdd.length > 0) {
      const suffix =
        content.length > 0 && !content.endsWith("\n") ? "\n" : "";
      fs.appendFileSync(
        gitignorePath,
        suffix + linesToAdd.join("\n") + "\n",
        "utf-8",
      );
    }
  }

  // ── Phase 4: Agent Team Orchestration ──────────────────────────────

  private async phase4(): Promise<void> {
    phaseHeader(4, "Agent Team Orchestration");

    const maxConcurrent = this.state.config.maxParallelPairs;
    let running = 0;
    const completed = new Set<string>();
    const failed = new Set<string>();
    const promises = new Map<string, Promise<void>>();

    // Pre-seed completed from state (for resume)
    for (const u of this.state.workUnits) {
      if (u.status === UnitStatus.COMPLETED) {
        completed.add(u.id);
      }
    }

    const getReady = (): WorkUnit[] => {
      return this.state.workUnits.filter(
        (u) =>
          u.status === UnitStatus.PENDING &&
          !promises.has(u.id) &&
          u.dependsOn.every(
            (dep) => completed.has(dep) || failed.has(dep),
          ),
      );
    };

    const totalUnits = this.state.workUnits.length;

    while (completed.size + failed.size < totalUnits) {
      const ready = getReady();

      for (const unit of ready) {
        if (running >= maxConcurrent) break;
        running++;

        const p = this.runUnitPipeline(unit)
          .then(() => {
            completed.add(unit.id);
            running--;
          })
          .catch((err) => {
            const message =
              err instanceof Error ? err.message : String(err);
            unit.status = UnitStatus.FAILED;
            running--;

            if (this.config.skipFailed) {
              console.error(
                `  ${RED_X} Unit ${unit.id} failed (skipped): ${message}`,
              );
              failed.add(unit.id);
              this.log.append("unit.failed", unit.id, {
                reason: message,
              });
            } else {
              throw new Error(
                `Unit ${unit.id} failed: ${message}`,
              );
            }
          });

        promises.set(unit.id, p);
      }

      // Wait for at least one to complete
      if (promises.size > 0) {
        await Promise.race(promises.values());

        // Clean up resolved promises
        for (const [id] of promises) {
          if (completed.has(id) || failed.has(id)) {
            promises.delete(id);
          }
        }
      } else if (completed.size + failed.size < totalUnits) {
        // No promises in flight and not all done -- stuck on deps
        const stuck = this.state.workUnits.filter(
          (u) =>
            u.status === UnitStatus.PENDING && !promises.has(u.id),
        );
        if (stuck.length > 0) {
          const stuckIds = stuck.map((u) => u.id).join(", ");
          throw new Error(
            `Deadlock: units [${stuckIds}] are blocked on unresolvable dependencies.`,
          );
        }
        break;
      }

      this.stateMgr.save(this.state);
    }

    console.log(
      `\n  ${GREEN_CHECK} Phase 4 complete: ${completed.size} succeeded, ${failed.size} failed`,
    );
  }

  // ── Unit Pipeline ─────────────────────────────────────────────────

  private async runUnitPipeline(unit: WorkUnit): Promise<void> {
    if (unit.unitType === UnitType.TASK) {
      await this.runTaskPipeline(unit);
    } else {
      await this.runCodePipeline(unit);
    }
  }

  private async runCodePipeline(unit: WorkUnit): Promise<void> {
    const framework = this.state.framework!;
    const maxRetries = this.config.maxRetries;

    // Step 4a: Test Writer
    await this.step4a(unit, framework, maxRetries);

    // Step 4b: RED Verification
    await this.step4b(unit, framework, maxRetries);

    // Step 4c + 4d: Code Writer with GREEN Verification
    await this.step4cd(unit, framework, maxRetries);

    // Step 4e: Spec Compliance Review
    await this.step4e(unit, maxRetries);

    // Step 4f: Adversarial Review (CODE units only)
    await this.step4f(unit, maxRetries);

    // Step 4g: Code Quality Review
    await this.step4g(unit, maxRetries);

    // All reviews passed
    unit.status = UnitStatus.COMPLETED;
    this.stateMgr.save(this.state);
    this.log.append("unit.completed", unit.id);
    unitLog(unit.id, `${GREEN_CHECK} Completed`);
  }

  private async runTaskPipeline(unit: WorkUnit): Promise<void> {
    const maxRetries = this.config.maxRetries;

    unit.status = UnitStatus.CODE_WRITING;
    this.stateMgr.save(this.state);
    unitLog(unit.id, "Dispatching implementer...");

    const planContext = this.state.designSummary ?? this.state.spec;
    await dispatchImplementer(unit, planContext, this.config, this.workingDir);

    unitLog(unit.id, `${GREEN_CHECK} Implementer done`);

    // Spec compliance + code quality (skip adversarial for TASK units)
    await this.step4e(unit, maxRetries);
    await this.step4g(unit, maxRetries);

    unit.status = UnitStatus.COMPLETED;
    this.stateMgr.save(this.state);
    this.log.append("unit.completed", unit.id);
    unitLog(unit.id, `${GREEN_CHECK} Completed`);
  }

  // ── Step 4a: Test Writer ──────────────────────────────────────────

  private async step4a(
    unit: WorkUnit,
    framework: NonNullable<TDDState["framework"]>,
    maxRetries: number,
  ): Promise<void> {
    unit.status = UnitStatus.TEST_WRITING;
    this.stateMgr.save(this.state);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      unitLog(
        unit.id,
        `Step 4a: Test Writer (attempt ${attempt}/${maxRetries})`,
      );
      unit.testWriterAttempts = attempt;

      this.log.append("test-writer.spawned", unit.id, { attempt });

      await dispatchTestWriter(unit, framework, this.config, this.workingDir);

      // Verify test files exist on disk
      const fileCheck = this.verifier.filesExist(unit.testFiles);
      if (!fileCheck.allExist) {
        unitLog(
          unit.id,
          `${RED_X} Missing test files: ${fileCheck.missing.join(", ")}`,
        );
        this.log.append("test-writer.failed", unit.id, {
          error: "Missing test files",
          missing: fileCheck.missing,
          attempt,
        });
        if (attempt === maxRetries) {
          throw new Error(
            `Test Writer failed after ${maxRetries} attempts: missing files`,
          );
        }
        continue;
      }

      // Check spec-contract file exists
      const specContractPath = `spec-contract-${unit.id}.md`;
      const specCheck = this.verifier.filesExist([specContractPath]);
      // Also try in the test directory
      let specExists = specCheck.allExist;
      if (!specExists && unit.testFiles.length > 0) {
        const testDir = path.dirname(unit.testFiles[0]);
        const altPath = path.join(testDir, specContractPath);
        specExists = fs.existsSync(
          path.resolve(this.workingDir, altPath),
        );
      }

      if (!specExists) {
        unitLog(
          unit.id,
          `${RED_X} Missing spec-contract-${unit.id}.md`,
        );
        this.log.append("test-writer.failed", unit.id, {
          error: "Missing spec-contract file",
          attempt,
        });
        if (attempt === maxRetries) {
          throw new Error(
            `Test Writer failed after ${maxRetries} attempts: missing spec-contract`,
          );
        }
        continue;
      }

      this.log.append("test-writer.completed", unit.id, {
        testFiles: unit.testFiles,
      });
      unitLog(unit.id, `${GREEN_CHECK} Test Writer done`);
      break;
    }
  }

  // ── Step 4b: RED Verification ─────────────────────────────────────

  private async step4b(
    unit: WorkUnit,
    framework: NonNullable<TDDState["framework"]>,
    maxRetries: number,
  ): Promise<void> {
    unit.status = UnitStatus.RED_VERIFICATION;
    this.stateMgr.save(this.state);
    unitLog(unit.id, "Step 4b: RED Verification");

    this.log.append("red.verification.start", unit.id);

    const result = this.verifier.redVerification(
      unit.testFiles,
      framework.testCommand,
      framework.language,
      this.state.entryMode,
    );

    if (result === null) {
      this.log.append("red.verification.failed", unit.id, {
        reason: "Anti-cheat violation: tests did not fail correctly",
      });

      // Re-run test writer if RED fails
      unitLog(
        unit.id,
        `${RED_X} RED verification failed -- re-running test writer`,
      );
      this.log.append("anti-cheat.violation", unit.id, {
        phase: "RED Verification",
        violation: "Tests did not fail as expected",
        action: "re-prompted",
      });

      await this.step4a(unit, framework, maxRetries);

      // Retry RED verification after re-writing tests
      const retryResult = this.verifier.redVerification(
        unit.testFiles,
        framework.testCommand,
        framework.language,
        this.state.entryMode,
      );

      if (retryResult === null) {
        throw new Error(
          `RED verification failed for ${unit.id} even after test rewrite`,
        );
      }

      unit.redVerification = retryResult;
    } else {
      unit.redVerification = result;
    }

    this.log.append("red.verification.passed", unit.id, {
      failureCount: unit.redVerification.failureCount,
      assertionCount: unit.redVerification.assertionCount,
    });
    unitLog(
      unit.id,
      `${GREEN_CHECK} RED: ${unit.redVerification.failureCount} failures, ${unit.redVerification.assertionCount} assertions`,
    );
  }

  // ── Steps 4c + 4d: Code Writer + GREEN Verification ──────────────

  private async step4cd(
    unit: WorkUnit,
    framework: NonNullable<TDDState["framework"]>,
    maxRetries: number,
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Step 4c: Code Writer
      unit.status = UnitStatus.CODE_WRITING;
      this.stateMgr.save(this.state);
      unitLog(
        unit.id,
        `Step 4c: Code Writer (attempt ${attempt}/${maxRetries})`,
      );
      unit.codeWriterAttempts = attempt;

      this.log.append("code-writer.spawned", unit.id, { attempt });

      await dispatchCodeWriter(
        unit,
        framework,
        this.config,
        this.workingDir,
      );

      this.log.append("code-writer.completed", unit.id, {
        implFiles: unit.implFiles,
      });

      // Step 4d: GREEN Verification
      unit.status = UnitStatus.GREEN_VERIFICATION;
      this.stateMgr.save(this.state);
      unitLog(unit.id, "Step 4d: GREEN Verification");

      this.log.append("green.verification.start", unit.id);

      const greenResult = this.verifier.greenVerification(
        unit.testFiles,
        framework.testCommand,
        unit.redVerification.testFileChecksums,
      );

      unit.greenVerification = greenResult;

      if (
        greenResult.testsPassed &&
        greenResult.testFilesUnchanged
      ) {
        this.log.append("green.verification.passed", unit.id);
        unitLog(unit.id, `${GREEN_CHECK} GREEN: all tests pass`);
        break;
      }

      // GREEN failed
      const reasons: string[] = [];
      if (!greenResult.testsPassed) {
        reasons.push(`tests failed (exit ${greenResult.exitCode})`);
      }
      if (!greenResult.testFilesUnchanged) {
        reasons.push(
          `test files modified: ${greenResult.changedFiles.join(", ")}`,
        );
        this.log.append("anti-cheat.violation", unit.id, {
          phase: "GREEN Verification",
          violation: "Test files were modified by Code Writer",
          action: "re-prompted",
        });
      }
      if (greenResult.skipMarkersFound.length > 0) {
        reasons.push(
          `skip markers found: ${greenResult.skipMarkersFound.join(", ")}`,
        );
        this.log.append("anti-cheat.violation", unit.id, {
          phase: "GREEN Verification",
          violation: `Skip markers: ${greenResult.skipMarkersFound.join(", ")}`,
          action: "re-prompted",
        });
      }

      this.log.append("green.verification.failed", unit.id, {
        reason: reasons.join("; "),
      });
      unitLog(
        unit.id,
        `${RED_X} GREEN failed: ${reasons.join("; ")}`,
      );

      if (attempt === maxRetries) {
        throw new Error(
          `GREEN verification failed for ${unit.id} after ${maxRetries} attempts`,
        );
      }
    }
  }

  // ── Step 4e: Spec Compliance Review ───────────────────────────────

  private async step4e(
    unit: WorkUnit,
    maxRetries: number,
  ): Promise<void> {
    unit.status = UnitStatus.SPEC_REVIEW;
    this.stateMgr.save(this.state);
    unitLog(unit.id, "Step 4e: Spec Compliance Review");

    // Pre-check: verify spec-contract file exists on disk
    const specContractName = `spec-contract-${unit.id}.md`;
    const rootPath = path.resolve(this.workingDir, specContractName);
    let specExists = fs.existsSync(rootPath);
    if (!specExists && unit.testFiles.length > 0) {
      const testDir = path.dirname(
        path.resolve(this.workingDir, unit.testFiles[0]),
      );
      specExists = fs.existsSync(
        path.join(testDir, specContractName),
      );
    }
    if (!specExists) {
      unitLog(
        unit.id,
        `${RED_X} spec-contract file not found, using inline spec`,
      );
    }

    this.log.append("spec-review.spawned", unit.id);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await dispatchSpecComplianceReview(
        unit,
        this.state.designSummary,
        this.workingDir,
        this.config,
      );

      unit.specCompliance = result;

      if (result.status === "passed") {
        this.log.append("spec-review.compliant", unit.id, {
          requirementsCovered: result.requirementsCovered,
          total: result.requirementsTotal,
        });
        unitLog(
          unit.id,
          `${GREEN_CHECK} Spec compliant: ${result.requirementsCovered}/${result.requirementsTotal} requirements`,
        );
        return;
      }

      this.log.append("spec-review.non-compliant", unit.id, {
        missingRequirements: result.missingRequirements,
        scopeCreep: result.scopeCreep,
      });
      unitLog(
        unit.id,
        `${RED_X} Non-compliant (attempt ${attempt}/${maxRetries}): ${result.missingRequirements.join(", ")}`,
      );

      if (attempt === maxRetries) {
        throw new Error(
          `Spec compliance review failed for ${unit.id} after ${maxRetries} attempts`,
        );
      }
    }
  }

  // ── Step 4f: Adversarial Review ───────────────────────────────────

  private async step4f(
    unit: WorkUnit,
    maxRetries: number,
  ): Promise<void> {
    unit.status = UnitStatus.ADVERSARIAL_REVIEW;
    this.stateMgr.save(this.state);
    unitLog(unit.id, "Step 4f: Adversarial Review");

    this.log.append("adversarial.spawned", unit.id);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await dispatchAdversarialReview(
        unit,
        this.workingDir,
        this.config,
      );

      unit.adversarial = result;

      if (result.status === "passed") {
        this.log.append("adversarial.passed", unit.id, {
          findings: result.findings,
        });
        unitLog(unit.id, `${GREEN_CHECK} Adversarial review passed`);
        return;
      }

      this.log.append("adversarial.failed", unit.id, {
        findings: result.findings,
      });
      unitLog(
        unit.id,
        `${RED_X} Adversarial review failed (attempt ${attempt}/${maxRetries}): ${result.findings.length} findings`,
      );

      if (attempt === maxRetries) {
        throw new Error(
          `Adversarial review failed for ${unit.id} after ${maxRetries} attempts`,
        );
      }
    }
  }

  // ── Step 4g: Code Quality Review ──────────────────────────────────

  private async step4g(
    unit: WorkUnit,
    maxRetries: number,
  ): Promise<void> {
    unit.status = UnitStatus.CODE_QUALITY_REVIEW;
    this.stateMgr.save(this.state);
    unitLog(unit.id, "Step 4g: Code Quality Review");

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await dispatchCodeQualityReview(
        unit,
        this.workingDir,
        this.config,
      );

      unit.codeQuality = result;

      if (result.status === "passed") {
        unitLog(unit.id, `${GREEN_CHECK} Code quality approved`);
        return;
      }

      unitLog(
        unit.id,
        `${RED_X} Code quality needs changes (attempt ${attempt}/${maxRetries}): ${result.issues.length} issues`,
      );

      if (attempt === maxRetries) {
        throw new Error(
          `Code quality review failed for ${unit.id} after ${maxRetries} attempts`,
        );
      }
    }
  }

  // ── Phase 5: Final Review ─────────────────────────────────────────

  private async phase5(): Promise<void> {
    phaseHeader(5, "Final Review");

    if (!this.state.framework) {
      console.log("  No framework configured. Skipping final test run.");
      return;
    }

    console.log("  Running full test suite...");
    const result = this.verifier.runTests(
      this.state.framework.testCommand,
      [],
    );

    this.log.append("integration.check", undefined, {
      passed: result.exitCode === 0,
      output: result.output.slice(0, 2000),
    });

    if (result.exitCode === 0) {
      console.log(
        `  ${GREEN_CHECK} All tests passing`,
      );
    } else {
      console.log(
        `  ${RED_X} Some tests failed (exit code ${result.exitCode})`,
      );
      console.log(
        result.output.slice(0, 1000),
      );
    }

    // ── Final Holistic Spec Compliance Review ──
    console.log("\n  Running final holistic spec compliance review...");
    console.log("  (Checking FULL spec against ALL implementation — not just per-unit)");

    // Gather all impl and test files from disk
    const allImplFiles: Record<string, string> = {};
    const allTestFiles: Record<string, string> = {};
    for (const unit of this.state.workUnits) {
      for (const f of unit.implFiles) {
        const fullPath = path.resolve(this.workingDir, f);
        if (fs.existsSync(fullPath)) {
          allImplFiles[f] = fs.readFileSync(fullPath, "utf-8");
        }
      }
      for (const f of unit.testFiles) {
        const fullPath = path.resolve(this.workingDir, f);
        if (fs.existsSync(fullPath)) {
          allTestFiles[f] = fs.readFileSync(fullPath, "utf-8");
        }
      }
    }

    const finalReview = await dispatchFinalSpecReview(
      this.state.spec,
      allImplFiles,
      allTestFiles,
      this.state.designSummary,
      this.state.config,
      this.workingDir,
    );

    this.log.append("final-spec-review.completed", undefined, {
      compliant: finalReview.compliant,
      gapCount: finalReview.gaps.length,
    });

    if (finalReview.compliant) {
      console.log(`  ${GREEN_CHECK} Final spec review: COMPLIANT`);
    } else {
      console.log(`  ${RED_X} Final spec review: NON-COMPLIANT`);
      console.log("\n  Requirements matrix:");
      console.log(finalReview.matrix);
    }

    if (finalReview.gaps.length > 0) {
      console.log("\n  Spec gaps found:");
      for (const gap of finalReview.gaps) {
        console.log(`    - ${gap}`);
      }
    }

    // Per-unit spec gap retrospective
    console.log("\n  Per-Unit Spec Gap Retrospective:");
    let gapsFound = false;
    for (const unit of this.state.workUnits) {
      if (unit.specCompliance.scopeCreep.length > 0) {
        gapsFound = true;
        for (const gap of unit.specCompliance.scopeCreep) {
          console.log(`    - [${unit.id}] Scope creep: ${gap}`);
        }
      }
      if (unit.specCompliance.missingRequirements.length > 0) {
        gapsFound = true;
        for (const mr of unit.specCompliance.missingRequirements) {
          console.log(`    - [${unit.id}] Missing: ${mr}`);
        }
      }
    }
    if (!gapsFound) {
      console.log("    No per-unit spec gaps identified.");
    }
  }

  // ── Phase 6: Report Generation ────────────────────────────────────

  private async phase6(): Promise<void> {
    phaseHeader(6, "Report Generation");

    // Content integrity check: refuse to generate report if units are still pending
    const pendingCount = this.state.workUnits.filter(
      (u) => u.status === UnitStatus.PENDING,
    ).length;
    if (pendingCount > 0) {
      throw new Error(
        `Cannot generate report: ${pendingCount} work units are still pending.`,
      );
    }

    const report = generateReport(this.state, this.workingDir);

    // Verify report file exists on disk
    const reportPath = path.join(this.workingDir, "tdd-report.md");
    if (!fs.existsSync(reportPath)) {
      throw new Error("Report file was not written to disk.");
    }

    console.log(`  ${GREEN_CHECK} Report written: ${reportPath}`);
    console.log(`  Report length: ${report.length} chars`);
  }

  // ── Phase 7: Cleanup ──────────────────────────────────────────────

  private async phase7(): Promise<void> {
    phaseHeader(7, "Cleanup");

    // Verify artifacts exist
    const reportPath = path.join(this.workingDir, "tdd-report.md");
    if (fs.existsSync(reportPath)) {
      console.log(`  ${GREEN_CHECK} Report: ${reportPath}`);
    }
    if (this.stateMgr.stateFileExists()) {
      console.log(
        `  ${GREEN_CHECK} State: ${this.stateMgr.stateFilePath}`,
      );
    }

    // Delete spec-contract files
    let contractsDeleted = 0;
    for (const unit of this.state.workUnits) {
      const contractName = `spec-contract-${unit.id}.md`;

      // Try root
      const rootContract = path.join(this.workingDir, contractName);
      if (fs.existsSync(rootContract)) {
        fs.unlinkSync(rootContract);
        contractsDeleted++;
      }

      // Try adjacent to test files
      for (const testFile of unit.testFiles) {
        const testDir = path.dirname(
          path.resolve(this.workingDir, testFile),
        );
        const adjacentContract = path.join(testDir, contractName);
        if (fs.existsSync(adjacentContract)) {
          fs.unlinkSync(adjacentContract);
          contractsDeleted++;
        }
      }
    }
    if (contractsDeleted > 0) {
      console.log(
        `  ${GREEN_CHECK} Deleted ${contractsDeleted} spec-contract files`,
      );
    }

    // Final state save
    this.log.append("session.complete", undefined, {
      summary: {
        completed: this.state.workUnits.filter(
          (u) => u.status === UnitStatus.COMPLETED,
        ).length,
        failed: this.state.workUnits.filter(
          (u) => u.status === UnitStatus.FAILED,
        ).length,
        total: this.state.workUnits.length,
      },
    });
    this.stateMgr.save(this.state);

    // Print summary
    const completed = this.state.workUnits.filter(
      (u) => u.status === UnitStatus.COMPLETED,
    ).length;
    const failedUnits = this.state.workUnits.filter(
      (u) => u.status === UnitStatus.FAILED,
    ).length;
    const total = this.state.workUnits.length;

    console.log(`\n  Session complete: ${completed}/${total} units succeeded`);
    if (failedUnits > 0) {
      console.log(`  ${RED_X} ${failedUnits} units failed`);
    }

    // Suggest next steps
    console.log("\n  Next steps:");
    console.log(`    1. Review the report: ${reportPath}`);
    console.log("    2. Run the full test suite to confirm");
    if (failedUnits > 0) {
      console.log(
        "    3. Re-run with --resume to retry failed units",
      );
    }
    console.log(
      "    4. Commit the generated code and tests",
    );
  }
}
