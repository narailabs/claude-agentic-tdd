# Eval 3: Existing Test — Trace

**Command**: `/tdd implement against src/__tests__/calculator.test.ts`

---

## Step 1: Skill Activation and Prerequisite Checks

1. Skill triggers on `/tdd` command.
2. Check `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` — confirmed.
3. Check git repo — confirmed.

## Step 2: Argument Parsing

- Spec text: "implement against src/__tests__/calculator.test.ts"
- No flags detected.

## Step 3: Configuration Loading

- Apply defaults (no `.tdd.config.json`, no TDD section in CLAUDE.md).
- maxParallelPairs=4, parallelMode="eager", modelStrategy="auto", effortLevel="high", maxRetries=3.

## Step 4: Session Model/Effort Detection

- Detect session model/effort. Assume sonnet/high.
- All agents capped at sonnet/high.

## Step 5: Entry Point Detection

- User says "implement against ... test" — this is **Mode 3: User-Provided Test**.
- The skill identifies the test file: `src/__tests__/calculator.test.ts`.
- Mode 3 skips: Test Writer phase, RED verification, and design gate.

## Step 6: Phase 0 — Design Gate

**SKIPPED** — Mode 3 always skips the design gate. User already has the test; the design is implicit in the test file.

## Step 7: Phase 1 — Framework Detection

1. Auto-detect from package.json: vitest (or jest) detected, TypeScript.
2. Result: language=typescript, testRunner=vitest, testCommand="npx vitest run", test file already known.

## Step 8: Phase 2 — Work Decomposition

- Read the user-provided test file `src/__tests__/calculator.test.ts` to understand what needs implementing.
- Assume the test file contains tests for: `add(a, b)`, `subtract(a, b)`, `multiply(a, b)`, `divide(a, b)` with edge cases (division by zero, floating point).
- Infer implementation file from test imports (e.g., `import { add, subtract, multiply, divide } from '../calculator'` implies `src/calculator.ts`).

**Single work unit produced**:

| Field | Value |
|-------|-------|
| id | `calculator` |
| name | Calculator |
| type | `"code"` |
| spec-contract | Derived from reading test file — implement add, subtract, multiply, divide with error handling for division by zero |
| dependsOn | `[]` |
| testFiles | `src/__tests__/calculator.test.ts` (pre-existing, user-provided) |
| implFiles | `src/calculator.ts` |

**Complexity**: Mechanical — isolated pure functions, clear spec from tests.

**Model assignment**: All sonnet/high.

**User confirmation**:
```
## TDD Work Plan

Framework: vitest (auto-detected)
Mode: user-provided-test
Work units: 1

### Unit 1: calculator [code]
Spec: Implement add, subtract, multiply, divide (from existing test file)
Test file: src/__tests__/calculator.test.ts (user-provided, will not be modified)
Implementation: src/calculator.ts
Dependencies: none

Note: Test Writer and RED verification are skipped (user owns the tests).

Proceed? [confirm/modify/cancel]
```

User confirms.

## Step 9: Phase 3 — State Initialization

1. Create `.tdd-state.json` with entry point "user-provided-test".
2. Add state files to `.gitignore`.
3. Initialize session log.

## Step 10: Phase 4 — Agent Team Orchestration

### Ready Queue

- `calculator` has no deps, immediately ready. Dispatch.

### Step 4a: Test Writer — SKIPPED

Mode 3 skips the Test Writer entirely. The user-provided test file is the test.

**However**, the lead still needs a spec-contract for the Code Writer. The lead reads the test file and generates `spec-contract-calculator.md` itself (or the step is adapted to derive it from the test file contents).

### Step 4b: RED Verification — SKIPPED

Mode 3 skips RED verification. User owns the tests; trust their quality.

**Still required**: Record checksums of the test file for GREEN verification later.
```bash
shasum -a 256 src/__tests__/calculator.test.ts
```
Store checksum in state.

### Step 4c: Spawn Code Writer

- Read `reference/code-writer-prompt.md` template.
- Read test file from disk: `src/__tests__/calculator.test.ts`.
- Read (or generate) spec-contract from disk.
- Model: sonnet/high.
- Code Writer receives:
  - Full test file contents (verbatim from disk)
  - Spec-contract
  - Framework info (vitest, typescript)
  - Target: `src/calculator.ts`
- Code Writer implements `add`, `subtract`, `multiply`, `divide` with division-by-zero error.
- Reports **DONE**.

### Step 4d: GREEN Verification

1. **Check 1 — Test Files Unchanged**: Recompute checksum of `src/__tests__/calculator.test.ts`. Compare against stored. Match. PASS.
2. **Check 2 — No Skip Markers**: Grep for `.skip`, `xit`, `.only`, etc. None added. PASS.
3. **Check 3 — All Tests Pass**: Run `npx vitest run src/__tests__/calculator.test.ts`. Exit code == 0. PASS.
4. **Check 4 — No Hardcoded Returns**: Read `src/calculator.ts`. Functions have real logic. PASS.

### Step 4e: Spec Compliance Review

- Read `reference/spec-compliance-reviewer-prompt.md`.
- Spawn reviewer (sonnet/high) with:
  - spec-contract (derived from test file)
  - No design summary
  - Test file contents
  - Implementation file contents
- Reviewer checks: all functions from tests are implemented, edge cases handled, API matches imports.
- **Verdict: COMPLIANT**.

### Step 4f: Adversarial Review

- Read `reference/adversarial-reviewer-prompt.md`.
- Spawn reviewer (sonnet/high) with spec-contract, test + impl files.
- Checks: edge case coverage, hardcoded returns, test-implementation coupling, cheating detection.
- Cross-reference anti-patterns doc.
- **Verdict: PASS**.

### Step 4g: Code Quality Review

- Read `reference/code-quality-reviewer-prompt.md`.
- Spawn reviewer (sonnet/high) with impl, tests, git diff.
- Checks: single responsibility, clear naming, no overbuilding, follows project patterns.
- **Assessment: Approved**.

**calculator COMPLETED.**

## Step 11: Phase 5 — Final Review

1. Run full test suite: `npx vitest run`. All tests pass.
2. Pristine output: no warnings, no skipped.
3. Single unit — no cross-unit integration concerns.

## Step 12: Phase 6 — Report Generation

Generate `tdd-report.md`:
- 1/1 units completed
- Mode: user-provided-test
- Test Writer: skipped (user-provided)
- RED verification: skipped
- GREEN verification: passed
- All reviews passed
- 0 anti-cheat violations

Generate `tdd-session.jsonl`.

## Step 13: Phase 7 — Cleanup

1. Shut down teammates.
2. Delete `spec-contract-calculator.md`.
3. Final state update.
4. Present report.
5. Suggest: "Run `npx vitest run` to verify, then commit."
