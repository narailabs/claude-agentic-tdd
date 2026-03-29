# Execution Trace: `/tdd add test coverage for src/utils/ --skip-design`

## Overview

This trace walks through exactly what the TDD skill does when invoked with an "add test coverage" command targeting an existing codebase, with the `--skip-design` flag. This is an iteration-2 trace -- the skill now explicitly documents the "Coverage Mode RED Verification" hide-and-restore procedure (SKILL.md lines 283-288, anti-cheat.md "Coverage Mode RED Verification" section), resolving the gap identified in iteration-1.

---

## Step 1: Skill Activation and Argument Parsing

**Trigger**: The `/tdd` slash command activates the skill. The `$ARGUMENTS` string is:
```
add test coverage for src/utils/ --skip-design
```

**Parsing** (SKILL.md, "Arguments" section, lines 28-35):
- Specification text extracted: `"add test coverage for src/utils/"`
- Flag `--skip-design` detected and stored: `skipDesign = true`
- No `--skip-failed`, `--config`, or `--design` flags present

**Result**: The orchestrator has a spec and knows to skip the design gate.

---

## Step 2: Prerequisites Check

**Action** (SKILL.md, "Prerequisites", lines 19-24):

1. Check `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set to `1`:
   - If not set, halt with: "Agent teams are required for agentic-tdd. Enable them by adding `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"` to the `env` section of your `.claude/settings.json`, then restart Claude Code."
2. Check the project is a git repository:
   ```bash
   git rev-parse --git-dir
   ```
   - If not, warn but continue.

**Result**: Both checks pass. The orchestrator proceeds.

---

## Step 3: Entry Point Detection -- Mode 2 (Existing Codebase)

**Decision logic** (SKILL.md, "Entry Point Detection", lines 98-103):

The skill examines the specification text and matches against three patterns:

| Mode | Pattern | Match? |
|------|---------|--------|
| 1. Natural language spec | Generic feature description | No |
| 2. Existing codebase | "add tests to..." or "add test coverage for..." | **YES** |
| 3. User-provided test | "implement against this test..." or provides a test file | No |

The phrase "add test coverage for src/utils/" directly matches Mode 2. The skill sets:
```
entryPoint = "existing-codebase"
```

### What Mode 2 means for the rest of the flow

The SKILL.md "Mode-Specific Adaptations" section (lines 105-116) explicitly describes how Mode 2 differs:

1. **Design gate**: Skip by default. Only trigger if the user explicitly passes `--design`.
2. **Test Writer**: Receives spec-contracts derived from reading existing source files (reverse-engineered behavior specs, not forward requirements).
3. **RED verification**: Adapted -- see "Coverage Mode RED Verification" (lines 283-288 and anti-cheat.md).
4. **Code Writer**: May be a no-op if characterization tests already pass against existing code. If tests pass immediately, skip Code Writer and proceed to review.
5. **GREEN verification**: Standard -- tests must pass and test files must be unchanged.

This is the fundamental difference from standard TDD: we are documenting existing behavior, not creating new behavior.

---

## Step 4: Configuration Loading

**Action** (SKILL.md, "Configuration Loading", lines 39-95):

1. Check for `.tdd.config.json` at project root:
   ```bash
   cat .tdd.config.json 2>/dev/null
   ```
   If found, parse and apply. If not, continue.

2. Check project `CLAUDE.md` for a `## TDD Configuration` section.

3. Apply defaults:
   ```
   antiCheat.minAssertionsPerTest: 1
   antiCheat.maxRetries: 3
   antiCheat.maxMockDepth: 2
   antiCheat.flagPrivateMethodTests: true
   execution.maxParallelPairs: 3
   execution.skipFailedAfterRetries: false
   execution.modelStrategy: "auto"
   reporting.generateReport: true
   reporting.generateSessionLog: true
   ```

4. Model strategy "auto" is noted for later use during complexity assessment.

**Result**: Merged configuration stored, ready to pass to all agents.

---

## Step 5: Phase 0 -- Design Gate (SKIPPED)

**Decision** (SKILL.md, "Phase 0: Design Gate", lines 118-168):

Two independent skip conditions both apply here:

1. The `--skip-design` flag was parsed in Step 1. The skill checks (line 133):
   > "Skip when: ... User passes `--skip-design`"

2. Mode 2 auto-skips the design gate (line 107):
   > "Design gate: Skip by default (characterizing existing code, not designing new features). Only trigger if the user explicitly passes `--design`."

Both conditions independently cause the skip. Even without `--skip-design`, Mode 2 would skip the design gate unless `--design` is explicitly passed. This is a specification improvement from iteration-1, where Mode 2 did not have an explicit auto-skip rule; now SKILL.md line 107 makes it clear.

**Result**: Phase 0 is entirely skipped. No clarifying questions, no design summary, no user approval gate. `designSummary` is set to `null` in the state file.

---

## Step 6: Phase 1 -- Framework Detection

**Action** (SKILL.md line 171, reference/framework-detection.md):

The skill runs the detection algorithm in priority order:

1. Check `.tdd.config.json` for explicit framework config (highest priority)
2. Check project `CLAUDE.md` for `## TDD Configuration`
3. Auto-detect from project files:
   - Check `package.json` for JS/TS frameworks
   - Check `pyproject.toml`, `pytest.ini` for Python
   - Check `go.mod` for Go
   - etc.

Suppose `package.json` contains `vitest` as a devDependency and a `tsconfig.json` is present:
```
framework:
  language: "typescript"
  testRunner: "vitest"
  testCommand: "npx vitest run"
  testFilePattern: "**/*.test.ts"
  sourceDir: "src/"
  testDir: "src/__tests__/"
```

4. If detection fails, ask the user for their test command.

**Result**: Framework info detected and stored. Applies identically to all modes.

---

## Step 7: Phase 2 -- Work Decomposition (Coverage-Specific)

**Action** (SKILL.md, "Phase 2: Work Decomposition", lines 184-233):

### How coverage mode decomposition differs

In standard TDD, decomposition analyzes the specification text. In coverage mode, decomposition analyzes the existing source files.

**Step 7a: Read the target directory**

The orchestrator reads `src/utils/`:
```bash
ls src/utils/
```

Suppose it finds:
```
src/utils/
  stringHelpers.ts
  dateFormatter.ts
  validation.ts
  apiClient.ts
```

**Step 7b: Read and analyze each source file**

This is a critical step unique to coverage mode. For each source file, the orchestrator reads the full file contents:

```bash
cat src/utils/stringHelpers.ts
```

From reading the source, the orchestrator extracts:
- Exported function/class signatures
- Parameter types and return types
- Observable behavior (what each function does)
- Edge case handling visible in the code
- Dependencies and imports

Example analysis for `stringHelpers.ts`:
```
Exports:
  - capitalize(str: string): string
    Behavior: Uppercases first character, lowercases rest.
    Edge cases: empty string returns "", single char works.

  - slugify(str: string): string
    Behavior: Lowercases, replaces spaces with hyphens, strips non-alphanumeric.
    Edge cases: multiple spaces, leading/trailing spaces, special characters.

  - truncate(str: string, maxLen: number): string
    Behavior: Returns first maxLen chars + "..." if string > maxLen, else full string.
    Edge cases: maxLen=0, maxLen > string length, negative maxLen.
```

This analysis produces a **reverse-engineered spec-contract** describing what the code currently does. This is characterization -- documenting actual behavior, not intended behavior.

**Step 7c: Create work units**

Each source file becomes a work unit:

- **id**: `string-helpers`, `date-formatter`, `validation`, `api-client`
- **name**: "String Helpers", "Date Formatter", "Validation", "API Client"
- **spec-contract**: The behavioral description derived from reading the source file
- **dependsOn**: Analyze cross-imports between utils files
- **testFiles**: Following detected conventions, e.g., `src/__tests__/stringHelpers.test.ts`
- **implFiles**: `src/utils/stringHelpers.ts` (already exists!)

**Step 7d: Complexity assessment**

For model strategy "auto" (SKILL.md lines 66-85):
- `string-helpers`: Simple (1 file, pure functions, no deps) -- `haiku` for Test Writer/Code Writer, `sonnet` for reviewer
- `date-formatter`: Simple -- same model assignment
- `validation`: Simple -- same model assignment
- `api-client`: Standard (imports external deps, does HTTP) -- `sonnet` for all agents

**Step 7e: User confirmation**

```
## TDD Work Plan

Framework: vitest (auto-detected)
Mode: existing-codebase
Work units: 4

### Unit 1: string-helpers
Spec: Characterization tests for stringHelpers.ts -- capitalize(), slugify(), truncate()
Files: src/__tests__/stringHelpers.test.ts -> src/utils/stringHelpers.ts (exists)
Dependencies: none

### Unit 2: date-formatter
Spec: Characterization tests for dateFormatter.ts -- formatDate(), parseISO(), relativeTime()
Files: src/__tests__/dateFormatter.test.ts -> src/utils/dateFormatter.ts (exists)
Dependencies: none

### Unit 3: validation
Spec: Characterization tests for validation.ts -- isEmail(), isURL(), validateSchema()
Files: src/__tests__/validation.test.ts -> src/utils/validation.ts (exists)
Dependencies: none

### Unit 4: api-client
Spec: Characterization tests for apiClient.ts -- get(), post(), handleError()
Files: src/__tests__/apiClient.test.ts -> src/utils/apiClient.ts (exists)
Dependencies: none

Execution plan: All units independent, run up to 3 in parallel.

Proceed? [confirm/modify/cancel]
```

**HARD GATE**: Wait for user confirmation. If modified, adjust and re-present. If cancelled, stop.

---

## Step 8: Phase 3 -- State Initialization

**Action** (SKILL.md line 236, reference/state-management.md):

1. Check for existing `.tdd-state.json`:
   - If found: show progress, offer resume/restart/add-units
   - If not found: create new state file

2. Add to `.gitignore` (if not already present):
   ```
   # agentic-tdd state and intermediate files
   .tdd-state.json
   tdd-session.jsonl
   spec-contract-*.md
   ```

3. Initialize state file with:
   ```json
   {
     "version": "1.0.0",
     "sessionId": "<uuid>",
     "startedAt": "2026-03-28T...",
     "spec": "add test coverage for src/utils/",
     "designSummary": null,
     "entryPoint": "existing-codebase",
     "framework": { "language": "typescript", "testRunner": "vitest", ... },
     "config": { "minAssertionsPerTest": 1, "maxRetries": 3, ... },
     "workUnits": [ ... all 4 units with status "pending" ... ]
   }
   ```

4. Initialize `tdd-session.jsonl` with:
   ```json
   {"timestamp":"...","event":"session.start","unitId":null,"data":{"spec":"add test coverage for src/utils/","entryPoint":"existing-codebase","framework":{"language":"typescript","testRunner":"vitest"}}}
   ```

---

## Step 9: Phase 4 -- Agent Team Orchestration (Per Work Unit)

The orchestrator processes each work unit through the full pipeline. We trace one unit in detail: `string-helpers`.

### Step 9a: Spawn Test Writer

**Action** (SKILL.md lines 254-270, reference/test-writer-prompt.md):

The orchestrator reads `reference/test-writer-prompt.md` and fills the template:

```
You are a Test Writer in an enforced TDD workflow. Your ONLY job is to write
failing tests that describe the desired BEHAVIOR of a feature. You must NOT
write any implementation code.

## Your Assignment

Module: stringHelpers
Exports: capitalize(str: string): string, slugify(str: string): string,
         truncate(str: string, maxLen: number): string

capitalize: Returns input string with first character uppercased, rest lowercased.
  Returns empty string for empty input. Single character input returns uppercased char.

slugify: Converts string to URL-safe slug. Lowercases, replaces spaces with hyphens,
  strips non-alphanumeric characters. Handles multiple consecutive spaces, leading/
  trailing whitespace, and special characters.

truncate: Returns first maxLen characters followed by "..." if string exceeds maxLen.
  Returns full string if shorter or equal. Handles maxLen=0, maxLen > string.length.

## Framework

- Language: TypeScript
- Test runner: Vitest
- Test command: npx vitest run
- Test file(s) to create: src/__tests__/stringHelpers.test.ts

## Project Conventions

[extracted from project CLAUDE.md, or "No specific conventions."]

## Rules (Non-Negotiable)

1. WRITE TESTS ONLY. Do not create implementation files.
2. TESTS MUST FAIL. Every test you write must fail when run...
3. TEST BEHAVIOR, NOT IMPLEMENTATION...
4. MEANINGFUL ASSERTIONS. Each test function must contain at least 1 assertion(s)...
5. EDGE CASES...
6. TEST NAMING...
7. STRUCTURE...
```

**Coverage-mode nuance**: The spec-contract given to the Test Writer was derived from reading the actual source code. It describes what the code *does*, not what someone *wants* it to do. The Test Writer does NOT know the implementation exists -- it receives a behavioral spec and writes tests as if targeting unbuilt code.

The Test Writer spawns and produces:
- `src/__tests__/stringHelpers.test.ts` -- test file with describe blocks, individual test cases, meaningful assertions
- `spec-contract-string-helpers.md` -- machine-readable spec contract

After the Test Writer completes, the orchestrator verifies both outputs exist on disk (SKILL.md lines 266-270):
```bash
test -f "src/__tests__/stringHelpers.test.ts"
test -f "src/__tests__/spec-contract-string-helpers.md"
```

### Step 9b: RED Verification -- Coverage Mode (Hide-and-Restore)

**Action** (SKILL.md lines 283-288, reference/anti-cheat.md "Coverage Mode RED Verification"):

This is the key difference from iteration-1. The SKILL.md now explicitly describes this procedure:

> **Mode 2 (Existing Codebase) -- Coverage Mode RED Verification:**
> 1. **Hide the implementation**: Temporarily rename the source file(s) being characterized.
> 2. **Run tests**: They should fail with import/module errors (proving they actually depend on the real code).
> 3. **Restore the implementation**: Rename back.
> 4. **Run tests again**: They should PASS (proving characterization is accurate).
> See `reference/anti-cheat.md` -> "Coverage Mode RED Verification" for the full procedure.

And `reference/anti-cheat.md` provides the detailed procedure:

#### Check 1: Tests Exist (standard, always applies)

```bash
test -f "src/__tests__/stringHelpers.test.ts"
```
Pass -- the Test Writer created the file.

#### Coverage Mode Check 2-3 Replacement: Hide-and-Restore

**Step 1: Hide the implementation**
```bash
mv "src/utils/stringHelpers.ts" "src/utils/stringHelpers.ts.tdd-hidden"
```

The source file is temporarily renamed. Any imports like `import { capitalize } from '../utils/stringHelpers'` will now fail to resolve.

**Step 2: Run tests -- they should fail with import/module errors**
```bash
npx vitest run src/__tests__/stringHelpers.test.ts 2>&1; echo "EXIT_CODE:$?"
```

Expected result: exit code != 0, with errors like:
```
Error: Cannot find module '../utils/stringHelpers'
```

**If exit code == 0 (tests pass even without the implementation file)**: This is an anti-cheat violation. The tests are tautological -- they do not actually import or depend on the real code. The Test Writer is re-prompted:
> "Your tests pass even when the implementation file is removed. They must import and test the actual code."

**If exit code != 0 with import/module errors**: GOOD. The tests genuinely depend on the implementation. This proves the tests are not self-contained tautologies.

**Step 3: Restore the implementation**
```bash
mv "src/utils/stringHelpers.ts.tdd-hidden" "src/utils/stringHelpers.ts"
```

The source file is back in its original location.

**Step 4: Run tests again -- they should pass**
```bash
npx vitest run src/__tests__/stringHelpers.test.ts 2>&1; echo "EXIT_CODE:$?"
```

Expected result: exit code == 0, all tests pass.

**If exit code != 0 (tests fail against the existing implementation)**: The characterization is inaccurate. The Test Writer mischaracterized the code. Re-prompt:
> "Your characterization tests fail against the existing implementation. They must describe what the code actually does, not what you think it should do."

**If exit code == 0**: Characterization is accurate. The tests correctly describe the existing behavior. Proceed.

#### Check 4: Assertion Density (standard, always applies)

Read `src/__tests__/stringHelpers.test.ts` and count assertion patterns per test function:
- `expect(`, `toBe(`, `toEqual(`, `toThrow(`, `toContain(`, `toMatch(`, etc.
- Must meet `minAssertionsPerTest` (default: 1)
- Exclude trivial assertions like `expect(true).toBe(true)` or `toBeDefined()` as sole assertion

Characterization tests typically have high assertion density since we can verify exact return values from reading the source.

#### Check 5: Behavior-Over-Implementation (standard, always applies)

Scan for anti-patterns:
- **Excessive mocking**: Count mock/spy/stub declarations per file. If mocks > 2x test functions, flag.
- **Private method testing**: Direct access to `._privateMethod` or `.__internal` patterns. If `flagPrivateMethodTests` is true (default), flag.
- **Implementation mirroring**: Test structure that exactly mirrors internal helper functions 1:1.

This check is especially important for coverage mode. When the Test Writer's spec-contract was derived from reading source code, there is a stronger temptation to test internals.

#### Record Checksums

After all RED verification checks pass:
```bash
shasum -a 256 "src/__tests__/stringHelpers.test.ts" | cut -d' ' -f1
```

Store in state file under `redVerification.testFileChecksums`:
```json
{
  "src/__tests__/stringHelpers.test.ts": "a1b2c3d4..."
}
```

State file updated: unit status transitions to `code-writing`.

### Step 9c: Code Writer -- Potential No-Op

**Action** (SKILL.md lines 300-316, reference/code-writer-prompt.md):

This is the second major coverage-mode adaptation. The SKILL.md explicitly states (lines 110-111):

> **Code Writer**: May be a no-op if characterization tests already pass against existing code. If tests pass immediately, skip Code Writer and proceed to review.

**Decision point**: During the hide-and-restore RED verification (Step 4), the orchestrator already ran the tests with the implementation present and they passed. This means the characterization tests accurately describe the existing behavior and no code changes are needed.

**The orchestrator skips the Code Writer entirely for this unit.**

This is the expected happy path for pure characterization. The implementation already exists and the tests already pass against it. There is nothing for the Code Writer to do.

**When the Code Writer would NOT be skipped**: If the RED verification Step 4 revealed that some characterization tests fail (e.g., the Test Writer described ideal behavior that differs from actual behavior), the Code Writer would be spawned to make adjustments. But this is an uncommon case for well-characterized code.

If the Code Writer were spawned, it would receive (per reference/code-writer-prompt.md):
- Test file contents (read from disk -- information barrier maintained)
- `spec-contract-string-helpers.md` contents (read from disk)
- Framework info
- Target impl file: `src/utils/stringHelpers.ts`
- Instructions: "Make these tests pass. Do NOT modify any test files."
- The Code Writer would read the existing file, note it already satisfies most tests, and make minimal patches if needed.

**Result for this trace**: Code Writer is a no-op. Proceed directly to review.

### Step 9d: GREEN Verification

**Action** (reference/anti-cheat.md, "GREEN Verification"):

Even when the Code Writer is skipped, GREEN verification still runs to establish the baseline.

#### Check 1: Test Files Unchanged
```bash
shasum -a 256 "src/__tests__/stringHelpers.test.ts" | cut -d' ' -f1
```
Compare against stored checksum from RED verification. They must match.

Since the Code Writer was skipped (no agent touched any files after RED verification), the checksums are guaranteed to match.

#### Check 2: No Skip/Focus Markers Added
```bash
grep -n 'xit\b\|xdescribe\b\|\.skip\b\|@pytest\.mark\.skip\|@skip\|t\.Skip\|@Ignore\|@Disabled\|pending(' "src/__tests__/stringHelpers.test.ts"
```
```bash
grep -n '\.only\b\|fdescribe\b\|fit\b' "src/__tests__/stringHelpers.test.ts"
```
No new markers should be present.

#### Check 3: All Tests Pass
```bash
npx vitest run src/__tests__/stringHelpers.test.ts 2>&1; echo "EXIT_CODE:$?"
```
Exit code must be 0. Since the implementation exists and the characterization was verified accurate in RED Step 4, this passes.

#### Check 4: No Hardcoded Returns (Heuristic)
Read the implementation file and check for suspicious patterns. In coverage mode, this is less relevant -- the implementation was written by a human, not by a Code Writer trying to cheat. But the check still runs for completeness. Any findings are flagged in the report but don't block.

**Result**: GREEN verification passes. Unit proceeds to review.

### Step 9e: Spec Compliance Review

**Action** (SKILL.md lines 329-349, reference/spec-compliance-reviewer-prompt.md):

Spawn a Spec Compliance Reviewer teammate with:
- `spec-contract-string-helpers.md` (read from disk)
- Design summary: `null` (Phase 0 was skipped)
- Test file contents (read from disk)
- Implementation file contents (read from disk)

The reviewer checks:
1. **Requirement coverage**: Is every function in the spec-contract tested and implemented?
2. **Missing requirements**: Are there exported functions in the impl file that the spec-contract missed?
3. **Scope creep**: Does the impl have functionality beyond the spec? (In coverage mode, this might surface dead code or unexported helper functions.)
4. **API contract accuracy**: Do function signatures match?
5. **Integration readiness**: N/A for standalone utils.

**Coverage-mode nuance**: Since the spec-contract was reverse-engineered from the source, compliance should be high. The real value is catching things the characterization missed -- functions the orchestrator didn't include in the spec, or undocumented behavior.

**Ordering rule** (SKILL.md line 349): Spec compliance MUST pass before adversarial review runs.

If NON-COMPLIANT: The pair goes back for revision. The Test Writer adds missing tests.
If COMPLIANT: Proceed to adversarial review.

**Result**: COMPLIANT. All functions in the spec-contract are tested and implemented.

### Step 9f: Adversarial Review

**Action** (SKILL.md lines 351-376, reference/adversarial-reviewer-prompt.md):

Spawn an Adversarial Reviewer teammate with:
- `spec-contract-string-helpers.md` (read from disk)
- Test file contents (read from disk)
- Implementation file contents (read from disk)

The reviewer applies the full checklist:

1. **Test completeness**: Are edge cases covered for all three functions? Empty strings, single chars, special characters, very long strings?
2. **Test quality**: Does each test have meaningful assertions? Are tests independent?
3. **Implementation quality**: Dead code? Obvious bugs the tests don't catch?
4. **Cheating detection**: Hardcoded returns? (Less relevant for existing human-written code, but the check still runs.)
5. **Coverage gaps**: Untested code paths, conditional branches with only one side tested?

Also checks the 5 anti-patterns from `reference/testing-anti-patterns.md`:
1. Testing mock behavior instead of real code
2. Test-only methods in production code
3. Mocking without understanding side effects
4. Incomplete mock objects
5. Integration tests as afterthought

**Coverage-mode value**: The adversarial reviewer is particularly valuable here. It identifies:
- Code paths in `stringHelpers.ts` that no test exercises
- Error handling branches not covered
- Edge cases the characterization spec missed

**Scoring output** (per adversarial-reviewer-prompt.md):
```
## Adversarial Review: string-helpers

### Verdict: PASS

### Test Completeness: 4/5
Good coverage of happy paths and common edge cases. Missing: unicode input handling.

### Test Quality: 5/5
Clear naming, independent tests, good assertion density.

### Implementation Quality: 4/5
Clean code. Minor: truncate() doesn't handle negative maxLen.

### Cheating Detection: CLEAN

### Coverage Gaps
- truncate() with negative maxLen argument
- slugify() with unicode characters

### Critical Issues (must fix)
None

### Recommendations (should fix)
1. Add test for truncate(-1, "hello")
2. Add test for slugify("cafe\u0301")
```

If FAIL (critical issues): pair revises.
If PASS: mark work unit as completed in state file.

**Result**: PASS with recommendations. Unit `string-helpers` status set to `completed`.

---

## Step 10: Parallel Execution for Remaining Units

**Action** (SKILL.md lines 377-379):

With `maxParallelPairs: 3` and all 4 units independent:

1. The orchestrator spawns Test Writers for `string-helpers`, `date-formatter`, and `validation` simultaneously (up to the 3-unit parallel cap).
2. As each unit completes its full pipeline (Test Writer -> RED -> [Code Writer skip] -> GREEN -> Spec Review -> Adversarial Review), the orchestrator spawns the Test Writer for `api-client`.
3. Each unit proceeds independently through the pipeline.

State file is updated after every phase transition for every unit, using atomic writes (write to `.tdd-state.json.tmp`, then rename).

Each unit follows the same pattern traced above for `string-helpers`:
- Test Writer receives a characterization spec derived from reading the source file
- RED verification uses hide-and-restore
- Code Writer is skipped if characterization tests pass (likely for all pure characterization units)
- GREEN verification confirms tests pass
- Spec compliance review checks requirement coverage
- Adversarial review identifies coverage gaps

The `api-client` unit may differ slightly:
- Higher complexity assessment (external HTTP dependency) -> `sonnet` model for all agents
- Test Writer may need to handle mocking of HTTP calls (but anti-cheat will flag excessive mocking)
- More likely to have coverage gaps around error handling and network failure scenarios

---

## Step 11: Phase 5 -- Final Review (Verification Before Completion)

**Action** (SKILL.md, "Phase 5", lines 382-404):

After ALL 4 work units complete:

### 1. Run the FULL test suite
```bash
npx vitest run 2>&1; echo "EXIT_CODE:$?"
```

This runs ALL tests -- the 4 new characterization test files plus any pre-existing tests in the project. The orchestrator reads the actual output.

### 2. Verify pristine output
All tests must pass. No warnings. No skipped tests. No pending tests. If the test runner reports anything other than clean green, investigate.

### 3. Review holistically
Check for:
- Naming conflicts between new test files and existing ones
- Import path issues
- Shared test fixtures or utilities that might conflict
- Test execution order dependencies

### 4. Cross-unit integration check
For utils, verify:
- If `apiClient.ts` imports from `validation.ts`, both sets of tests coexist without interference
- No test file modifies global state that affects other test files
- All test files can run together without order-dependent failures

### 5. Anti-rationalization (SKILL.md lines 396-404)
The orchestrator applies the anti-rationalization table. It does NOT accept:

| Excuse | Response |
|--------|----------|
| "Tests should pass now" | Run them. Read the output. "Should" is not "did." |
| "I'm confident this works" | Confidence without evidence is delusion. Run the tests. |
| "The fix is obvious" | Obvious fixes cause subtle bugs. Run the tests. |

The orchestrator reads the actual test runner output and verifies clean passage.

**Result**: Full test suite passes. No integration issues found.

---

## Step 12: Phase 6 -- Report Generation

**Action** (SKILL.md lines 406-448, reference/report-format.md):

### tdd-report.md

```markdown
# TDD Session Report

**Date**: 2026-03-28T...
**Specification**: add test coverage for src/utils/
**Framework**: typescript / vitest
**Entry Point**: existing-codebase

## Summary

| Metric | Value |
|--------|-------|
| Work units | 4/4 |
| Tests written | 28 |
| Assertions | 56 |
| Anti-cheat violations | 0 |
| Adversarial reviews | 4/4 passed |
| Retries | 0 |

## Work Units

### String Helpers -- completed

**Spec**: Characterization tests for stringHelpers.ts -- capitalize(), slugify(), truncate()

| Phase | Status | Attempts | Notes |
|-------|--------|----------|-------|
| Test Writer | completed | 1 | 8 tests, 16 assertions |
| RED Verification | passed (hide-and-restore) | -- | import errors confirmed, then all pass |
| Code Writer | skipped (no-op) | 0 | Characterization tests pass against existing code |
| GREEN Verification | passed | -- | All tests pass |
| Spec Compliance | compliant | -- | 3/3 requirements covered |
| Adversarial Review | passed | -- | Minor recommendations: unicode edge cases |

**Files created**:
- Tests: src/__tests__/stringHelpers.test.ts
- Implementation: src/utils/stringHelpers.ts (pre-existing, unchanged)

**Reviewer findings**: Consider adding unicode input tests for slugify().

---

### Date Formatter -- completed

**Spec**: Characterization tests for dateFormatter.ts -- formatDate(), parseISO(), relativeTime()

| Phase | Status | Attempts | Notes |
|-------|--------|----------|-------|
| Test Writer | completed | 1 | 7 tests, 14 assertions |
| RED Verification | passed (hide-and-restore) | -- | import errors confirmed, then all pass |
| Code Writer | skipped (no-op) | 0 | Tests pass against existing code |
| GREEN Verification | passed | -- | All tests pass |
| Spec Compliance | compliant | -- | 3/3 requirements covered |
| Adversarial Review | passed | -- | Clean |

**Files created**:
- Tests: src/__tests__/dateFormatter.test.ts
- Implementation: src/utils/dateFormatter.ts (pre-existing, unchanged)

---

### Validation -- completed

**Spec**: Characterization tests for validation.ts -- isEmail(), isURL(), validateSchema()

| Phase | Status | Attempts | Notes |
|-------|--------|----------|-------|
| Test Writer | completed | 1 | 6 tests, 12 assertions |
| RED Verification | passed (hide-and-restore) | -- | import errors confirmed, then all pass |
| Code Writer | skipped (no-op) | 0 | Tests pass against existing code |
| GREEN Verification | passed | -- | All tests pass |
| Spec Compliance | compliant | -- | 3/3 requirements covered |
| Adversarial Review | passed | -- | Recommend: test more invalid email formats |

**Files created**:
- Tests: src/__tests__/validation.test.ts
- Implementation: src/utils/validation.ts (pre-existing, unchanged)

---

### API Client -- completed

**Spec**: Characterization tests for apiClient.ts -- get(), post(), handleError()

| Phase | Status | Attempts | Notes |
|-------|--------|----------|-------|
| Test Writer | completed | 1 | 7 tests, 14 assertions |
| RED Verification | passed (hide-and-restore) | -- | import errors confirmed, then all pass |
| Code Writer | skipped (no-op) | 0 | Tests pass against existing code |
| GREEN Verification | passed | -- | All tests pass |
| Spec Compliance | compliant | -- | 3/3 requirements covered |
| Adversarial Review | passed | -- | Recommend: test network timeout scenarios |

**Files created**:
- Tests: src/__tests__/apiClient.test.ts
- Implementation: src/utils/apiClient.ts (pre-existing, unchanged)

**Reviewer findings**: Consider adding timeout and retry-on-failure edge case tests.

---

## Anti-Cheat Log

No violations encountered during this session. The hide-and-restore procedure confirmed all
characterization tests genuinely depend on the implementation files (failing with import errors
when the files are hidden, passing when restored).

## Final Integration Check

- All tests passing: yes
- Integration issues found: none
- Full suite: 28 tests, 56 assertions, 0 failures
```

### tdd-session.jsonl

One JSON object per line with timestamp, event type, work unit ID, and data. Events logged throughout the session include: session.start, decomposition.complete, user.confirmed, team.created, test-writer.spawned/completed (x4), red.verification.start/passed (x4), code-writer.skipped (x4), green.verification.start/passed (x4), spec-review.spawned/compliant (x4), adversarial.spawned/passed (x4), unit.completed (x4), integration.check, session.complete.

---

## Step 13: Phase 7 -- Cleanup

**Action** (SKILL.md, "Phase 7", lines 527-535):

1. **Shut down remaining teammates**: Close any still-running reviewer agents.
2. **Remove intermediate artifacts**: Delete all `spec-contract-*.md` files:
   - `src/__tests__/spec-contract-string-helpers.md`
   - `src/__tests__/spec-contract-date-formatter.md`
   - `src/__tests__/spec-contract-validation.md`
   - `src/__tests__/spec-contract-api-client.md`
3. **Final state file update**: All units completed, summary updated.
4. **Present report**: Show `tdd-report.md` contents to the user.
5. **Suggest next steps**: "Run the full test suite (`npx vitest run`), review the report, and commit the new test files."

Note: `tdd-report.md` is intentionally NOT gitignored -- it is a deliverable the user may want to commit.

---

## Key Differences from Iteration-1 Trace

### 1. Coverage Mode RED Verification is Now Documented

**Iteration-1 finding**: The SKILL.md did not explicitly describe how RED verification adapts for coverage mode. The trace identified this as a "gap" and recommended the hide-and-restore approach.

**Iteration-2 status**: SKILL.md lines 283-288 now explicitly document the procedure:
1. Hide the implementation (rename with `.tdd-hidden` suffix)
2. Run tests -- verify import/module errors
3. Restore the implementation
4. Run tests -- verify they pass

And `reference/anti-cheat.md` has a full "Coverage Mode RED Verification (Entry Point Mode 2)" section with the exact bash commands, success/failure criteria, and re-prompt messages.

### 2. Design Gate Auto-Skip for Mode 2 is Now Explicit

**Iteration-1 finding**: The `--skip-design` flag was "technically redundant for Mode 2" but Mode 2 did not have an explicit auto-skip rule.

**Iteration-2 status**: SKILL.md line 107 now states: "Design gate: Skip by default (characterizing existing code, not designing new features). Only trigger if the user explicitly passes `--design`." And line 132: "Existing codebase coverage mode (entry point mode 2) -- unless `--design` is explicitly passed."

### 3. Code Writer No-Op Path is Now Explicit

**Iteration-1 finding**: "The skill doesn't describe a 'skip Code Writer' path."

**Iteration-2 status**: SKILL.md lines 110-111 now state: "Code Writer: May be a no-op if characterization tests already pass against existing code. If tests pass immediately, skip Code Writer and proceed to review."

### 4. Checks That Still Apply in Coverage Mode

**Anti-cheat.md** now has an explicit subsection (lines 156-162) listing which standard checks still apply in coverage mode:
- Check 1 (Tests Exist) -- still required
- Check 4 (Assertion Density) -- still required
- Check 5 (Behavior-Over-Implementation) -- still required
- Record Checksums -- still required

---

## Summary of Coverage Mode Flow

```
User: /tdd add test coverage for src/utils/ --skip-design
  |
  v
[Parse arguments] -> spec="add test coverage for src/utils/", skipDesign=true
  |
  v
[Prerequisites] -> agent teams enabled, git repo verified
  |
  v
[Entry point detection] -> Mode 2 (existing-codebase)
  |
  v
[Config loading] -> defaults applied
  |
  v
[Design gate] -> SKIPPED (Mode 2 auto-skip + --skip-design flag)
  |
  v
[Framework detection] -> TypeScript, Vitest
  |
  v
[Read src/utils/*.ts files] -> analyze exports, behavior, edge cases
  |
  v
[Decompose into work units] -> 4 units from 4 source files
  |
  v
[User confirmation] -> HARD GATE
  |
  v
[State initialization] -> .tdd-state.json, .gitignore, session log
  |
  v
[For each unit, up to 3 in parallel]:
  |
  +-> [Spawn Test Writer] -> characterization tests from reverse-engineered spec
  |     |
  |     v
  +-> [RED: Hide-and-Restore]
  |     |-- mv impl.ts impl.ts.tdd-hidden
  |     |-- Run tests -> MUST fail (import errors)
  |     |-- mv impl.ts.tdd-hidden impl.ts
  |     |-- Run tests -> MUST pass (characterization accurate)
  |     |-- Assertion density check
  |     |-- Behavior-over-implementation check
  |     |-- Record checksums
  |     |
  |     v
  +-> [Code Writer] -> SKIPPED (tests already pass)
  |     |
  |     v
  +-> [GREEN verification] -> checksums match, no skips, tests pass
  |     |
  |     v
  +-> [Spec Compliance Review] -> MUST pass before adversarial
  |     |
  |     v
  +-> [Adversarial Review] -> coverage gaps, anti-patterns, quality
  |     |
  |     v
  +-> [Unit completed]
  |
  v
[Final review] -> full test suite, integration check, anti-rationalization
  |
  v
[Report generation] -> tdd-report.md + tdd-session.jsonl
  |
  v
[Cleanup] -> delete spec-contracts, shut down agents, suggest next steps
```
