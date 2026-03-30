import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { SessionLog } from "../sessionLog.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tdd-log-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── logFilePath ──────────────────────────────────────────────────────

describe("SessionLog.logFilePath", () => {
  it("returns workingDir/tdd-session.jsonl", () => {
    const log = new SessionLog(tmpDir);
    expect(log.logFilePath).toBe(path.join(tmpDir, "tdd-session.jsonl"));
  });
});

// ── initialize ───────────────────────────────────────────────────────

describe("SessionLog.initialize", () => {
  it("creates the log file on disk", () => {
    const log = new SessionLog(tmpDir);
    log.initialize();
    expect(fs.existsSync(log.logFilePath)).toBe(true);
  });

  it("creates an empty file", () => {
    const log = new SessionLog(tmpDir);
    log.initialize();
    const content = fs.readFileSync(log.logFilePath, "utf-8");
    expect(content).toBe("");
  });

  it("truncates an existing file", () => {
    const log = new SessionLog(tmpDir);
    fs.writeFileSync(log.logFilePath, "old data\n", "utf-8");
    log.initialize();
    const content = fs.readFileSync(log.logFilePath, "utf-8");
    expect(content).toBe("");
  });
});

// ── append ───────────────────────────────────────────────────────────

describe("SessionLog.append", () => {
  it("writes a single JSONL line with required fields", () => {
    const log = new SessionLog(tmpDir);
    log.initialize();
    log.append("phase_start", "wu-1", { phase: 3 });

    const content = fs.readFileSync(log.logFilePath, "utf-8");
    const lines = content.split("\n").filter((l) => l.length > 0);
    expect(lines).toHaveLength(1);

    const entry = JSON.parse(lines[0]);
    expect(entry.event).toBe("phase_start");
    expect(entry.unitId).toBe("wu-1");
    expect(entry.data).toEqual({ phase: 3 });
    expect(typeof entry.timestamp).toBe("string");
    // Verify timestamp is valid ISO-8601
    expect(new Date(entry.timestamp).getTime()).toBeGreaterThan(0);
  });

  it("defaults unitId to null and data to empty object", () => {
    const log = new SessionLog(tmpDir);
    log.initialize();
    log.append("session_start");

    const content = fs.readFileSync(log.logFilePath, "utf-8");
    const entry = JSON.parse(content.trim());
    expect(entry.unitId).toBeNull();
    expect(entry.data).toEqual({});
  });

  it("appends multiple lines", () => {
    const log = new SessionLog(tmpDir);
    log.initialize();
    log.append("event_a");
    log.append("event_b");
    log.append("event_c");

    const content = fs.readFileSync(log.logFilePath, "utf-8");
    const lines = content.split("\n").filter((l) => l.length > 0);
    expect(lines).toHaveLength(3);

    const events = lines.map((l) => JSON.parse(l).event);
    expect(events).toEqual(["event_a", "event_b", "event_c"]);
  });
});

// ── eventCount ───────────────────────────────────────────────────────

describe("SessionLog.eventCount", () => {
  it("returns 0 when log file does not exist", () => {
    const log = new SessionLog(tmpDir);
    expect(log.eventCount()).toBe(0);
  });

  it("returns 0 for an empty log", () => {
    const log = new SessionLog(tmpDir);
    log.initialize();
    expect(log.eventCount()).toBe(0);
  });

  it("returns correct count after appending events", () => {
    const log = new SessionLog(tmpDir);
    log.initialize();
    log.append("a");
    log.append("b");
    expect(log.eventCount()).toBe(2);
  });
});

// ── logFileExists ────────────────────────────────────────────────────

describe("SessionLog.logFileExists", () => {
  it("returns false before initialization", () => {
    const log = new SessionLog(tmpDir);
    expect(log.logFileExists()).toBe(false);
  });

  it("returns true after initialization", () => {
    const log = new SessionLog(tmpDir);
    log.initialize();
    expect(log.logFileExists()).toBe(true);
  });
});
