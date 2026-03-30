import {
  type WorkUnit,
  type FrameworkInfo,
  type TDDConfig,
  type EntryMode,
  UnitType,
  Complexity,
  createWorkUnit,
} from "../types.js";
import { dispatchAgent } from "./base.js";

/** Shape of a single work unit in the decomposer's JSON output. */
interface RawDecomposedUnit {
  id: string;
  name: string;
  unitType?: string;
  specContract: string;
  dependsOn?: string[];
  testFiles?: string[];
  implFiles?: string[];
  complexity?: string;
}

/**
 * Build the decomposition prompt. The agent is asked to analyse the spec
 * and break it into ordered, dependency-aware work units.
 */
function buildDecompositionPrompt(
  spec: string,
  entryMode: EntryMode,
  framework: FrameworkInfo | null,
  designSummary: string | null,
): string {
  const frameworkSection = framework
    ? [
        `Language: ${framework.language}`,
        `Test runner: ${framework.testRunner}`,
        `Test command: ${framework.testCommand}`,
        `Test file pattern: ${framework.testFilePattern}`,
        `Source directory: ${framework.sourceDir}`,
        `Test directory: ${framework.testDir}`,
      ].join("\n")
    : "No framework detected. Determine the appropriate language and framework from the spec.";

  const designSection = designSummary
    ? `## Design Summary\n\n${designSummary}`
    : "";

  return `You are decomposing a feature specification into work units for a TDD pipeline.

## Specification

${spec}

${designSection}

## Entry Mode

${String(entryMode)}

## Framework

${frameworkSection}

## Your Task

Analyse the specification and break it into ordered work units. Each unit should be
independently testable and small enough for a single Test Writer / Code Writer pair.

Consider:
- Dependencies between units (a unit can only start after its dependencies complete)
- Logical grouping (related functions in one unit)
- Appropriate file paths for tests and implementation

## Output Format

Return ONLY a JSON array. No markdown fencing, no explanation text. Each element:

\`\`\`
{
  "id": "string - unique identifier like 'wu-1', 'wu-2'",
  "name": "string - short descriptive name",
  "unitType": "'code' | 'task'",
  "specContract": "string - detailed spec for this unit including expected API surface",
  "dependsOn": ["array of unit IDs this depends on"],
  "testFiles": ["array of test file paths to create"],
  "implFiles": ["array of implementation file paths to create"],
  "complexity": "'mechanical' | 'standard' | 'architecture'"
}
\`\`\`

Rules:
- Every code unit MUST have at least one test file and one impl file
- Task units (unitType: "task") are for non-code work (config, docs, migrations)
- Order units so dependencies come first
- Use descriptive IDs and names
- Keep specContract detailed enough for a Test Writer to write comprehensive tests
- Set complexity based on the unit's scope:
  - mechanical: simple, repetitive, pattern-following
  - standard: typical feature work
  - architecture: complex design decisions, multiple concerns`;
}

/**
 * Parse a complexity string into the Complexity enum, with a safe default.
 */
function parseComplexity(value: string | undefined): Complexity {
  switch (value) {
    case "mechanical":
      return Complexity.MECHANICAL;
    case "architecture":
      return Complexity.ARCHITECTURE;
    default:
      return Complexity.STANDARD;
  }
}

/**
 * Parse a unit type string into the UnitType enum, with a safe default.
 */
function parseUnitType(value: string | undefined): UnitType {
  return value === "task" ? UnitType.TASK : UnitType.CODE;
}

/**
 * Extract a JSON array from a response that may contain markdown fencing
 * or surrounding text.
 */
function extractJsonArray(response: string): string {
  // Try to find JSON within markdown code fences
  const fencedMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  // Try to find a raw JSON array
  const arrayMatch = response.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  return response.trim();
}

/**
 * Decompose a feature specification into work units by dispatching
 * an agent with read-only tools. The agent analyses the spec and
 * existing codebase (for Mode 2/4) and returns structured work units.
 */
export async function decomposeSpec(
  spec: string,
  entryMode: EntryMode,
  framework: FrameworkInfo | null,
  designSummary: string | null,
  config: TDDConfig,
  workingDir: string,
): Promise<WorkUnit[]> {
  const prompt = buildDecompositionPrompt(spec, entryMode, framework, designSummary);

  const response = await dispatchAgent({
    prompt,
    tools: ["Read", "Glob", "Grep"],
    model: "sonnet",
    effort: config.effort,
    workingDir,
  });

  // Parse the JSON response
  const jsonText = extractJsonArray(response);
  let rawUnits: RawDecomposedUnit[];
  try {
    rawUnits = JSON.parse(jsonText) as RawDecomposedUnit[];
  } catch {
    throw new Error(
      `Failed to parse decomposition response as JSON.\nResponse:\n${response}`,
    );
  }

  if (!Array.isArray(rawUnits)) {
    throw new Error(
      `Decomposition response is not an array.\nParsed value: ${JSON.stringify(rawUnits)}`,
    );
  }

  // Convert raw JSON to WorkUnit instances via the factory function
  const workUnits: WorkUnit[] = [];
  for (const raw of rawUnits) {
    const unit = createWorkUnit(raw.id, raw.name, raw.specContract, {
      unitType: parseUnitType(raw.unitType),
      dependsOn: raw.dependsOn ?? [],
      complexity: parseComplexity(raw.complexity),
    });

    // Attach file paths from the decomposer's output
    unit.testFiles = raw.testFiles ?? [];
    unit.implFiles = raw.implFiles ?? [];

    workUnits.push(unit);
  }

  return workUnits;
}
