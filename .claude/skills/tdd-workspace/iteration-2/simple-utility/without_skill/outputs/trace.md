# Default Claude Code Behavior Trace (Without TDD Skill) -- Iteration 2

## Prompt

```
/tdd implement a string utility module with functions: capitalize(str) that capitalizes the first letter, truncate(str, maxLen) that truncates with ellipsis, and slugify(str) that converts to URL-safe slugs
```

## How Default Claude Code Interprets This

Default Claude Code has no `/tdd` skill loaded. The `/tdd` prefix is not a recognized built-in command, so Claude treats the entire input as a natural-language request: "implement a string utility module with three specific functions." The behavioral descriptions in the prompt (capitalizes the first letter, truncates with ellipsis, converts to URL-safe slugs) are taken as implementation specifications, not as test acceptance criteria.

---

## Step-by-Step Trace

### Step 1: Parse the Request

Claude identifies three functions to implement from the natural language:
- `capitalize(str)` -- capitalize the first letter of the input string
- `truncate(str, maxLen)` -- truncate the string to maxLen characters, appending ellipsis if truncated
- `slugify(str)` -- convert the string to a URL-safe slug (lowercase, hyphens, no special characters)

Claude does **not** interpret `/tdd` as a command. It does not trigger any test-driven development workflow, agent team orchestration, or phased execution. It proceeds as a standard "implement this for me" request.

### Step 2: Inspect Project Context

Claude would use tools to understand the project:
- Run `ls` or `Glob` to see the directory structure
- Look for `package.json`, `tsconfig.json`, `pyproject.toml`, or other project config files
- Check for existing source files to infer language conventions

In this repository, the project is a Claude Code plugin (`.claude/` directory structure, `plugin.json`). There is no `package.json` or pre-existing application source code. Claude would note this and choose a language. Given the function signatures use `str` (untyped) and the prompt reads like JavaScript/TypeScript conventions, Claude would almost certainly choose **TypeScript** or **JavaScript**. TypeScript is the more common default for modern Node.js work.

### Step 3: Scaffold the Project (Possibly)

Because there is no `package.json`, Claude might:
- Run `npm init -y` to create a basic `package.json`
- Optionally install TypeScript (`npm install --save-dev typescript`) and create `tsconfig.json`
- Possibly install a test framework if it decides to write tests

However, for a "simple utility module" request, Claude may skip scaffolding entirely and just create the source file directly, treating it as a standalone module.

### Step 4: Write the Implementation FIRST

**This is the critical divergence from TDD.** Default Claude Code writes the implementation immediately. No tests exist. No behavior contracts are established before code is written. Claude produces something like:

**File: `src/stringUtils.ts`** (or `src/string-utils.ts`)

```typescript
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

The entire implementation is written in a single pass. There is no iterative RED-GREEN-REFACTOR cycle. Claude's internal reasoning serves as the only "test" of correctness.

### Step 5: Write Tests AFTER (Maybe)

Default Claude Code **may** write tests as a follow-up, but this is not guaranteed. The decision depends on:
- Whether Claude interprets `/tdd` as a hint that the user wants tests (possible but unreliable)
- Whether Claude decides to be thorough on its own initiative
- Whether the user's conversational history suggests they value tests

If tests are written, Claude would:
1. Pick a test framework (Jest or Vitest, based on general popularity)
2. Install it: `npm install --save-dev jest @types/jest ts-jest` or `npm install --save-dev vitest`
3. Write tests that **conform to the already-written implementation**

This is the fundamental problem: the tests are written to confirm what the code already does, not to define what the code should do. The test expectations are derived from the implementation, not from independent behavioral analysis.

```typescript
import { capitalize, truncate, slugify } from '../src/stringUtils';

describe('capitalize', () => {
  it('capitalizes the first letter of a string', () => {
    expect(capitalize('hello')).toBe('Hello');
  });
  it('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });
});

describe('truncate', () => {
  it('truncates long strings with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });
  it('returns string unchanged if within limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });
});

describe('slugify', () => {
  it('converts spaces to hyphens and lowercases', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });
  it('removes special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });
});
```

### Step 6: Run Tests

Claude would run the test command (`npx jest` or `npx vitest run`) and expect all tests to pass on the first run. Since the tests were written to match the implementation, they will pass. Claude treats this as confirmation of correctness.

### Step 7: Report Completion

Claude provides a conversational summary:
- "I created a string utility module with capitalize, truncate, and slugify functions."
- Lists the file paths created
- May show a snippet of the test results
- Declares the task complete

No structured report is generated.

---

## What Default Claude Code Does NOT Do

### 1. Does NOT Write Tests First (No RED Phase)
The implementation is written before any test exists. There is never a moment where tests exist and fail against missing code. Without a RED phase, there is no evidence that the tests are actually testing meaningful behavior -- they could be tautological assertions that pass regardless of implementation correctness.

### 2. Does NOT Verify Tests Fail Before Implementation (No RED/GREEN Cycle)
In proper TDD:
- **RED**: Write a failing test. Run it. Confirm it fails with a non-zero exit code. Verify the failure message indicates the right reason (e.g., function not found, assertion mismatch).
- **GREEN**: Write minimal code to make the test pass. Run it. Confirm it passes.
- **REFACTOR**: Clean up while keeping tests green.

Default Claude skips all three phases. Tests and implementation are produced in one shot or in implementation-first order. There is no verification that the tests would have failed without the implementation.

### 3. Does NOT Use Agent Teams or Information Barriers
Default Claude operates as a single agent in a single context. It does not:
- Spawn a "Test Writer" agent that has no access to implementation code
- Spawn a "Code Writer" agent that receives tests from disk (not from the test-writing context)
- Enforce that the Code Writer cannot modify test files
- Use checksum verification to detect test tampering

Everything happens in one context, so the entity writing tests has full knowledge of (or has just written) the implementation. This defeats the purpose of independent test design.

### 4. Does NOT Perform Adversarial Review
There is no adversarial reviewer that checks:
- Do the tests actually verify behavior, or do they just mirror implementation details?
- Are there edge cases missing? (e.g., `truncate("ab", 2)`, `truncate("", 5)`, `slugify("---")`, `capitalize(null)`)
- Could a subtly wrong implementation pass all tests?
- Are there testing anti-patterns (tautological assertions, implementation-coupled expectations)?

### 5. Does NOT Perform Spec Compliance Review
No reviewer checks whether the implementation actually satisfies the original specification. The spec said "capitalizes the first letter" -- does that mean only the first letter, or should the rest be lowercased? The spec said "truncates with ellipsis" -- is that `...` (three dots) or the unicode ellipsis character? The spec said "URL-safe slugs" -- does that handle unicode characters, consecutive hyphens, or leading/trailing hyphens? These ambiguities go unexamined.

### 6. Does NOT Detect Test Frameworks Systematically
Default Claude picks a test framework based on general heuristics or its own preference. It does not:
- Systematically scan for existing test configurations across the project
- Check multiple framework indicators (jest.config, vitest.config, .mocharc, pytest.ini, cargo test, go test, etc.)
- Respect project conventions as the TDD skill's framework-detection.md does for 10+ languages

### 7. Does NOT Manage State or Support Resume
There is no state file tracking work unit progress. If the conversation is interrupted:
- No record of which functions were implemented
- No record of which tests passed
- No ability to resume from where work stopped
- The user starts over from scratch

### 8. Does NOT Decompose Into Work Units
Default Claude treats the three functions as a single implementation task. It does not:
- Decompose the spec into independent work units (one per function)
- Execute separate RED/GREEN cycles for each unit
- Allow partial completion or per-unit retry
- Present a decomposition plan for user approval before starting

### 9. Does NOT Enforce a Design Gate
Default Claude does not pause to:
- Analyze spec complexity or ambiguity
- Ask clarifying questions about edge cases
- Present an architectural plan
- Get user confirmation before writing code

It jumps straight from parsing the request to writing the implementation.

### 10. Does NOT Check for Testing Anti-Patterns
The TDD skill checks for 5+ anti-patterns (tautological tests, implementation-coupled tests, snapshot overuse, assertion-free tests, over-mocking). Default Claude has no such gates and commonly produces tests that mirror implementation details rather than testing behavior.

### 11. Does NOT Produce a Structured Report
Default Claude gives a conversational summary. It does not produce a structured report with:
- Per-work-unit RED/GREEN status
- Phase execution logs
- Test coverage metrics
- Anti-pattern scan results
- Adversarial review findings

---

## Assertions Evaluation (Against eval_metadata.json)

| # | Assertion | Satisfied? | Notes |
|---|-----------|------------|-------|
| 1 | Detects or asks about test framework before writing tests | NO | Claude picks a framework ad-hoc without systematic detection |
| 2 | Presents a work decomposition plan and asks for user confirmation before proceeding | NO | Claude jumps straight to implementation |
| 3 | Test Writer creates test files BEFORE any implementation code exists | NO | Implementation is written first |
| 4 | Tests fail initially (RED phase verified) | NO | No RED phase exists; tests are written after implementation |
| 5 | Code Writer receives test file contents read from disk (information barrier) | NO | Single agent; no information barrier |
| 6 | Code Writer does NOT modify test files (checksum verification) | NO | Single agent writes both; no checksum verification |
| 7 | All tests pass after implementation (GREEN phase) | PARTIAL | Tests pass, but there is no distinct GREEN phase |
| 8 | An adversarial review step is performed | NO | No adversarial review |
| 9 | A tdd-report.md or equivalent summary is generated | NO | Only conversational output |
| 10 | The skill does NOT skip any verification steps even for simple specs | NO | All verification steps are absent |

**Score: 0-1 out of 10 assertions satisfied** (depending on how strictly PARTIAL is counted)

---

## Likely Edge Cases Missed

Without adversarial review or independent test design, default Claude is likely to miss:

- `capitalize("")` -- empty string handling
- `capitalize("A")` -- already capitalized single character
- `capitalize("123abc")` -- non-alpha first character
- `truncate("abc", 3)` -- exact boundary (length equals maxLen)
- `truncate("abc", 2)` -- maxLen less than ellipsis length (3)
- `truncate("abc", 0)` -- zero maxLen
- `truncate("", 5)` -- empty string truncation
- `slugify("")` -- empty string
- `slugify("---")` -- only special characters
- `slugify("  hello  ")` -- leading/trailing whitespace
- `slugify("hello--world")` -- consecutive hyphens in input
- `slugify("cafe\u0301")` -- unicode with combining characters

## Estimated Timeline

For this simple task, default Claude would complete in roughly 3-5 tool calls:
1. Inspect project structure (Glob/ls)
2. Create implementation file (Write)
3. Optionally create test file and config (Write x2)
4. Run tests (Bash)

Total wall-clock time: under 60 seconds.
