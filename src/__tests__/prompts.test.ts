import { describe, it, expect } from "vitest";
import {
  loadTemplate,
  extractTemplateBlock,
  loadAndFillTemplate,
  getReferenceDir,
} from "../prompts.js";
import * as fs from "node:fs";

// ── getReferenceDir ──────────────────────────────────────────────────

describe("getReferenceDir", () => {
  it("returns a path ending in skills/tdd/reference", () => {
    const dir = getReferenceDir();
    expect(dir).toMatch(/skills\/tdd\/reference$/);
  });

  it("points to an existing directory", () => {
    const dir = getReferenceDir();
    expect(fs.existsSync(dir)).toBe(true);
  });
});

// ── loadTemplate ─────────────────────────────────────────────────────

describe("loadTemplate", () => {
  it("loads the test-writer template", () => {
    const content = loadTemplate("test-writer");
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain("Test Writer");
  });

  it("loads the code-writer template", () => {
    const content = loadTemplate("code-writer");
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain("Code Writer");
  });

  it("loads the adversarial template", () => {
    const content = loadTemplate("adversarial");
    expect(content.length).toBeGreaterThan(0);
  });

  it("loads the spec-compliance template", () => {
    const content = loadTemplate("spec-compliance");
    expect(content.length).toBeGreaterThan(0);
  });

  it("loads the code-quality template", () => {
    const content = loadTemplate("code-quality");
    expect(content.length).toBeGreaterThan(0);
  });

  it("loads the implementer template", () => {
    const content = loadTemplate("implementer");
    expect(content.length).toBeGreaterThan(0);
  });

  it("throws for an unknown template name", () => {
    expect(() => loadTemplate("nonexistent")).toThrow(/Unknown template name/);
  });
});

// ── extractTemplateBlock ─────────────────────────────────────────────

describe("extractTemplateBlock", () => {
  it("extracts content between ``` markers", () => {
    const raw = `# Title

Some preamble.

\`\`\`
Hello {name}, welcome to {place}.
\`\`\`

Trailing text.
`;
    const block = extractTemplateBlock(raw);
    expect(block).toBe("Hello {name}, welcome to {place}.");
  });

  it("trims whitespace from extracted content", () => {
    const raw = "intro\n```\n   spaced content   \n```\nend";
    const block = extractTemplateBlock(raw);
    expect(block).toBe("spaced content");
  });

  it("throws when no opening marker found", () => {
    expect(() => extractTemplateBlock("no markers here")).toThrow(
      /No opening .* marker/,
    );
  });

  it("throws when no closing marker found", () => {
    expect(() => extractTemplateBlock("start\n```\nopened but never closed")).toThrow(
      /No closing .* marker/,
    );
  });

  it("extracts from an actual template file", () => {
    const raw = loadTemplate("test-writer");
    const block = extractTemplateBlock(raw);
    expect(block.length).toBeGreaterThan(0);
    // The block should contain placeholders
    expect(block).toContain("{spec_contract}");
  });
});

// ── loadAndFillTemplate ──────────────────────────────────────────────

describe("loadAndFillTemplate", () => {
  it("fills string placeholders", () => {
    const result = loadAndFillTemplate("test-writer", {
      spec_contract: "Build a calculator with add/subtract",
      language: "typescript",
      test_runner: "vitest",
      test_command: "npx vitest run",
      test_file_paths: "src/__tests__/calc.test.ts",
      project_conventions_from_claude_md: "Use strict types",
    });

    expect(result).toContain("Build a calculator with add/subtract");
    expect(result).toContain("typescript");
    expect(result).toContain("vitest");
    expect(result).not.toContain("{spec_contract}");
    expect(result).not.toContain("{language}");
  });

  it("fills array placeholders with comma-separated values", () => {
    const result = loadAndFillTemplate("test-writer", {
      spec_contract: "spec",
      language: "typescript",
      test_runner: "vitest",
      test_command: "npx vitest run",
      test_file_paths: ["calc.test.ts", "utils.test.ts"],
      project_conventions_from_claude_md: "none",
    });

    expect(result).toContain("calc.test.ts, utils.test.ts");
  });

  it("fills Record placeholders with formatted file blocks", () => {
    const result = loadAndFillTemplate("code-writer", {
      spec_contract_file_contents: "spec",
      language: "typescript",
      test_runner: "vitest",
      test_command: "npx vitest run",
      test_file_contents_verbatim: {
        "calc.test.ts": 'expect(add(1,2)).toBe(3);',
      },
      impl_file_paths: "calc.ts",
      project_conventions_from_claude_md: "none",
    });

    expect(result).toContain("### calc.test.ts");
    expect(result).toContain("expect(add(1,2)).toBe(3);");
  });
});
