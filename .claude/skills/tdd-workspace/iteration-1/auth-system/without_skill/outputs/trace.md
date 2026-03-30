# Eval 2: auth-system — Baseline Trace (No TDD Skill)

## Input
`/tdd build a user authentication system with registration, login, password reset`

## What Default Claude Code Would Do

### Step 1: Interpret the command
Without the TDD skill, `/tdd` is not recognized. Claude treats this as a natural language request to build an auth system. This is a significantly more complex spec than Eval 1 — it involves multiple components, data storage, security concerns (password hashing, token generation), and cross-component dependencies.

### Step 2: Implementation approach
Claude Code would produce a monolithic implementation:

1. Ask a few clarifying questions (maybe) about tech stack
2. Write implementation files for all three features in one or a few passes
3. Create a test file afterward
4. Run tests, fix issues
5. Report done

### Step 3: Actual file creation sequence

```
1. Write src/auth/register.ts        ← implementation first
2. Write src/auth/login.ts           ← implementation first
3. Write src/auth/password-reset.ts  ← implementation first
4. Write src/auth/types.ts           ← shared types
5. Write src/__tests__/auth.test.ts  ← tests AFTER implementation
6. Run tests
7. Fix failures
8. Report done
```

### Step 4: No design gate
Claude would not formally analyze that this spec:
- Involves 3+ distinct features
- Has security implications (password hashing, token expiry)
- Has cross-component data flow (registration creates users that login references)
- Has ambiguities (token expiry policy, lockout policy, email verification)

It would make implicit design decisions without presenting them for user review.

## Detailed Behavioral Analysis

### Would Claude use agent teams?
**NO.** Single-session execution. For a complex system like auth, this means all design decisions, implementations, and tests come from the same context with no independent verification. The auth system involves security-sensitive logic (password hashing, token generation) where independent review is most valuable.

### Would Claude write tests first?
**NO.** Implementation-first. For an auth system, this is particularly problematic because:
- Security edge cases (empty passwords, SQL injection, token reuse) are easily missed when tests are written to match existing code
- Error handling paths (invalid credentials, expired tokens, duplicate emails) are often under-tested
- The implementation shapes what gets tested rather than the spec

### Would Claude verify RED?
**NO.** No RED verification. For auth, this means tests like "should reject invalid password" might pass vacuously if the assertion is weak or the mock setup is wrong.

### Would Claude verify GREEN?
**NO.** No tamper detection. If Claude modifies a test to make it pass (e.g., changing an expected error message to match the implementation), nothing catches this.

### Would Claude use information barriers?
**NO.** Same session writes everything. For auth, this means the test for "should hash password before storing" might just check that bcrypt.hash was called (implementation-mirroring) instead of verifying the stored value is not plaintext (behavioral).

### Would Claude do formal reviews?
**NO.** No adversarial review to catch:
- Missing edge cases (what if reset token is used twice?)
- Security gaps (is password hashing actually secure?)
- Spec compliance gaps (does registration actually validate email format?)

No spec compliance review to verify all three features (registration, login, password reset) are fully implemented with all their sub-requirements.

### Would Claude classify tasks by complexity?
**NO.** Registration, login, and password reset have different complexity profiles:
- Registration: straightforward input validation + storage
- Login: credential verification + session/token management
- Password reset: multi-step flow with token generation, expiry, and secure update

All would be handled identically.

### Would Claude use eager dispatch?
**NO.** Sequential processing. Despite login depending on registration but password reset also depending on registration, these dependency chains are not analyzed. No concurrent execution.

### Would Claude run a design gate?
**NO.** This spec clearly triggers the design gate conditions (3+ features, security concerns, ambiguous error handling policies), but without the skill, no design refinement happens. Claude makes implicit decisions about:
- Token type (JWT vs session)
- Password hashing algorithm
- Token expiry policies
- Error response formats
- Email verification requirements

None of these decisions are presented to the user for review.

### Would Claude assign model/effort by complexity?
**NO.** No per-component model selection. The security-sensitive password reset flow gets the same treatment as a simple getter.

## Anti-Patterns Present in Baseline

1. **No design gate**: Security-sensitive system built without explicit design review
2. **Implementation-first**: Security edge cases likely missed in tests
3. **No RED verification**: Token validation tests may be vacuously passing
4. **No information barrier**: Tests mirror implementation structure
5. **No formal review**: Security gaps undetected
6. **No dependency analysis**: Cross-component integration untested
7. **Implicit design decisions**: Token type, expiry policy, hashing algorithm chosen without user input
8. **No state management**: Cannot resume if session interrupted mid-auth-system
9. **Monolithic output**: No decomposition into independent work units
10. **No report**: No documentation of what security decisions were made and why
