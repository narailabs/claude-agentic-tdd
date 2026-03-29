# TDD Skill Execution Trace: User-Provided Test Mode

## Input

```
/tdd implement against src/__tests__/calculator.test.ts
```

---

## Step 1: Entry Point Detection (Mode 3 Identified)

The skill parses `$ARGUMENTS` and matches the phrase "implement against" combined with a test file path. Per SKILL.md "Entry Point Detection" section:

> **3. User-provided test**: User says "implement against this test..." or provides a failing test file -- skip Test Writer, go directly to Code Writer

**Decision**: Entry point mode is `user-provided-test`. This is recorded in the state file as `"entryPoint": "user-provided-test"`.

### Consequences of Mode 3

The following phases are affected:

| Phase | Normal Mode | Mode 3 (User-Provided Test) | Reason |
|-------|-------------|----------------------------|--------|
| Phase 0: Design Gate | Conditional | **SKIPPED** | SKILL.md explicitly says "Skip when: User-provided failing test (entry point mode 3)" |
| Phase 1: Framework Detection | Runs | **Runs** | Still need to know how to execute the tests |
| Phase 2: Work Decomposition | Runs (multi-unit) | **Simplified** (single unit) | The test file IS the spec; no decomposition needed |
| Phase 3: State Init | Runs | **Runs** | State tracking still required |
| Phase 4a: Test Writer | Runs | **SKIPPED** | User already wrote the tests |
| Phase 4b: RED Verification | Runs | **Runs (modified)** | Must verify user's tests actually fail |
| Phase 4c: Code Writer | Runs | **Runs** | Core of the workflow |
| Phase 4d: GREEN Verification | Runs | **Runs** | Must verify tests now pass |
| Phase 4e: Spec Compliance Review | Runs | **Runs (adapted)** | Spec contract derived from test file instead of Test Writer |
| Phase 4f: Adversarial Review | Runs | **Runs** | Quality gate still applies |
| Phase 5: Final Review | Runs | **Runs** | Integration verification still required |
| Phase 6: Report | Runs | **Runs** | Report generation still required |
| Phase 7: Cleanup | Runs | **Runs** | Always runs |

---

## Step 2: Prerequisites Check

1. **Agent teams enabled**: Check that `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set to `1`. If not, inform user and halt.
2. **Git repository**: Check for `.git` directory. If absent, warn but continue.

---

## Step 3: Configuration Loading

Load configuration in priority order:

1. Check for `.tdd.config.json` at project root (or `--config` path). Parse if found.
2. Check project `CLAUDE.md` for `## TDD Configuration` section.
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

No `--skip-failed`, `--config`, `--design`, or `--skip-design` flags were passed, so defaults apply. However, `--skip-design` is effectively implied by mode 3 anyway (see Phase 0 skip rule).

---

## Step 4: Phase 0 -- Design Gate

**SKIPPED.** The skill explicitly lists "User-provided failing test (entry point mode 3)" as a skip condition for the design gate. No clarifying questions, no design document, no user approval gate.

`designSummary` is set to `null` in the state file.

---

## Step 5: Phase 1 -- Framework Detection

Even though the test file is user-provided, the skill still needs to know how to run it. The framework detection algorithm from `reference/framework-detection.md` executes:

1. Check `.tdd.config.json` for explicit framework config -- if found, use it.
2. Check project `CLAUDE.md` for `## TDD Configuration` section.
3. Auto-detect: The test file is `src/__tests__/calculator.test.ts` -- the `.ts` extension and `__tests__` directory pattern strongly suggest Jest or Vitest.
   - Read `package.json` and check `dependencies`/`devDependencies` for `vitest`, `jest`, etc.
   - Check for `scripts.test` in `package.json`.
   - Check for `tsconfig.json` to confirm TypeScript.
4. Store the result, e.g.:
   ```
   framework:
     language: "typescript"
     testRunner: "jest"  (or "vitest", depending on detection)
     testCommand: "npx jest" (or "npx vitest run")
     testFilePattern: "**/*.test.ts"
     sourceDir: "src/"
     testDir: "src/__tests__/"
   ```

---

## Step 6: Phase 2 -- Work Decomposition (Simplified)

In mode 3, there is no natural language spec to decompose. The user-provided test file IS the work unit. The skill creates a single work unit:

- **id**: `calculator` (derived from the test filename)
- **name**: "Calculator" (humanized)
- **spec-contract**: Derived by reading the test file and extracting the behavioral requirements from test descriptions and assertions. The skill reads `src/__tests__/calculator.test.ts` and synthesizes a spec-contract.
- **dependsOn**: `[]` (single unit, no dependencies)
- **testFiles**: `["src/__tests__/calculator.test.ts"]`
- **implFiles**: Inferred from the test file's import statements (e.g., if the test imports from `../calculator`, the impl file is `src/calculator.ts`)

### Spec-Contract Generation for Mode 3

Since there is no Test Writer to produce the `spec-contract-calculator.md` file, the Team Manager (lead) must generate it. The lead:

1. Reads the test file from disk.
2. Analyzes the `describe` blocks, `it`/`test` descriptions, and assertions.
3. Produces a `spec-contract-calculator.md` file containing:
   - Summary of what the implementation must do
   - Public API surface (function signatures, class interfaces) as imported by the test
   - Expected behavior for each test case
   - Constraints or requirements inferred from assertions
4. Writes it to `src/__tests__/spec-contract-calculator.md` (same directory as the test file, per Test Writer template convention).

### User Confirmation

Present the work plan (simplified for single unit):

```
## TDD Work Plan

Framework: jest (auto-detected)
Mode: user-provided-test
Work units: 1

### Unit 1: calculator
Spec: [synthesized from test file analysis]
Test file: src/__tests__/calculator.test.ts (user-provided, read-only)
Implementation file: src/calculator.ts (to be created)
Dependencies: none

Note: Test Writer phase will be skipped. Tests are user-provided.

Proceed? [confirm/modify/cancel]
```

Wait for user confirmation.

---

## Step 7: Phase 3 -- State Initialization

1. Check for existing `.tdd-state.json`. If found, offer resume/restart/add-units. If not, create new.
2. Add `.tdd-state.json`, `tdd-session.jsonl`, and `spec-contract-*.md` to `.gitignore`.
3. Initialize `tdd-session.jsonl` with a `session.start` event:
   ```json
   {"timestamp": "2026-03-17T...", "event": "session.start", "unitId": null, "data": {"spec": "implement against src/__tests__/calculator.test.ts", "entryPoint": "user-provided-test", "framework": {"language": "typescript", "testRunner": "jest", ...}}}
   ```

State file created with:
- `entryPoint`: `"user-provided-test"`
- `designSummary`: `null`
- Single work unit with `testWriter.status`: `"completed"` (pre-completed since user provided the tests)

---

## Step 8: Phase 4a -- Test Writer

**SKIPPED.** The user provided the test file. No Test Writer agent is spawned. The state file records the Test Writer as pre-completed:

```json
"testWriter": {
  "status": "completed",
  "attempts": 0,
  "lastError": null
}
```

Session log does NOT emit `test-writer.spawned` or `test-writer.completed` events.

---

## Step 9: Phase 4b -- RED Verification (RUNS, with full checks)

Even though the user wrote the tests, RED verification is essential. The user's tests might be tautological, syntactically broken, or already passing. The anti-cheat system applies to ALL tests regardless of origin.

### Check 1: Tests Exist

```bash
test -f "src/__tests__/calculator.test.ts"
```

The file was provided by the user so it should exist. If somehow missing, report error.

### Check 2: Tests Fail (RED Phase)

```bash
npx jest src/__tests__/calculator.test.ts 2>&1; echo "EXIT_CODE:$?"
```

Parse exit code. Tests MUST fail (exit code != 0). This is the critical RED verification.

**If tests PASS (exit code == 0)**: This is an anti-cheat violation. But since there is no Test Writer to re-prompt, the skill must escalate to the user:

> "Your tests pass without any implementation. This means they either test nothing meaningful, or the implementation already exists. Please provide failing tests that require new implementation code."

This is a **HARD GATE** -- cannot proceed until tests fail.

### Check 3: Correct Failure Type

Parse test output. Acceptable: "Cannot find module", "is not a function", "ReferenceError", "ModuleNotFoundError". Unacceptable: SyntaxError in the test file, TypeError in test code, framework config errors.

**If unacceptable failures**: Escalate to user (since there is no Test Writer to re-prompt):

> "Your test file has errors that prevent it from running correctly: [error]. Please fix the test file and re-run /tdd."

### Check 4: Assertion Density

Read the test file. Count TypeScript assertion patterns (`expect(`, `toBe(`, `toEqual(`, `toThrow(`, etc.) per test function. Must be >= `minAssertionsPerTest` (default: 1).

Exclude trivial assertions: `expect(true).toBe(true)`, sole `toBeDefined()`, etc.

**If below threshold**: Escalate to user:

> "Your tests have insufficient assertion density. Each test must contain at least 1 meaningful assertion(s). Please add specific assertions."

### Check 5: Behavior-Over-Implementation

Scan for anti-patterns:
- Excessive mocking (mocks > 2x test functions)
- Private method testing (`obj._privateMethod`)
- Implementation mirroring

**If flagged**: Warn user but do not block (these are user-authored tests; the skill respects user intent but logs the concern).

### Record Checksums

After RED verification passes:

```bash
shasum -a 256 "src/__tests__/calculator.test.ts" | cut -d' ' -f1
```

Store the checksum in state file under `redVerification.testFileChecksums`. This is CRITICAL -- the same checksum verification applies regardless of who wrote the tests. The Code Writer is still forbidden from modifying them.

**Session log events**:
```json
{"event": "red.verification.start", "unitId": "calculator", ...}
{"event": "red.verification.passed", "unitId": "calculator", "data": {"failureCount": N, "assertionCount": M}}
```

---

## Step 10: Phase 4c -- Code Writer (RUNS)

### Information Barrier in Mode 3

The information barrier still applies, but its shape changes:

**Normal mode**: The barrier prevents the Code Writer from seeing the Test Writer's reasoning/prompt. The Code Writer only sees test file contents read from disk and the spec-contract read from disk.

**Mode 3**: There is no Test Writer reasoning to hide, so the barrier is inherently satisfied. However, the principle still applies:

- The Code Writer receives ONLY:
  - Test file contents read from disk (`src/__tests__/calculator.test.ts`)
  - The `spec-contract-calculator.md` contents (generated by the lead in Phase 2, read from disk)
  - Framework info (language, test runner, test command)
  - Target implementation file path(s) (e.g., `src/calculator.ts`)
  - Project conventions from `CLAUDE.md`

- The Code Writer MUST NOT receive:
  - Any reasoning about how the tests were designed
  - Implementation hints beyond the spec-contract
  - Any other project code not directly relevant

The lead fills in the Code Writer prompt template from `reference/code-writer-prompt.md`:

```
You are a Code Writer in an enforced TDD workflow. Your ONLY job is to write
the minimum implementation code that makes the provided tests pass.

## Tests To Pass
[contents of src/__tests__/calculator.test.ts, read from disk]

## Spec Contract
[contents of spec-contract-calculator.md, read from disk]

## Framework
- Language: TypeScript
- Test runner: Jest (or Vitest)
- Test command: npx jest
- Implementation file(s) to create: src/calculator.ts

## Project Conventions
[from CLAUDE.md, or "No specific conventions."]

## Rules (Non-Negotiable)
1. DO NOT MODIFY TEST FILES. [...]
2. DO NOT ADD SKIP/IGNORE MARKERS. [...]
3. MINIMUM IMPLEMENTATION. [...]
4. NO HARDCODING. [...]
5. CORRECT EXPORTS. [...]
6. ERROR HANDLING. [...]
7. DEPENDENCIES. [...]
```

### Lead Verification Checklist

Before spawning, the lead verifies:
- [x] Prompt contains test file contents read from DISK (not from any agent output)
- [x] Prompt contains spec-contract read from DISK (the one the lead generated)
- [x] Prompt does NOT contain any reference to "Test Writer" or test authoring process
- [x] Test file checksums have been recorded for GREEN verification

The Code Writer teammate is spawned and produces the implementation file(s).

**Session log events**:
```json
{"event": "code-writer.spawned", "unitId": "calculator", "data": {"attempt": 1}}
{"event": "code-writer.completed", "unitId": "calculator", "data": {"implFiles": ["src/calculator.ts"], "duration": "..."}}
```

---

## Step 11: Phase 4d -- GREEN Verification (RUNS, full checks)

### Check 1: Test Files Unchanged (Checksum Verification)

```bash
shasum -a 256 "src/__tests__/calculator.test.ts" | cut -d' ' -f1
```

Compare against the checksum stored during RED verification. **This check is identical regardless of who wrote the tests.** If the Code Writer modified the user's test file, it is an anti-cheat violation.

**If checksum differs**: Discard Code Writer changes (`git checkout` the test file), re-prompt:

> "You modified test files, which is forbidden. Write implementation code ONLY. Do not change any test files. Make the tests pass as-is."

### Check 2: No Skip/Focus Markers Added

```bash
grep -n 'xit\b\|xdescribe\b\|\.skip\b\|@pytest\.mark\.skip\|@skip\|t\.Skip\|@Ignore\|@Disabled\|pending(' "src/__tests__/calculator.test.ts"
grep -n '\.only\b\|fdescribe\b\|fit\b' "src/__tests__/calculator.test.ts"
```

Check for newly added markers (compare against any that existed in the original user-provided file).

### Check 3: All Tests Pass

```bash
npx jest src/__tests__/calculator.test.ts 2>&1; echo "EXIT_CODE:$?"
```

Exit code must be 0. If not, re-prompt Code Writer with failure output (up to `maxRetries` = 3).

If all retries exhausted:
- Default: escalate to user with full context
- Triggers Systematic Debugging Protocol (Phase D1-D4) if Code Writer fails 2+ times on the same test

### Check 4: No Hardcoded Returns (Heuristic)

Read the implementation file. Look for suspicious patterns:
- Functions returning only literals
- Switch statements with all literal returns matching test expectations
- Implementations shorter than 3 lines for non-trivial specs

If suspicious: flag in report (does not block; adversarial reviewer will catch it).

**Session log events**:
```json
{"event": "green.verification.start", "unitId": "calculator", ...}
{"event": "green.verification.passed", "unitId": "calculator", ...}
```

---

## Step 12: Phase 4e -- Spec Compliance Review (RUNS)

The Spec Compliance Reviewer is spawned as a teammate with:

- The `spec-contract-calculator.md` contents (the lead-generated one, read from disk)
- Design summary: `null` ("No design phase was run.")
- Test file contents (read from disk)
- Implementation file contents (read from disk)

The reviewer checks:
1. **Requirement coverage** -- Is every spec-contract requirement implemented and tested?
2. **Missing requirements** -- Are there implied requirements?
3. **Scope creep** -- Does the implementation include features NOT in the spec?
4. **API contract accuracy** -- Do signatures and types match?
5. **Integration readiness** -- Are interfaces compatible?

**If NON-COMPLIANT**: Since there is no Test Writer to add missing tests, the lead must either:
- Add the missing tests itself (acting as a proxy Test Writer, then re-running RED verification on the new tests)
- Escalate to the user: "The spec compliance review found gaps. The following requirements are not covered: [list]. Would you like to add tests for these?"

**If COMPLIANT**: Proceed to adversarial review.

**ORDERING RULE**: Spec compliance MUST pass before adversarial review runs.

---

## Step 13: Phase 4f -- Adversarial Review (RUNS)

The Adversarial Reviewer is spawned as a teammate with:

- The `spec-contract-calculator.md` contents (read from disk)
- Test file contents (read from disk)
- Implementation file contents (read from disk)
- The scoring rubric from `reference/adversarial-reviewer-prompt.md`

The reviewer evaluates:
1. **Test Completeness** (score/5) -- Are all behaviors tested? Edge cases? Negative cases?
2. **Test Quality** (score/5) -- Meaningful assertions? Independent tests? Good names?
3. **Implementation Quality** (score/5) -- Follows spec? Minimum code? Obvious bugs?
4. **Cheating Detection** -- Hardcoded returns? Test-aware code? Shallow implementation? Mock exploitation?
5. **Coverage Gaps** -- Untested code paths? One-sided conditionals?

Also checks for the 5 anti-patterns from `reference/testing-anti-patterns.md`:
1. Testing Mock Behavior
2. Test-Only Methods
3. Mocking Without Understanding
4. Incomplete Mocks
5. Integration Tests as Afterthought

**If FAIL verdict (critical issues)**: The pair must revise. Since there is no Test Writer agent, the lead either:
- Addresses test gaps itself or asks the user to improve the tests
- Re-prompts the Code Writer for implementation issues
- Repeats RED (if tests changed) -> Code Writer -> GREEN -> Review cycle

**If PASS verdict**: Mark work unit as completed in state file.

**Session log events**:
```json
{"event": "adversarial.spawned", "unitId": "calculator", ...}
{"event": "adversarial.passed", "unitId": "calculator", "data": {"findings": [...]}}
{"event": "unit.completed", "unitId": "calculator"}
```

---

## Step 14: Phase 5 -- Final Review

1. **Run the FULL test suite** (not just calculator tests -- all test files in the project):
   ```bash
   npx jest 2>&1; echo "EXIT_CODE:$?"
   ```
   Read the actual output. Do not assume success.

2. **Verify pristine output**: All tests pass, no warnings, no skipped tests, no pending tests.

3. **Review all generated code holistically** -- look for inconsistencies, naming conflicts.

4. **Cross-unit integration check**: For a single-unit run, this is primarily checking that the new code does not break existing tests.

5. If issues found: fix before proceeding. Apply the anti-rationalization table -- no "it should work" excuses.

---

## Step 15: Phase 6 -- Report Generation

Generate `tdd-report.md` with:

```markdown
# TDD Session Report

**Date**: 2026-03-17T...
**Specification**: implement against src/__tests__/calculator.test.ts
**Framework**: TypeScript / Jest
**Entry Point**: user-provided-test

## Summary

| Metric | Value |
|--------|-------|
| Work units | 1/1 |
| Tests written | [count from user's file] |
| Assertions | [count] |
| Anti-cheat violations | [count] |
| Adversarial reviews | 1/1 |
| Retries | [count] |

## Work Units

### Calculator -- completed

| Phase | Status | Attempts | Notes |
|-------|--------|----------|-------|
| Test Writer | skipped (user-provided) | 0 | Tests provided by user |
| RED Verification | passed | -- | [N] failures, [M] assertions |
| Code Writer | completed | [N] | -- |
| GREEN Verification | passed | -- | All tests passing |
| Spec Compliance | compliant | -- | [N]/[N] requirements covered |
| Adversarial Review | passed | -- | [findings summary] |

## Anti-Cheat Log
[any violations]

## Final Integration Check
- All tests passing: yes
- Integration issues found: none
```

Also append final events to `tdd-session.jsonl`:
```json
{"event": "integration.check", "unitId": null, "data": {"passed": true, "totalTests": N, "failures": 0}}
{"event": "session.complete", "unitId": null, "data": {"summary": {...}}}
```

---

## Step 16: Phase 7 -- Cleanup

1. Shut down any remaining teammates (Code Writer, reviewers should already be done).
2. **Delete intermediate artifacts**: Remove `spec-contract-calculator.md` (the lead-generated spec-contract).
3. Final state file update (mark session complete).
4. Present the report to the user.
5. Suggest next steps: "Run the full test suite (`npx jest`), review the implementation, and commit when satisfied."

---

## Summary of Checksum Verification in Mode 3

The checksum flow is:

```
RED Verification (Step 9)
    |
    v
Record SHA-256 of src/__tests__/calculator.test.ts
    |
    v
Store in state: redVerification.testFileChecksums
    |
    v
Code Writer runs (Step 10)
    |
    v
GREEN Verification (Step 11)
    |
    v
Recompute SHA-256 of src/__tests__/calculator.test.ts
    |
    v
Compare against stored checksum
    |
    +-- MATCH: proceed
    +-- MISMATCH: ANTI-CHEAT VIOLATION, discard Code Writer changes, re-prompt
```

**Key point**: The checksum mechanism is completely agnostic to who wrote the tests. Whether the Test Writer agent or the user authored the file, the Code Writer is forbidden from changing it, and this is enforced by cryptographic hash comparison.

---

## Agents Spawned in Mode 3

| Agent | Spawned? | Role |
|-------|----------|------|
| Test Writer | NO | User provided tests |
| Code Writer | YES | Writes implementation to pass user's tests |
| Spec Compliance Reviewer | YES | Verifies implementation matches derived spec-contract |
| Adversarial Reviewer | YES | Quality gate on tests + implementation |

Total agents spawned: 3 (vs. 4 in normal mode).
