import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { detectEntryMode, detectFramework } from "../detection.js";
import { EntryMode } from "../types.js";

// ── detectEntryMode ──────────────────────────────────────────────────

describe("detectEntryMode", () => {
  it("returns NATURAL_LANGUAGE for a plain feature description", () => {
    expect(detectEntryMode("implement a user auth system")).toBe(
      EntryMode.NATURAL_LANGUAGE,
    );
  });

  it("returns NATURAL_LANGUAGE for a quoted feature spec", () => {
    expect(detectEntryMode("build a REST API for todo items")).toBe(
      EntryMode.NATURAL_LANGUAGE,
    );
  });

  it("returns EXISTING_CODEBASE for 'add test coverage'", () => {
    expect(detectEntryMode("add test coverage for src/utils/")).toBe(
      EntryMode.EXISTING_CODEBASE,
    );
  });

  it("returns EXISTING_CODEBASE for 'add tests to'", () => {
    expect(detectEntryMode("add tests to the auth module")).toBe(
      EntryMode.EXISTING_CODEBASE,
    );
  });

  it("returns EXISTING_CODEBASE for 'add coverage'", () => {
    expect(detectEntryMode("add coverage for src/lib")).toBe(
      EntryMode.EXISTING_CODEBASE,
    );
  });

  it("returns USER_PROVIDED_TEST for 'implement against' with .test. file", () => {
    expect(
      detectEntryMode("implement against src/__tests__/calc.test.ts"),
    ).toBe(EntryMode.USER_PROVIDED_TEST);
  });

  it("returns USER_PROVIDED_TEST for 'implement against' with .spec. file", () => {
    expect(
      detectEntryMode("implement against src/calc.spec.ts"),
    ).toBe(EntryMode.USER_PROVIDED_TEST);
  });

  it("returns USER_PROVIDED_TEST for 'implement against' with _test. file", () => {
    expect(
      detectEntryMode("implement against tests/test_calc.py with _test. suffix"),
    ).toBe(EntryMode.USER_PROVIDED_TEST);
  });

  it("returns NATURAL_LANGUAGE for 'implement against' without test file suffix", () => {
    // No .test., .spec., or _test. in the path
    expect(detectEntryMode("implement against the API spec")).toBe(
      EntryMode.NATURAL_LANGUAGE,
    );
  });

  it("returns PLAN_EXECUTION for 'execute plan'", () => {
    expect(detectEntryMode("execute plan docs/plan.md")).toBe(
      EntryMode.PLAN_EXECUTION,
    );
  });

  it("returns PLAN_EXECUTION for 'execute docs/' prefix", () => {
    expect(detectEntryMode("execute docs/refactor.md")).toBe(
      EntryMode.PLAN_EXECUTION,
    );
  });

  it("returns PLAN_EXECUTION for .plan file extension", () => {
    expect(detectEntryMode("run project.plan")).toBe(
      EntryMode.PLAN_EXECUTION,
    );
  });

  it("returns PLAN_EXECUTION for .md file extension", () => {
    expect(detectEntryMode("run migration.md")).toBe(
      EntryMode.PLAN_EXECUTION,
    );
  });

  it("is case-insensitive", () => {
    expect(detectEntryMode("ADD TEST COVERAGE for src/")).toBe(
      EntryMode.EXISTING_CODEBASE,
    );
    expect(detectEntryMode("IMPLEMENT AGAINST src/foo.test.ts")).toBe(
      EntryMode.USER_PROVIDED_TEST,
    );
    expect(detectEntryMode("EXECUTE PLAN docs/plan.md")).toBe(
      EntryMode.PLAN_EXECUTION,
    );
  });
});

// ── detectFramework ──────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tdd-detect-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("detectFramework", () => {
  it("detects vitest from package.json devDependencies", async () => {
    const pkg = { devDependencies: { vitest: "^1.0.0" } };
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify(pkg),
      "utf-8",
    );

    const result = await detectFramework(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.language).toBe("typescript");
    expect(result!.testRunner).toBe("vitest");
    expect(result!.testCommand).toBe("npx vitest run");
  });

  it("detects jest from package.json dependencies", async () => {
    const pkg = { dependencies: { jest: "^29.0.0" } };
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify(pkg),
      "utf-8",
    );

    const result = await detectFramework(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.testRunner).toBe("jest");
  });

  it("detects mocha from package.json", async () => {
    const pkg = { devDependencies: { mocha: "^10.0.0" } };
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify(pkg),
      "utf-8",
    );

    const result = await detectFramework(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.testRunner).toBe("mocha");
  });

  it("detects pytest from pyproject.toml", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "pyproject.toml"),
      `[tool.pytest.ini_options]\nminversion = "6.0"`,
      "utf-8",
    );

    const result = await detectFramework(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.language).toBe("python");
    expect(result!.testRunner).toBe("pytest");
    expect(result!.testCommand).toBe("pytest");
  });

  it("detects Go from go.mod", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "go.mod"),
      "module example.com/myapp\n\ngo 1.21\n",
      "utf-8",
    );

    const result = await detectFramework(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.language).toBe("go");
    expect(result!.testRunner).toBe("go-test");
  });

  it("detects Rust from Cargo.toml", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "Cargo.toml"),
      `[package]\nname = "myapp"\nversion = "0.1.0"`,
      "utf-8",
    );

    const result = await detectFramework(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.language).toBe("rust");
    expect(result!.testRunner).toBe("cargo-test");
  });

  it("returns null for empty directory", async () => {
    const result = await detectFramework(tmpDir);
    expect(result).toBeNull();
  });

  it("prefers vitest over jest when both present", async () => {
    const pkg = {
      devDependencies: { vitest: "^1.0.0", jest: "^29.0.0" },
    };
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify(pkg),
      "utf-8",
    );

    const result = await detectFramework(tmpDir);
    expect(result!.testRunner).toBe("vitest");
  });
});
