# Anti-Cheat Guardrails

The anti-cheat system is the core differentiator of agentic-tdd. It ensures tests are
meaningful and implementation is genuine. ALL checks are mandatory and run on EVERY pair.

## RED Verification

Run after the Test Writer completes, before spawning the Code Writer.

### Check 1: Tests Exist

Verify that the expected test file(s) were created:

```bash
test -f "{test_file_path}"
```

If test files don't exist → FAIL. Re-prompt Test Writer.

### Check 2: Tests Fail (RED Phase)

Run the test command and verify non-zero exit code:

```bash
{test_command} {test_file_path} 2>&1; echo "EXIT_CODE:$?"
```

Parse the output for the exit code. If exit code == 0 (tests pass) → ANTI-CHEAT VIOLATION.

This means the Test Writer wrote tautological tests that pass without implementation.
Re-prompt with: "Your tests pass without any implementation. This means they test nothing
meaningful. Rewrite them to test actual behavior that requires implementation code."

### Check 3: Correct Failure Type

Parse test output for failure reasons. Acceptable failures:
- "not found" / "not defined" / "Cannot find module"
- "is not a function" / "is not defined"
- "ReferenceError" / "ImportError" / "ModuleNotFoundError"
- "expected [something] but received undefined"
- General assertion failures where expected values don't match actual

Unacceptable failures (test file itself is broken):
- "SyntaxError" in the test file
- "TypeError" caused by test code (not missing implementation)
- Test framework configuration errors
- File permission errors

If failures are unacceptable → re-prompt Test Writer with the error output.

### Check 4: Assertion Density

Read the test file and count assertion patterns per test function.

**JavaScript/TypeScript patterns**:
```
expect(     toBe(     toEqual(     toThrow(     toHaveBeenCalled(
toContain(  toMatch(  toBeTruthy(  toBeFalsy(   toBeGreaterThan(
toHaveLength(  toHaveProperty(  rejects.toThrow(  assert(  assert.
```

**Python patterns**:
```
assert      self.assert     assertEqual     assertRaises    pytest.raises
assertIn    assertNotIn     assertTrue      assertFalse     assertIsNone
assertAlmostEqual  assertGreater  assertLess
```

**Go patterns**:
```
t.Error     t.Errorf    t.Fatal     t.Fatalf    if.*!=
assert.     require.
```

**Count**: total assertions / total test functions. Must be >= `minAssertionsPerTest` (default: 1).

**Exclude trivial assertions**:
- `expect(true).toBe(true)` / `assert True`
- `expect(x).toBeDefined()` as sole assertion
- `expect(x).not.toBeNull()` as sole assertion
- `expect(mockFn).toHaveBeenCalled()` without argument checks

If below threshold → re-prompt: "Tests have insufficient assertion density. Each test
must contain at least {min} meaningful assertion(s). Add specific assertions about return
values, side effects, or error conditions."

### Check 5: Behavior-Over-Implementation

Scan test files for anti-patterns:

**Excessive mocking** (configurable threshold: `maxMockDepth`):
- Count mock/spy/stub declarations per test file
- If mocks > 2x the number of test functions → flag
- Mock-only assertions (only checking mocks were called, never checking real outcomes)

**Private method testing**:
- Direct access to private/internal methods (e.g., `obj._privateMethod`, `obj.__private`)
- Testing internal state (e.g., `expect(obj.internalState).toBe(...)`)

**Implementation mirroring**:
- Test structure that exactly mirrors implementation file structure 1:1
- Tests that name internal helper functions

If flagged → re-prompt: "Tests appear to test implementation details rather than
behavior. Focus on testing what the code DOES (inputs → outputs, side effects) not
HOW it does it internally."

### Record Checksums

After RED verification passes, compute checksums of all test files using `shasum` (available on both macOS and Linux):

```bash
shasum -a 256 "{test_file_path}" | cut -d' ' -f1
```

Store checksums in the state file under `redVerification.testFileChecksums`.

---

## GREEN Verification

Run after the Code Writer completes.

### Check 1: Test Files Unchanged

Compare current checksums against stored checksums:

```bash
shasum -a 256 "{test_file_path}" | cut -d' ' -f1
```

If ANY checksum differs → ANTI-CHEAT VIOLATION. The Code Writer modified test files.

Action: Discard ALL Code Writer changes (git checkout the test files), then re-prompt
the Code Writer: "You modified test files, which is forbidden. Write implementation
code ONLY. Do not change any test files. Make the tests pass as-is."

### Check 2: No Skip/Focus Markers Added

Grep test files for newly added skip markers:

```bash
grep -n 'xit\b\|xdescribe\b\|\.skip\b\|@pytest\.mark\.skip\|@skip\|t\.Skip\|@Ignore\|@Disabled\|pending(' "{test_file_path}"
```

Also check for `.only` / focus markers (which limit which tests run, hiding failures):

```bash
grep -n '\.only\b\|fdescribe\b\|fit\b' "{test_file_path}"
```

If any NEW matches found that weren't in the original test file → ANTI-CHEAT VIOLATION.

For skip markers: "You added skip markers to tests. Remove them and make ALL tests pass."
For focus markers: "You added .only/focus markers to limit which tests run. Remove them — ALL tests must run."

### Check 3: All Tests Pass

Run the test command:

```bash
{test_command} {test_file_path} 2>&1; echo "EXIT_CODE:$?"
```

If exit code != 0 → tests still failing. Re-prompt Code Writer with the failure output:
"The following tests are still failing. Fix your implementation to make them pass: [output]"

Track retry count. After `maxRetries`:
- Default: escalate to user with full context
- With `--skip-failed`: mark unit as failed, continue to next unit

### Check 4: No Hardcoded Returns (Heuristic)

This is a best-effort heuristic. Read the implementation file and look for suspicious
patterns:
- Functions that consist only of `return [literal]`
- Switch statements where every case returns a literal matching test expectations
- Implementations shorter than 3 lines for non-trivial specs

If suspicious → flag in the report but don't block (the adversarial reviewer will
catch this more thoroughly).

---

## Retry Protocol

When a verification fails and the agent is re-prompted:

1. Increment retry counter in state file
2. Include the specific failure reason in the re-prompt
3. Include the test output or verification details
4. If retrying Test Writer: "Your previous test file failed verification because: [reason]. Please rewrite."
5. If retrying Code Writer: "Your implementation failed because: [reason]. Fix it without modifying test files."

After `maxRetries` (default 3) consecutive failures for the same phase:
- Default behavior: pause and escalate to the user
- With `--skip-failed`: mark unit as failed, log the failure, continue

---

## Anti-Rationalization Table

Agents (and humans) will try to skip TDD discipline. These are the common excuses and why they are WRONG. When you detect any of these rationalizations in agent output or user requests, reject them firmly.

| Excuse | Rebuttal |
|--------|----------|
| "This is too simple to need tests" | Simple code becomes complex code. The test takes 30 seconds. Write it. |
| "I'll write the tests after" | That's not TDD. That's hoping your code works and writing tests to confirm your bias. Delete the code, write the test first. |
| "The test would just be testing the framework" | Then your feature is trivial and the test is trivial. Write it anyway — it catches regressions. |
| "I already know how to implement this" | Good. Then the test will be easy to write. The test documents the behavior for the next person. Write it. |
| "Deleting working code is wasteful" | Code written without a failing test is untested code. Untested code is a liability, not an asset. Delete it. |
| "I can just keep it as reference" | No. "Reference" code becomes "copied" code. The test must drive the implementation. Start clean. |
| "TDD is slowing me down" | TDD is preventing you from writing bugs. The time you "save" skipping tests is borrowed from debugging later. |
| "Just this once" | There is no "just this once." Every exception becomes the rule. If you skip here, you skip everywhere. |
| "The tests will be the same anyway" | If you already know the tests, writing them first costs nothing. If you're wrong, TDD just saved you from a bad implementation. |
| "Mocking everything is fine" | If you have to mock everything, your design is wrong. Tests should use real code. Mocks are a last resort, not a default. |

### Red Flags That Mean STOP

If any of these occur, halt the current work unit and restart from test writing:

1. **Implementation exists before test** — delete all implementation code, no exceptions
2. **Test passes immediately** — the test is tautological; rewrite to test real behavior
3. **Agent rationalizes skipping a test** — any excuse from the table above
4. **Agent keeps code "as reference"** — delete it entirely, not just comment it out
5. **Multiple tests written then all implemented at once** — must be one-test-at-a-time cycles
