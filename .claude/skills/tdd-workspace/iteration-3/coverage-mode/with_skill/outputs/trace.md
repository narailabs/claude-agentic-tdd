# Execution Trace: `/tdd add test coverage for src/utils/ --skip-design`

## Task Under Trace

**Command**: `/tdd add test coverage for src/utils/ --skip-design`
**Entry Point Mode**: Mode 2 (Existing Codebase)
**Key Procedures Traced**: Hide-and-restore RED verification, three-stage review pipeline, code quality review

---

## Step 0: Argument Parsing

The orchestrator parses `$ARGUMENTS`:
- **Specification text**: `add test coverage for src/utils/`
- **`--skip-design`**: present -- design gate will be skipped
- **`--skip-failed`**: not present -- failures escalate to user
- **`--config`**: not present -- use default config

The phrase "add test coverage for" triggers **Entry Point Mode 2 (Existing Codebase)**.

---

## Step 1: Prerequisites Check

1. **Agent teams enabled**: Check that `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set to `1` in settings or environment. If not, halt and instruct user.
2. **Git repository**: Verify the project is a git repo (needed for diff checks in GREEN verification and code quality review). If not a repo, warn but continue.

---

## Step 2: Configuration Loading

Load configuration in priority order:

1. Check for `.tdd.config.json` at project root (or custom path via `--config`). Parse JSON if found.
2. Check project CLAUDE.md for a `## TDD Configuration` section.
3. Apply defaults for any unset keys:
   ```
   antiCheat.minAssertionsPerTest: 1
   antiCheat.maxRetries: 3
   antiCheat.maxMockDepth: 2
   antiCheat.flagPrivateMethodTests: true
   execution.maxParallelPairs: 3
   execution.parallelMode: "auto"
   execution.skipFailedAfterRetries: false
   execution.modelStrategy: "auto"
   reporting.generateReport: true
   reporting.generateSessionLog: true
   ```

Merged config stored in state file and passed to all teammates.

---

## Step 3: Phase 0 -- Design Gate

**Decision**: SKIP.

Three independent reasons to skip:
1. Mode 2 (existing codebase) skips design gate by default.
2. `--skip-design` flag explicitly requests skipping.
3. Characterizing existing code does not require architectural design.

The skill document states: "Skip when: Existing codebase coverage mode (entry point mode 2) -- unless `--design` is explicitly passed."

No `designSummary` is stored in the state file (set to `null`).

---

## Step 4: Phase 1 -- Framework Detection

The orchestrator reads `reference/framework-detection.md` and runs detection:

1. Check `.tdd.config.json` for explicit framework config.
2. Check project CLAUDE.md for test conventions.
3. Auto-detect from project files:
   - Read `package.json` -- check for vitest, jest, mocha, etc.
   - Read `pyproject.toml` -- check for pytest config.
   - Read `go.mod`, `Cargo.toml`, `build.gradle`, `pom.xml`, etc.
   - First match wins.
4. If detection fails, ask the user for their test command.

**Output stored**:
```
framework:
  language: [detected]
  testRunner: [detected]
  testCommand: [detected]
  testFilePattern: [detected]
  sourceDir: [detected, e.g. "src/"]
  testDir: [detected, e.g. "src/__tests__/" or "tests/"]
```

---

## Step 5: Phase 2 -- Work Decomposition (Mode 2 Adaptation)

Because this is Mode 2, the orchestrator reads the existing source files in `src/utils/` to understand what code exists. For each source file found, it reverse-engineers a behavior spec (not forward requirements).

### 5a: Scan source directory

List all source files in `src/utils/`. For example, suppose we find:
- `src/utils/formatDate.ts`
- `src/utils/parseConfig.ts`
- `src/utils/stringHelpers.ts`

### 5b: Read each source file

For each file, read the code to understand:
- Exported functions/classes and their signatures
- Observable behavior (inputs -> outputs)
- Edge cases visible in the code (error handling, boundary checks)
- Side effects

### 5c: Produce work units

For each source file, produce a work unit with a **reverse-engineered spec-contract** (describing what the code currently does, not what it should do):

```
Work unit example:
  id: format-date
  name: Format Date Utility
  type: "code"
  spec-contract: "Characterize the formatDate function. It accepts a Date object
    and an optional format string. It returns a formatted date string. Currently
    handles ISO, short, and long formats. Throws on invalid Date input."
  dependsOn: []
  testFiles: ["src/__tests__/formatDate.test.ts"]
  implFiles: ["src/utils/formatDate.ts"]   <-- already exists
```

### 5d: Model cost assessment

With `modelStrategy: "auto"`, assess each work unit's complexity:
- Utility functions touching 1-2 files with clear interfaces -> **mechanical task**.
  - Test Writer: `haiku`
  - Code Writer: likely skipped (Mode 2 -- implementation exists)
  - Reviewers: `sonnet`

### 5e: User confirmation

Present the work plan:
```
## TDD Work Plan

Framework: [detected framework]
Mode: existing-codebase
Parallel: auto (max 3 concurrent)
Work units: 3

### Unit 1: format-date [code]
Spec: Characterize formatDate() -- date formatting with ISO/short/long formats
Files: src/__tests__/formatDate.test.ts -> src/utils/formatDate.ts (existing)
Dependencies: none

### Unit 2: parse-config [code]
Spec: Characterize parseConfig() -- config file parsing with validation
Files: src/__tests__/parseConfig.test.ts -> src/utils/parseConfig.ts (existing)
Dependencies: none

### Unit 3: string-helpers [code]
Spec: Characterize string helper functions -- capitalize, truncate, slugify
Files: src/__tests__/stringHelpers.test.ts -> src/utils/stringHelpers.ts (existing)
Dependencies: none

Execution plan:
  Batch 1 (parallel): format-date, parse-config, string-helpers

Proceed? [confirm/modify/cancel]
```

**HARD GATE**: Wait for user confirmation before proceeding.

---

## Step 6: Phase 3 -- State Initialization

1. Check for existing `.tdd-state.json`. If found, offer resume/restart/add-units. If not, create new.
2. Add to `.gitignore` if not already present:
   ```
   .tdd-state.json
   tdd-session.jsonl
   spec-contract-*.md
   ```
3. Initialize `tdd-session.jsonl` with `session.start` event.
4. Create state file with:
   - `entryPoint: "existing-codebase"`
   - `designSummary: null`
   - All work units in `pending` status

---

## Step 7: Phase 4 -- Agent Team Orchestration (Per Work Unit)

All three units are independent, so they execute in parallel (Batch 1, up to `maxParallelPairs: 3`). The following trace covers one work unit in detail. Each unit follows the same pipeline.

### Tracing: Work Unit "format-date"

---

### Step 7a: Spawn Test Writer (Step 4a)

The orchestrator reads `reference/test-writer-prompt.md` and fills the template.

**Mode 2 adaptation**: The Test Writer receives a spec-contract derived from reading the existing source file (reverse-engineered behavior spec), not a forward requirement. The Test Writer is instructed to write characterization tests that describe what the existing code actually does.

**Prompt sent to Test Writer** (filled template):
- Spec-contract: reverse-engineered from `src/utils/formatDate.ts`
- Framework info: language, test runner, test command, file patterns
- Target test file: `src/__tests__/formatDate.test.ts`
- Project conventions from CLAUDE.md
- Rules: write tests only, test behavior not implementation, meaningful assertions, edge cases

**Wait** for Test Writer to complete and report status (DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED).

**Post-completion verification**: Check that BOTH artifacts exist on disk:
1. `src/__tests__/formatDate.test.ts` (the test file)
2. `spec-contract-format-date.md` (in the same directory as the test file)

If either is missing, re-prompt the Test Writer.

---

### Step 7b: RED Verification -- Coverage Mode (Step 4b)

**This is the critical Mode 2 adaptation.** Standard RED verification requires tests to FAIL. In coverage mode, the implementation already exists, so characterization tests that PASS immediately is expected, not a violation.

The orchestrator reads `reference/anti-cheat.md` -> "Coverage Mode RED Verification" section and executes the hide-and-restore procedure.

#### Check 1: Tests Exist

```bash
test -f "src/__tests__/formatDate.test.ts"
```

If not found -> FAIL, re-prompt Test Writer.

#### Checks 2-3 REPLACED by Hide-and-Restore Procedure:

##### Hide-and-Restore Step 1: Hide the implementation

```bash
mv "src/utils/formatDate.ts" "src/utils/formatDate.ts.tdd-hidden"
```

The source file is temporarily renamed. This makes it invisible to the test runner's import resolution.

##### Hide-and-Restore Step 2: Run tests -- they SHOULD FAIL

```bash
{test_command} src/__tests__/formatDate.test.ts 2>&1; echo "EXIT_CODE:$?"
```

**Expected result**: exit code != 0, with import/module errors (e.g., "Cannot find module '../utils/formatDate'", "ModuleNotFoundError", "ImportError").

**Decision tree**:
- If exit code == 0 (tests PASS even without implementation):
  - **ANTI-CHEAT VIOLATION**: Tests are tautological. They do not actually import or depend on the real code.
  - Re-prompt Test Writer: "Your tests pass even when the implementation file is removed. They must import and test the actual code."
  - Increment retry counter. After `maxRetries` (3): escalate to user.
- If exit code != 0 with import/module errors:
  - **GOOD**: Tests genuinely depend on the implementation. Proceed to Step 3.
- If exit code != 0 with other errors (syntax errors in test file, framework config errors):
  - These are unacceptable failures. Re-prompt Test Writer with the error output.

##### Hide-and-Restore Step 3: Restore the implementation

```bash
mv "src/utils/formatDate.ts.tdd-hidden" "src/utils/formatDate.ts"
```

**CRITICAL**: This must happen regardless of the outcome of Step 2. If the orchestrator crashes between Step 1 and Step 3, the user's source code is hidden. The state file should track that a hide operation is in progress.

##### Hide-and-Restore Step 4: Run tests -- they SHOULD PASS

```bash
{test_command} src/__tests__/formatDate.test.ts 2>&1; echo "EXIT_CODE:$?"
```

**Expected result**: exit code == 0 (all tests pass against the existing implementation).

**Decision tree**:
- If exit code == 0 (tests pass):
  - **GOOD**: Characterization is accurate. The tests describe what the code actually does.
  - Proceed to review. **Code Writer may be skipped** (see Mode 2 adaptation below).
- If exit code != 0 (tests fail):
  - **CHARACTERIZATION ERROR**: The Test Writer mischaracterized the code. Tests describe what they think the code does, not what it actually does.
  - Re-prompt: "Your characterization tests fail against the existing implementation. They must describe what the code actually does, not what you think it should do."
  - Increment retry counter. After `maxRetries` (3): escalate to user.

#### Check 4: Assertion Density (Still applies in coverage mode)

Read the test file. Count assertion patterns per test function.

For JavaScript/TypeScript, count occurrences of:
```
expect(    toBe(    toEqual(    toThrow(    toHaveBeenCalled(
toContain( toMatch( toBeTruthy( toBeFalsy(  toBeGreaterThan(
toHaveLength(  toHaveProperty(  rejects.toThrow(  assert(  assert.
```

Calculate: total assertions / total test functions. Must be >= `minAssertionsPerTest` (default: 1).

Exclude trivial assertions:
- `expect(true).toBe(true)`
- `expect(x).toBeDefined()` as sole assertion
- `expect(x).not.toBeNull()` as sole assertion
- `expect(mockFn).toHaveBeenCalled()` without argument checks

If below threshold -> re-prompt: "Tests have insufficient assertion density."

#### Check 5: Behavior-Over-Implementation (Still applies in coverage mode)

Scan test files for anti-patterns:

- **Excessive mocking**: Count mock/spy/stub declarations. If mocks > 2x test functions -> flag.
- **Private method testing**: Direct access to `._privateMethod`, `.__private`, internal state assertions.
  - Governed by `antiCheat.flagPrivateMethodTests` config (default: true).
- **Implementation mirroring**: Test structure that 1:1 mirrors implementation file structure; tests naming internal helpers.

If flagged -> re-prompt with behavior-over-implementation guidance.

#### Record Checksums (Still applies in coverage mode)

After all RED verification checks pass:

```bash
shasum -a 256 "src/__tests__/formatDate.test.ts" | cut -d' ' -f1
```

Store checksum in state file under `redVerification.testFileChecksums`.

**State update**: Mark unit status as `red-verification: passed`. Log `red.verification.passed` event to session log.

---

### Step 7c: Code Writer Decision (Step 4c) -- Mode 2 Adaptation

**Mode 2 special handling**: In coverage mode, characterization tests are expected to pass against the existing code. If the hide-and-restore Step 4 confirmed tests pass:

- **Code Writer is a NO-OP**. The existing implementation already satisfies the characterization tests.
- Skip directly to the review phase.

If the Test Writer wrote tests that go beyond characterization (e.g., testing new behavior that should exist but doesn't), then the Code Writer would be spawned to modify the existing code. But for pure "add test coverage" tasks, Code Writer is typically skipped.

**If Code Writer IS needed** (tests include new behavior expectations):

The orchestrator reads `reference/code-writer-prompt.md` and fills the template.

**Information Barrier enforced**:
- Code Writer receives ONLY: test file contents (read from disk), spec-contract file (read from disk), framework info, target impl file paths, project conventions.
- Code Writer does NOT receive: Test Writer prompt, Test Writer reasoning, implementation hints beyond spec-contract.

**Lead Verification Checklist** (from code-writer-prompt.md):
- [ ] Prompt contains test file contents read from DISK
- [ ] Prompt contains spec-contract read from DISK
- [ ] Prompt does NOT contain any Test Writer prompt text
- [ ] Prompt does NOT contain references to the test authoring process
- [ ] Test file checksums have been recorded

Wait for Code Writer to complete.

---

### Step 7d: GREEN Verification (Step 4d) -- If Code Writer Was Spawned

If Code Writer was skipped (pure characterization), GREEN verification still runs but is simpler -- just confirm tests still pass.

If Code Writer ran, full GREEN verification:

#### GREEN Check 1: Test Files Unchanged

```bash
shasum -a 256 "src/__tests__/formatDate.test.ts" | cut -d' ' -f1
```

Compare against stored checksum from RED verification. If different -> **ANTI-CHEAT VIOLATION**: Code Writer modified test files.

Action: Discard ALL Code Writer changes (`git checkout` the test files). Re-prompt: "You modified test files, which is forbidden. Write implementation code ONLY."

#### GREEN Check 2: No Skip/Focus Markers Added

```bash
grep -n 'xit\b\|xdescribe\b\|\.skip\b\|@pytest\.mark\.skip\|@skip\|t\.Skip\|@Ignore\|@Disabled\|pending(' "src/__tests__/formatDate.test.ts"
```

```bash
grep -n '\.only\b\|fdescribe\b\|fit\b' "src/__tests__/formatDate.test.ts"
```

If NEW matches found that were not in the original test file -> **ANTI-CHEAT VIOLATION**.

#### GREEN Check 3: All Tests Pass

```bash
{test_command} src/__tests__/formatDate.test.ts 2>&1; echo "EXIT_CODE:$?"
```

If exit code != 0 -> re-prompt Code Writer with failure output. Track retry count. After `maxRetries` (3): escalate to user (or skip if `--skip-failed`).

#### GREEN Check 4: No Hardcoded Returns (Heuristic)

Read implementation file, look for:
- Functions consisting only of `return [literal]`
- Switch statements where every case returns a literal matching test expectations
- Implementations shorter than 3 lines for non-trivial specs

If suspicious -> flag in report (does not block; adversarial reviewer catches this more thoroughly).

**State update**: Mark `green-verification: passed`.

---

### Step 7e: Three-Stage Review Pipeline -- Stage 1: Spec Compliance Review (Step 4e)

**ORDERING RULE**: Spec compliance MUST pass before adversarial review. No point reviewing code quality for an implementation that does not match the spec.

The orchestrator reads `reference/spec-compliance-reviewer-prompt.md` and spawns a Spec Compliance Reviewer teammate.

**Inputs provided to reviewer**:
- `spec-contract-format-date.md` contents (read from disk)
- Design summary from state file (null -- Phase 0 was skipped)
- Test file contents (`src/__tests__/formatDate.test.ts`, read from disk)
- Implementation file contents (`src/utils/formatDate.ts`, read from disk)

**What the reviewer checks**:

1. **Requirement Coverage**: For EACH requirement in the spec-contract:
   - Is it implemented? [YES / NO / PARTIAL]
   - Is there a test that specifically verifies it? [YES / NO]

2. **Missing Requirements**: Implied requirements nobody tested? Edge cases from the spec not handled?

3. **Scope Creep**: Implementation includes functionality NOT in the spec? Extra code flagged.

4. **API Contract Accuracy**: Function signatures match spec? Return types correct? Error types correct?

5. **Integration Readiness**: Interfaces compatible with dependent units? Exports what dependent units need?

**Output**: Structured report with verdict: COMPLIANT or NON-COMPLIANT.

**Decision tree**:
- **COMPLIANT**: Proceed to adversarial review (Stage 2).
- **NON-COMPLIANT**: Send the pair back for revision. Test Writer adds missing tests, then Code Writer re-implements. This loops back to Step 7a (Test Writer) for the deficient requirements.

**State update**: Record `specComplianceReview` status, requirements covered, missing requirements, scope creep.

---

### Step 7f: Three-Stage Review Pipeline -- Stage 2: Adversarial Review (Step 4f)

**Prerequisite**: Spec compliance review PASSED (COMPLIANT verdict).

The orchestrator reads `reference/adversarial-reviewer-prompt.md` and spawns an Adversarial Reviewer teammate.

**Inputs provided to reviewer**:
- `spec-contract-format-date.md` contents (read from disk)
- Test file contents (`src/__tests__/formatDate.test.ts`, read from disk)
- Implementation file contents (`src/utils/formatDate.ts`, read from disk)
- Scoring rubric from `reference/adversarial-reviewer-prompt.md`

**What the reviewer checks**:

1. **Test Completeness** (score /5):
   - All behaviors from spec-contract tested?
   - Edge cases covered (empty, null, boundaries, errors)?
   - Negative cases tested?
   - Would tests catch regressions?

2. **Test Quality** (score /5):
   - Meaningful, specific assertions?
   - Tests independent (no shared mutable state)?
   - Accurate test names?
   - No redundant tests?
   - Assertion density adequate?

3. **Implementation Quality** (score /5):
   - Follows spec-contract?
   - Minimum code needed, no dead code?
   - Bugs the tests miss?
   - Error handling correct?

4. **Cheating Detection** (CLEAN / SUSPICIOUS / CAUGHT):
   - Hardcoded returns matching test expectations?
   - Test-aware code (special-casing test input values)?
   - Shallow stubs passing tests without real implementation?
   - Mock exploitation (excessive mocking hiding untested code)?

5. **Coverage Gaps**:
   - Untested code paths?
   - Conditional branches with only one side tested?
   - Error paths tested with real error conditions?

**Anti-Patterns Check** (from `reference/testing-anti-patterns.md`):
   1. Testing Mock Behavior instead of real outcomes
   2. Test-Only Methods in production code
   3. Mocking Without Understanding side effects
   4. Incomplete Mock Objects missing downstream fields
   5. Integration Tests as Afterthought

**Output**: Structured report with verdict: PASS or FAIL.

**Decision tree**:
- **PASS**: Proceed to code quality review (Stage 3). Minor recommendations noted.
- **FAIL**: Log findings. Send the pair back for revision -- Test Writer re-writes tests addressing gaps, then Code Writer re-implements. This loops back to Step 7a.

**State update**: Record `adversarialReview` status, findings, score.

---

### Step 7g: Three-Stage Review Pipeline -- Stage 3: Code Quality Review (Step 4g)

**Prerequisite**: BOTH spec compliance AND adversarial review PASSED.

**ORDERING RULE**: Spec compliance -> Adversarial review -> Code quality. Each stage must pass before the next runs.

The orchestrator reads `reference/code-quality-reviewer-prompt.md` and spawns a Code Quality Reviewer teammate.

**Inputs provided to reviewer**:
- Implementation file contents (`src/utils/formatDate.ts`, read from disk)
- Test file contents (`src/__tests__/formatDate.test.ts`, read from disk)
- Git diff for this work unit (changes since before the unit started)

**What the reviewer checks**:

1. **Structure**:
   - Each file has one clear responsibility with well-defined interface?
   - Units decomposed for independent understanding and testing?

2. **Naming and Clarity**:
   - Names clear and accurate (describe what, not how)?
   - Readable by a new developer without extra context?

3. **Discipline**:
   - No overbuilding (YAGNI)?
   - No unnecessary abstraction, premature optimization, or dead code?
   - Follows existing project patterns and conventions?

4. **Testing**:
   - Tests verify behavior, not implementation details?
   - Tests comprehensive without being brittle?
   - Would a valid refactor break the tests? (It should not.)

5. **Size**:
   - New files already large?
   - Existing files significantly grown?

**Output**: Report with Strengths, Issues (Critical/Important/Minor), and Assessment (Approved / Needs Changes).

**Decision tree**:
- **Approved**: Mark work unit as COMPLETED in state file. Log `unit.completed` event.
- **Needs Changes (Critical or Important issues)**: Send back to Code Writer for fixes, then re-review.
  - Only critical and important issues block; minor issues are noted but do not block.

**State update**: Mark unit status as `completed` (or back to `code-writing` if needs changes).

---

## Step 8: Parallel Completion

Steps 7a through 7g execute for EACH work unit in the batch. Since all three units (format-date, parse-config, string-helpers) are independent, they run concurrently in Batch 1, up to `maxParallelPairs: 3`.

The orchestrator waits for ALL units in the batch to complete (including all three review stages) before proceeding to Phase 5.

---

## Step 9: Phase 5 -- Final Review

**IRON LAW**: No completion claim without fresh verification evidence. "It should work" is not evidence.

### 9a: Run the FULL test suite

```bash
{test_command} 2>&1; echo "EXIT_CODE:$?"
```

Run ALL test files together (not just the new ones). Read the actual output -- do not assume success.

### 9b: Verify pristine output

All tests pass, no warnings, no skipped tests, no pending tests. If the runner reports anything other than clean green, investigate.

### 9c: Holistic code review

Review all generated code together. Look for:
- Inconsistencies between units
- Naming conflicts
- Missing connections between units

### 9d: Cross-unit integration check

Since all units are characterization tests for existing utilities, verify that the new test files do not interfere with each other or with existing tests.

### 9e: Anti-Rationalization enforcement

The orchestrator rejects all of these excuses (from itself or any agent):

| Excuse | Response |
|--------|----------|
| "Tests should pass now" | Run them. Read the output. |
| "I'm confident this works" | Confidence without evidence is delusion. Run the tests. |
| "The fix is obvious" | Obvious fixes cause subtle bugs. Run the tests. |
| "Only changed one line" | One-line changes break everything. Run the tests. |
| "Same pattern as before" | Patterns don't guarantee correctness. Run the tests. |

If integration issues found: report with evidence (actual test output) and fix before proceeding.

---

## Step 10: Phase 6 -- Report Generation

### 10a: tdd-report.md

Generated from `reference/report-format.md` template:

```markdown
# TDD Session Report

**Date**: [ISO-8601 timestamp]
**Specification**: add test coverage for src/utils/
**Framework**: [language] / [test runner]
**Entry Point**: existing-codebase

## Summary

| Metric | Value |
|--------|-------|
| Work units | 3/3 |
| Tests written | [count] |
| Assertions | [count] |
| Anti-cheat violations | [count] |
| Adversarial reviews | [passed]/3 |
| Retries | [count] |

## Work Units

### Format Date -- [status]
[per-unit details: Test Writer, RED, Code Writer (skipped), GREEN, Spec Compliance, Adversarial, Code Quality]

### Parse Config -- [status]
[per-unit details]

### String Helpers -- [status]
[per-unit details]

## Anti-Cheat Log
[violations and resolutions]

## Final Integration Check
[full suite results]
```

Note: `tdd-report.md` is NOT gitignored -- it is a deliverable.

### 10b: tdd-session.jsonl

One JSON object per line with timestamp, event type, unit ID, data. All events logged throughout the session.

---

## Step 11: Phase 7 -- Cleanup

1. **Clean up agent team**: Shut down all remaining teammates.
2. **Remove intermediate artifacts**: Delete all `spec-contract-*.md` files created during the session:
   - `spec-contract-format-date.md`
   - `spec-contract-parse-config.md`
   - `spec-contract-string-helpers.md`
3. **Final state file update**: Mark session as complete.
4. **Present the report** to the user.
5. **Suggest next steps**: Run full test suite, commit changes, review coverage report.

---

## Key Mode 2 Differences Summary

| Aspect | Mode 1 (New Feature) | Mode 2 (Coverage -- This Trace) |
|--------|---------------------|-------------------------------|
| Design gate | Triggers on complexity | Skipped by default |
| Spec-contracts | Forward requirements | Reverse-engineered from existing code |
| RED verification | Tests must FAIL (no implementation) | Hide-and-restore procedure |
| RED pass condition | Tests fail with import/module errors | Hidden: tests fail; Restored: tests pass |
| Code Writer | Always runs | May be NO-OP (implementation exists) |
| GREEN verification | Standard | Standard (but may be trivial if Code Writer skipped) |
| Three-stage review | Full pipeline | Full pipeline (same) |
| Code quality review | Reviews new code | Reviews existing code + new tests |

---

## Hide-and-Restore Procedure Detail (The Core Innovation for Mode 2)

```
State: impl exists, tests just written
         |
         v
  [Step 1] mv impl.ts impl.ts.tdd-hidden
         |
         v
  [Step 2] Run tests
         |
    +----+----+
    |         |
  PASS      FAIL
    |         |
    v         v
  VIOLATION  Check error type
  (tautological   |
   tests)    +----+----+
             |         |
          Import     Other
          errors     errors
             |         |
             v         v
           GOOD     Re-prompt
             |      Test Writer
             v
  [Step 3] mv impl.ts.tdd-hidden impl.ts   <-- ALWAYS restore
             |
             v
  [Step 4] Run tests
         |
    +----+----+
    |         |
  PASS      FAIL
    |         |
    v         v
  GOOD     Mischaracterization
  (proceed   (re-prompt
   to review) Test Writer)
```

This procedure proves two things:
1. **Tests depend on real code** (they fail when the code is hidden)
2. **Tests accurately describe existing behavior** (they pass when code is restored)

Both conditions must hold for characterization tests to be valid.

---

## Three-Stage Review Pipeline Detail

```
  [Unit passes GREEN verification]
         |
         v
  [Stage 1: Spec Compliance Review]
         |
    +----+----+
    |         |
  COMPLIANT  NON-COMPLIANT
    |         |
    v         v
  Continue   Revise (back to Test Writer)
    |
    v
  [Stage 2: Adversarial Review]
         |
    +----+----+
    |         |
  PASS      FAIL
    |         |
    v         v
  Continue   Revise (back to Test Writer)
    |
    v
  [Stage 3: Code Quality Review]
         |
    +----+----+
    |         |
  APPROVED  NEEDS CHANGES
    |         |
    v         v
  COMPLETED  Fix (back to Code Writer, then re-review)
```

Each stage gates the next. No stage can be skipped or reordered. The spec compliance review prevents wasted effort reviewing code quality for non-compliant implementations. The adversarial review prevents wasted effort polishing code that has fundamental test weaknesses.
