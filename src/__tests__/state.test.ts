import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { StateManager } from "../state.js";
import { createDefaultConfig, createDefaultState } from "../types.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tdd-state-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeState() {
  return createDefaultState("test spec", createDefaultConfig());
}

// ── stateFilePath ────────────────────────────────────────────────────

describe("StateManager.stateFilePath", () => {
  it("returns workingDir/.tdd-state.json", () => {
    const mgr = new StateManager(tmpDir);
    expect(mgr.stateFilePath).toBe(path.join(tmpDir, ".tdd-state.json"));
  });
});

// ── save ─────────────────────────────────────────────────────────────

describe("StateManager.save", () => {
  it("creates .tdd-state.json on disk", () => {
    const mgr = new StateManager(tmpDir);
    mgr.save(makeState());
    expect(fs.existsSync(mgr.stateFilePath)).toBe(true);
  });

  it("writes valid JSON", () => {
    const mgr = new StateManager(tmpDir);
    const state = makeState();
    mgr.save(state);
    const raw = fs.readFileSync(mgr.stateFilePath, "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("updates the updatedAt timestamp", () => {
    const mgr = new StateManager(tmpDir);
    const state = makeState();
    const before = state.updatedAt;

    // Small delay to ensure timestamp differs
    const savedAt = new Date().toISOString();
    mgr.save(state);

    const raw = fs.readFileSync(mgr.stateFilePath, "utf-8");
    const persisted = JSON.parse(raw);
    expect(persisted.updatedAt >= savedAt).toBe(true);
    // updatedAt may or may not differ from before depending on timing,
    // but the saved value should be recent
    expect(new Date(persisted.updatedAt).getTime()).toBeGreaterThan(0);
  });

  it("does not leave a .tmp file behind (atomic write)", () => {
    const mgr = new StateManager(tmpDir);
    mgr.save(makeState());

    const tmpFile = mgr.stateFilePath + ".tmp";
    expect(fs.existsSync(tmpFile)).toBe(false);
  });
});

// ── loadExisting ─────────────────────────────────────────────────────

describe("StateManager.loadExisting", () => {
  it("returns null when no state file exists", () => {
    const mgr = new StateManager(tmpDir);
    expect(mgr.loadExisting()).toBeNull();
  });

  it("loads a previously saved state", () => {
    const mgr = new StateManager(tmpDir);
    const state = makeState();
    state.spec = "round-trip test";
    mgr.save(state);

    const loaded = mgr.loadExisting();
    expect(loaded).not.toBeNull();
    expect(loaded!.spec).toBe("round-trip test");
    expect(loaded!.sessionId).toBe(state.sessionId);
  });

  it("round-trips all fields correctly", () => {
    const mgr = new StateManager(tmpDir);
    const state = makeState();
    state.entryMode = 2; // EXISTING_CODEBASE
    state.designSummary = "A design";
    mgr.save(state);

    const loaded = mgr.loadExisting()!;
    expect(loaded.version).toBe(state.version);
    expect(loaded.spec).toBe(state.spec);
    expect(loaded.entryMode).toBe(state.entryMode);
    expect(loaded.designSummary).toBe("A design");
    expect(loaded.config).toEqual(state.config);
    expect(loaded.workUnits).toEqual(state.workUnits);
  });
});

// ── stateFileExists ──────────────────────────────────────────────────

describe("StateManager.stateFileExists", () => {
  it("returns false when no file", () => {
    const mgr = new StateManager(tmpDir);
    expect(mgr.stateFileExists()).toBe(false);
  });

  it("returns true after save", () => {
    const mgr = new StateManager(tmpDir);
    mgr.save(makeState());
    expect(mgr.stateFileExists()).toBe(true);
  });
});
