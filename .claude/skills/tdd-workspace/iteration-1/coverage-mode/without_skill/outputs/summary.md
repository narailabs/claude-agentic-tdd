# Summary: Default Claude Code Behavior for Coverage Mode

## Prompt

`/tdd add test coverage for src/utils/ --skip-design`

## What Default Claude Code Would Do

1. **Ignore the `/tdd` command** -- treated as natural language, no skill invoked
2. **Read all source files** in `src/utils/` to understand existing code
3. **Check for test framework** via `package.json` or existing test files
4. **Write all tests in a single pass** -- one test file per source file, all at once
5. **Run tests once** -- fix test-side errors if any fail, then declare done
6. **Produce an informal summary** -- no structured report or metrics

## Does It Analyze Existing Code Structure?

**Partially.** Claude reads the source files and identifies exports, function signatures, and basic logic. However, this analysis is shallow -- it does not:
- Map dependencies between utilities
- Identify edge cases systematically
- Assess which functions are most critical to test
- Create a decomposition or execution plan

## Does It Write Proper Characterization Tests?

**No.** Characterization testing requires:
1. Writing tests that capture current behavior
2. Verifying the tests actually detect changes (RED-like validation)
3. Using those tests as a regression safety net

Default Claude skips step 2 entirely. It writes tests that happen to pass, but there is no verification that they would catch meaningful regressions. The tests are confirmation tests, not characterization tests.

## Does It Use TDD Methodology?

**No.** TDD requires:
- **Red**: Write a failing test first
- **Green**: Write minimum code to pass
- **Refactor**: Clean up while tests protect you

Default Claude inverts this completely:
- Reads implementation first (anti-TDD)
- Writes tests to match what the code already does (confirmation bias)
- Never verifies tests would fail without the implementation (no RED phase)
- No refactoring step

## Key Gaps (vs. Agentic TDD Skill)

| Gap | Impact |
|-----|--------|
| No RED verification | Tautological tests go undetected |
| No information barrier | Tests mirror implementation internals |
| No assertion density checks | Low-value assertions inflate coverage |
| No adversarial review | Edge cases and anti-patterns missed |
| No spec compliance review | No verification that tests match requirements |
| No anti-cheat guardrails | No checksum protection, no skip-marker detection |
| No state management | Cannot resume interrupted sessions |
| No structured decomposition | No dependency ordering, no parallel execution |
| No characterization methodology | Tests confirm current behavior without proving they catch regressions |
| No report generation | No metrics, no audit trail |

## Bottom Line

Default Claude Code produces syntactically correct tests that pass against the current implementation. These tests provide **coverage metrics** but not **confidence**. They answer "does the code do what it does?" rather than "does the code do what it should?" The absence of RED verification, adversarial review, and anti-cheat guardrails means the tests may encode existing bugs as expected behavior and miss critical edge cases.
