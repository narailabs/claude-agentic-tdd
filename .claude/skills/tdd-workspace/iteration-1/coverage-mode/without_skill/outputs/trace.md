# Trace: Default Claude Code Handling "/tdd add test coverage for src/utils/ --skip-design"

## Context

The user types `/tdd add test coverage for src/utils/ --skip-design` in a project where the TDD skill is **not loaded**. This trace documents what default Claude Code would do without the agentic-tdd plugin.

---

## Step 1: Command Interpretation

Default Claude Code does not recognize `/tdd` as a registered skill command. It treats the entire input as a natural language request. Claude interprets:

> "Add test coverage for src/utils/, skip design"

Claude understands this as: "Write tests for existing code in src/utils/." The `--skip-design` flag is ignored or interpreted loosely as "don't overthink the architecture, just write tests."

No skill is invoked. No structured pipeline begins.

---

## Step 2: Explore the Codebase

Claude would start by reading the contents of `src/utils/`:

```
Tool: Bash("ls src/utils/")
Tool: Glob("src/utils/**/*")
```

Then read each file to understand what functions exist:

```
Tool: Read("src/utils/stringHelpers.ts")
Tool: Read("src/utils/dateUtils.ts")
Tool: Read("src/utils/validators.ts")
... (one Read per file found)
```

Claude also checks for existing test infrastructure:

```
Tool: Glob("**/*.test.*")
Tool: Glob("**/*.spec.*")
Tool: Read("package.json")  // to find test runner
```

**Assessment**: Claude does perform basic code analysis. It reads the source files and identifies the test framework. This is reasonable but shallow -- it is reconnaissance, not structured characterization.

---

## Step 3: Write Tests (All at Once)

This is where default Claude Code diverges sharply from TDD methodology. Claude would:

1. Read all source files in `src/utils/`
2. Write test files for all of them in a single pass
3. Create or edit test files directly

Typical behavior:

```
Tool: Write("src/utils/__tests__/stringHelpers.test.ts", <full test file>)
Tool: Write("src/utils/__tests__/dateUtils.test.ts", <full test file>)
Tool: Write("src/utils/__tests__/validators.test.ts", <full test file>)
```

The tests are written **after reading the implementation**. Claude mirrors the implementation structure in the tests.

---

## Step 4: Run Tests Once

Claude runs the tests:

```
Tool: Bash("npx vitest run src/utils/__tests__/")
```

If tests pass, Claude reports success and stops.
If tests fail, Claude reads the error output and fixes the test files (not the implementation).

---

## Step 5: Report Results

Claude produces an informal summary:

> "I've added test coverage for the utility files in src/utils/. All tests are passing. Here's what's covered: ..."

No structured report. No metrics on assertion density. No anti-cheat verification.

---

## Critical Analysis: What Goes Wrong

### Problem 1: No TDD -- Tests Written After Implementation

Default Claude reads the implementation first, then writes tests to match it. This is **test-after development**, the opposite of TDD. The tests are confirmation tests, not specification tests. They verify what the code currently does, not what it should do.

**Consequence**: If the implementation has a bug, the test will encode that bug as expected behavior. The test provides false confidence.

### Problem 2: No RED Phase Verification

Default Claude never verifies that tests fail before implementation exists. Since the implementation already exists (coverage mode), this means Claude never verifies that the tests would catch a regression. There is no check that removing a function would cause the test to fail.

**Consequence**: Tests may be tautological. A test like `expect(add(2, 3)).toBe(5)` is fine, but `expect(typeof add).toBe('function')` passes whether add works correctly or not. Without RED verification, trivial tests slip through.

### Problem 3: No Information Barrier

Default Claude reads the implementation and writes tests in the same context. The LLM has full knowledge of how the code works internally. Tests unconsciously mirror the implementation structure.

**Consequence**: Tests that test implementation details, not behavior. If the implementation uses a specific algorithm, the tests may implicitly depend on that algorithm. Refactoring breaks the tests even when behavior is preserved.

### Problem 4: No Assertion Density Checks

Default Claude does not count assertions per test. It may write tests with:
- A single `toBeDefined()` assertion
- Mock-only assertions (`toHaveBeenCalled()` without checking results)
- Trivial truthiness checks

**Consequence**: Low-value tests that inflate coverage metrics without actually verifying behavior.

### Problem 5: No Adversarial Review

Default Claude does not review its own test quality. There is no second pass asking:
- "Are edge cases covered?"
- "Would these tests catch a real bug?"
- "Are the assertions specific enough?"

**Consequence**: Happy-path-only coverage. Missing: boundary conditions, error cases, null/undefined inputs, empty collections, overflow, concurrency, type coercion edge cases.

### Problem 6: No Anti-Pattern Detection

Default Claude does not check for the 5 documented anti-patterns:
1. Testing mock behavior instead of real code
2. Test-only methods in production code
3. Mocking without understanding side effects
4. Incomplete mock objects
5. Integration tests as an afterthought

**Consequence**: Tests may use all of these anti-patterns freely.

### Problem 7: No Decomposition or Dependency Analysis

Default Claude processes all files at once rather than decomposing into independent work units. There is no analysis of which utilities depend on others, no ordering, no parallel execution plan.

**Consequence**: Tests may have implicit ordering dependencies. A failure in one utility's tests may cascade confusingly.

### Problem 8: No State Management or Resumability

Default Claude does not create a state file. If the session is interrupted, all progress context is lost. There is no way to resume from where it left off.

**Consequence**: Interrupted sessions require starting over.

### Problem 9: Implementation-Mirroring Test Structure

Because Claude reads the implementation first, tests tend to mirror the file and function structure 1:1. Each exported function gets a `describe` block. Each code path gets a test case. The test file becomes a shadow of the implementation file.

**Consequence**: Tests that break when the implementation is refactored, even if behavior is unchanged. High coupling between test and implementation structure.

### Problem 10: No Characterization Test Methodology

For coverage mode (adding tests to existing code), the proper approach is characterization testing: write tests that capture current behavior, verify they fail if behavior changes, then use those tests as a safety net for future changes.

Default Claude does not follow this methodology. It writes tests that happen to pass against the current implementation, but there is no verification that the tests are actually characterizing meaningful behavior.

---

## Behavior Comparison Table

| Aspect | Default Claude Code | Agentic TDD Skill |
|--------|--------------------|--------------------|
| Test timing | After reading implementation | Before implementation (or characterization-first) |
| RED verification | None | Mandatory -- tests must fail first |
| GREEN verification | Run once, fix if needed | Checksum-protected, retry protocol |
| Information barrier | None -- full context | Code Writer cannot see Test Writer reasoning |
| Assertion density | Not checked | Enforced minimum per test |
| Anti-pattern detection | None | 5 documented patterns checked |
| Adversarial review | None | Dedicated reviewer agent |
| Spec compliance review | None | Dedicated reviewer agent |
| State management | None | Full state file with resume |
| Decomposition | All-at-once | Work units with dependency graph |
| Report generation | Informal summary | Structured report with metrics |
| Anti-cheat guardrails | None | Checksum verification, skip marker detection, hardcoded return detection |
| Mock quality | Not assessed | Mock decision tree enforced |
| Edge case coverage | Incidental | Explicitly reviewed |
| Retry protocol | Ad-hoc fix and rerun | Structured retries with escalation |

---

## Expected Output Quality

Default Claude Code would produce tests that:
- **Pass** (high likelihood -- Claude is good at writing syntactically correct tests)
- **Cover happy paths** (good for basic function calls with normal inputs)
- **Miss edge cases** (no systematic review of boundaries)
- **Mirror implementation** (test structure follows code structure)
- **Have variable assertion quality** (some strong, some trivial)
- **Lack characterization rigor** (no proof that tests catch regressions)

The tests would be "better than nothing" but would provide false confidence about code correctness. They would inflate coverage percentages without proportionally increasing defect detection capability.
