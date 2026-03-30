# Eval 4: Coverage Mode — Trace

**Command**: `/tdd add test coverage for src/utils/ --skip-design`

---

## Step 1: Skill Activation and Prerequisite Checks

1. Skill triggers on `/tdd` command.
2. Check `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` — confirmed.
3. Check git repo — confirmed.

## Step 2: Argument Parsing

- Spec text: "add test coverage for src/utils/"
- Flag: `--skip-design` detected.

## Step 3: Configuration Loading

- Apply defaults. maxParallelPairs=4, parallelMode="eager", modelStrategy="auto", effortLevel="high".

## Step 4: Session Model/Effort Detection

- Detect session model/effort. Assume sonnet/high.
- All agents capped at sonnet/high.

## Step 5: Entry Point Detection

- User says "add test coverage for..." — this is **Mode 2: Existing Codebase**.
- Target directory: `src/utils/`.
- Mode 2 specifics: design gate skipped by default (also explicitly `--skip-design`), Test Writer receives spec-contracts derived from reading existing source files, RED verification uses hide-and-restore, Code Writer may be no-op.

## Step 6: Phase 0 — Design Gate

**SKIPPED** — Mode 2 skips by default (characterizing existing code, not designing new features). Also `--skip-design` flag is set.

## Step 7: Phase 1 — Framework Detection

1. Auto-detect: vitest in package.json, TypeScript.
2. Result: language=typescript, testRunner=vitest, testCommand="npx vitest run".

## Step 8: Phase 2 — Work Decomposition

### Source File Discovery

Read the contents of `src/utils/` to find existing source files:
- Assume found: `src/utils/format.ts`, `src/utils/validate.ts`, `src/utils/transform.ts`

### Spec-Contract Derivation (Reverse Engineering)

For each source file, the lead reads the code and derives a behavioral spec-contract:
- **format.ts**: exports `formatDate(date)`, `formatCurrency(amount, locale)`, `formatPercentage(value)`
- **validate.ts**: exports `isEmail(str)`, `isURL(str)`, `isPhoneNumber(str, countryCode)`
- **transform.ts**: exports `camelToSnake(str)`, `snakeToCamel(str)`, `flattenObject(obj)`

### Work Units

**Unit 1: format-utils [code]**
- spec-contract: Characterize existing behavior of formatDate, formatCurrency, formatPercentage
- dependsOn: `[]`
- testFiles: `src/__tests__/format.test.ts`
- implFiles: `src/utils/format.ts` (existing — not to be modified)

**Unit 2: validate-utils [code]**
- spec-contract: Characterize existing behavior of isEmail, isURL, isPhoneNumber
- dependsOn: `[]`
- testFiles: `src/__tests__/validate.test.ts`
- implFiles: `src/utils/validate.ts` (existing)

**Unit 3: transform-utils [code]**
- spec-contract: Characterize existing behavior of camelToSnake, snakeToCamel, flattenObject
- dependsOn: `[]`
- testFiles: `src/__tests__/transform.test.ts`
- implFiles: `src/utils/transform.ts` (existing)

**Complexity**: All Mechanical — isolated functions, clear existing code, characterization only.

**Model assignment**: All sonnet/high.

### User Confirmation

```
## TDD Work Plan

Framework: vitest (auto-detected)
Mode: existing-codebase (coverage)
Work units: 3

### Unit 1: format-utils [code]
Spec: Characterize formatDate, formatCurrency, formatPercentage
Test: src/__tests__/format.test.ts (new)
Implementation: src/utils/format.ts (existing, will not be modified)
Dependencies: none

### Unit 2: validate-utils [code]
Spec: Characterize isEmail, isURL, isPhoneNumber
Test: src/__tests__/validate.test.ts (new)
Implementation: src/utils/validate.ts (existing, will not be modified)
Dependencies: none

### Unit 3: transform-utils [code]
Spec: Characterize camelToSnake, snakeToCamel, flattenObject
Test: src/__tests__/transform.test.ts (new)
Implementation: src/utils/transform.ts (existing, will not be modified)
Dependencies: none

Execution plan (eager dispatch, max 4 concurrent):
  Ready immediately: format-utils, validate-utils, transform-utils (all parallel)

Note: Code Writer may be skipped if characterization tests pass against existing code.

Proceed? [confirm/modify/cancel]
```

User confirms.

## Step 9: Phase 3 — State Initialization

1. Create `.tdd-state.json` with entry point "existing-codebase".
2. Add state files to `.gitignore`.
3. Initialize session log.

## Step 10: Phase 4 — Agent Team Orchestration

### Ready Queue Initialization (Eager Dispatch)

- All 3 units have no dependencies. Ready queue: `[format-utils, validate-utils, transform-utils]`.
- Dispatch all 3 concurrently (3 of max 4 slots).

---

### UNIT: format-utils (Slot 1) — parallel with others

#### Step 4a: Spawn Test Writer

- Template from `reference/test-writer-prompt.md`.
- **Mode 2 adaptation**: spec-contract is derived from reading existing source (not forward requirements). The Test Writer is told to characterize what the code actually does.
- Test Writer reads behavior from spec-contract and writes characterization tests:
  - formatDate: returns ISO string, handles invalid dates, handles various date formats
  - formatCurrency: returns formatted string with currency symbol, handles locale variations
  - formatPercentage: returns percentage string, handles decimal precision
- Creates `spec-contract-format-utils.md`.
- Reports **DONE**.

#### Step 4b: RED Verification — Coverage Mode (Hide-and-Restore)

Per `reference/anti-cheat.md` "Coverage Mode RED Verification":

**Step 1: Hide the implementation**
```bash
mv src/utils/format.ts src/utils/format.ts.tdd-hidden
```

**Step 2: Run tests — should FAIL with import errors**
```bash
npx vitest run src/__tests__/format.test.ts 2>&1; echo "EXIT_CODE:$?"
```
- Exit code != 0 with "Cannot find module '../utils/format'" — GOOD. Tests genuinely depend on the real code.
- If exit code == 0 → tests are tautological (anti-cheat violation). Re-prompt Test Writer.

**Step 3: Restore the implementation**
```bash
mv src/utils/format.ts.tdd-hidden src/utils/format.ts
```

**Step 4: Run tests — should PASS**
```bash
npx vitest run src/__tests__/format.test.ts 2>&1; echo "EXIT_CODE:$?"
```
- Exit code == 0 — characterization is accurate. PASS.
- If exit code != 0 → Test Writer mischaracterized the code. Re-prompt: "Your characterization tests fail against the existing implementation."

**Remaining checks (still apply in coverage mode)**:
- Check 1 (Tests Exist) — PASS.
- Check 4 (Assertion Density) — adequate. PASS.
- Check 5 (Behavior-Over-Implementation) — no excessive mocking, no private method access. PASS.
- Record checksums.

#### Step 4c: Code Writer — SKIPPED (No-Op)

Characterization tests pass against existing code. No implementation changes needed. Code Writer is a no-op. Skip directly to review.

#### Step 4d: GREEN Verification

Since Code Writer was skipped, verify that:
1. Test file checksums unchanged since RED verification — PASS (no one touched them).
2. Tests still pass — run tests. PASS.

#### Step 4e: Spec Compliance Review

- Spawn reviewer with spec-contract (derived from existing code), test file, implementation file.
- Reviewer checks: does the characterization cover the existing API surface? Are there exported functions without tests?
- **Verdict: COMPLIANT**.

#### Step 4f: Adversarial Review

- Spawn reviewer with spec-contract, test + impl files.
- Checks: are characterization tests meaningful? Do they actually test real behavior or just import the module? Edge case coverage for existing code.
- **Verdict: PASS**.

#### Step 4g: Code Quality Review

- Spawn reviewer with impl, tests, git diff (diff is only new test files).
- Checks: test quality, naming, structure. No implementation changes to review.
- **Assessment: Approved**.

**format-utils COMPLETED.**

---

### UNITS: validate-utils (Slot 2) and transform-utils (Slot 3)

Follow the identical pattern as format-utils:
1. Test Writer characterizes existing behavior.
2. Coverage Mode RED: hide impl, verify tests fail, restore impl, verify tests pass.
3. Code Writer: SKIPPED (no-op, characterization tests already pass).
4. GREEN verification (checksum + test run).
5. Three-stage review: spec compliance -> adversarial -> code quality.
6. All pass, units completed.

All three units run in parallel from the start since they have no dependencies.

---

## Step 11: Phase 5 — Final Review

1. Run full test suite: `npx vitest run`. All tests pass (new characterization tests + any existing tests).
2. Pristine output: no warnings, no skipped.
3. Holistic review: characterization tests consistently cover the utility APIs.
4. No cross-unit integration concerns (all independent utility modules).

## Step 12: Phase 6 — Report Generation

Generate `tdd-report.md`:
- 3/3 units completed
- Mode: existing-codebase
- Code Writer: skipped for all units (characterization against existing code)
- RED verification: coverage mode (hide-and-restore) — all passed
- GREEN verification: passed
- All reviews passed

Generate `tdd-session.jsonl`.

## Step 13: Phase 7 — Cleanup

1. Shut down teammates.
2. Delete spec-contract files.
3. Final state update.
4. Present report.
5. Suggest: "Run `npx vitest run` to verify all characterization tests pass, then commit."
