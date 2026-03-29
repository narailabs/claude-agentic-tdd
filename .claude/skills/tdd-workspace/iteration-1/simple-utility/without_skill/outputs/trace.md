# Default Claude Code Behavior Trace (Without TDD Skill)

## Prompt

```
/tdd implement a string utility module with functions: capitalize(str) that capitalizes the first letter, truncate(str, maxLen) that truncates with ellipsis, and slugify(str) that converts to URL-safe slugs
```

## How Default Claude Code Interprets This

Default Claude Code has no `/tdd` skill loaded. It treats `/tdd` as meaningless prefix text and focuses on the natural-language instruction: "implement a string utility module with functions: capitalize, truncate, and slugify."

---

## Step-by-Step Trace

### Step 1: Analyze the Request

Claude reads the prompt and identifies three functions to implement:
- `capitalize(str)` -- capitalize first letter
- `truncate(str, maxLen)` -- truncate with ellipsis
- `slugify(str)` -- convert to URL-safe slug

Claude does **not** interpret `/tdd` as a command. It proceeds as a standard implementation request.

### Step 2: Check Project Context

Claude would likely run:
- `ls` or `Glob` to see the project structure
- Look for existing `package.json`, `tsconfig.json`, or other configuration files
- Check for existing source files to understand conventions (language, module style, etc.)

In this repo, there is no `package.json` or existing source code. Claude would note this and decide on a language/framework. Given the function signatures use `str` (not typed), Claude would likely choose either **TypeScript** or **JavaScript**, defaulting to TypeScript in most cases since it is the most common convention in modern Node.js projects.

### Step 3: Scaffold the Project (Possibly)

Because there is no `package.json`, Claude might:
- Run `npm init -y` to create a basic package.json
- Install dependencies like `typescript` and possibly a test framework
- Create a `tsconfig.json`

However, Claude might also just write the files directly without full scaffolding, depending on how it interprets the scope. For a "string utility module," it could simply create a single file.

### Step 4: Write the Implementation FIRST

**This is the critical divergence from TDD.** Default Claude Code writes the implementation first. It would create something like:

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

Claude writes the complete implementation in one pass. No tests exist yet. No verification that the code is correct beyond Claude's own reasoning.

### Step 5: Write Tests AFTER (Maybe)

Default Claude Code **might** write tests, but only as an afterthought -- and only if:
- The user mentioned "tests" (they didn't explicitly here, though `/tdd` was in the prompt)
- Claude decides to be thorough

If it does write tests, it would:
- Pick a test framework (likely Jest or Vitest) based on what it considers standard
- Install it: `npm install --save-dev jest @types/jest ts-jest` (or vitest)
- Write tests that **match the implementation it already wrote**

This is a key problem: the tests are written to confirm existing code, not to define desired behavior independently. The tests would look like:

```typescript
import { capitalize, truncate, slugify } from './stringUtils';

describe('capitalize', () => {
  it('capitalizes the first letter', () => {
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
  it('converts to lowercase slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });
  it('removes special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });
});
```

### Step 6: Run Tests

Claude would run `npx jest` or equivalent and expect all tests to pass on the first run.

### Step 7: Report Success

Claude would report that the module is implemented and tests pass, then present the file paths to the user.

---

## What Default Claude Code Does NOT Do

### 1. Does NOT Write Tests First
Default Claude writes implementation first, then optionally tests. There is no RED phase -- no moment where tests exist and fail against missing/stub code. The tests are retrofitted to match the implementation.

### 2. Does NOT Perform RED/GREEN Verification
In proper TDD:
- **RED**: Write a failing test first. Run it. Confirm it fails for the right reason.
- **GREEN**: Write minimal code to make the test pass. Run it. Confirm it passes.
- **REFACTOR**: Clean up while keeping tests green.

Default Claude skips all of this. Tests and implementation are written in one shot. There is no verification that the tests would have failed without the implementation (i.e., the tests might be tautological or test the wrong thing and still pass).

### 3. Does NOT Use Agent Teams
Default Claude Code operates as a single agent. It does not:
- Spawn a separate "Test Writer" agent with an information barrier (no access to implementation)
- Spawn a separate "Code Writer" agent that only sees tests
- Use adversarial reviewers

Everything happens in one context, so the test author has full knowledge of the implementation, defeating the purpose of independent test design.

### 4. Does NOT Do Adversarial Review
There is no adversarial reviewer that checks:
- Are the tests actually testing behavior or just mirroring implementation?
- Are there edge cases missing?
- Could the implementation pass all tests while being subtly wrong?
- Are there testing anti-patterns (e.g., testing implementation details instead of behavior)?

### 5. Does NOT Detect Test Frameworks Systematically
Default Claude picks a test framework based on general heuristics or its own preference. It does not:
- Systematically scan for existing test configurations
- Check multiple framework indicators (jest.config, vitest.config, .mocharc, pytest.ini, etc.)
- Respect project conventions for 10+ languages as the TDD skill's framework-detection.md does

### 6. Does NOT Manage State or Enable Resume
There is no state file tracking which work units are complete, which failed, or where to resume. If the session is interrupted, the user starts over.

### 7. Does NOT Enforce a Design Gate
Default Claude does not pause to:
- Analyze spec complexity
- Decompose into work units
- Get user approval on the plan before writing code
- Consider architecture implications

It jumps straight to implementation.

### 8. Does NOT Check for Testing Anti-Patterns
The TDD skill explicitly checks for 5+ anti-patterns (tautological tests, implementation-coupled tests, etc.). Default Claude has no such gates.

### 9. Does NOT Produce a Structured Report
Default Claude gives a conversational summary. It does not produce a structured report with:
- Per-work-unit pass/fail status
- RED/GREEN phase logs
- Coverage metrics
- Anti-pattern scan results

---

## Likely Outcome

Default Claude would produce a working string utility module and possibly tests. The code would likely be correct for the happy path. However:

- **Edge cases** may be missed (e.g., `truncate("ab", 3)` -- what happens when maxLen equals string length + ellipsis length? What about `maxLen < 3`? What about `slugify` with unicode input, consecutive special characters, strings that are entirely special characters?)
- **Tests would be shallow** -- covering the obvious cases but not probing boundaries
- **No confidence that tests are meaningful** -- since they were written after implementation and by the same "agent," they may just be confirmation bias encoded as assertions
- **No incremental verification** -- everything is written at once, so if there is a subtle bug, there is no RED phase to catch that the test expectations were wrong

## Estimated Timeline

For this simple task, default Claude would likely complete in one pass taking roughly 2-4 tool calls:
1. Check project structure
2. Create implementation file
3. Optionally create test file and config
4. Run tests

Total wall-clock time: under 60 seconds.
