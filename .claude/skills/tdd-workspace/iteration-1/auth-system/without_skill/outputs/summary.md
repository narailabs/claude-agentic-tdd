# Eval 2: auth-system — Baseline Summary

## Eval
`/tdd build a user authentication system with registration, login, password reset`

## Baseline Behavior (Without Skill)

| Assertion Point | Present? | Notes |
|----------------|----------|-------|
| Agent teams | NO | Single-session, no Test Writer / Code Writer separation |
| Tests written first | NO | Implementation-first for all 3 auth components |
| RED verification | NO | Security-sensitive tests never proven to fail |
| GREEN verification | NO | No tamper detection on test files |
| Information barriers | NO | Same session writes tests + implementation for auth logic |
| Formal reviews | NO | No adversarial review of security edge cases |
| Task classification | NO | Registration, login, password-reset not differentiated by complexity |
| Eager dispatch | NO | Sequential; no parallel execution of independent units |
| Model/effort by complexity | NO | Uniform handling; password-reset flow same as simple validators |
| Work decomposition | NO | Likely all written as monolithic auth module |
| Design gate | NO | No explicit design decisions presented (token type, expiry, hashing) |
| User confirmation of plan | NO | Implicit architecture decisions |
| State management / resume | NO | No .tdd-state.json |
| Report generation | NO | No structured output |

## Key Gaps

1. **Security design unreviewed**: Password hashing algorithm, token expiry, lockout policy all decided implicitly without user input or formal design gate.
2. **Cross-component integration untested**: Login depends on registration's user storage; password reset depends on both. Without decomposition and dependency tracking, integration gaps are likely.
3. **No independent security review**: Auth systems benefit most from adversarial review (token reuse, timing attacks, injection). Baseline has none.
4. **Spec ambiguity unresolved**: Questions like "should accounts be active immediately or require email verification?" are answered implicitly, potentially incorrectly.

## Expected Output Quality
- Functional code: likely works for happy path
- Security: potentially adequate but unverified (common hashing libraries used but edge cases untested)
- Test quality: shallow — likely tests happy paths (successful registration, successful login) but misses security edge cases (duplicate email, expired token reuse, password strength, brute force handling)
- Architecture: potentially tightly coupled without explicit interface design
