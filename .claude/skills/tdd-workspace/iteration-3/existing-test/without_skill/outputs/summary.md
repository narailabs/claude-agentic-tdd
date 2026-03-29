# Summary: Default Claude Code vs TDD Skill for "implement against test file"

## What Default Claude Code Gets Right

- **Recognizes the intent**: "Implement against [test file]" is unambiguous. Claude Code correctly interprets this as "make these tests pass."
- **Reads the test file first**: Claude Code reliably reads referenced files before acting.
- **Writes implementation**: Claude Code would produce a working implementation in a single pass.
- **Runs tests after implementation**: Likely yes, but not guaranteed or enforced.
- **Does not ask for unnecessary confirmation**: No work decomposition plan for a single file (coincidentally correct).

## What Default Claude Code Misses

### Critical Gaps

1. **No test file protection (checksum verification)**: Nothing prevents Claude Code from modifying the user's test file. Under pressure from failing tests, it may "fix" assertions, add skip markers, or adjust imports. This is the highest-risk gap for this scenario -- the user said "implement against" meaning the tests are the contract.

2. **No adversarial review**: The same agent writes code and judges whether it is correct. No independent reviewer checks for edge case gaps, test-implementation coupling, or implementation shortcuts.

3. **No information barrier**: The same context reads the tests and writes the implementation. There is no separation to prevent the Code Writer from taking shortcuts that satisfy specific assertion values without genuine logic.

### Moderate Gaps

4. **No anti-pattern detection**: Hardcoded returns, excessive mocking, trivially-satisfying implementations go undetected.

5. **No skip marker detection**: If Claude Code adds `.skip`, `xit`, or `@Ignore` to troublesome tests, nothing flags it.

6. **No anti-rationalization enforcement**: Claude Code may declare "tests should pass now" without running them.

### Minor Gaps

7. **No state management**: Session interruption means starting over.

8. **No structured reporting**: No session log, no TDD report, no audit trail.

## Eval Assertion Coverage

| Assertion | Without Skill |
|-----------|--------------|
| Detects entry point mode 3 (user-provided test) | FAIL -- no mode concept |
| Skips Test Writer (does not rewrite tests) | PARTIAL -- no rewrite, but no hard protection |
| Reads test file and passes to Code Writer | PARTIAL -- reads file, but no separate agent |
| GREEN verification (checksum + tests pass) | FAIL -- no checksum; test run likely but not enforced |
| Adversarial review on test+implementation pair | FAIL -- no independent review |
| Does not ask for work decomposition confirmation | PASS -- coincidentally correct |

Score: 1 full pass, 2 partial, 3 full fails out of 6 assertions.

## Risk Assessment

| Risk | Likelihood | Impact |
|------|-----------|--------|
| Test file silently modified | Medium | High |
| Implementation satisfies tests trivially | Low-Medium | Medium |
| Verification skipped ("should work") | Low-Medium | High |
| Anti-patterns in implementation undetected | Medium | Low-Medium |
| No audit trail of what was done | Certain | Low |

## Bottom Line

Default Claude Code delivers roughly 55-65% of the value for this scenario. The basic workflow (read tests, write code, probably verify) works. But the TDD skill's primary value-add here is **test file integrity protection** via checksum verification and **independent adversarial review** -- ensuring that "implement against tests" means genuinely satisfying immutable test contracts, not silently adjusting tests to match a convenient implementation.
