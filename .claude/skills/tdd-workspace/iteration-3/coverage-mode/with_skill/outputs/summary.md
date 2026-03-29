# Summary: Coverage Mode Trace (`/tdd add test coverage for src/utils/ --skip-design`)

## Mode Determination

- **Entry Point**: Mode 2 (Existing Codebase), triggered by "add test coverage for"
- **Design Gate**: Skipped (two reasons: Mode 2 default + explicit `--skip-design` flag)
- **Spec-Contracts**: Reverse-engineered from reading existing source files (not forward requirements)

## Phase Execution Order

| Phase | Action | Mode 2 Notes |
|-------|--------|-------------|
| Phase 0: Design Gate | SKIPPED | Mode 2 default; `--skip-design` reinforces |
| Phase 1: Framework Detection | Standard | Auto-detect from project files |
| Phase 2: Work Decomposition | Adapted | Read `src/utils/` source files; reverse-engineer behavior specs |
| Phase 3: State Init | Standard | Create `.tdd-state.json`, session log, update `.gitignore` |
| Phase 4: Orchestration | Adapted | Per-unit pipeline with Mode 2 RED verification |
| Phase 5: Final Review | Standard | Full test suite run with anti-rationalization enforcement |
| Phase 6: Report | Standard | `tdd-report.md` + `tdd-session.jsonl` |
| Phase 7: Cleanup | Standard | Delete `spec-contract-*.md` files, shut down agents |

## Per-Unit Pipeline (Mode 2)

For each source file in `src/utils/`:

1. **Test Writer** -- writes characterization tests describing what existing code does
2. **RED Verification (Hide-and-Restore)** -- the key Mode 2 innovation:
   - Hide implementation (`mv impl.ts impl.ts.tdd-hidden`)
   - Run tests -- must FAIL with import errors (proves tests depend on real code)
   - Restore implementation (`mv impl.ts.tdd-hidden impl.ts`)
   - Run tests -- must PASS (proves tests accurately characterize existing behavior)
3. **Code Writer** -- typically NO-OP in coverage mode (implementation already satisfies tests)
4. **GREEN Verification** -- confirm tests still pass; verify checksums unchanged
5. **Three-Stage Review**:
   - Stage 1: Spec Compliance (COMPLIANT gates Stage 2)
   - Stage 2: Adversarial Review (PASS gates Stage 3)
   - Stage 3: Code Quality Review (APPROVED marks unit complete)

## Hide-and-Restore Procedure

This is the core RED verification adaptation for Mode 2. It replaces the standard "tests must fail" check (which would be wrong for characterization tests that correctly pass against existing code).

**What it proves**:
1. Tests are not tautological -- they actually import and depend on the real implementation
2. Tests are accurate -- they describe what the code currently does, not imagined behavior

**Failure modes**:
- Tests pass with hidden implementation -> tautological tests (anti-cheat violation)
- Tests fail after restoration -> mischaracterization (Test Writer error)
- Non-import errors with hidden implementation -> broken test file (Test Writer error)

**Safety concern**: Between hide and restore, the source file is renamed. If the orchestrator crashes, the user's code is in a `.tdd-hidden` state. The state file should track this.

## Three-Stage Review Pipeline

Strictly ordered: Spec Compliance -> Adversarial -> Code Quality.

**Rationale for ordering**:
- No point doing adversarial review on non-compliant code
- No point doing code quality review on code with fundamental test weaknesses
- Each stage addresses a distinct concern: correctness, robustness, maintainability

**Failure handling**:
- Stage 1 failure (NON-COMPLIANT) -> back to Test Writer for missing tests, then Code Writer
- Stage 2 failure (FAIL) -> back to Test Writer for gap tests, then Code Writer
- Stage 3 failure (NEEDS CHANGES, Critical/Important) -> back to Code Writer for fixes, then re-review

## Checks That Apply in All Modes

These run regardless of entry point mode:
- Check 1: Tests Exist
- Check 4: Assertion Density (count assertions per test, minimum threshold)
- Check 5: Behavior-Over-Implementation (flag excessive mocking, private method testing, implementation mirroring)
- Record Checksums (for GREEN verification integrity)

## Key Config Values Used

| Config Key | Default | Where Used |
|-----------|---------|-----------|
| `antiCheat.minAssertionsPerTest` | 1 | RED Check 4 |
| `antiCheat.maxRetries` | 3 | All retry loops |
| `antiCheat.maxMockDepth` | 2 | RED Check 5 |
| `antiCheat.flagPrivateMethodTests` | true | RED Check 5 |
| `execution.maxParallelPairs` | 3 | Batch concurrency limit |
| `execution.skipFailedAfterRetries` | false | Escalate vs skip on failure |
| `reporting.generateReport` | true | Phase 6 |
| `reporting.generateSessionLog` | true | Phase 3 + throughout |

## Anti-Rationalization

The IRON LAW applies at Phase 5: "No completion claim without fresh verification evidence." The full test suite must be run and its output read. Every excuse in the anti-rationalization table is rejected.
