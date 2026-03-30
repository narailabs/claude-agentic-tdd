# Eval 3: existing-test — Baseline Trace (No TDD Skill)

## Input
`/tdd implement against src/__tests__/calculator.test.ts`

## What Default Claude Code Would Do

### Step 1: Interpret the command
Without the TDD skill, Claude interprets this as: "read the existing test file and write implementation code to make the tests pass." This is the closest a baseline Claude gets to TDD — the tests already exist. However, critical skill behaviors are still absent.

### Step 2: Implementation approach

1. Read `src/__tests__/calculator.test.ts` to understand what's being tested
2. Write `src/calculator.ts` (or wherever the import points) to make tests pass
3. Run tests
4. Fix any failures
5. Report done

### Step 3: Actual file creation sequence

```
1. Read src/__tests__/calculator.test.ts    ← read existing tests
2. Write src/calculator.ts                   ← implementation
3. Run tests
4. Fix failures if any
5. Report done
```

### Step 4: What's missing even in this "test-first-ish" scenario
Even though tests exist before implementation (because the user provided them), the baseline still lacks every structural guardrail that the TDD skill provides.

## Detailed Behavioral Analysis

### Would Claude use agent teams?
**NO.** Single-session execution. The same Claude that reads the test file also writes the implementation. There is no separation of concerns.

### Would Claude write tests first?
**PARTIALLY.** The tests already exist (user-provided), so in a sense this is test-first. However, Claude does not:
- Verify test quality before implementing
- Check assertion density
- Check for behavior-over-implementation patterns
- Verify the tests actually test meaningful behavior

### Would Claude verify RED?
**NO.** This is Mode 3 in the TDD skill (user-provided test), which actually skips RED verification by design since the user owns the tests. However, the baseline doesn't even have a concept of "Mode 3" — it simply doesn't verify RED in any mode. The distinction matters because the skill makes a conscious, documented decision to trust user tests, while the baseline simply has no verification at all.

### Would Claude verify GREEN?
**NO.** This is the most critical gap for existing-test mode. Without GREEN verification:
- Claude could modify the test file to make tests pass (no checksum comparison)
- Claude could add `.skip` markers to failing tests
- Claude could weaken assertions
- Nothing prevents test tampering

The TDD skill records test file checksums before the Code Writer starts and verifies they're unchanged after. The baseline has no such mechanism.

### Would Claude use information barriers?
**NO.** The same session reads the test, understands what it expects, and writes the implementation. While this is less problematic for user-provided tests (the tests are already "independent"), it still means Claude can over-fit the implementation to test specifics rather than building robust code.

### Would Claude do formal reviews?
**NO.** No spec compliance review (is the implementation complete relative to what the tests require?). No adversarial review (are there edge cases the user's tests miss?). No code quality review. Claude writes code to pass tests and reports done.

### Would Claude detect it's in "existing test" mode?
**NO.** The TDD skill has explicit entry point detection (Mode 3: user-provided test) with specific behavioral adaptations. The baseline has no mode detection — it just interprets the request ad hoc.

### Would Claude use eager dispatch?
**NO.** Single file implementation, sequential execution.

### Would Claude generate state or reports?
**NO.** No `.tdd-state.json`, no `tdd-report.md`, no session log. If the session is interrupted, all progress context is lost.

## Anti-Patterns Present in Baseline

1. **No GREEN verification**: Test files could be modified to make them pass — no tamper detection
2. **No formal review**: Implementation quality unverified beyond "tests pass"
3. **No mode detection**: No adaptation for existing-test entry point
4. **No assertion quality check**: User tests accepted without density/quality verification
5. **No report generation**: No documentation of what was implemented
6. **No state management**: Cannot resume if interrupted
7. **No spec-contract extraction**: No machine-readable artifact linking tests to requirements
8. **No skip-marker detection**: Claude could add `.skip` to difficult tests without detection
