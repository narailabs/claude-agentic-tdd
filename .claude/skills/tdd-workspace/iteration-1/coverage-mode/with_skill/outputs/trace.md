# Execution Trace: `/tdd add test coverage for src/utils/ --skip-design`

## Overview

This trace walks through exactly what the TDD skill does when invoked with an "add test coverage" command targeting an existing codebase, with the `--skip-design` flag. It highlights where the coverage-mode flow diverges from the standard new-feature TDD flow.

---

## Step 1: Skill Activation and Argument Parsing

**Trigger**: The `/tdd` slash command activates the skill. The `$ARGUMENTS` string is:
```
add test coverage for src/utils/ --skip-design
```

**Parsing** (SKILL.md, "Arguments" section):
- Specification text extracted: `"add test coverage for src/utils/"`
- Flag `--skip-design` detected and stored: `skipDesign = true`
- No `--skip-failed`, `--config`, or `--design` flags present

**Result**: The orchestrator has a spec and knows to skip the design gate.

---

## Step 2: Prerequisites Check

**Action** (SKILL.md, "Prerequisites"):
1. Check that `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set to `1`. If not, halt with an instruction message.
2. Check that the project is a git repository (`git rev-parse --git-dir`). If not, warn but continue.

**Result**: Both checks pass (or the user is instructed to fix them before proceeding).

---

## Step 3: Entry Point Detection -- Mode 2 (Existing Codebase)

**Decision logic** (SKILL.md, "Entry Point Detection"):

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

The SKILL.md says for Mode 2: "generate characterization tests first, then new feature tests." This fundamentally changes the TDD cycle:

- **Standard TDD (Mode 1)**: Tests describe behavior that does NOT exist yet. Tests must fail because there is no implementation.
- **Coverage mode (Mode 2)**: Tests describe behavior that ALREADY exists. The implementation is already on disk. Tests are characterizing existing behavior.

This creates an immediate tension with the anti-cheat system, which we trace below.

---

## Step 4: Configuration Loading

**Action** (SKILL.md, "Configuration Loading"):

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

**Result**: Merged configuration stored, ready to pass to all agents.

---

## Step 5: Phase 0 -- Design Gate (SKIPPED)

**Decision** (SKILL.md, "Phase 0: Design Gate"):

The `--skip-design` flag was parsed in Step 1. The skill checks:
> "Skip when: ... User passes `--skip-design`"

**Result**: Phase 0 is entirely skipped. No clarifying questions, no design summary, no user approval gate. `designSummary` is set to `null` in the state file.

This is appropriate for coverage mode -- we are not designing a new system; we are documenting an existing one.

---

## Step 6: Phase 1 -- Framework Detection

**Action** (reference/framework-detection.md):

The skill runs the detection algorithm:

1. Check `.tdd.config.json` for explicit framework config (highest priority)
2. Check project `CLAUDE.md` for `## TDD Configuration`
3. Auto-detect from project files:
   - Check `package.json` for JS/TS frameworks (vitest, jest, mocha, etc.)
   - Check `pyproject.toml`, `pytest.ini` for Python
   - Check `go.mod` for Go
   - Check `Cargo.toml` for Rust
   - etc.

For example, if `package.json` contains `vitest` as a devDependency:
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

**Result**: Framework info stored and ready for use by all agents.

---

## Step 7: Phase 2 -- Work Decomposition (Coverage-Specific)

**Action** (SKILL.md, "Phase 2: Work Decomposition"):

This is where coverage mode diverges significantly from standard TDD.

### Standard TDD decomposition
Analyze the *specification* and break it into logical feature units.

### Coverage mode decomposition
Analyze the *existing source files* in `src/utils/` and break them into coverage units.

The orchestrator reads the `src/utils/` directory:
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

Each source file (or logical group) becomes a work unit. For each:

- **id**: kebab-case derived from filename (e.g., `string-helpers`)
- **name**: Human-readable (e.g., "String Helpers")
- **spec-contract**: Derived by READING THE EXISTING CODE. The orchestrator reads `src/utils/stringHelpers.ts`, analyzes the exported functions, their signatures, their behavior, and produces a behavioral spec-contract. This is a characterization -- describing what the code currently does, not what we want it to do.
- **dependsOn**: Analyze imports between the utils files
- **testFiles**: e.g., `src/__tests__/stringHelpers.test.ts` (following detected conventions)
- **implFiles**: `src/utils/stringHelpers.ts` (already exists!)

**Key difference**: In standard TDD, `implFiles` don't exist yet. In coverage mode, they already exist on disk. The spec-contract is reverse-engineered from code, not forward-designed from requirements.

### Complexity assessment (for model strategy "auto")

Each unit is assessed:
- Simple util (1 file, pure functions, no deps): `haiku` for Test Writer/Code Writer, `sonnet` for reviewer
- Utils with external deps (apiClient.ts): `sonnet` for all
- Complex utils: `opus` for Test Writer and reviewer

### User confirmation

The orchestrator presents:
```
## TDD Work Plan

Framework: vitest (auto-detected)
Mode: existing-codebase
Work units: 4

### Unit 1: string-helpers
Spec: Characterization tests for stringHelpers.ts — capitalize(), slugify(), truncate()
Files: src/__tests__/stringHelpers.test.ts -> src/utils/stringHelpers.ts (exists)
Dependencies: none

### Unit 2: date-formatter
Spec: Characterization tests for dateFormatter.ts — formatDate(), parseISO(), relativeTime()
Files: src/__tests__/dateFormatter.test.ts -> src/utils/dateFormatter.ts (exists)
Dependencies: none

### Unit 3: validation
Spec: Characterization tests for validation.ts — isEmail(), isURL(), validateSchema()
Files: src/__tests__/validation.test.ts -> src/utils/validation.ts (exists)
Dependencies: none

### Unit 4: api-client
Spec: Characterization tests for apiClient.ts — get(), post(), handleError()
Files: src/__tests__/apiClient.test.ts -> src/utils/apiClient.ts (exists)
Dependencies: none

Execution plan: All units independent, run up to 3 in parallel.

Proceed? [confirm/modify/cancel]
```

**HARD GATE**: Wait for user confirmation.

---

## Step 8: Phase 3 -- State Initialization

**Action** (reference/state-management.md):

1. Check for existing `.tdd-state.json`:
   - If found: offer resume/restart/add-units
   - If not found: create new state file

2. Add to `.gitignore`:
   ```
   .tdd-state.json
   tdd-session.jsonl
   spec-contract-*.md
   ```

3. Initialize state file with `entryPoint: "existing-codebase"`, all work units in `pending` status.

4. Initialize `tdd-session.jsonl` with:
   ```json
   {"timestamp":"...","event":"session.start","unitId":null,"data":{"spec":"add test coverage for src/utils/","entryPoint":"existing-codebase","framework":{"language":"typescript","testRunner":"vitest",...}}}
   ```

---

## Step 9: Phase 4 -- Agent Team Orchestration (Per Work Unit)

The orchestrator processes each work unit through the full pipeline. Let's trace one unit: `string-helpers`.

### Step 9a: Spawn Test Writer

**Action** (reference/test-writer-prompt.md):

The Test Writer teammate is spawned with:
- **spec-contract**: The characterization spec derived from reading `src/utils/stringHelpers.ts`. Example:
  ```
  Module: stringHelpers
  Exports: capitalize(str: string): string, slugify(str: string): string, truncate(str: string, maxLen: number): string

  capitalize: Returns input string with first character uppercased. Returns empty string for empty input.
  slugify: Converts string to URL-safe slug. Lowercases, replaces spaces with hyphens, strips non-alphanumeric.
  truncate: Returns first maxLen characters followed by "..." if string exceeds maxLen. Returns full string if shorter.
  ```
- **Framework info**: vitest, TypeScript
- **Target test file**: `src/__tests__/stringHelpers.test.ts`
- **Instructions**: Write tests that describe BEHAVIOR. Each test must have meaningful assertions. Do NOT write implementation code.

**Coverage-mode nuance**: The Test Writer is told to write tests against a spec-contract, same as Mode 1. The Test Writer does NOT know that the implementation already exists. It writes tests as if the code doesn't exist yet -- importing from the impl path but expecting the tests to stand on their own as behavioral descriptions.

The Test Writer also creates `spec-contract-string-helpers.md` in the test directory.

### Step 9b: RED Verification -- THE CRITICAL TENSION POINT

**Action** (reference/anti-cheat.md, "RED Verification"):

This is where coverage mode creates the biggest conceptual problem.

#### Check 1: Tests Exist
```bash
test -f "src/__tests__/stringHelpers.test.ts"
```
Pass -- the Test Writer created the file.

#### Check 2: Tests Fail (RED Phase)
```bash
npx vitest run src/__tests__/stringHelpers.test.ts 2>&1; echo "EXIT_CODE:$?"
```

**HERE IS THE PROBLEM**: The implementation ALREADY EXISTS at `src/utils/stringHelpers.ts`. If the Test Writer wrote correct characterization tests and the imports resolve, **the tests will PASS immediately** (exit code 0).

The anti-cheat rule says:
> "If exit code == 0 (tests pass) -> ANTI-CHEAT VIOLATION. This means the Test Writer wrote tautological tests that pass without implementation."

But that rule assumes Mode 1 (no implementation exists). In Mode 2, tests passing immediately is EXPECTED and CORRECT behavior -- we are characterizing existing code.

#### How the skill SHOULD handle this

The SKILL.md entry point detection says Mode 2 should "generate characterization tests first." The anti-cheat.md RED verification rule is written for Mode 1. There is an **implicit adaptation required**:

**Option A (Strict reading of SKILL.md)**: The skill proceeds as written. RED verification fires, detects tests passing, flags an anti-cheat violation, and re-prompts the Test Writer. This is WRONG for coverage mode and would cause an infinite retry loop -- the tests will always pass because the code exists.

**Option B (Reasonable interpretation)**: The orchestrator, knowing `entryPoint == "existing-codebase"`, MODIFIES the RED verification behavior:
- Skip Check 2 (tests must fail) entirely, OR
- Invert it: tests SHOULD pass (confirming they correctly characterize the code), OR
- Temporarily rename/hide the implementation file, run tests (they should fail with import errors), then restore it

**Option C (What the skill text most likely intends)**: The phrase "generate characterization tests first, then new feature tests" suggests a two-pass approach:
1. First pass: Write characterization tests. These WILL pass against existing code. RED verification is adapted to verify that tests fail when the implementation is REMOVED (confirming they actually test the impl, not tautologies).
2. Second pass (optional): If the user also wants new features, proceed with standard TDD.

**Most likely actual behavior**: The orchestrator recognizes Mode 2 and adapts RED verification. The remaining checks still apply:

#### Check 3: Correct Failure Type
If we use the "temporarily remove implementation" approach, we verify that failures are "Cannot find module" or "is not a function" -- confirming the tests actually import from the real implementation.

#### Check 4: Assertion Density
This check applies identically regardless of mode. Count `expect(` / `toBe(` / `toEqual(` patterns per test function. Must meet `minAssertionsPerTest` (default 1). Characterization tests should have high assertion density since we can verify exact return values.

#### Check 5: Behavior-Over-Implementation
This check is even MORE important for coverage mode. When writing tests for existing code, there's a strong temptation to:
- Test private methods directly (the writer can see them in the source)
- Mirror the implementation structure 1:1
- Use excessive mocking

The anti-cheat catches these. If `flagPrivateMethodTests` is true (default), the skill flags tests that access `._private` or `.__internal` patterns.

#### Record Checksums
After verification passes:
```bash
shasum -a 256 "src/__tests__/stringHelpers.test.ts" | cut -d' ' -f1
```
Checksums stored in state file.

### Step 9c: Spawn Code Writer -- ANOTHER TENSION POINT

**Action** (reference/code-writer-prompt.md):

In standard TDD, the Code Writer creates the implementation from scratch. In coverage mode, **the implementation already exists**.

**How this plays out**:

The Code Writer receives:
- Test file contents (read from disk)
- `spec-contract-string-helpers.md` (read from disk)
- Framework info
- Target impl file: `src/utils/stringHelpers.ts`
- Instructions: "Make these tests pass. Do NOT modify any test files."

**The Code Writer reads the existing implementation file** and determines that the tests already pass (or makes minimal adjustments if there are gaps). In coverage mode, the Code Writer's role shifts from "create implementation" to "verify/adjust existing implementation against new tests."

Possible outcomes:
1. **Tests already pass**: Code Writer reports completion without changes. This is the EXPECTED happy path for pure characterization.
2. **Tests reveal a gap**: The characterization spec includes edge cases the existing code doesn't handle. Code Writer patches the implementation. This is a bonus -- coverage mode discovered a bug.
3. **Tests and impl disagree**: The characterization spec may have described ideal behavior that the existing code doesn't match. This surfaces a design question.

### Step 9d: GREEN Verification

**Action** (reference/anti-cheat.md, "GREEN Verification"):

#### Check 1: Test Files Unchanged
```bash
shasum -a 256 "src/__tests__/stringHelpers.test.ts" | cut -d' ' -f1
```
Compare against RED verification checksums. This check applies identically -- the Code Writer must not have modified test files.

#### Check 2: No Skip Markers Added
```bash
grep -n 'xit\b\|xdescribe\b\|\.skip\b\|@pytest\.mark\.skip...' "src/__tests__/stringHelpers.test.ts"
```
Same check as Mode 1. No skipping allowed.

#### Check 3: All Tests Pass
```bash
npx vitest run src/__tests__/stringHelpers.test.ts 2>&1; echo "EXIT_CODE:$?"
```
Exit code must be 0. In coverage mode, this is almost guaranteed since the code already exists.

#### Check 4: No Hardcoded Returns
Read impl file and check for suspicious patterns. In coverage mode, this check is less relevant -- the implementation was written by a human, not by a Code Writer trying to cheat. But the check still runs.

### Step 9e: Spec Compliance Review

**Action** (reference/spec-compliance-reviewer-prompt.md):

Spawn a Spec Compliance Reviewer with:
- `spec-contract-string-helpers.md` (read from disk)
- Design summary: `null` (Phase 0 was skipped)
- Test file contents
- Implementation file contents

The reviewer checks:
1. **Requirement coverage**: Is every function in the spec-contract tested and implemented?
2. **Missing requirements**: Are there exported functions in the impl that the spec-contract missed?
3. **Scope creep**: Does the impl have functionality beyond the spec? (In coverage mode, this might surface dead code.)
4. **API contract accuracy**: Do signatures match?
5. **Integration readiness**: N/A for utils.

**Coverage-mode nuance**: The spec-contract was derived from the existing code, so compliance should be high. The real value is catching things the characterization missed -- functions the orchestrator didn't include in the spec, or edge cases not described.

If NON-COMPLIANT: pair goes back for revision (Test Writer adds missing tests, Code Writer adjusts).
If COMPLIANT: proceed to adversarial review.

### Step 9f: Adversarial Review

**Action** (reference/adversarial-reviewer-prompt.md):

Spawn an Adversarial Reviewer with:
- spec-contract, test files, implementation files

The reviewer applies the full checklist:
1. **Test completeness**: Edge cases covered?
2. **Test quality**: Meaningful assertions?
3. **Implementation quality**: Dead code? Obvious bugs?
4. **Cheating detection**: Hardcoded returns? (Less relevant for existing code)
5. **Coverage gaps**: Untested code paths?

Also checks the 5 anti-patterns from `reference/testing-anti-patterns.md`:
- Testing mock behavior instead of real code
- Test-only methods in production code
- Mocking without understanding side effects
- Incomplete mock objects
- Integration tests as afterthought

**Coverage-mode value**: The adversarial reviewer is particularly valuable here. It can identify:
- Code paths in `stringHelpers.ts` that no test exercises
- Branches where only one side is tested
- Error paths that need test coverage

If FAIL (critical issues): pair revises.
If PASS: mark work unit as completed in state file.

---

## Step 10: Parallel Execution

With `maxParallelPairs: 3` and all 4 units independent, the orchestrator:
1. Spawns Test Writers for `string-helpers`, `date-formatter`, and `validation` simultaneously
2. As each completes its pipeline, spawns the Test Writer for `api-client`
3. Each unit proceeds through RED -> Code Writer -> GREEN -> Spec Review -> Adversarial Review independently

State file is updated after every phase transition for every unit.

---

## Step 11: Phase 5 -- Final Review

**Action** (SKILL.md, "Phase 5"):

After ALL work units complete:

1. **Run the FULL test suite**:
   ```bash
   npx vitest run 2>&1; echo "EXIT_CODE:$?"
   ```
   This runs ALL tests (including any pre-existing tests), not just the new characterization tests.

2. **Verify pristine output**: All pass, no warnings, no skipped.

3. **Review holistically**: Check for naming conflicts between new test files and existing ones. Check that new tests don't interfere with existing tests.

4. **Cross-unit integration check**: For utils, this means ensuring that if `apiClient.ts` imports from `validation.ts`, both sets of tests can coexist.

5. **Anti-rationalization**: Read the actual test output. "Should work" is not evidence.

---

## Step 12: Phase 6 -- Report Generation

**Action** (reference/report-format.md):

Generate `tdd-report.md`:
```markdown
# TDD Session Report

**Date**: 2026-03-17T...
**Specification**: add test coverage for src/utils/
**Framework**: typescript / vitest
**Entry Point**: existing-codebase

## Summary

| Metric | Value |
|--------|-------|
| Work units | 4/4 |
| Tests written | 24 |
| Assertions | 48 |
| Anti-cheat violations | 0 |
| Adversarial reviews | 4/4 |
| Retries | 1 |

## Work Units
[... per-unit details ...]
```

Generate `tdd-session.jsonl` with all events logged throughout.

---

## Step 13: Phase 7 -- Cleanup

1. Shut down remaining teammates
2. Delete all `spec-contract-*.md` files
3. Final state file update
4. Present report to user
5. Suggest: "Run full test suite, review the report, and commit changes."

---

## Key Differences: Coverage Mode vs. Standard TDD

| Aspect | Standard TDD (Mode 1) | Coverage Mode (Mode 2) |
|--------|----------------------|----------------------|
| **Entry point** | Natural language spec | "add test coverage for..." |
| **Spec-contract source** | Designed from requirements | Reverse-engineered from existing code |
| **Implementation exists?** | No -- created by Code Writer | Yes -- already on disk |
| **Design gate** | May trigger for complex specs | Typically skipped (code is the design) |
| **RED verification** | Tests MUST fail (no impl) | Tests WOULD pass (impl exists) -- needs adaptation |
| **Code Writer role** | Create implementation from scratch | Verify/adjust existing implementation |
| **GREEN verification** | Standard -- tests must pass | Almost trivially satisfied |
| **Adversarial review focus** | Balance of test + impl quality | Primarily coverage gap detection |
| **Primary value** | Ensuring correctness of new code | Documenting and verifying existing behavior |
| **Anti-cheat relevance** | Full -- prevents lazy testing | Partial -- some checks need mode-aware logic |

---

## Identified Gap: RED Verification in Coverage Mode

The most significant finding in this trace is that the anti-cheat RED verification (Check 2: "Tests must fail") is incompatible with coverage mode as literally written. The SKILL.md acknowledges Mode 2 as a valid entry point but does not explicitly describe how RED verification adapts.

**Recommended resolution**: When `entryPoint == "existing-codebase"`:
1. Before running tests, temporarily move/rename the implementation file
2. Run tests -- they should fail with import/module-not-found errors (proving they actually import from the real code)
3. Restore the implementation file
4. Run tests again -- they should pass (proving the characterization is accurate)
5. If tests fail even WITH the implementation, the characterization spec was wrong -- feed back to Test Writer

This "remove-and-restore" approach preserves the anti-cheat intent (tests aren't tautological) while accommodating existing code.

---

## Identified Gap: --skip-design is Redundant for Coverage Mode

The SKILL.md says the design gate is skipped for Mode 3 (user-provided test) but does not explicitly say it is auto-skipped for Mode 2. The `--skip-design` flag is necessary here because:

- Mode 2 targets existing code, so there's no new design to validate
- Without `--skip-design`, a complex `src/utils/` with 3+ files could trigger the design gate (since it mentions "3+ distinct features or components")
- The flag correctly prevents this unnecessary gate

However, ideally the skill would auto-skip the design gate for Mode 2, making the flag redundant for coverage scenarios.
