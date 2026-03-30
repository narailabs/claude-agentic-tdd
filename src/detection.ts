import * as fs from "node:fs";
import * as path from "node:path";
import { EntryMode, type FrameworkInfo } from "./types.js";

/**
 * Parse the spec text to determine which entry mode the TDD session
 * should use.
 */
export function detectEntryMode(spec: string): EntryMode {
  const lower = spec.toLowerCase();

  // Mode 2: existing codebase (add tests to existing code)
  if (
    lower.includes("add tests to") ||
    lower.includes("add test coverage") ||
    lower.includes("add coverage")
  ) {
    return EntryMode.EXISTING_CODEBASE;
  }

  // Mode 3: user-provided test file
  if (lower.includes("implement against")) {
    const hasTestRef =
      lower.includes(".test.") ||
      lower.includes(".spec.") ||
      lower.includes("_test.");
    if (hasTestRef) {
      return EntryMode.USER_PROVIDED_TEST;
    }
  }

  // Mode 4: plan execution
  if (
    lower.includes("execute plan") ||
    lower.includes("execute docs/") ||
    /\.(plan|md)\b/.test(lower)
  ) {
    return EntryMode.PLAN_EXECUTION;
  }

  // Mode 1: natural language (default)
  return EntryMode.NATURAL_LANGUAGE;
}

/**
 * Read and parse a JSON file, returning null if it does not exist
 * or cannot be parsed.
 */
function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Check whether a file exists at the given path.
 */
function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Check if a specific dependency appears in any of the dependency groups
 * within a package.json object.
 */
function hasDependency(
  pkg: Record<string, unknown>,
  name: string,
): boolean {
  const groups = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
  ] as const;

  for (const group of groups) {
    const deps = pkg[group];
    if (deps && typeof deps === "object" && name in (deps as Record<string, unknown>)) {
      return true;
    }
  }

  return false;
}

/**
 * Detect the test framework from project configuration files in the
 * working directory. Checks package.json, pyproject.toml, go.mod, and
 * Cargo.toml in that order.
 *
 * Returns null if no framework can be detected.
 */
export async function detectFramework(
  workingDir: string,
): Promise<FrameworkInfo | null> {
  // 1. Check package.json for JS/TS frameworks
  const pkgPath = path.join(workingDir, "package.json");
  const pkg = readJsonFile(pkgPath);

  if (pkg !== null) {
    if (hasDependency(pkg, "vitest")) {
      return {
        language: "typescript",
        testRunner: "vitest",
        testCommand: "npx vitest run",
        testFilePattern: "**/*.test.ts",
        sourceDir: "src/",
        testDir: "src/__tests__/",
      };
    }

    if (hasDependency(pkg, "jest")) {
      return {
        language: "typescript",
        testRunner: "jest",
        testCommand: "npx jest",
        testFilePattern: "**/*.test.ts",
        sourceDir: "src/",
        testDir: "src/__tests__/",
      };
    }

    if (hasDependency(pkg, "mocha")) {
      return {
        language: "typescript",
        testRunner: "mocha",
        testCommand: "npx mocha",
        testFilePattern: "**/*.test.ts",
        sourceDir: "src/",
        testDir: "src/__tests__/",
      };
    }
  }

  // 2. Check pyproject.toml for Python
  const pyprojectPath = path.join(workingDir, "pyproject.toml");
  if (fileExists(pyprojectPath)) {
    const content = fs.readFileSync(pyprojectPath, "utf-8");
    if (content.includes("pytest")) {
      return {
        language: "python",
        testRunner: "pytest",
        testCommand: "pytest",
        testFilePattern: "**/test_*.py",
        sourceDir: "src/",
        testDir: "tests/",
      };
    }
  }

  // 3. Check go.mod for Go
  const goModPath = path.join(workingDir, "go.mod");
  if (fileExists(goModPath)) {
    return {
      language: "go",
      testRunner: "go-test",
      testCommand: "go test ./...",
      testFilePattern: "**/*_test.go",
      sourceDir: "./",
      testDir: "./",
    };
  }

  // 4. Check Cargo.toml for Rust
  const cargoPath = path.join(workingDir, "Cargo.toml");
  if (fileExists(cargoPath)) {
    return {
      language: "rust",
      testRunner: "cargo-test",
      testCommand: "cargo test",
      testFilePattern: "**/*_test.rs",
      sourceDir: "src/",
      testDir: "tests/",
    };
  }

  return null;
}
