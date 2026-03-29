# Summary: Default Claude Code Behavior on Auth System Prompt (Iteration 2)

## Verdict

Default Claude Code would produce a **functional authentication system** with all three features (registration, login, password reset) implemented and superficially tested. However, it would skip every quality gate that distinguishes disciplined TDD from code-and-pray development. The nine parenthetical sub-requirements would be addressed as an informal checklist rather than tracked as formal acceptance criteria.

## Answers to the Five Key Questions

### 1. Would it ask design questions first?
**No.** Claude Code would not ask a single clarifying question. It would infer defaults for every ambiguous decision: bcrypt for hashing, HS256 JWT, in-memory storage, 5-attempt lockout, 1-hour token expiry, nodemailer with ethereal transport. None of these choices would be surfaced for user review before implementation begins.

### 2. Would it write tests before code?
**No.** Implementation would be written first for all three features (registration, login, password reset), then tests would be written afterward to match what was built. No test would ever be observed in a failing (RED) state before its corresponding implementation exists.

### 3. Would it use agent teams?
**No.** All work would happen in a single sequential thread. There would be no Test Writer agent operating behind an information barrier, no separate Code Writer constrained to making tests pass, no adversarial reviewer, and no spec compliance checker. The same "mind" writes both tests and code, eliminating the independence that catches design flaws.

### 4. Would it verify RED/GREEN phases?
**No.** There is no RED/GREEN/REFACTOR cycle. Tests are never run in a failing state to confirm they detect missing functionality. There is no anti-cheat verification, no mutation testing, and no check that tests actually fail when implementation is removed.

### 5. Would it produce a structured report?
**No.** The final output would be a conversational summary ("I built an auth system with these endpoints..."), not a structured report with work unit statuses, coverage metrics, spec compliance matrix, or session log.

## Assertion Results

| # | Assertion | Result |
|---|-----------|--------|
| 1 | Triggers design gate -- asks clarifying questions | FAIL |
| 2 | Produces design summary before proceeding | FAIL |
| 3 | Decomposes into at least 3 work units | FAIL |
| 4 | Identifies dependencies between units | FAIL |
| 5 | Respects dependency order in execution | PARTIAL |
| 6 | Each work unit goes through RED->GREEN->review cycle | FAIL |
| 7 | Runs final integration test across all units | FAIL |
| 8 | Report shows work units with phase statuses | FAIL |

**Score: ~0.5/8** (partial credit on implicit dependency ordering)

## Risk Assessment

| Risk | Severity | Likelihood |
|------|----------|------------|
| Tests that pass by construction but miss real bugs | High | High |
| Missing edge cases (token reuse, concurrent registration, clock skew) | High | High |
| Architecture decisions that do not match user intent | Medium | High |
| Security defaults that are reasonable but un-reviewed | Medium | Medium |
| No resume capability if session is interrupted mid-build | Low | Medium |

## Key Difference from Iteration 1

The iteration-2 prompt is more specific: it enumerates 9 sub-requirements in parentheticals. Default Claude Code treats these as an informal checklist and addresses most of them, but does not formally decompose them into tracked work units with individual RED/GREEN cycles. The richer specification helps Claude Code produce more complete implementation code, but does not change the fundamental absence of test-first discipline, agent teams, or verification gates. The gap between default behavior and TDD-enforced behavior remains the same in kind, though the richer spec slightly reduces the gap in feature coverage.

## Bottom Line

Default Claude Code optimizes for **speed to a working result**. For a security-critical system like authentication -- where edge cases in token expiry, failed attempt tracking, and password hashing carry real-world consequences -- the absence of test-first discipline, independent review agents, and formal verification represents a significant quality gap.
