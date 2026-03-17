# TDD Skill Execution Summary: User Authentication System

## Prompt

```
/tdd build a user authentication system with registration (email validation, password hashing,
duplicate detection), login (JWT tokens, failed attempt tracking), and password reset
(token generation, expiry, email notification)
```

## Phase Execution Overview

| Phase | Action | Outcome |
|-------|--------|---------|
| **Pre-Phase** | Parse args, load config (defaults), detect entry point (natural-language-spec) | No flags set; defaults applied |
| **Phase 0: Design Gate** | Triggered (3+ features, external integrations, ambiguous spec) | 3 clarifying questions asked one-at-a-time; design summary approved |
| **Phase 1: Framework Detection** | Auto-detect from project files | TypeScript / Vitest assumed |
| **Phase 2: Work Decomposition** | 3 work units identified with dependency analysis | user-registration (no deps), user-login (depends on registration), password-reset (depends on registration) |
| **Phase 3: State Init** | Create `.tdd-state.json`, session log, update `.gitignore` | State tracking initialized |
| **Phase 4: Agent Orchestration** | Execute 3 units respecting dependency order | Unit 1 sequential, then Units 2+3 in parallel |
| **Phase 5: Final Review** | Run full test suite, holistic code review, cross-unit integration check | All tests pass, no integration issues |
| **Phase 6: Report** | Generate `tdd-report.md` and `tdd-session.jsonl` | 3/3 units completed |
| **Phase 7: Cleanup** | Remove spec-contract files, shut down teammates, present results | Session complete |

## Design Gate Details

**Triggered because:**
- 3 distinct features (registration, login, password reset)
- External integrations (JWT, bcrypt, email notification)
- Ambiguous data flow and error handling

**Questions asked (one at a time):**
1. Password reset token expiry duration and limits
2. Consequence of repeated login failures (lockout policy)
3. Email notification: concrete service vs pluggable interface

**Key design decisions captured:**
- Stateless JWT (no revocation)
- Pluggable notification interface (not coupled to email provider)
- Account lockout after 5 failures, 30-minute auto-unlock
- 1-hour reset token expiry, one active token per user
- bcrypt for password hashing

## Dependency Graph and Execution Order

```
                    user-registration
                     /            \
                    v              v
             user-login      password-reset
```

- **Level 0**: `user-registration` runs first (no dependencies)
- **Level 1**: `user-login` and `password-reset` run in parallel (both depend only on `user-registration`)

## Per-Unit Pipeline (Applied to Each Unit)

Each unit goes through 6 sub-steps:

1. **Test Writer** (teammate) -- writes failing tests + spec-contract file
2. **RED Verification** -- confirms tests fail correctly, checks assertion density, checks for anti-patterns, records test file checksums
3. **Code Writer** (teammate) -- receives test files and spec-contract from disk only (information barrier enforced), writes minimum implementation
4. **GREEN Verification** -- verifies test checksums unchanged, no skip markers, all tests pass
5. **Spec Compliance Review** (teammate) -- verifies every spec requirement is implemented and tested; runs BEFORE adversarial review
6. **Adversarial Review** (teammate) -- checks edge cases, cheating, anti-patterns, coverage gaps

## Anti-Cheat Guardrails Applied

| Guardrail | When | What |
|-----------|------|------|
| Tests must fail (RED) | After Test Writer | Exit code != 0, correct failure types |
| Assertion density | After Test Writer | >= 1 meaningful assertion per test |
| Behavior-over-implementation | After Test Writer | No excessive mocking, no private method tests |
| Test file checksums | After Code Writer | Checksums must match RED-phase checksums |
| No skip/focus markers | After Code Writer | grep for `.skip`, `xit`, `.only`, etc. |
| All tests pass (GREEN) | After Code Writer | Exit code == 0 |
| No hardcoded returns | After Code Writer | Heuristic check for literal returns |
| Information barrier | Code Writer prompt | Only test file + spec-contract from disk; no Test Writer reasoning |

## Final Integration Check

After all 3 units complete:
1. Full test suite run (`npx vitest run`) -- read actual output, not assumed
2. Pristine output verified (no warnings, no skipped tests)
3. Cross-unit compatibility checked (UserStore interface, password hash format, import paths)
4. Anti-rationalization enforced ("should work" is not evidence -- only test output counts)

## Files Produced

**Implementation:**
- `src/user-registration.ts`
- `src/user-login.ts`
- `src/password-reset.ts`

**Tests:**
- `src/__tests__/user-registration.test.ts`
- `src/__tests__/user-login.test.ts`
- `src/__tests__/password-reset.test.ts`

**Reports:**
- `tdd-report.md` (not gitignored -- deliverable)
- `tdd-session.jsonl` (gitignored)

**Cleaned up:**
- `spec-contract-user-registration.md` (deleted in Phase 7)
- `spec-contract-user-login.md` (deleted in Phase 7)
- `spec-contract-password-reset.md` (deleted in Phase 7)
