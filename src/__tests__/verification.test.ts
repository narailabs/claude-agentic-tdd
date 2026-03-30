import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { Verifier } from "../verification.js";

let tmpDir: string;
let verifier: Verifier;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tdd-verify-test-"));
  verifier = new Verifier(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Helper: write a file inside tmpDir and return its relative path. */
function writeFile(relPath: string, content: string): string {
  const absPath = path.join(tmpDir, relPath);
  const dir = path.dirname(absPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(absPath, content, "utf-8");
  return relPath;
}

// ── computeChecksum ──────────────────────────────────────────────────

describe("Verifier.computeChecksum", () => {
  it("returns a 64-char hex SHA-256 string", () => {
    writeFile("hello.txt", "hello world");
    const hash = verifier.computeChecksum("hello.txt");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns consistent results for same content", () => {
    writeFile("a.txt", "identical content");
    const h1 = verifier.computeChecksum("a.txt");
    const h2 = verifier.computeChecksum("a.txt");
    expect(h1).toBe(h2);
  });

  it("returns different results for different content", () => {
    writeFile("a.txt", "content A");
    writeFile("b.txt", "content B");
    const hA = verifier.computeChecksum("a.txt");
    const hB = verifier.computeChecksum("b.txt");
    expect(hA).not.toBe(hB);
  });
});

// ── verifyChecksumsUnchanged ─────────────────────────────────────────

describe("Verifier.verifyChecksumsUnchanged", () => {
  it("reports allMatch when checksums match", () => {
    writeFile("f.txt", "stable");
    const hash = verifier.computeChecksum("f.txt");
    const result = verifier.verifyChecksumsUnchanged({ "f.txt": hash }, ["f.txt"]);
    expect(result.allMatch).toBe(true);
    expect(result.changed).toEqual([]);
  });

  it("detects changed files", () => {
    writeFile("f.txt", "original");
    const hash = verifier.computeChecksum("f.txt");
    // Modify the file
    writeFile("f.txt", "modified");
    const result = verifier.verifyChecksumsUnchanged({ "f.txt": hash }, ["f.txt"]);
    expect(result.allMatch).toBe(false);
    expect(result.changed).toContain("f.txt");
  });

  it("treats missing stored checksum as changed", () => {
    writeFile("f.txt", "data");
    const result = verifier.verifyChecksumsUnchanged({}, ["f.txt"]);
    expect(result.allMatch).toBe(false);
    expect(result.changed).toContain("f.txt");
  });

  it("treats missing file on disk as changed", () => {
    const result = verifier.verifyChecksumsUnchanged(
      { "gone.txt": "abc123" },
      ["gone.txt"],
    );
    expect(result.allMatch).toBe(false);
    expect(result.changed).toContain("gone.txt");
  });
});

// ── filesExist ───────────────────────────────────────────────────────

describe("Verifier.filesExist", () => {
  it("reports allExist when all files are present", () => {
    writeFile("a.ts", "a");
    writeFile("b.ts", "b");
    const result = verifier.filesExist(["a.ts", "b.ts"]);
    expect(result.allExist).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("detects missing files", () => {
    writeFile("a.ts", "a");
    const result = verifier.filesExist(["a.ts", "nope.ts"]);
    expect(result.allExist).toBe(false);
    expect(result.missing).toEqual(["nope.ts"]);
  });

  it("handles empty list", () => {
    const result = verifier.filesExist([]);
    expect(result.allExist).toBe(true);
    expect(result.missing).toEqual([]);
  });
});

// ── countAssertions ──────────────────────────────────────────────────

describe("Verifier.countAssertions", () => {
  it("counts TypeScript expect() assertions", () => {
    const testContent = `
import { describe, it, expect } from "vitest";

describe("calc", () => {
  it("adds numbers", () => {
    expect(add(1, 2)).toBe(3);
    expect(add(0, 0)).toEqual(0);
  });

  it("subtracts numbers", () => {
    expect(sub(5, 3)).toBe(2);
  });
});
`;
    writeFile("calc.test.ts", testContent);
    const result = verifier.countAssertions("calc.test.ts", "typescript");
    // 3 expect( + 2 .toBe( + 1 .toEqual( = 6
    expect(result.assertionCount).toBe(6);
    expect(result.testCount).toBe(2);
  });

  it("detects weak assertions", () => {
    const testContent = `
it("checks something", () => {
  expect(result).toBeTruthy();
  expect(list).toBeDefined();
  expect(count).toBeGreaterThan(0);
});
`;
    writeFile("weak.test.ts", testContent);
    const result = verifier.countAssertions("weak.test.ts", "typescript");
    expect(result.weakAssertions.length).toBeGreaterThanOrEqual(3);
  });

  it("counts Python assertions", () => {
    const testContent = `
def test_add():
    assert add(1, 2) == 3
    assert add(0, 0) == 0

def test_sub():
    assert sub(5, 3) == 2
`;
    writeFile("test_calc.py", testContent);
    const result = verifier.countAssertions("test_calc.py", "python");
    expect(result.assertionCount).toBe(3);
    expect(result.testCount).toBe(2);
  });

  it("returns zeros for nonexistent file", () => {
    const result = verifier.countAssertions("nope.ts", "typescript");
    expect(result.assertionCount).toBe(0);
    expect(result.testCount).toBe(0);
    expect(result.weakAssertions).toEqual([]);
  });
});

// ── checkSkipMarkers ─────────────────────────────────────────────────

describe("Verifier.checkSkipMarkers", () => {
  it("detects .skip marker", () => {
    writeFile("skip.test.ts", `it.skip("disabled", () => {});`);
    const markers = verifier.checkSkipMarkers("skip.test.ts");
    expect(markers.length).toBeGreaterThanOrEqual(1);
    expect(markers.some((m) => m.includes("skip"))).toBe(true);
  });

  it("detects xit marker", () => {
    writeFile("xit.test.ts", `xit("disabled", () => {});`);
    const markers = verifier.checkSkipMarkers("xit.test.ts");
    expect(markers.length).toBeGreaterThanOrEqual(1);
    expect(markers.some((m) => m.includes("skip"))).toBe(true);
  });

  it("detects .only (focus) marker", () => {
    writeFile("only.test.ts", `it.only("focused", () => {});`);
    const markers = verifier.checkSkipMarkers("only.test.ts");
    expect(markers.length).toBeGreaterThanOrEqual(1);
    expect(markers.some((m) => m.includes("focus"))).toBe(true);
  });

  it("detects xdescribe marker", () => {
    writeFile("xd.test.ts", `xdescribe("disabled suite", () => {});`);
    const markers = verifier.checkSkipMarkers("xd.test.ts");
    expect(markers.length).toBeGreaterThanOrEqual(1);
  });

  it("detects pytest skip marker", () => {
    writeFile("test_skip.py", `@pytest.mark.skip\ndef test_foo(): pass`);
    const markers = verifier.checkSkipMarkers("test_skip.py");
    expect(markers.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty array for clean file", () => {
    writeFile("clean.test.ts", `it("works", () => { expect(1).toBe(1); });`);
    const markers = verifier.checkSkipMarkers("clean.test.ts");
    expect(markers).toEqual([]);
  });

  it("returns empty array for nonexistent file", () => {
    const markers = verifier.checkSkipMarkers("nope.ts");
    expect(markers).toEqual([]);
  });
});

// ── classifyFailure ──────────────────────────────────────────────────

describe("Verifier.classifyFailure", () => {
  it('classifies ReferenceError as "acceptable"', () => {
    expect(verifier.classifyFailure("ReferenceError: add is not defined")).toBe(
      "acceptable",
    );
  });

  it('classifies "Cannot find module" as "acceptable"', () => {
    expect(
      verifier.classifyFailure("Cannot find module '../calc'"),
    ).toBe("acceptable");
  });

  it('classifies "not a function" as "acceptable"', () => {
    expect(verifier.classifyFailure("add is not a function")).toBe("acceptable");
  });

  it('classifies SyntaxError as "unacceptable"', () => {
    expect(verifier.classifyFailure("SyntaxError: Unexpected token")).toBe(
      "unacceptable",
    );
  });

  it('classifies TypeError as "unacceptable"', () => {
    expect(
      verifier.classifyFailure("TypeError: Cannot read properties of undefined"),
    ).toBe("unacceptable");
  });

  it("unacceptable takes precedence over acceptable", () => {
    // Output containing both patterns
    const output = "Cannot find module './foo'\nSyntaxError: bad import";
    expect(verifier.classifyFailure(output)).toBe("unacceptable");
  });

  it('classifies unknown output as "unknown"', () => {
    expect(verifier.classifyFailure("1 test failed")).toBe("unknown");
  });
});

// ── scanAntiPatterns ─────────────────────────────────────────────────

describe("Verifier.scanAntiPatterns", () => {
  it("detects excessive mocking", () => {
    // 1 test, 5 mocks → exceeds 2*1 threshold
    const testContent = `
it("over-mocked", () => {
  const a = vi.fn();
  const b = vi.fn();
  const c = vi.fn();
  const d = vi.fn();
  const e = vi.fn();
  expect(a).toBeCalled();
});
`;
    writeFile("mocks.test.ts", testContent);
    const findings = verifier.scanAntiPatterns("mocks.test.ts", "typescript");
    expect(findings.some((f) => f.includes("Excessive mocking"))).toBe(true);
  });

  it("does not flag reasonable mocking", () => {
    // 2 tests, 2 mocks → within 2*2 threshold
    const testContent = `
it("test a", () => {
  const a = vi.fn();
  expect(a).toBeCalled();
});
it("test b", () => {
  const b = vi.fn();
  expect(b).toBeCalled();
});
`;
    writeFile("ok.test.ts", testContent);
    const findings = verifier.scanAntiPatterns("ok.test.ts", "typescript");
    expect(findings.some((f) => f.includes("Excessive mocking"))).toBe(false);
  });

  it("detects private method access", () => {
    const testContent = `
it("accesses private", () => {
  expect(obj._internalMethod()).toBe(42);
  expect(obj.__secret).toBe("x");
});
`;
    writeFile("priv.test.ts", testContent);
    const findings = verifier.scanAntiPatterns("priv.test.ts", "typescript");
    expect(findings.some((f) => f.includes("Private method access"))).toBe(true);
  });

  it("returns empty array for nonexistent file", () => {
    const findings = verifier.scanAntiPatterns("nope.ts", "typescript");
    expect(findings).toEqual([]);
  });
});
