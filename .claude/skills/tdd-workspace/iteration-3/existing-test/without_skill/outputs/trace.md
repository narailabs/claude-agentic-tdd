# Trace: Default Claude Code Handling "/tdd implement against src/__tests__/calculator.test.ts"

## Scenario

User prompt: `/tdd implement against src/__tests__/calculator.test.ts`

No TDD skill is loaded. Claude Code processes this as a plain natural-language request.

---

## Step-by-Step Predicted Behavior

### Step 1: Parse the Intent

Claude Code does not recognize `/tdd` as a registered skill command because no skill is installed. It treats the entire string as a natural-language instruction: "The user wants me to implement code that satisfies the tests in `src/__tests__/calculator.test.ts`."

Claude Code WOULD correctly understand this as a "make the tests pass" task. The phrasing "implement against [test file]" is unambiguous even without a dedicated skill parser.

What Claude Code would NOT do:

- Detect this as "entry point mode 3" (user-provided test) -- it has no mode concept
- Skip Test Writer or design phases -- those concepts do not exist
- Treat the test file as an immutable contract -- it sees it as just another file

---

### Step 2: Read the Test File

Claude Code WOULD read the test file. When a user references a specific file path, Claude Code reliably reads it to understand the request.

```
Tool call: Read src/__tests__/calculator.test.ts
```

Claude Code would analyze imports, describe blocks, individual test cases, and assertions to build a mental model of what functions/classes/methods need to exist.

---

### Step 3: Infer Implementation Requirements

Based on the test file, Claude Code would determine:

- The import path (e.g., `import { Calculator } from '../calculator'`)
- The class or function interface expected (constructor, method signatures)
- Expected return values and behaviors for each test case
- Error handling expectations (throws, rejects, returns error objects)

This is implicit reasoning, not a formal spec extraction. Claude Code would not produce a spec-contract document or any intermediate artifact.

---

### Step 4: Write Implementation Code (Single Pass)

Claude Code would create or edit the implementation file (e.g., `src/calculator.ts`) in a single pass, attempting to satisfy ALL tests simultaneously. It would:

- Create the file if it does not exist
- Export the expected class/functions matching the import statement
- Implement all methods/functions with logic intended to pass every test

There is no RED-GREEN cycle. There is no incremental verification. Claude Code writes the complete implementation at once based on its reading of the test file.

---

### Step 5: Run Tests (Likely but Not Enforced)

Claude Code would LIKELY run the tests after writing the implementation. This is probable because:

- The task explicitly involves making tests pass, so verification is implied
- Claude Code has a general tendency to verify work when the task is test-related

It would execute something like:

```bash
npx vitest run src/__tests__/calculator.test.ts
# or
npx jest src/__tests__/calculator.test.ts
```

If tests fail, Claude Code would read the output, adjust the implementation, and re-run. It would iterate 1-3 times.

However, this is NOT guaranteed. Claude Code might:

- Skip running tests if it judges the implementation to be obviously correct
- Run tests but skim the output, missing partial failures
- Declare success after seeing "X passed" without noticing "Y failed" on the same line
- Say "the tests should pass now" without actually running them

---

### Step 6: Report Completion

Claude Code would summarize what it did: "I read the test file, created `src/calculator.ts` with the Calculator class, and verified all tests pass." If it did run the tests, it would include the output. If it did not, it would state its confidence that the implementation is correct.

---

## What Claude Code Would NOT Do

This section maps directly to the eval assertions for the TDD skill.

### 1. Detect Entry Point Mode 3 (User-Provided Test)

The TDD skill recognizes "implement against [test file]" as Mode 3, which triggers specific adaptations: skip Test Writer, skip RED verification, skip design gate, go directly to Code Writer with information barrier.

Default Claude Code has no concept of modes. It just reads the file and writes code.

**Assertion gap**: "Detects that the user provided an existing test file (entry point mode 3)" -- FAIL without skill.

### 2. Skip the Test Writer Phase (Preserve User's Test File)

The TDD skill explicitly skips the Test Writer agent for Mode 3 because the user owns the tests. It treats the test file as a fixed contract.

Default Claude Code has no Test Writer agent to skip -- but more importantly, it has no constraint against modifying the test file. If the implementation proves difficult, Claude Code may:

- Adjust assertions it believes are "incorrect"
- Change import paths
- Add `.skip` or `.todo` to problematic tests
- Rewrite test descriptions

**Assertion gap**: "Skips the Test Writer phase -- does NOT rewrite or replace the user's test file" -- PARTIAL. Claude Code would not proactively rewrite the tests, but it has no hard protection against modifying them under pressure.

### 3. Read Test File and Pass Contents to Code Writer (Information Barrier)

The TDD skill reads the test file from disk and passes it to a separate Code Writer agent with an information barrier -- the Code Writer receives ONLY the test file and spec-contract, nothing else.

Default Claude Code reads the test file, but there is no information barrier. The same context that reads the tests also writes the implementation. This means Claude Code can take shortcuts: it knows the exact assertion values and can write code that produces those specific outputs without genuine logic.

**Assertion gap**: "Reads the existing test file from disk and passes contents to the Code Writer" -- PARTIAL. It reads the file, but there is no separate Code Writer agent and no information barrier.

### 4. GREEN Verification (Checksum Check, All Tests Pass)

The TDD skill performs GREEN verification with two components:
- Checksum verification: confirms test files are byte-identical to their state before the Code Writer ran
- Test execution: confirms all tests pass with exit code 0

Default Claude Code:
- No checksum verification whatsoever. If the test file was modified, nobody would notice.
- Test execution is likely but not enforced. There is no protocol requiring it.
- No check for newly added skip/ignore markers in tests.

**Assertion gap**: "Still performs GREEN verification (checksum check, all tests pass)" -- FAIL without skill. The checksum component is entirely absent. The test-execution component is probable but not enforced.

### 5. Adversarial Review

The TDD skill spawns a separate Adversarial Reviewer agent that independently evaluates:
- Edge case coverage
- Test-implementation coupling
- Coverage gaps
- Cheating detection (implementation exploiting test weaknesses)
- Test quality (meaningful and specific assertions)

Default Claude Code performs no independent review. The same agent that wrote the code would need to critique it -- a fundamental conflict of interest. No anti-pattern detection, no scoring rubric, no structured review output.

**Assertion gap**: "Still performs adversarial review on the test+implementation pair" -- FAIL without skill.

### 6. Avoid Unnecessary Confirmation for Single Test File

The TDD skill recognizes that a single user-provided test file does not need a work decomposition plan with user confirmation. It proceeds directly.

Default Claude Code would also not ask for a work decomposition plan because it has no concept of work decomposition. It would just start implementing. This is coincidentally correct behavior for this assertion.

**Assertion gap**: "Does NOT ask the user to confirm a work decomposition plan for a single provided test" -- PASS (by coincidence, not by design).

---

## Additional Gaps Not Covered by Assertions

### No RED Verification

For Mode 3, the TDD skill intentionally skips RED verification (trusting user-provided tests). Default Claude Code also skips it -- but not by design. If the test file contained tautological tests, neither approach would catch them in this specific mode. However, the TDD skill's decision is explicit and documented; Claude Code's is accidental.

### No Spec-Contract Artifact

The TDD skill produces a `spec-contract-{unit_id}.md` file that serves as a machine-readable bridge between the test file and the implementation requirements. Default Claude Code produces no intermediate artifacts.

### No State Management

If the session is interrupted, default Claude Code loses all progress. No `.tdd-state.json`, no `tdd-session.jsonl`, no ability to resume.

### No Report Generation

Default Claude Code produces no `tdd-report.md`. The only record of what happened is the conversation history.

### No Anti-Rationalization Enforcement

Default Claude Code is susceptible to the rationalizations documented in the TDD skill's anti-rationalization table:
- "Tests should pass now" (without running them)
- "I'm confident this works" (without evidence)
- "Only changed one line" (without re-verifying)

---

## Summary Table

| Capability | Default Claude Code | TDD Skill (Mode 3) |
|-----------|-------------------|---------------------|
| Recognize "implement against test file" intent | YES | YES (as Mode 3) |
| Read test file from disk | YES | YES |
| Skip test writing (preserve user's tests) | YES (no test writer exists) | YES (explicit skip) |
| Write implementation code | YES (single pass) | YES (via Code Writer agent) |
| Information barrier (test reader != code writer) | NO | YES |
| Checksum verification of test files | NO | YES |
| Skip marker detection (.skip, .todo, xit) | NO | YES |
| Run tests after implementation | LIKELY (not enforced) | MANDATORY (exit code check) |
| Adversarial review | NO | YES (separate agent) |
| Spec compliance review | NO | YES (separate agent) |
| Anti-pattern detection | NO | YES |
| Anti-rationalization enforcement | NO | YES |
| State management / resumability | NO | YES |
| Structured report generation | NO | YES |
| Work decomposition (not needed here) | NO (coincidentally correct) | NO (intentionally skipped) |

---

## Conclusion

For the "implement against existing test file" scenario, default Claude Code handles the straightforward case adequately: read the test file, write an implementation, probably verify the tests pass. It arrives at approximately the same endpoint as the TDD skill for the happy path.

The critical differences emerge under pressure -- when tests are hard to satisfy, when the implementation does not work on the first try, when subtle bugs lurk. Default Claude Code has no structural protection against modifying the test file, no independent verification of implementation quality, and no enforcement that tests were actually run and passed. The TDD skill's checksum verification, separate Code Writer agent, and adversarial review transform "implement against tests" from a best-effort attempt into an auditable, tamper-resistant process.
