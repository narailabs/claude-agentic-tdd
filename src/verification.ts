import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { execSync } from "node:child_process";
import {
  type RedVerification,
  type GreenVerification,
  EntryMode,
} from "./types.js";

// ── Pattern Definitions ────────────────────────────────────────────────

const ASSERTION_PATTERNS: Record<string, RegExp[]> = {
  typescript: [
    /expect\(/,
    /\.toBe\(/,
    /\.toEqual\(/,
    /\.toThrow\(/,
    /\.toContain\(/,
    /\.toMatch\(/,
    /\.toHaveLength\(/,
    /\.toHaveProperty\(/,
    /\.rejects\./,
    /\bassert\b/,
  ],
  python: [
    /\bassert\b/,
    /self\.assert/,
    /assertEqual/,
    /assertRaises/,
    /pytest\.raises/,
  ],
  go: [
    /t\.Error/,
    /t\.Fatal/,
    /assert\./,
    /require\./,
  ],
};

const TEST_FUNCTION_PATTERNS: Record<string, RegExp> = {
  typescript: /(?:it|test)\s*\(/g,
  python: /def\s+test_/g,
  go: /func\s+Test/g,
};

const WEAK_ASSERTION_PATTERNS: RegExp[] = [
  /toBeGreaterThan\(\s*0\s*\)/,
  /toBeGreaterThanOrEqual\(\s*0\s*\)/,
  /toBeTruthy\(\s*\)/,
  /toBeDefined\(\s*\)/,
  /not\.toBeNull\(\s*\)/,
  /toBeFalsy\(\s*\)/,
];

const SKIP_MARKER_PATTERNS: RegExp[] = [
  /\bxit\b/,
  /\bxdescribe\b/,
  /\.skip\b/,
  /@pytest\.mark\.skip/,
  /@skip\b/,
  /t\.Skip/,
  /@Ignore\b/,
  /@Disabled\b/,
  /\bpending\(/,
];

const FOCUS_MARKER_PATTERNS: RegExp[] = [
  /\.only\b/,
  /\bfdescribe\b/,
  /\bfit\b/,
];

const ACCEPTABLE_FAILURE_PATTERNS: RegExp[] = [
  /not found/i,
  /not defined/i,
  /Cannot find module/,
  /is not a function/,
  /ReferenceError/,
  /ImportError/,
  /ModuleNotFoundError/,
];

const UNACCEPTABLE_FAILURE_PATTERNS: RegExp[] = [
  /SyntaxError/,
  /TypeError/,
  /configuration error/i,
];

const DEFAULT_TIMEOUT = 30_000;

// ── Verifier ───────────────────────────────────────────────────────────

export class Verifier {
  constructor(private workingDir: string) {}

  // ── Checksum Management ────────────────────────────────────────────

  computeChecksum(filePath: string): string {
    const resolved = path.resolve(this.workingDir, filePath);
    const content = fs.readFileSync(resolved);
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  verifyChecksumsUnchanged(
    stored: Record<string, string>,
    files: string[],
  ): { allMatch: boolean; changed: string[] } {
    const changed: string[] = [];

    for (const file of files) {
      const storedHash = stored[file];
      if (storedHash === undefined) {
        changed.push(file);
        continue;
      }

      try {
        const currentHash = this.computeChecksum(file);
        if (currentHash !== storedHash) {
          changed.push(file);
        }
      } catch {
        changed.push(file);
      }
    }

    return { allMatch: changed.length === 0, changed };
  }

  // ── File Existence ─────────────────────────────────────────────────

  filesExist(paths: string[]): { allExist: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const p of paths) {
      const resolved = path.resolve(this.workingDir, p);
      if (!fs.existsSync(resolved)) {
        missing.push(p);
      }
    }

    return { allExist: missing.length === 0, missing };
  }

  // ── Test Execution ─────────────────────────────────────────────────

  runTests(
    testCommand: string,
    testFiles: string[],
    timeout?: number,
  ): { exitCode: number; output: string } {
    const fullCommand = `${testCommand} ${testFiles.join(" ")}`;
    const effectiveTimeout = timeout ?? DEFAULT_TIMEOUT;

    try {
      const output = execSync(fullCommand, {
        cwd: this.workingDir,
        timeout: effectiveTimeout,
        stdio: ["pipe", "pipe", "pipe"],
        encoding: "utf-8",
      });
      return { exitCode: 0, output: output ?? "" };
    } catch (error: unknown) {
      const execError = error as {
        status?: number | null;
        stdout?: string;
        stderr?: string;
      };
      const stdout = execError.stdout ?? "";
      const stderr = execError.stderr ?? "";
      const exitCode = execError.status ?? 1;
      return { exitCode, output: stdout + stderr };
    }
  }

  // ── Assertion Density Analysis ─────────────────────────────────────

  countAssertions(
    filePath: string,
    language: string,
  ): { assertionCount: number; testCount: number; weakAssertions: string[] } {
    const resolved = path.resolve(this.workingDir, filePath);

    let content: string;
    try {
      content = fs.readFileSync(resolved, "utf-8");
    } catch {
      return { assertionCount: 0, testCount: 0, weakAssertions: [] };
    }

    const lang = normalizeLanguage(language);
    const patterns = ASSERTION_PATTERNS[lang] ?? ASSERTION_PATTERNS.typescript;
    const testPattern = TEST_FUNCTION_PATTERNS[lang] ?? TEST_FUNCTION_PATTERNS.typescript;

    // Count assertions
    let assertionCount = 0;
    for (const pattern of patterns) {
      const global = new RegExp(pattern.source, "g");
      const matches = content.match(global);
      if (matches) {
        assertionCount += matches.length;
      }
    }

    // Count test functions
    const testMatches = content.match(testPattern);
    const testCount = testMatches?.length ?? 0;

    // Find weak assertions
    const weakAssertions: string[] = [];
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const weakPattern of WEAK_ASSERTION_PATTERNS) {
        if (weakPattern.test(line)) {
          weakAssertions.push(`Line ${i + 1}: ${line.trim()}`);
        }
      }
    }

    return { assertionCount, testCount, weakAssertions };
  }

  // ── Skip Marker Detection ─────────────────────────────────────────

  checkSkipMarkers(filePath: string): string[] {
    const resolved = path.resolve(this.workingDir, filePath);

    let content: string;
    try {
      content = fs.readFileSync(resolved, "utf-8");
    } catch {
      return [];
    }

    const found: string[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of SKIP_MARKER_PATTERNS) {
        if (pattern.test(line)) {
          found.push(`skip: Line ${i + 1}: ${line.trim()}`);
        }
      }

      for (const pattern of FOCUS_MARKER_PATTERNS) {
        if (pattern.test(line)) {
          found.push(`focus: Line ${i + 1}: ${line.trim()}`);
        }
      }
    }

    return found;
  }

  // ── Failure Classification ─────────────────────────────────────────

  classifyFailure(
    testOutput: string,
  ): "acceptable" | "unacceptable" | "unknown" {
    const hasAcceptable = ACCEPTABLE_FAILURE_PATTERNS.some((p) =>
      p.test(testOutput),
    );
    const hasUnacceptable = UNACCEPTABLE_FAILURE_PATTERNS.some((p) =>
      p.test(testOutput),
    );

    // Unacceptable takes precedence: if the test file itself is broken,
    // it doesn't matter that the import also failed.
    if (hasUnacceptable) return "unacceptable";
    if (hasAcceptable) return "acceptable";
    return "unknown";
  }

  // ── Anti-Pattern Scanning ──────────────────────────────────────────

  scanAntiPatterns(filePath: string, language: string): string[] {
    const resolved = path.resolve(this.workingDir, filePath);

    let content: string;
    try {
      content = fs.readFileSync(resolved, "utf-8");
    } catch {
      return [];
    }

    const lang = normalizeLanguage(language);
    const findings: string[] = [];

    // Count test functions
    const testPattern =
      TEST_FUNCTION_PATTERNS[lang] ?? TEST_FUNCTION_PATTERNS.typescript;
    const testMatches = content.match(testPattern);
    const testCount = testMatches?.length ?? 0;

    // Excessive mocking: count mock/spy/stub declarations
    const mockPatterns = /\b(?:mock|spy|stub|jest\.fn|vi\.fn|sinon\.|patch|Mock|MagicMock)\b/g;
    const mockMatches = content.match(mockPatterns);
    const mockCount = mockMatches?.length ?? 0;

    if (testCount > 0 && mockCount > 2 * testCount) {
      findings.push(
        `Excessive mocking: ${mockCount} mock declarations for ${testCount} tests (threshold: ${2 * testCount})`,
      );
    }

    // Private method access
    const privateAccessPattern = /\._\w+|\.#\w+|\.__\w+/g;
    const privateMatches = content.match(privateAccessPattern);
    if (privateMatches && privateMatches.length > 0) {
      findings.push(
        `Private method access: ${privateMatches.length} occurrence(s) — ${[...new Set(privateMatches)].join(", ")}`,
      );
    }

    // Implementation mirroring: look for references to internal helpers
    // that suggest the test mirrors internal structure
    const internalRefPattern = /(?:internal|private|_helper|_impl|_do)\w+/g;
    const internalMatches = content.match(internalRefPattern);
    if (internalMatches && internalMatches.length > 3) {
      findings.push(
        `Possible implementation mirroring: ${internalMatches.length} references to internal/helper identifiers`,
      );
    }

    return findings;
  }

  // ── Composite RED Verification ─────────────────────────────────────

  redVerification(
    testFiles: string[],
    testCommand: string,
    language: string,
    entryMode: EntryMode,
  ): RedVerification | null {
    // For USER_PROVIDED_TEST mode, skip RED checks 1-3
    if (entryMode === EntryMode.USER_PROVIDED_TEST) {
      return this.redVerificationUserProvided(testFiles, language);
    }

    // Check 1: Test files exist
    const existence = this.filesExist(testFiles);
    if (!existence.allExist) {
      return null;
    }

    // For EXISTING_CODEBASE mode, use hide-and-restore approach
    if (entryMode === EntryMode.EXISTING_CODEBASE) {
      return this.redVerificationExistingCodebase(
        testFiles,
        testCommand,
        language,
      );
    }

    // Standard RED verification (NATURAL_LANGUAGE / PLAN_EXECUTION)
    // Check 2: Tests must fail (RED)
    const testResult = this.runTests(testCommand, testFiles);
    if (testResult.exitCode === 0) {
      // Tests pass without implementation — tautological
      return null;
    }

    // Check 3: Correct failure type
    const failureType = this.classifyFailure(testResult.output);
    if (failureType === "unacceptable") {
      return null;
    }

    // Check 4: Assertion density
    let totalAssertions = 0;
    let totalTests = 0;
    const allWeakAssertions: string[] = [];

    for (const file of testFiles) {
      const density = this.countAssertions(file, language);
      totalAssertions += density.assertionCount;
      totalTests += density.testCount;
      allWeakAssertions.push(...density.weakAssertions);
    }

    // Check 5: Anti-pattern scanning
    const allAntiPatterns: string[] = [];
    for (const file of testFiles) {
      const patterns = this.scanAntiPatterns(file, language);
      allAntiPatterns.push(...patterns);
    }

    // Record checksums
    const checksums: Record<string, string> = {};
    for (const file of testFiles) {
      checksums[file] = this.computeChecksum(file);
    }

    return {
      status: "passed",
      testsFailed: true,
      failureCount: totalTests,
      assertionCount: totalAssertions,
      antiPatterns: allAntiPatterns,
      testFileChecksums: checksums,
    };
  }

  // ── Composite GREEN Verification ───────────────────────────────────

  greenVerification(
    testFiles: string[],
    testCommand: string,
    storedChecksums: Record<string, string>,
  ): GreenVerification {
    // Check 1: Test file checksums unchanged
    const checksumResult = this.verifyChecksumsUnchanged(
      storedChecksums,
      testFiles,
    );

    // Check 2: No skip/focus markers
    const allSkipMarkers: string[] = [];
    for (const file of testFiles) {
      const markers = this.checkSkipMarkers(file);
      allSkipMarkers.push(...markers);
    }

    // Check 3: Run tests — verify pass
    const testResult = this.runTests(testCommand, testFiles);

    return {
      status:
        checksumResult.allMatch &&
        allSkipMarkers.length === 0 &&
        testResult.exitCode === 0
          ? "passed"
          : "failed",
      testFilesUnchanged: checksumResult.allMatch,
      changedFiles: checksumResult.changed,
      skipMarkersFound: allSkipMarkers,
      testsPassed: testResult.exitCode === 0,
      testOutput: testResult.output,
      exitCode: testResult.exitCode,
    };
  }

  // ── Private Helpers ────────────────────────────────────────────────

  /**
   * RED verification for USER_PROVIDED_TEST mode.
   * Skips checks 1-3 (existence, failure, failure classification)
   * since the user provided the tests themselves.
   */
  private redVerificationUserProvided(
    testFiles: string[],
    language: string,
  ): RedVerification | null {
    let totalAssertions = 0;
    let totalTests = 0;
    const allAntiPatterns: string[] = [];

    for (const file of testFiles) {
      const density = this.countAssertions(file, language);
      totalAssertions += density.assertionCount;
      totalTests += density.testCount;

      const patterns = this.scanAntiPatterns(file, language);
      allAntiPatterns.push(...patterns);
    }

    // Record checksums
    const checksums: Record<string, string> = {};
    for (const file of testFiles) {
      try {
        checksums[file] = this.computeChecksum(file);
      } catch {
        return null;
      }
    }

    return {
      status: "passed",
      testsFailed: true,
      failureCount: totalTests,
      assertionCount: totalAssertions,
      antiPatterns: allAntiPatterns,
      testFileChecksums: checksums,
    };
  }

  /**
   * RED verification for EXISTING_CODEBASE mode.
   * Uses hide-and-restore: rename impl files, run tests (should fail),
   * restore impl files, run tests again (should pass).
   */
  private redVerificationExistingCodebase(
    testFiles: string[],
    testCommand: string,
    language: string,
  ): RedVerification | null {
    // Discover implementation files referenced by tests.
    // We infer impl files from test file names by convention.
    const implFiles = this.inferImplFiles(testFiles);
    const hiddenMap = new Map<string, string>();

    try {
      // Step 1: Hide implementation files
      for (const implFile of implFiles) {
        const resolved = path.resolve(this.workingDir, implFile);
        const hiddenPath = resolved + ".tdd-hidden";

        if (fs.existsSync(resolved)) {
          fs.renameSync(resolved, hiddenPath);
          hiddenMap.set(resolved, hiddenPath);
        }
      }

      // Step 2: Run tests — they should fail (import errors)
      const failResult = this.runTests(testCommand, testFiles);
      if (failResult.exitCode === 0) {
        // Tests pass even without implementation — tautological
        return null;
      }

      // Verify the failure is due to missing imports, not broken tests
      const failureType = this.classifyFailure(failResult.output);
      if (failureType === "unacceptable") {
        return null;
      }
    } finally {
      // Step 3: Restore implementation files (always, even on error)
      for (const [original, hidden] of hiddenMap) {
        if (fs.existsSync(hidden)) {
          fs.renameSync(hidden, original);
        }
      }
    }

    // Step 4: Run tests with implementation restored — they should pass
    const passResult = this.runTests(testCommand, testFiles);
    if (passResult.exitCode !== 0) {
      // Characterization tests don't match existing behavior
      return null;
    }

    // Assertion density + anti-patterns
    let totalAssertions = 0;
    let totalTests = 0;
    const allAntiPatterns: string[] = [];

    for (const file of testFiles) {
      const density = this.countAssertions(file, language);
      totalAssertions += density.assertionCount;
      totalTests += density.testCount;

      const patterns = this.scanAntiPatterns(file, language);
      allAntiPatterns.push(...patterns);
    }

    // Record checksums
    const checksums: Record<string, string> = {};
    for (const file of testFiles) {
      checksums[file] = this.computeChecksum(file);
    }

    return {
      status: "passed",
      testsFailed: true,
      failureCount: totalTests,
      assertionCount: totalAssertions,
      antiPatterns: allAntiPatterns,
      testFileChecksums: checksums,
    };
  }

  /**
   * Infer implementation file paths from test file paths by stripping
   * common test suffixes/directories.
   */
  private inferImplFiles(testFiles: string[]): string[] {
    const implFiles: string[] = [];

    for (const testFile of testFiles) {
      // Strip common test patterns:
      //   foo.test.ts  ->  foo.ts
      //   foo_test.py  ->  foo.py
      //   foo_test.go  ->  foo.go
      //   __tests__/foo.test.ts  ->  foo.ts
      let implFile = testFile
        .replace(/\.test\.(\w+)$/, ".$1")
        .replace(/\.spec\.(\w+)$/, ".$1")
        .replace(/_test\.(\w+)$/, ".$1")
        .replace(/test_([^/]+)$/, "$1");

      // Remove __tests__ directory segment
      implFile = implFile.replace(/__tests__\//, "");

      // Only add if it differs from the test file (avoids self-reference)
      if (implFile !== testFile) {
        implFiles.push(implFile);
      }
    }

    return implFiles;
  }
}

// ── Utility ────────────────────────────────────────────────────────────

function normalizeLanguage(language: string): string {
  const lower = language.toLowerCase();

  if (lower === "typescript" || lower === "javascript" || lower === "ts" || lower === "js") {
    return "typescript";
  }
  if (lower === "python" || lower === "py") {
    return "python";
  }
  if (lower === "go" || lower === "golang") {
    return "go";
  }

  return lower;
}
