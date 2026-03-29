# TDD Skill Execution Trace

## User Prompt

```
/tdd implement a string utility module with functions: capitalize(str) that capitalizes the first letter, truncate(str, maxLen) that truncates with ellipsis, and slugify(str) that converts to URL-safe slugs
```

---

## Prerequisites Check

**What happens**: Before any phase, the skill checks two prerequisites.

1. **Agent teams enabled**: Check that `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set to `1` in environment or `.claude/settings.json`. If not set, the skill halts and instructs the user to enable it.

2. **Git repository**: Check if the project is a git repo (for diff/checksum operations during GREEN verification). If not, warn but continue.

**Expected outcome**: Both checks pass (assuming a properly configured environment). Proceed.

---

## Argument Parsing

**What happens**: Parse `$ARGUMENTS` for:
- **Specification text**: `"implement a string utility module with functions: capitalize(str) that capitalizes the first letter, truncate(str, maxLen) that truncates with ellipsis, and slugify(str) that converts to URL-safe slugs"`
- **Flags**: None detected (`--skip-failed`, `--config`, `--design`, `--skip-design` are all absent)

**Expected outcome**: Spec text captured. No flags. All defaults apply.

---

## Configuration Loading

**What happens**: Load configuration in priority order:

1. **Check for `.tdd.config.json`** at project root:
   ```bash
   cat .tdd.config.json 2>/dev/null
   ```
   Likely not found (no custom config specified).

2. **Check project CLAUDE.md** for a `## TDD Configuration` section. The project's CLAUDE.md exists but contains no TDD Configuration section with test-specific overrides (it has general project docs).

3. **Apply defaults** (flat keys):
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

**Expected outcome**: Default configuration loaded. Stored for later use.

---

## Entry Point Detection

**What happens**: Determine mode based on the user's input.

- The user provides a natural language description ("implement a string utility module...").
- No mention of "add tests to..." or existing test files.
- No user-provided failing test.

**Decision**: Mode is **natural-language-spec** (mode 1).

**Expected outcome**: Entry point set to `natural-language-spec`. Standard flow from Phase 0 onward.

---

## Phase 0: Design Gate (Optional)

**Trigger condition evaluation**:

- Does the spec mention 3+ distinct features or components? **Yes** -- capitalize, truncate, and slugify are 3 functions. However, they are all within a single module and are independent pure functions with clear inputs/outputs.
- Does the spec involve external integrations? **No**.
- Is the spec ambiguous about data flow, ownership, or error handling? **No** -- each function has a clear, well-understood purpose.
- Did the user pass `--design`? **No**.

**Counter-consideration for skipping**:
- Each function is a simple, pure utility with clear inputs and outputs.
- No architectural decisions needed. No data flow between components.
- This is essentially a "single-unit spec with clear inputs/outputs" (or at most 3 trivially independent units).

**Decision**: **SKIP Phase 0**. The spec is simple enough that no design refinement is needed. The 3 functions are independent utilities, not 3 interacting components. No `--design` flag was passed.

**Expected outcome**: `designSummary` is set to `null` in state. Proceed directly to Phase 1.

---

## Phase 1: Framework Detection

**What happens**: Read `reference/framework-detection.md` and run the detection algorithm.

### Step 1: Check `.tdd.config.json` for explicit framework config
Not found (already checked during configuration loading).

### Step 2: Check project CLAUDE.md for `## TDD Configuration` section
No test conventions found.

### Step 3: Auto-detect from project files

Run Bash commands to inspect project files:

```bash
cat package.json 2>/dev/null
```

**Scenario A (package.json with vitest)**:
If `package.json` exists and contains `vitest` in devDependencies:
- Framework: Vitest
- Test command: `npx vitest run` (or `scripts.test` if defined)
- File pattern: `**/*.test.ts` or `**/*.spec.ts`
- Check for `tsconfig.json` to determine TypeScript vs JavaScript

**Scenario B (package.json with jest)**:
If Jest is found instead, use `npx jest`.

**Scenario C (no package.json — Python, Go, etc.)**:
Check for `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.

**Scenario D (nothing detected)**:
Ask the user for their test command.

### Step 4: Detect test directory
- Look for existing test files matching the pattern.
- If none exist, use language-standard defaults (e.g., `src/__tests__/` for JS/TS, `tests/` for Python).

**Expected outcome** (assuming a JS/TS project with Vitest):
```
framework:
  language: "typescript"
  testRunner: "vitest"
  testCommand: "npx vitest run"
  testFilePattern: "**/*.test.ts"
  sourceDir: "src/"
  testDir: "src/__tests__/"
```

Stored in state. Used for all subsequent test execution.

---

## Phase 2: Work Decomposition

**What happens**: Analyze the specification and break it into independent work units.

### Decomposition Analysis

The spec describes 3 independent pure functions in a single string utility module:

1. `capitalize(str)` -- capitalizes the first letter of a string
2. `truncate(str, maxLen)` -- truncates with ellipsis if string exceeds maxLen
3. `slugify(str)` -- converts a string to a URL-safe slug

**Key decision**: These could be decomposed as:
- **Option A**: 3 separate work units (one per function) -- allows parallel execution, finer-grained TDD cycles
- **Option B**: 1 work unit (the whole module) -- simpler, since they share a file and have no dependencies

The skill would likely choose **3 work units** because:
- Each function has distinct behavior and edge cases
- Independent TDD cycles are cleaner
- They have no dependencies on each other
- The skill is designed to decompose into the smallest testable units

### Work Units Produced

**Unit 1: capitalize**
- id: `capitalize`
- name: "Capitalize function"
- spec-contract: "Implement a `capitalize(str)` function that takes a string and returns a new string with the first letter capitalized. Should handle empty strings, single characters, already-capitalized strings, and strings starting with non-alphabetic characters."
- dependsOn: `[]`
- testFiles: `["src/__tests__/capitalize.test.ts"]`
- implFiles: `["src/string-utils.ts"]` (or `["src/capitalize.ts"]`)

**Unit 2: truncate**
- id: `truncate`
- name: "Truncate function"
- spec-contract: "Implement a `truncate(str, maxLen)` function that returns the string truncated to `maxLen` characters with `...` appended if the string exceeds `maxLen`. Should handle edge cases: string shorter than maxLen (return as-is), empty strings, maxLen of 0, maxLen less than ellipsis length."
- dependsOn: `[]`
- testFiles: `["src/__tests__/truncate.test.ts"]`
- implFiles: `["src/string-utils.ts"]` (or `["src/truncate.ts"]`)

**Unit 3: slugify**
- id: `slugify`
- name: "Slugify function"
- spec-contract: "Implement a `slugify(str)` function that converts a string to a URL-safe slug: lowercase, replace spaces with hyphens, remove non-alphanumeric characters (except hyphens), collapse multiple hyphens, trim leading/trailing hyphens. Handle edge cases: empty string, strings with special characters, unicode, multiple spaces."
- dependsOn: `[]`
- testFiles: `["src/__tests__/slugify.test.ts"]`
- implFiles: `["src/string-utils.ts"]` (or `["src/slugify.ts"]`)

### Dependency Analysis

All 3 units are fully independent (no shared types, no function calls between them). They can all run in parallel (up to `maxParallelPairs: 3`).

### User Confirmation

The skill presents the work plan to the user:

```
## TDD Work Plan

Framework: vitest (auto-detected)
Mode: natural-language-spec
Work units: 3

### Unit 1: capitalize
Spec: Capitalize the first letter of a string, handling empty strings, single chars, and non-alpha starts
Files: src/__tests__/capitalize.test.ts -> src/string-utils.ts
Dependencies: none

### Unit 2: truncate
Spec: Truncate string to maxLen with ellipsis, handling edge cases for short strings and small maxLen values
Files: src/__tests__/truncate.test.ts -> src/string-utils.ts
Dependencies: none

### Unit 3: slugify
Spec: Convert string to URL-safe slug (lowercase, hyphens, no special chars), handling edge cases
Files: src/__tests__/slugify.test.ts -> src/string-utils.ts
Dependencies: none

Execution plan: All 3 units in parallel (no dependencies).

Proceed? [confirm/modify/cancel]
```

**HARD GATE**: Waits for user confirmation. If user modifies, adjust and re-present. If cancelled, stop.

**Expected outcome**: User confirms. Proceed to Phase 3.

---

## Phase 3: State Initialization

**What happens**:

### Step 1: Check for existing `.tdd-state.json`
```bash
cat .tdd-state.json 2>/dev/null
```
Not found (fresh session). Create new state file.

### Step 2: Update `.gitignore`

Check if `.gitignore` exists and contains the required entries:
```bash
grep -q '.tdd-state.json' .gitignore 2>/dev/null
```

If not present, append:
```
# agentic-tdd state and intermediate files
.tdd-state.json
tdd-session.jsonl
spec-contract-*.md
```

### Step 3: Create state file

Write `.tdd-state.json` with:
- `version`: "1.0.0"
- `sessionId`: generated UUID
- `startedAt`: current ISO-8601 timestamp
- `spec`: the original user spec text
- `designSummary`: null (Phase 0 was skipped)
- `entryPoint`: "natural-language-spec"
- `framework`: detected framework info
- `config`: merged configuration (all defaults)
- `workUnits`: 3 units, all with status "pending" and sub-statuses "pending"
- `summary`: zeroed counters

### Step 4: Initialize session log

Create `tdd-session.jsonl` and write the first event:
```json
{"timestamp":"2026-03-17T...","event":"session.start","unitId":null,"data":{"spec":"implement a string utility module...","entryPoint":"natural-language-spec","framework":{"language":"typescript","testRunner":"vitest","testCommand":"npx vitest run"}}}
```

Then log the decomposition:
```json
{"timestamp":"...","event":"decomposition.complete","unitId":null,"data":{"units":[{"id":"capitalize","name":"Capitalize function","dependsOn":[]},{"id":"truncate","name":"Truncate function","dependsOn":[]},{"id":"slugify","name":"Slugify function","dependsOn":[]}]}}
```

And the user confirmation:
```json
{"timestamp":"...","event":"user.confirmed","unitId":null,"data":{"unitCount":3}}
```

### Step 5: Assess complexity for model strategy

Since `modelStrategy` is `"auto"`, assess each work unit:

All 3 units are **Simple** (1 file each, clear spec, no external deps, pure functions):
- Test Writer: `haiku`
- Code Writer: `haiku`
- Reviewer: `sonnet`

Store `modelAssignment` in each work unit's state.

**Expected outcome**: State file created, session log initialized, `.gitignore` updated. Proceed to Phase 4.

---

## Phase 4: Agent Team Orchestration

**What happens**: The main session (Team Manager/Lead) creates an agent team and begins executing work units.

### Team Creation

Log event:
```json
{"timestamp":"...","event":"team.created","unitId":null,"data":{"teamId":"..."}}
```

### Execution Plan

All 3 units are independent, and `maxParallelPairs` is 3, so all 3 can run in parallel. However, the TDD pipeline for each unit is sequential (Test Writer -> RED -> Code Writer -> GREEN -> Spec Review -> Adversarial Review).

In practice, 3 Test Writers are spawned simultaneously. As each completes, its pipeline continues independently.

Below, the trace follows **one unit (capitalize)** in full detail, then notes that truncate and slugify follow the identical pipeline in parallel.

---

### Unit: capitalize

#### Step 4a: Spawn Test Writer

**State update**: `capitalize.status` -> `test-writing`, `capitalize.testWriter.status` -> `in-progress`

**Session log**:
```json
{"timestamp":"...","event":"test-writer.spawned","unitId":"capitalize","data":{"unitId":"capitalize","attempt":1}}
```

**Action**: Spawn a Test Writer teammate using the template from `reference/test-writer-prompt.md`, with placeholders filled:

- `{spec_contract}`: "Implement a `capitalize(str)` function that takes a string and returns a new string with the first letter capitalized. Handle edge cases: empty string, single character, already capitalized, strings starting with non-alphabetic characters."
- `{language}`: "typescript"
- `{test_runner}`: "vitest"
- `{test_command}`: "npx vitest run"
- `{test_file_paths}`: "src/__tests__/capitalize.test.ts"
- `{project_conventions_from_claude_md}`: "No specific conventions." (or conventions from CLAUDE.md if relevant)
- `{min_assertions}`: 1
- `{unit_id}`: "capitalize"

The Test Writer agent:
1. Creates `src/__tests__/capitalize.test.ts` with tests like:
   - `describe('capitalize')` block
   - "should capitalize the first letter of a lowercase string"
   - "should return empty string for empty input"
   - "should handle single character strings"
   - "should not modify already capitalized strings"
   - "should handle strings starting with numbers"
   - "should handle strings starting with special characters"
   - Each test imports `capitalize` from the implementation module and calls it with specific inputs, asserting on return values using `expect(...).toBe(...)`.

2. Creates `spec-contract-capitalize.md` in `src/__tests__/` containing:
   - Summary of what `capitalize` must do
   - Public API surface: `capitalize(str: string): string`
   - Expected behavior for each test case
   - Constraints from the spec

**Wait**: Lead waits for the Test Writer teammate to complete.

**Verification of outputs**: After Test Writer completes, the lead checks:
```bash
test -f "src/__tests__/capitalize.test.ts"
test -f "src/__tests__/spec-contract-capitalize.md"
```
Both must exist. If not, re-prompt the Test Writer.

**Session log**:
```json
{"timestamp":"...","event":"test-writer.completed","unitId":"capitalize","data":{"unitId":"capitalize","testFiles":["src/__tests__/capitalize.test.ts"],"duration":"..."}}
```

**Expected outcome**: Test file and spec-contract file created on disk. Proceed to RED verification.

---

#### Step 4b: RED Verification

**State update**: `capitalize.status` -> `red-verification`

**Session log**:
```json
{"timestamp":"...","event":"red.verification.start","unitId":"capitalize","data":{"unitId":"capitalize"}}
```

**Check 1: Tests Exist**
```bash
test -f "src/__tests__/capitalize.test.ts"
```
Expected: File exists. PASS.

**Check 2: Tests Fail (RED Phase)**
```bash
npx vitest run src/__tests__/capitalize.test.ts 2>&1; echo "EXIT_CODE:$?"
```
Expected: Exit code != 0. Tests fail because `capitalize` function doesn't exist yet (no implementation file). The output should contain errors like "Cannot find module" or "is not a function".

If exit code == 0: ANTI-CHEAT VIOLATION. Tests pass without implementation, meaning they are tautological. Re-prompt Test Writer: "Your tests pass without any implementation. This means they test nothing meaningful. Rewrite them to test actual behavior that requires implementation code." (Up to maxRetries: 3)

**Check 3: Correct Failure Type**
Parse test output for failure reasons:
- Acceptable: "Cannot find module '../string-utils'" or "capitalize is not a function" -- these indicate missing implementation.
- Unacceptable: "SyntaxError" in the test file, framework config errors.

If unacceptable failures: Re-prompt Test Writer with the error output.

**Check 4: Assertion Density**
Read `src/__tests__/capitalize.test.ts` and count assertion patterns:
- Count occurrences of `expect(`, `toBe(`, `toEqual(`, `toThrow(`, etc.
- Count test functions (`it(` or `test(`)
- Compute ratio: assertions / test functions
- Must be >= `minAssertionsPerTest` (1)
- Exclude trivial assertions: `expect(true).toBe(true)`, `toBeDefined()` as sole assertion

Expected: Each test has at least 1 meaningful `expect(...).toBe(...)` call. PASS.

**Check 5: Behavior-Over-Implementation**
Scan for anti-patterns:
- Excessive mocking: Count mock/spy/stub declarations. For pure functions like `capitalize`, there should be zero mocks. PASS.
- Private method testing: No `._privateMethod` or `.__private` access. PASS.
- Implementation mirroring: Tests should describe behavior ("should capitalize first letter"), not mirror internal logic. PASS.

**Record Checksums**:
```bash
shasum -a 256 "src/__tests__/capitalize.test.ts" | cut -d' ' -f1
```
Store the checksum (e.g., `a1b2c3d4...`) in state under `capitalize.redVerification.testFileChecksums`.

**State update**: `capitalize.redVerification.status` -> `passed`, with `failureCount`, `assertionCount`, and empty `antiPatterns`.

**Session log**:
```json
{"timestamp":"...","event":"red.verification.passed","unitId":"capitalize","data":{"unitId":"capitalize","failureCount":6,"assertionCount":8}}
```

**Expected outcome**: All 5 checks pass. Test file checksum recorded. Proceed to Code Writer.

---

#### Step 4c: Spawn Code Writer

**State update**: `capitalize.status` -> `code-writing`, `capitalize.codeWriter.status` -> `in-progress`

**Lead Verification Checklist** (before spawning):
- [x] Read test file contents from DISK (not from Test Writer agent messages)
- [x] Read spec-contract from DISK (`spec-contract-capitalize.md`)
- [x] Prompt does NOT contain Test Writer prompt text
- [x] Prompt does NOT reference "Test Writer" or "Agent A"
- [x] Test file checksums recorded

**Action**: Read both files from disk:
```bash
cat src/__tests__/capitalize.test.ts
cat src/__tests__/spec-contract-capitalize.md
```

**Spawn Code Writer teammate** using the template from `reference/code-writer-prompt.md`, with:
- `{test_file_contents_verbatim}`: the literal contents of `capitalize.test.ts` read from disk
- `{spec_contract_file_contents}`: the literal contents of `spec-contract-capitalize.md` read from disk
- `{language}`: "typescript"
- `{test_runner}`: "vitest"
- `{test_command}`: "npx vitest run"
- `{impl_file_paths}`: "src/string-utils.ts" (or "src/capitalize.ts")
- `{project_conventions_from_claude_md}`: "No specific conventions."

**INFORMATION BARRIER**: The Code Writer receives ONLY the test file and spec-contract. No Test Writer reasoning, no implementation hints, no other work units' code.

**Session log**:
```json
{"timestamp":"...","event":"code-writer.spawned","unitId":"capitalize","data":{"unitId":"capitalize","attempt":1}}
```

The Code Writer agent:
1. Reads the test file to understand what `capitalize` must do
2. Reads the spec-contract for API details
3. Creates `src/string-utils.ts` (or the appropriate impl file) with:
   ```typescript
   export function capitalize(str: string): string {
     if (!str) return str;
     return str.charAt(0).toUpperCase() + str.slice(1);
   }
   ```
4. Does NOT modify any test files
5. Does NOT add skip markers

**Wait**: Lead waits for the Code Writer teammate to complete.

**Session log**:
```json
{"timestamp":"...","event":"code-writer.completed","unitId":"capitalize","data":{"unitId":"capitalize","implFiles":["src/string-utils.ts"],"duration":"..."}}
```

**Expected outcome**: Implementation file created. Proceed to GREEN verification.

---

#### Step 4d: GREEN Verification

**State update**: `capitalize.status` -> `green-verification`

**Session log**:
```json
{"timestamp":"...","event":"green.verification.start","unitId":"capitalize","data":{"unitId":"capitalize"}}
```

**Check 1: Test Files Unchanged**
```bash
shasum -a 256 "src/__tests__/capitalize.test.ts" | cut -d' ' -f1
```
Compare against stored checksum. If different: ANTI-CHEAT VIOLATION. Discard Code Writer changes (`git checkout` the test files), re-prompt: "You modified test files, which is forbidden. Write implementation code ONLY."

Expected: Checksums match. PASS.

**Check 2: No Skip/Focus Markers Added**
```bash
grep -n 'xit\b\|xdescribe\b\|\.skip\b\|@pytest\.mark\.skip\|@skip\|t\.Skip\|@Ignore\|@Disabled\|pending(' "src/__tests__/capitalize.test.ts"
grep -n '\.only\b\|fdescribe\b\|fit\b' "src/__tests__/capitalize.test.ts"
```
Expected: No matches (or only pre-existing ones). PASS.

**Check 3: All Tests Pass**
```bash
npx vitest run src/__tests__/capitalize.test.ts 2>&1; echo "EXIT_CODE:$?"
```
Expected: Exit code == 0. All tests pass.

If tests fail: Re-prompt Code Writer with the failure output. Track retry count. After `maxRetries` (3): escalate to user (or switch to Systematic Debugging Protocol if the same test keeps failing).

**Check 4: No Hardcoded Returns (Heuristic)**
Read the implementation file and scan for:
- Functions that only `return [literal]`
- Switch statements with literal returns matching test expectations
- Implementations shorter than 3 lines for non-trivial specs

For `capitalize`, a 2-3 line implementation is expected and reasonable for a simple utility. Not flagged.

**State update**: `capitalize.greenVerification.status` -> `passed`, `testsPassed` -> true, `testFilesUnchanged` -> true.

**Session log**:
```json
{"timestamp":"...","event":"green.verification.passed","unitId":"capitalize","data":{"unitId":"capitalize"}}
```

**Expected outcome**: All GREEN checks pass. Proceed to Spec Compliance Review.

---

#### Step 4e: Spec Compliance Review

**State update**: `capitalize.status` -> `spec-review`

**Session log**:
```json
{"timestamp":"...","event":"spec-review.spawned","unitId":"capitalize","data":{"unitId":"capitalize"}}
```

**Action**: Read from disk:
```bash
cat src/__tests__/spec-contract-capitalize.md
cat src/__tests__/capitalize.test.ts
cat src/string-utils.ts
```

**Spawn Spec Compliance Reviewer teammate** using the template from `reference/spec-compliance-reviewer-prompt.md`, with:
- `{spec_contract}`: contents of `spec-contract-capitalize.md`
- `{design_summary}`: "No design phase was run."
- `{test_file_contents}`: contents of `capitalize.test.ts`
- `{impl_file_contents}`: contents of `string-utils.ts`
- `{unit_name}`: "Capitalize function"

The reviewer checks:
1. **Requirement coverage**: Is `capitalize(str)` implemented? Are edge cases (empty string, single char, already capitalized, non-alpha start) covered in both tests and implementation?
2. **Missing requirements**: Any implied requirements not addressed?
3. **Scope creep**: Does the implementation include extra features not in the spec?
4. **API contract accuracy**: Does the function signature match `capitalize(str: string): string`?
5. **Integration readiness**: No dependencies on other units, so minimal concern here.

**Expected reviewer output**:
```markdown
## Spec Compliance Review: Capitalize function

### Verdict: COMPLIANT

### Requirement Matrix
| # | Requirement | Implemented | Tested | Notes |
|---|------------|-------------|--------|-------|
| 1 | Capitalize first letter | YES | YES | |
| 2 | Handle empty string | YES | YES | |
| 3 | Handle single character | YES | YES | |
| 4 | Handle already capitalized | YES | YES | |
| 5 | Handle non-alpha start | YES | YES | |

### Missing Requirements: None
### Scope Creep: None
### API Contract Issues: None
### Blocking Issues: None
```

**Decision**: COMPLIANT -> proceed to adversarial review.

If NON-COMPLIANT: Send the pair back for revision. Test Writer adds missing tests, then Code Writer re-implements. This loops until compliant or maxRetries.

**Session log**:
```json
{"timestamp":"...","event":"spec-review.compliant","unitId":"capitalize","data":{"unitId":"capitalize","requirementsCovered":5,"total":5}}
```

---

#### Step 4f: Adversarial Review

**State update**: `capitalize.status` -> `adversarial-review`

**Session log**:
```json
{"timestamp":"...","event":"adversarial.spawned","unitId":"capitalize","data":{"unitId":"capitalize"}}
```

**Action**: Read from disk:
```bash
cat src/__tests__/spec-contract-capitalize.md
cat src/__tests__/capitalize.test.ts
cat src/string-utils.ts
```

**Spawn Adversarial Reviewer teammate** using the template from `reference/adversarial-reviewer-prompt.md`, with:
- `{spec_contract}`: contents of `spec-contract-capitalize.md`
- `{test_file_contents}`: contents of `capitalize.test.ts`
- `{impl_file_contents}`: contents of `string-utils.ts`
- `{unit_name}`: "Capitalize function"
- `{min_assertions}`: 1

The reviewer:
1. **Test Completeness**: Checks all spec behaviors are tested, edge cases covered.
2. **Test Quality**: Meaningful assertions, independent tests, good naming.
3. **Implementation Quality**: Minimal code, follows spec, no dead code.
4. **Cheating Detection**: No hardcoded returns, no test-aware code, no shallow stubs.
5. **Coverage Gaps**: Any untested code paths?

Also checks against the 5 anti-patterns from `testing-anti-patterns.md`:
- No mock behavior testing (pure function, no mocks needed)
- No test-only methods
- No mocking without understanding
- No incomplete mock objects
- N/A for integration tests (pure utility)

**Expected reviewer output**:
```markdown
## Adversarial Review: Capitalize function

### Verdict: PASS

### Test Completeness: 4/5
Good coverage. Consider adding a test for unicode characters (e.g., accented letters).

### Test Quality: 5/5
Clear assertions, good naming, independent tests.

### Implementation Quality: 5/5
Minimal and correct.

### Cheating Detection: CLEAN
No hardcoded returns, implementation is generic.

### Coverage Gaps
- Unicode handling could be tested

### Critical Issues (must fix): None

### Recommendations (should fix)
1. Consider adding a test for unicode input (e.g., capitalize("uber") -> "Uber")
```

**Decision**: PASS -> mark work unit as completed.

If FAIL (critical issues found): Log findings, send pair back for revision (Test Writer rewrites addressing gaps, then Code Writer re-implements). This loops until pass or maxRetries.

**State update**: `capitalize.status` -> `completed`, `capitalize.adversarialReview.status` -> `passed`

**Session log**:
```json
{"timestamp":"...","event":"adversarial.passed","unitId":"capitalize","data":{"unitId":"capitalize","findings":["Consider unicode test"]}}
```
```json
{"timestamp":"...","event":"unit.completed","unitId":"capitalize","data":{"unitId":"capitalize"}}
```

---

### Units: truncate and slugify (Parallel)

**Both units follow the identical pipeline** as capitalize, running in parallel:

#### truncate Pipeline

**4a - Test Writer**: Spawned with truncate's spec-contract. Creates `src/__tests__/truncate.test.ts` and `spec-contract-truncate.md`. Tests cover:
- String shorter than maxLen (returned as-is)
- String exactly maxLen (returned as-is)
- String longer than maxLen (truncated with "...")
- Empty string input
- maxLen of 0
- maxLen less than ellipsis length (e.g., maxLen=2)
- Very long strings
- maxLen equal to string length

**4b - RED Verification**: Tests fail with "Cannot find module" (truncate not implemented). Assertion density checked. Checksums recorded.

**4c - Code Writer**: Receives test file + spec-contract from disk. Writes `truncate` function in `src/string-utils.ts` (appending to existing file if capitalize already created it, or in its own file). Implementation: check length, return original or sliced + "...".

**4d - GREEN Verification**: Checksum match, no skip markers, all tests pass.

**4e - Spec Compliance Review**: Reviewer confirms all requirements met.

**4f - Adversarial Review**: Reviewer checks edge cases, cheating. Likely PASS.

#### slugify Pipeline

**4a - Test Writer**: Spawned with slugify's spec-contract. Creates `src/__tests__/slugify.test.ts` and `spec-contract-slugify.md`. Tests cover:
- Basic string -> slug conversion ("Hello World" -> "hello-world")
- Special characters removed ("Hello, World!" -> "hello-world")
- Multiple spaces/hyphens collapsed ("hello   world" -> "hello-world")
- Leading/trailing hyphens trimmed
- All lowercase
- Empty string
- Already-slugified string
- Numbers preserved ("Version 2.0" -> "version-20")
- Unicode characters

**4b - RED Verification**: Tests fail. Assertions adequate. Checksums recorded.

**4c - Code Writer**: Writes `slugify` implementation: lowercase, replace spaces, remove non-alphanumeric (except hyphens), collapse hyphens, trim.

**4d - GREEN Verification**: All checks pass.

**4e - Spec Compliance Review**: All requirements covered.

**4f - Adversarial Review**: PASS.

---

## Phase 5: Final Review -- Verification Before Completion

**What happens**: After ALL 3 work units complete.

### Step 1: Run FULL test suite
```bash
npx vitest run 2>&1; echo "EXIT_CODE:$?"
```

This runs ALL test files together (capitalize, truncate, slugify) to check for:
- Integration issues between the units
- Name conflicts in shared module
- Import/export issues

**IRON LAW**: Actually read the output. Do not assume success.

**Expected output**: All tests pass (e.g., "3 test files | 18 tests passed"). Exit code 0.

### Step 2: Verify pristine output
- No warnings
- No skipped tests
- No pending tests
- Clean green output

### Step 3: Review all generated code holistically
- Check that all 3 functions are properly exported from `src/string-utils.ts`
- No naming conflicts
- Consistent coding style across functions
- No duplicate utility code

### Step 4: Cross-unit integration check
- These units are independent pure functions, so integration risk is minimal.
- If they share a module file, verify all exports are correct.

### Step 5: Fix if needed
If any integration issues found: report them with evidence (actual test output) and fix before proceeding.

### Verification Anti-Rationalization
At this step, the skill explicitly rejects:
- "Tests should pass now" -> Run them. Read the output.
- "I'm confident this works" -> Run the tests.
- "Only changed one line" -> Run the tests.

**Session log**:
```json
{"timestamp":"...","event":"integration.check","unitId":null,"data":{"passed":true,"totalTests":18,"failures":0}}
```

**Expected outcome**: All tests pass. No integration issues. Proceed to report generation.

---

## Phase 6: Report Generation

**What happens**: Generate two files (since `reporting.generateReport` and `reporting.generateSessionLog` are both `true`).

### tdd-report.md

Created at project root:

```markdown
# TDD Session Report

**Date**: 2026-03-17T...Z
**Specification**: implement a string utility module with functions: capitalize(str) that capitalizes the first letter, truncate(str, maxLen) that truncates with ellipsis, and slugify(str) that converts to URL-safe slugs
**Framework**: typescript / vitest
**Entry Point**: natural-language-spec

## Summary

| Metric | Value |
|--------|-------|
| Work units | 3/3 |
| Tests written | ~18 |
| Assertions | ~22 |
| Anti-cheat violations | 0 |
| Adversarial reviews | 3/3 passed |
| Retries | 0 |

## Work Units

### Capitalize function -- completed

**Spec**: Capitalize the first letter of a string, handling edge cases

| Phase | Status | Attempts | Notes |
|-------|--------|----------|-------|
| Test Writer | completed | 1 | |
| RED Verification | passed | -- | 6 failures, 8 assertions |
| Code Writer | completed | 1 | |
| GREEN Verification | passed | -- | all pass |
| Spec Compliance | compliant | -- | 5/5 requirements |
| Adversarial Review | passed | -- | |

**Files created**:
- Tests: src/__tests__/capitalize.test.ts
- Implementation: src/string-utils.ts

### Truncate function -- completed
[similar structure]

### Slugify function -- completed
[similar structure]

## Anti-Cheat Log

No violations encountered.

## Final Integration Check

- All tests passing: yes
- Integration issues found: none
```

### tdd-session.jsonl

Already accumulated throughout the session with all events. Final event:
```json
{"timestamp":"...","event":"session.complete","unitId":null,"data":{"summary":{"totalUnits":3,"completedUnits":3,"failedUnits":0,"totalTests":18,"totalAssertions":22,"antiCheatViolations":0}}}
```

Note: `tdd-report.md` is intentionally NOT gitignored -- it is a deliverable.

**Expected outcome**: Both report files generated.

---

## Phase 7: Cleanup

**What happens**:

### Step 1: Clean up agent team
Shut down any remaining teammates (all should be complete by now).

### Step 2: Remove intermediate artifacts
Delete all `spec-contract-*.md` files created during the session:
```bash
rm -f src/__tests__/spec-contract-capitalize.md
rm -f src/__tests__/spec-contract-truncate.md
rm -f src/__tests__/spec-contract-slugify.md
```

### Step 3: Final state file update
Update `.tdd-state.json` with final status:
- All units completed
- Summary statistics finalized
- `updatedAt` set to current timestamp

### Step 4: Present report to user
Display the report summary to the user, highlighting:
- 3/3 work units completed
- All tests passing
- No anti-cheat violations
- Files created: test files and implementation files

### Step 5: Suggest next steps
The skill suggests:
- "Run the full test suite: `npx vitest run`"
- "Review the generated code in `src/string-utils.ts`"
- "Commit changes: the `tdd-report.md` file documents what was built"
- "Consider adding the string utilities to your module's public exports"

**Expected outcome**: Clean session. All artifacts cleaned up except deliverables (test files, implementation files, report). User sees a summary of what was accomplished.

---

## Summary of Files Created

### Permanent deliverables (kept):
- `src/__tests__/capitalize.test.ts` -- tests for capitalize
- `src/__tests__/truncate.test.ts` -- tests for truncate
- `src/__tests__/slugify.test.ts` -- tests for slugify
- `src/string-utils.ts` -- implementation of all 3 functions
- `tdd-report.md` -- session report (not gitignored)

### Session artifacts (gitignored):
- `.tdd-state.json` -- session state (gitignored)
- `tdd-session.jsonl` -- event log (gitignored)

### Intermediate artifacts (deleted in cleanup):
- `spec-contract-capitalize.md` -- deleted
- `spec-contract-truncate.md` -- deleted
- `spec-contract-slugify.md` -- deleted

---

## Agents Spawned (Total)

| Agent | Count | Model (auto strategy) |
|-------|-------|-----------------------|
| Test Writer | 3 (one per unit, parallel) | haiku |
| Code Writer | 3 (one per unit, parallel after RED) | haiku |
| Spec Compliance Reviewer | 3 (one per unit) | sonnet |
| Adversarial Reviewer | 3 (one per unit) | sonnet |
| **Total agents** | **12** | |

Note: If any retries occur, additional agents are spawned (up to maxRetries per phase per unit).

---

## Error Paths Not Taken

The following error-handling paths exist in the skill but were not triggered for this simple spec:

1. **Phase 0 Design Gate**: Skipped (simple spec, no `--design` flag)
2. **Test Writer retry**: Not needed (tests fail correctly on first attempt)
3. **RED anti-cheat violation**: Not triggered (tests properly fail without implementation)
4. **Code Writer retry**: Not needed (implementation passes tests on first attempt)
5. **GREEN anti-cheat violation**: Not triggered (test files unchanged, no skip markers)
6. **Spec Compliance NON-COMPLIANT**: Not triggered (all requirements met)
7. **Adversarial Review FAIL**: Not triggered (no critical issues)
8. **Systematic Debugging Protocol**: Not triggered (no persistent test failures)
9. **`--skip-failed` behavior**: Not applicable (no flag, no failures)
10. **Session resume**: Not applicable (fresh session)
11. **Test command not found**: Not applicable (framework correctly detected)
12. **Teammate crash/timeout**: Not applicable (all agents complete normally)
