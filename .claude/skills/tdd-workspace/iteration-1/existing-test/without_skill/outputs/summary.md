# Summary: Default Claude Code vs TDD Skill for "implement against test file"

## What Default Claude Code Gets Right

- **Recognizes the intent**: Yes. "Implement against [test file]" is clear enough that Claude Code correctly interprets it as "make these tests pass."
- **Reads the test file first**: Yes. Claude Code reliably reads referenced files before acting.
- **Runs tests after implementation**: Likely yes, but not guaranteed. No hard enforcement.

## What Default Claude Code Misses

### Critical Gaps

1. **No test file protection**: No checksum, no diff check, no constraint preventing Claude Code from modifying the test file. Under pressure from failing tests, it may "fix" tests rather than fix implementation.

2. **No RED verification**: Tests are never proven to fail before implementation begins. Tautological tests (that pass without any implementation) would go undetected.

3. **No independent review**: The same agent that writes code also judges whether the code is correct. No adversarial reviewer, no spec compliance check.

### Moderate Gaps

4. **No anti-pattern detection**: Hardcoded returns, excessive mocking, implementation-mirroring tests, trivial assertions -- all go undetected.

5. **No incremental discipline**: Everything is implemented in one pass rather than through iterative RED-GREEN cycles.

6. **No state management**: Session interruption means starting over.

### Minor Gaps

7. **No structured reporting**: No session log, no TDD report, no audit trail.

8. **No anti-rationalization enforcement**: Claude Code may skip verification with "I'm confident this works."

## Risk Assessment

| Risk | Likelihood | Impact |
|------|-----------|--------|
| Test file silently modified | Medium | High |
| Tests pass but implementation is trivially correct | Low-Medium | Medium |
| Verification skipped ("should work") | Low-Medium | High |
| Tautological tests undetected | Low (in this scenario, tests pre-exist) | Medium |
| Anti-patterns in implementation | Medium | Low-Medium |

## Bottom Line

For the "implement against existing test file" scenario, default Claude Code delivers roughly 60-70% of the value. It gets the basic job done -- read tests, write code, probably verify. But it provides zero guarantees about test integrity, implementation quality, or process discipline. The TDD skill's primary value-add in this scenario is the **test file protection** (checksum verification) and **independent adversarial review** -- ensuring that "making tests pass" means genuinely correct implementation, not test manipulation.
