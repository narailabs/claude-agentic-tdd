import { describe, it, expect } from "vitest";
import {
  createDefaultConfig,
  createDefaultState,
  createWorkUnit,
  createRedVerification,
  createGreenVerification,
  createSpecComplianceResult,
  createAdversarialResult,
  createCodeQualityResult,
  UnitType,
  UnitStatus,
  Complexity,
  EntryMode,
} from "../types.js";

// ── createDefaultConfig ──────────────────────────────────────────────

describe("createDefaultConfig", () => {
  it("returns expected default values", () => {
    const cfg = createDefaultConfig();
    expect(cfg.minAssertionsPerTest).toBe(1);
    expect(cfg.maxRetries).toBe(3);
    expect(cfg.maxMockDepth).toBe(2);
    expect(cfg.flagPrivateMethodTests).toBe(true);
    expect(cfg.maxParallelPairs).toBe(4);
    expect(cfg.skipFailed).toBe(false);
    expect(cfg.modelStrategy).toBe("auto");
    expect(cfg.effort).toBe("high");
    expect(cfg.forceDesign).toBe(false);
    expect(cfg.skipDesign).toBe(false);
  });

  it("returns a new object on each call", () => {
    const a = createDefaultConfig();
    const b = createDefaultConfig();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

// ── createDefaultState ───────────────────────────────────────────────

describe("createDefaultState", () => {
  it("sets spec and config from arguments", () => {
    const cfg = createDefaultConfig();
    const state = createDefaultState("build a calculator", cfg);
    expect(state.spec).toBe("build a calculator");
    expect(state.config).toBe(cfg);
  });

  it("generates a UUID sessionId", () => {
    const state = createDefaultState("s", createDefaultConfig());
    // UUID v4 format: 8-4-4-4-12 hex characters
    expect(state.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("generates unique sessionIds", () => {
    const a = createDefaultState("s", createDefaultConfig());
    const b = createDefaultState("s", createDefaultConfig());
    expect(a.sessionId).not.toBe(b.sessionId);
  });

  it("sets ISO-8601 timestamps", () => {
    const before = new Date().toISOString();
    const state = createDefaultState("s", createDefaultConfig());
    const after = new Date().toISOString();

    expect(state.startedAt >= before).toBe(true);
    expect(state.startedAt <= after).toBe(true);
    expect(state.updatedAt >= before).toBe(true);
    expect(state.updatedAt <= after).toBe(true);
  });

  it("sets remaining fields to defaults", () => {
    const state = createDefaultState("s", createDefaultConfig());
    expect(state.version).toBe("1.0.0");
    expect(state.designSummary).toBeNull();
    expect(state.entryMode).toBe(EntryMode.NATURAL_LANGUAGE);
    expect(state.framework).toBeNull();
    expect(state.workUnits).toEqual([]);
  });
});

// ── createWorkUnit ───────────────────────────────────────────────────

describe("createWorkUnit", () => {
  it("sets id, name, and specContract from arguments", () => {
    const wu = createWorkUnit("wu-1", "Auth module", "Login with email/password");
    expect(wu.id).toBe("wu-1");
    expect(wu.name).toBe("Auth module");
    expect(wu.specContract).toBe("Login with email/password");
  });

  it("uses default unitType, wave, dependsOn, and complexity when no options", () => {
    const wu = createWorkUnit("wu-1", "N", "S");
    expect(wu.unitType).toBe(UnitType.CODE);
    expect(wu.wave).toBe("backend");
    expect(wu.dependsOn).toEqual([]);
    expect(wu.complexity).toBe(Complexity.STANDARD);
  });

  it("respects optional overrides", () => {
    const wu = createWorkUnit("wu-2", "N", "S", {
      unitType: UnitType.TASK,
      wave: "frontend",
      dependsOn: ["wu-1"],
      complexity: Complexity.ARCHITECTURE,
    });
    expect(wu.unitType).toBe(UnitType.TASK);
    expect(wu.wave).toBe("frontend");
    expect(wu.dependsOn).toEqual(["wu-1"]);
    expect(wu.complexity).toBe(Complexity.ARCHITECTURE);
  });

  it("initialises status and attempt counters", () => {
    const wu = createWorkUnit("wu-1", "N", "S");
    expect(wu.status).toBe(UnitStatus.PENDING);
    expect(wu.modelAssignment).toBeNull();
    expect(wu.testFiles).toEqual([]);
    expect(wu.implFiles).toEqual([]);
    expect(wu.testWriterAttempts).toBe(0);
    expect(wu.codeWriterAttempts).toBe(0);
  });

  it("initialises nested verification/review objects", () => {
    const wu = createWorkUnit("wu-1", "N", "S");
    expect(wu.redVerification.status).toBe("pending");
    expect(wu.greenVerification.status).toBe("pending");
    expect(wu.specCompliance.status).toBe("pending");
    expect(wu.adversarial.status).toBe("pending");
    expect(wu.codeQuality.status).toBe("pending");
  });
});

// ── Sub-object factories ─────────────────────────────────────────────

describe("createRedVerification", () => {
  it("returns pending defaults", () => {
    const rv = createRedVerification();
    expect(rv.status).toBe("pending");
    expect(rv.testsFailed).toBe(false);
    expect(rv.failureCount).toBe(0);
    expect(rv.assertionCount).toBe(0);
    expect(rv.antiPatterns).toEqual([]);
    expect(rv.testFileChecksums).toEqual({});
  });
});

describe("createGreenVerification", () => {
  it("returns pending defaults", () => {
    const gv = createGreenVerification();
    expect(gv.status).toBe("pending");
    expect(gv.testsPassed).toBe(false);
    expect(gv.testFilesUnchanged).toBe(true);
    expect(gv.changedFiles).toEqual([]);
    expect(gv.skipMarkersFound).toEqual([]);
    expect(gv.testOutput).toBe("");
    expect(gv.exitCode).toBe(-1);
  });
});

describe("createSpecComplianceResult", () => {
  it("returns pending defaults", () => {
    const sc = createSpecComplianceResult();
    expect(sc.status).toBe("pending");
    expect(sc.requirementsCovered).toBe(0);
    expect(sc.requirementsTotal).toBe(0);
    expect(sc.missingRequirements).toEqual([]);
    expect(sc.scopeCreep).toEqual([]);
    expect(sc.rawResponse).toBe("");
  });
});

describe("createAdversarialResult", () => {
  it("returns pending defaults", () => {
    const ar = createAdversarialResult();
    expect(ar.status).toBe("pending");
    expect(ar.findings).toEqual([]);
    expect(ar.score).toBeNull();
    expect(ar.rawResponse).toBe("");
  });
});

describe("createCodeQualityResult", () => {
  it("returns pending defaults", () => {
    const cq = createCodeQualityResult();
    expect(cq.status).toBe("pending");
    expect(cq.issues).toEqual([]);
    expect(cq.rawResponse).toBe("");
  });
});
