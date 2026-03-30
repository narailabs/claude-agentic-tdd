# Eval 3: existing-test — Baseline Summary

## Eval
`/tdd implement against src/__tests__/calculator.test.ts`

## Baseline Behavior (Without Skill)

| Assertion Point | Present? | Notes |
|----------------|----------|-------|
| Agent teams | NO | Single-session execution |
| Tests written first | PARTIAL | Tests exist (user-provided) but no quality verification |
| RED verification | NO | Not applicable for Mode 3, but baseline lacks the concept entirely |
| GREEN verification | NO | No checksum/tamper detection — test files could be modified |
| Information barriers | NO | Same session reads tests and writes implementation |
| Formal reviews | NO | No adversarial, spec compliance, or code quality review |
| Task classification | NO | No mode detection (not recognized as "existing test" mode) |
| Eager dispatch | NO | Single-file sequential execution |
| Model/effort by complexity | NO | Uniform handling |
| Skip-marker detection | NO | Could add .skip to difficult tests undetected |
| State management / resume | NO | No .tdd-state.json |
| Report generation | NO | No structured output |

## Key Gaps

1. **GREEN verification is the critical gap**: For existing-test mode, the most important guardrail is ensuring the Code Writer does not modify the user's test files. Without checksum comparison, test tampering goes undetected.
2. **No skip-marker detection**: Tests could be silently skipped by adding `.skip`, `xit`, `@pytest.mark.skip`, etc.
3. **No spec compliance review**: No verification that the implementation covers everything the tests expect.
4. **No code quality review**: Implementation could be a minimal hack that passes tests but is unmaintainable.

## Expected Output Quality
- Functional code: likely makes tests pass (this is the easiest baseline case since tests already define the target)
- Test integrity: unknown — test files might be modified
- Implementation quality: minimal to make tests pass; may lack proper error handling, types, or documentation
- No review feedback: potential code quality issues go unnoticed
