# Eval 4: coverage-mode — Baseline Trace (No TDD Skill)

## Input
`/tdd add test coverage for src/utils/ --skip-design`

## What Default Claude Code Would Do

### Step 1: Interpret the command
Without the TDD skill, `/tdd` is not recognized. Claude interprets this as: "add test coverage for the files in `src/utils/`." The `--skip-design` flag is meaningless to baseline Claude (no design gate concept exists).

### Step 2: Implementation approach
Claude would read the existing source files in `src/utils/`, understand what they do, then write tests for them. This is a characterization testing task — the code already exists, and tests need to document its current behavior.

1. Read all files in `src/utils/`
2. Understand each function/module
3. Write test files that exercise the existing code
4. Run tests to confirm they pass
5. Report done

### Step 3: Actual file creation sequence

```
1. Read src/utils/*.ts (or .js)          ← understand existing code
2. Write src/__tests__/utils.test.ts     ← tests based on reading implementation
3. Run tests
4. Fix any failures
5. Report done
```

### Step 4: Critical gap — coverage mode RED verification
The TDD skill has a specific Coverage Mode RED Verification for Mode 2 (existing codebase):
1. Temporarily rename the source files
2. Run tests — they should fail (proving tests actually depend on real code)
3. Restore the source files
4. Run tests — they should pass (proving characterization is accurate)

This procedure catches a critical failure mode: tests that import from the source but don't actually exercise it (mocked out, wrong imports, or testing their own setup code). The baseline has no such verification.

## Detailed Behavioral Analysis

### Would Claude use agent teams?
**NO.** Single-session execution. All test writing happens in the main session.

### Would Claude write tests first?
**NOT APPLICABLE / NO.** In coverage mode, the implementation already exists. The task is to write tests that characterize it. However, Claude would write tests that are shaped by reading the implementation (it sees the code, then writes tests that match what it saw). This is the opposite of behavioral testing — it's implementation-mirroring.

### Would Claude verify RED (Coverage Mode)?
**NO.** This is the most critical gap for coverage mode. Without the rename-test-restore cycle:
- Tests might import the module but not actually exercise its real code paths
- Tests might use mocks that bypass the actual implementation
- Tests might pass for reasons unrelated to the source code being correct
- There is no proof that the tests actually depend on `src/utils/`

The TDD skill's coverage mode RED verification (hide implementation, verify tests fail, restore, verify tests pass) is specifically designed for this scenario and is completely absent in baseline.

### Would Claude verify GREEN?
**PARTIALLY.** Claude would run tests and confirm they pass. But there's no checksum mechanism, no tamper detection, and no verification that the tests actually exercise the real code vs. mocked versions.

### Would Claude use information barriers?
**NO.** Claude reads the implementation first, then writes tests. The tests inevitably mirror the implementation structure. For coverage mode, this means:
- Tests check what the code does, not what it should do
- Bug-compatible tests: if the code has a bug, the test documents the bug as correct behavior
- Tests tied to implementation details (internal variable names, private methods, specific control flow)

### Would Claude do formal reviews?
**NO.** No adversarial review to check:
- Are the tests actually testing behavior or just mirroring implementation?
- Are there code paths that are untested?
- Are the mocks appropriate or do they hide real behavior?

### Would Claude detect the `--skip-design` flag?
**NO.** The flag is meaningless without the skill. There is no design gate to skip.

### Would Claude detect it's in "coverage mode"?
**NO.** The TDD skill has explicit Mode 2 (existing codebase) detection with specific behavioral adaptations. Baseline Claude just reads and writes without mode awareness.

### Would Claude handle src/utils/ as multiple work units?
**NO.** If `src/utils/` contains multiple files (e.g., `string-utils.ts`, `date-utils.ts`, `array-utils.ts`), Claude would likely write a single test file covering all of them, rather than decomposing into independent work units that could be developed and reviewed in parallel.

### Would Claude check assertion density?
**NO.** No minimum assertion threshold. Tests could have a single weak assertion per test case.

## Anti-Patterns Present in Baseline

1. **No Coverage Mode RED verification**: No rename-test-restore cycle to prove tests depend on real code
2. **Implementation-mirroring tests**: Tests shaped by reading source code, not by behavioral specification
3. **Bug-compatible characterization**: If existing code has bugs, tests document them as correct
4. **No assertion density check**: Tests may have weak or vacuous assertions
5. **No behavioral focus**: Tests likely mirror implementation structure (private methods, internal state)
6. **No work unit decomposition**: All utils tested in one monolithic pass
7. **No formal review**: Test quality unverified
8. **Flag ignored**: `--skip-design` meaningless without skill
9. **No spec-contract**: No machine-readable artifact documenting what each util should do
10. **No mock depth checking**: Tests might over-mock, bypassing the real code entirely
