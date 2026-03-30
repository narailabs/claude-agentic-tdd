# Eval 4: coverage-mode — Baseline Summary

## Eval
`/tdd add test coverage for src/utils/ --skip-design`

## Baseline Behavior (Without Skill)

| Assertion Point | Present? | Notes |
|----------------|----------|-------|
| Agent teams | NO | Single-session execution |
| Tests written first | N/A | Coverage mode — code exists, tests are new |
| RED verification (coverage mode) | NO | No rename-test-restore cycle; no proof tests depend on real code |
| GREEN verification | PARTIAL | Tests run and pass, but no tamper detection |
| Information barriers | NO | Claude reads implementation then writes tests (mirroring risk) |
| Formal reviews | NO | No adversarial review of test quality |
| Task classification | NO | No mode detection (not recognized as coverage mode) |
| Eager dispatch | NO | Sequential single-session execution |
| Model/effort by complexity | NO | Uniform handling for all utils |
| Work decomposition | NO | All utils tested in single pass |
| --skip-design flag | IGNORED | No design gate concept exists |
| Assertion density check | NO | No minimum threshold |
| Mock depth check | NO | Over-mocking undetected |
| State management / resume | NO | No .tdd-state.json |

## Key Gaps

1. **Coverage Mode RED Verification is the critical gap**: The rename-test-restore cycle is the only way to prove characterization tests actually depend on the source code. Without it, tests could be vacuously passing through mocks or wrong imports.
2. **Implementation-mirroring tests**: Reading the code first means tests document "what the code does" not "what the code should do." Bugs become encoded as correct behavior.
3. **No assertion density**: Coverage tests could have a single `expect(result).toBeDefined()` per function — technically passing but providing no real coverage.
4. **No per-util decomposition**: Multiple utility files should be separate work units with independent review cycles.

## Expected Output Quality
- Tests: will pass, but likely mirror implementation structure
- Coverage: may miss edge cases visible only from behavioral spec perspective
- Quality: no guarantee assertions are meaningful (could be all `.toBeDefined()` or `.toBeTruthy()`)
- Bugs: existing bugs in src/utils/ will be documented as correct behavior in tests
