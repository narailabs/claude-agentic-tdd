# Eval 1: Simple Utility — Trace

**Command**: `/tdd implement a string utility module with functions: capitalize(str), truncate(str, maxLen), slugify(str)`

---

## Step 1: Skill Activation and Prerequisite Checks

1. Skill triggers on `/tdd` command invocation.
2. Check `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` — confirm set.
3. Check git repo — confirm present.

## Step 2: Argument Parsing

- Spec text: "implement a string utility module with functions: capitalize(str), truncate(str, maxLen), slugify(str)"
- No flags detected (`--skip-failed`, `--config`, `--design`, `--skip-design`, `--effort` all absent).

## Step 3: Configuration Loading

1. Check for `.tdd.config.json` — not found; use defaults.
2. Check project CLAUDE.md for `## TDD Configuration` — none found.
3. Apply defaults:
   - `antiCheat.minAssertionsPerTest`: 1
   - `antiCheat.maxRetries`: 3
   - `antiCheat.maxMockDepth`: 2
   - `execution.maxParallelPairs`: 4
   - `execution.parallelMode`: "eager"
   - `execution.modelStrategy`: "auto"
   - `execution.effortLevel`: "high"

## Step 4: Session Model/Effort Detection

- Detect current session model and effort (ceiling). Assume session is on sonnet/high (typical).
- Since session ceiling is sonnet/high, all agents capped at sonnet/high regardless of complexity.

## Step 5: Entry Point Detection

- Natural language spec (Mode 1 — default). No "add tests to", no "implement against", no plan file.

## Step 6: Phase 0 — Design Gate Evaluation

**Trigger check**:
- Spec mentions 3 functions but they are all in one module — NOT 3 distinct components/features.
- No external integrations, no ambiguity about data flow.
- No `--design` flag.
- Single-unit-like spec with clear inputs/outputs.

**Decision**: SKIP design gate. This is a simple utility spec.

## Step 7: Phase 1 — Framework Detection

1. Read `reference/framework-detection.md` algorithm.
2. Check `.tdd.config.json` — not found.
3. Check CLAUDE.md for test conventions — none.
4. Auto-detect: run `cat package.json`. Look for vitest/jest/mocha in deps.
   - Assume `vitest` found in devDependencies, `tsconfig.json` exists.
5. Result:
   - language: "typescript"
   - testRunner: "vitest"
   - testCommand: "npx vitest run"
   - testFilePattern: "**/*.test.ts"
   - sourceDir: "src/"
   - testDir: "src/__tests__/"

## Step 8: Phase 2 — Work Decomposition

Analyze spec: three functions in a single string utility module. All pure functions, no dependencies between them, clear inputs/outputs.

**Decomposition options**:
- Option A: 1 unit (string-utils) covering all three functions.
- Option B: 3 units, one per function.

The skill would likely choose **1 unit** since these are closely related utilities in one module. Three simple functions in one file is natural.

**Work unit produced**:

| Field | Value |
|-------|-------|
| id | `string-utils` |
| name | String Utilities |
| type | `"code"` |
| spec-contract | Implement a string utility module exporting: `capitalize(str)` — capitalizes the first letter, lowercases the rest; `truncate(str, maxLen)` — truncates to maxLen, adds "..." if truncated; `slugify(str)` — lowercases, replaces non-alphanumeric with hyphens, trims hyphens |
| dependsOn | `[]` |
| testFiles | `src/__tests__/string-utils.test.ts` |
| implFiles | `src/string-utils.ts` |

**Complexity assessment**: Mechanical — isolated functions, clear spec, 1-2 files.

**Model assignment** (capped at session ceiling sonnet/high):
- Test Writer: sonnet/high
- Code Writer: sonnet/high
- Spec Compliance Reviewer: sonnet/high
- Adversarial Reviewer: sonnet/high
- Code Quality Reviewer: sonnet/high

**User confirmation presented**:
```
## TDD Work Plan

Framework: vitest (auto-detected)
Mode: natural-language-spec
Work units: 1

### Unit 1: string-utils [code]
Spec: Implement capitalize(str), truncate(str, maxLen), slugify(str) with edge case handling
Files: src/__tests__/string-utils.test.ts -> src/string-utils.ts
Dependencies: none

Execution plan (eager dispatch, max 4 concurrent):
  Ready immediately: string-utils

Proceed? [confirm/modify/cancel]
```

User confirms.

## Step 9: Phase 3 — State Initialization

1. Check for `.tdd-state.json` — not found, create new.
2. Add `.tdd-state.json`, `tdd-session.jsonl`, `spec-contract-*.md` to `.gitignore`.
3. Initialize `tdd-session.jsonl` with `session.start` event.
4. Write `.tdd-state.json` with unit status "pending".

## Step 10: Phase 4 — Agent Team Orchestration

### Ready Queue Initialization

- `string-utils` has no dependencies, added to ready queue immediately.
- Pop 1 unit (only 1 exists), dispatch.

### Step 4a: Spawn Test Writer (string-utils)

- Read `reference/test-writer-prompt.md` template.
- Fill placeholders: spec-contract for capitalize/truncate/slugify, vitest framework, test file path `src/__tests__/string-utils.test.ts`, min_assertions=1.
- Spawn Test Writer teammate (sonnet/high).
- Test Writer writes `src/__tests__/string-utils.test.ts` with describe blocks for each function:
  - `capitalize`: "should capitalize first letter", "should handle empty string", "should handle single char", "should lowercase rest"
  - `truncate`: "should return string as-is if under maxLen", "should truncate and add ellipsis", "should handle zero maxLen", "should handle empty string"
  - `slugify`: "should lowercase and replace spaces with hyphens", "should remove special characters", "should trim leading/trailing hyphens", "should collapse multiple hyphens", "should handle empty string"
- Test Writer also creates `spec-contract-string-utils.md` in the same directory.
- Test Writer reports DONE.
- Lead verifies both files exist on disk.

### Step 4b: RED Verification

1. **Check 1 — Tests Exist**: `test -f src/__tests__/string-utils.test.ts` — PASS.
2. **Check 2 — Tests Fail (RED)**: Run `npx vitest run src/__tests__/string-utils.test.ts`. Exit code != 0 (cannot find module `../string-utils`). PASS — tests are properly RED.
3. **Check 3 — Correct Failure Type**: Parse output. Errors are "Cannot find module" / "ModuleNotFoundError" — acceptable failure type. PASS.
4. **Check 4 — Assertion Density**: Read test file, count expect() calls per test. ~12-15 assertions across ~12-13 tests. Ratio >= 1. PASS.
5. **Check 5 — Behavior-Over-Implementation**: Scan for mocks (none — pure functions). No private method access. No implementation mirroring. PASS.
6. **Record Checksums**: `shasum -a 256 src/__tests__/string-utils.test.ts` stored in state file.

### Step 4c: Spawn Code Writer (string-utils)

- Read `reference/code-writer-prompt.md` template.
- Read test file from disk (NOT from Test Writer output — information barrier).
- Read `spec-contract-string-utils.md` from disk.
- Fill template with test contents, spec-contract, vitest framework info, target `src/string-utils.ts`.
- Spawn Code Writer teammate (sonnet/high).
- Code Writer creates `src/string-utils.ts` with three exported functions implementing capitalize, truncate, slugify.
- Code Writer reports DONE.

### Step 4d: GREEN Verification

1. **Check 1 — Test Files Unchanged**: Recompute checksum of `src/__tests__/string-utils.test.ts`, compare against stored. Match. PASS.
2. **Check 2 — No Skip Markers**: Grep for `xit`, `.skip`, `.only`, etc. None found. PASS.
3. **Check 3 — All Tests Pass**: Run `npx vitest run src/__tests__/string-utils.test.ts`. Exit code == 0. All tests green. PASS.
4. **Check 4 — No Hardcoded Returns (heuristic)**: Read implementation. Functions have logic (not just return literals). PASS.

### Step 4e: Spec Compliance Review

- Read `reference/spec-compliance-reviewer-prompt.md`.
- Spawn Spec Compliance Reviewer (sonnet/high) with:
  - spec-contract from disk
  - No design summary (Phase 0 skipped)
  - Test file contents from disk
  - Implementation file contents from disk
- Reviewer checks each requirement: capitalize, truncate, slugify — all implemented and tested.
- Checks for missing requirements, scope creep, API contract accuracy.
- **Verdict: COMPLIANT**. Proceed.

### Step 4f: Adversarial Review

- Read `reference/adversarial-reviewer-prompt.md`.
- Spawn Adversarial Reviewer (sonnet/high) with spec-contract, test files, impl files, scoring rubric.
- Reviewer checks: edge cases covered, no test-implementation coupling, no cheating, good assertion quality.
- Cross-references `reference/testing-anti-patterns.md` — no anti-patterns detected (pure functions, no mocks).
- **Verdict: PASS**.

### Step 4g: Code Quality Review

- Read `reference/code-quality-reviewer-prompt.md`.
- Spawn Code Quality Reviewer (sonnet/high) with impl files, test files, git diff.
- Reviewer checks: single responsibility (one utility module), clear naming, no overbuilding, follows project patterns.
- **Assessment: Approved**.

Mark `string-utils` as completed in state file.

## Step 11: Phase 5 — Final Review

1. Run full test suite: `npx vitest run`. All tests pass. Exit code 0.
2. Verify pristine output: no warnings, no skipped, no pending.
3. Holistic review: single unit, no cross-unit concerns.
4. Integration check: N/A (single unit).

## Step 12: Phase 6 — Report Generation

1. Generate `tdd-report.md` with summary: 1/1 units completed, ~12-15 tests, ~12-15 assertions, 0 anti-cheat violations, all reviews passed.
2. Generate `tdd-session.jsonl` with all events logged.

## Step 13: Phase 7 — Cleanup

1. Clean up agent team (shut down teammates).
2. Delete `spec-contract-string-utils.md`.
3. Final state file update.
4. Present report to user.
5. Suggest: "Run full test suite with `npx vitest run`, then commit changes."
