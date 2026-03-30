import * as fs from "node:fs";
import * as path from "node:path";
import {
  type WorkUnit,
  type TDDConfig,
  type SpecComplianceResult,
  type AdversarialResult,
  type CodeQualityResult,
} from "../types.js";
import { loadAndFillTemplate, loadTemplate, extractTemplateBlock } from "../prompts.js";
import { dispatchAgent, parseReviewVerdict } from "./base.js";

// ── Helpers ──────────────────────────────────────────────────────────────

/** Read a file from disk relative to workingDir. Returns placeholder on failure. */
function readFileFromDisk(filePath: string, workingDir: string): string {
  const resolved = path.resolve(workingDir, filePath);
  try {
    return fs.readFileSync(resolved, "utf-8");
  } catch {
    return `[File not found: ${filePath}]`;
  }
}

/** Read multiple files into a Record<path, content>. */
function readFilesFromDisk(
  filePaths: string[],
  workingDir: string,
): Record<string, string> {
  const contents: Record<string, string> = {};
  for (const filePath of filePaths) {
    contents[filePath] = readFileFromDisk(filePath, workingDir);
  }
  return contents;
}

/** Locate and read the spec-contract file for a work unit. */
function readSpecContract(unit: WorkUnit, workingDir: string): string {
  // Try adjacent to the first test file
  if (unit.testFiles.length > 0) {
    const testDir = path.dirname(path.resolve(workingDir, unit.testFiles[0]));
    const adjacentPath = path.join(testDir, `spec-contract-${unit.id}.md`);
    try {
      return fs.readFileSync(adjacentPath, "utf-8");
    } catch {
      // fall through
    }
  }

  // Try working directory root
  const rootPath = path.resolve(workingDir, `spec-contract-${unit.id}.md`);
  try {
    return fs.readFileSync(rootPath, "utf-8");
  } catch {
    return unit.specContract;
  }
}

const READONLY_TOOLS = ["Read", "Glob", "Grep"];

// ── Spec Compliance Review ───────────────────────────────────────────────

/**
 * Parse the requirements matrix from a spec compliance review response.
 * Extracts rows from the markdown table and counts covered/total.
 */
function parseRequirementsMatrix(response: string): {
  covered: number;
  total: number;
  missing: string[];
} {
  const lines = response.split("\n");
  let total = 0;
  let covered = 0;
  const missing: string[] = [];

  // Look for table rows: | # | Requirement | YES/NO/PARTIAL | ... |
  for (const line of lines) {
    const tableMatch = line.match(
      /\|\s*\d+\s*\|\s*(.+?)\s*\|\s*(YES|NO|PARTIAL)\s*\|/i,
    );
    if (tableMatch) {
      total++;
      const requirement = tableMatch[1].trim();
      const status = tableMatch[2].toUpperCase();
      if (status === "YES") {
        covered++;
      } else {
        missing.push(`${requirement} (${status})`);
      }
    }
  }

  return { covered, total, missing };
}

/** Extract scope creep items from the response. */
function parseScopeCreep(response: string): string[] {
  const items: string[] = [];
  const scopeSection = response.match(
    /### Scope Creep\s*\n([\s\S]*?)(?=\n###|\n##|$)/,
  );
  if (!scopeSection) return items;

  const sectionText = scopeSection[1].trim();
  if (sectionText.toLowerCase() === "none") return items;

  // Extract bullet items
  const bulletLines = sectionText.match(/^[-*]\s+(.+)$/gm);
  if (bulletLines) {
    for (const line of bulletLines) {
      const text = line.replace(/^[-*]\s+/, "").trim();
      if (text.length > 0) {
        items.push(text);
      }
    }
  }

  return items;
}

export async function dispatchSpecComplianceReview(
  unit: WorkUnit,
  designSummary: string | null,
  workingDir: string,
  config: TDDConfig,
): Promise<SpecComplianceResult> {
  const specContract = readSpecContract(unit, workingDir);
  const testFileContents = readFilesFromDisk(unit.testFiles, workingDir);
  const implFileContents = readFilesFromDisk(unit.implFiles, workingDir);

  const prompt = loadAndFillTemplate("spec-compliance", {
    spec_contract: specContract,
    design_summary: designSummary ?? "No design phase was run.",
    test_file_contents: testFileContents,
    impl_file_contents: implFileContents,
    unit_name: unit.name,
  });

  const response = await dispatchAgent({
    prompt,
    tools: READONLY_TOOLS,
    model: unit.modelAssignment?.reviewer ?? "sonnet",
    effort: config.effort,
    workingDir,
  });

  const verdict = parseReviewVerdict(response, ["COMPLIANT", "NON-COMPLIANT"]);
  const matrix = parseRequirementsMatrix(response);
  const scopeCreep = parseScopeCreep(response);

  return {
    status: verdict === "COMPLIANT" ? "passed" : "failed",
    requirementsCovered: matrix.covered,
    requirementsTotal: matrix.total,
    missingRequirements: matrix.missing,
    scopeCreep,
    rawResponse: response,
  };
}

// ── Adversarial Review ───────────────────────────────────────────────────

/** Extract findings from the adversarial review critical issues section. */
function parseAdversarialFindings(response: string): string[] {
  const findings: string[] = [];

  // Extract from Critical Issues and Recommendations sections
  for (const sectionName of ["Critical Issues", "Recommendations", "Coverage Gaps"]) {
    const section = response.match(
      new RegExp(`### ${sectionName}[^\\n]*\\n([\\s\\S]*?)(?=\\n###|\\n##|$)`),
    );
    if (!section) continue;

    const text = section[1].trim();
    if (text.toLowerCase() === "none" || text.toLowerCase() === '"none"') continue;

    const numbered = text.match(/^\d+\.\s+(.+)$/gm);
    if (numbered) {
      for (const line of numbered) {
        const item = line.replace(/^\d+\.\s+/, "").trim();
        if (item.length > 0) {
          findings.push(`[${sectionName}] ${item}`);
        }
      }
    }

    const bullets = text.match(/^[-*]\s+(.+)$/gm);
    if (bullets) {
      for (const line of bullets) {
        const item = line.replace(/^[-*]\s+/, "").trim();
        if (item.length > 0) {
          findings.push(`[${sectionName}] ${item}`);
        }
      }
    }
  }

  return findings;
}

/** Extract score values from the adversarial review. */
function parseAdversarialScores(response: string): Record<string, number> | null {
  const scores: Record<string, number> = {};
  const categories = [
    "Test Completeness",
    "Test Quality",
    "Implementation Quality",
  ];

  for (const category of categories) {
    const match = response.match(
      new RegExp(`### ${category}:\\s*(\\d)\\s*/\\s*5`),
    );
    if (match) {
      scores[category] = parseInt(match[1], 10);
    }
  }

  return Object.keys(scores).length > 0 ? scores : null;
}

export async function dispatchAdversarialReview(
  unit: WorkUnit,
  workingDir: string,
  config: TDDConfig,
): Promise<AdversarialResult> {
  const specContract = readSpecContract(unit, workingDir);
  const testFileContents = readFilesFromDisk(unit.testFiles, workingDir);
  const implFileContents = readFilesFromDisk(unit.implFiles, workingDir);

  const prompt = loadAndFillTemplate("adversarial", {
    spec_contract: specContract,
    test_file_contents: testFileContents,
    impl_file_contents: implFileContents,
    unit_name: unit.name,
    min_assertions: String(config.minAssertionsPerTest),
  });

  const response = await dispatchAgent({
    prompt,
    tools: READONLY_TOOLS,
    model: unit.modelAssignment?.reviewer ?? "sonnet",
    effort: config.effort,
    workingDir,
  });

  const verdict = parseReviewVerdict(response, ["PASS", "FAIL"]);
  const findings = parseAdversarialFindings(response);
  const score = parseAdversarialScores(response);

  return {
    status: verdict === "PASS" ? "passed" : "failed",
    findings,
    score,
    rawResponse: response,
  };
}

// ── Code Quality Review ──────────────────────────────────────────────────

/** Extract issues from the code quality review. */
function parseCodeQualityIssues(response: string): string[] {
  const issues: string[] = [];

  const issuesSection = response.match(
    /\*\*Issues\*\*:?\s*\n([\s\S]*?)(?=\n\*\*Assessment\*\*|$)/,
  );
  if (!issuesSection) return issues;

  const text = issuesSection[1].trim();
  if (text.toLowerCase() === "none") return issues;

  // Extract categorized items (Critical / Important / Minor bullet lines)
  const itemLines = text.match(/^[-*]\s+(.+)$/gm);
  if (itemLines) {
    for (const line of itemLines) {
      const item = line.replace(/^[-*]\s+/, "").trim();
      if (item.length > 0) {
        issues.push(item);
      }
    }
  }

  return issues;
}

export async function dispatchCodeQualityReview(
  unit: WorkUnit,
  workingDir: string,
  config: TDDConfig,
): Promise<CodeQualityResult> {
  const implFileContents = readFilesFromDisk(unit.implFiles, workingDir);
  const testFileContents = readFilesFromDisk(unit.testFiles, workingDir);

  // The code-quality template uses prose placeholders, not {curly} ones.
  // Build the prompt by extracting the template block and injecting context.
  const raw = loadTemplate("code-quality");
  const templateBlock = extractTemplateBlock(raw);

  // Replace the prose placeholder with actual file contents
  const formattedImpl = formatFileContents(implFileContents);
  const formattedTests = formatFileContents(testFileContents);

  const prompt = templateBlock.replace(
    "[From the implementer's or Code Writer's report \u2014 what they claim they built]",
    `### Implementation Files\n\n${formattedImpl}\n\n### Test Files\n\n${formattedTests}`,
  );

  const response = await dispatchAgent({
    prompt,
    tools: READONLY_TOOLS,
    model: unit.modelAssignment?.reviewer ?? "sonnet",
    effort: config.effort,
    workingDir,
  });

  const verdict = parseReviewVerdict(response, ["Approved", "Needs Changes"]);
  const issues = parseCodeQualityIssues(response);

  return {
    status: verdict === "Approved" ? "passed" : "failed",
    issues,
    rawResponse: response,
  };
}

/**
 * Final holistic spec compliance review.
 * Unlike per-unit reviews which check each unit against its spec-contract,
 * this checks the ENTIRE original spec against ALL implementation files.
 * Catches gaps between units, missing integrations, and requirements that
 * fell through the cracks during decomposition.
 */
export async function dispatchFinalSpecReview(
  originalSpec: string,
  allImplFiles: Record<string, string>,
  allTestFiles: Record<string, string>,
  designSummary: string | null,
  config: TDDConfig,
  workingDir: string,
): Promise<{ compliant: boolean; matrix: string; gaps: string[]; rawResponse: string }> {
  const prompt = `You are performing a FINAL holistic spec compliance review.

## Original Specification (FULL)

${originalSpec}

## Design Summary

${designSummary || "No design phase was run."}

## All Implementation Files

${formatFileContents(allImplFiles)}

## All Test Files

${formatFileContents(allTestFiles)}

## CRITICAL: Do Not Trust Prior Reviews

Per-unit reviews checked each unit against its own spec-contract. But requirements
can fall through the cracks between units. You are checking the WHOLE spec against
the WHOLE implementation.

## Your Mission

1. **Requirements Matrix**: For EVERY requirement in the original spec, verify:
   - Is it implemented? [YES / NO / PARTIAL]
   - Is it tested? [YES / NO]
   - Which file implements it?
   - If PARTIAL or NO: what is missing?

2. **Cross-Unit Integration**: Do components that should work together actually integrate?
   - Are dependency graph relationships actually wired (constructor injection, imports)?
   - Can data flow between components as the spec describes?

3. **Nobody-Owns-This Gaps**: Requirements that exist in the spec but weren't assigned to any unit.

4. **Test Quality Spot Check**: Pick 3 critical requirements and verify the tests actually
   test the right thing with exact values (not weak assertions).

## Output Format

### Verdict: COMPLIANT | NON-COMPLIANT

### Requirements Matrix
| # | Requirement | Implemented | Tested | File | Notes |
|---|------------|-------------|--------|------|-------|
| 1 | ... | YES/NO/PARTIAL | YES/NO | ... | ... |

### Cross-Unit Integration Issues
[list, or "None"]

### Gaps (requirements not covered by any unit)
[list, or "None"]

### Test Quality Spot Check
[3 requirements with test analysis]

### Blocking Issues
[numbered list of must-fix items, or "None"]`;

  const response = await dispatchAgent({
    prompt,
    tools: ["Read", "Glob", "Grep"],
    model: config.modelStrategy === "standard" ? "sonnet" : "opus",
    effort: config.effort,
    workingDir,
  });

  const upper = response.toUpperCase();
  const compliant = upper.includes("### VERDICT: COMPLIANT") && !upper.includes("### VERDICT: NON-COMPLIANT");

  // Extract gaps
  const gaps: string[] = [];
  const gapSection = response.match(/### Gaps.*?\n([\s\S]*?)(?=###|$)/i);
  if (gapSection && gapSection[1]) {
    const lines = gapSection[1].trim().split("\n").filter(l => l.trim().startsWith("-") || l.trim().startsWith("*"));
    for (const line of lines) {
      const cleaned = line.replace(/^[\s\-*]+/, "").trim();
      if (cleaned && cleaned.toLowerCase() !== "none") {
        gaps.push(cleaned);
      }
    }
  }

  // Extract matrix section
  const matrixSection = response.match(/### Requirements Matrix[\s\S]*?(?=###|$)/i);
  const matrix = matrixSection ? matrixSection[0].trim() : "";

  return { compliant, matrix, gaps, rawResponse: response };
}

/** Format a Record<path, content> as markdown file blocks. */
function formatFileContents(files: Record<string, string>): string {
  return Object.entries(files)
    .map(([filePath, content]) => `#### ${filePath}\n\`\`\`\n${content}\n\`\`\``)
    .join("\n\n");
}
