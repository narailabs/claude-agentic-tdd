# Eval 2: Auth System — Trace

**Command**: `/tdd build a user authentication system with registration (email validation, password hashing, duplicate detection), login (JWT tokens, failed attempt tracking), and password reset (token generation, expiry, email notification)`

---

## Step 1: Skill Activation and Prerequisite Checks

1. Skill triggers on `/tdd` command.
2. Check `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` — confirmed.
3. Check git repo — confirmed.

## Step 2: Argument Parsing

- Spec text: "build a user authentication system with registration (email validation, password hashing, duplicate detection), login (JWT tokens, failed attempt tracking), and password reset (token generation, expiry, email notification)"
- No flags detected.

## Step 3: Configuration Loading

1. Check `.tdd.config.json` — not found.
2. Check CLAUDE.md for `## TDD Configuration` — none.
3. Apply defaults: maxParallelPairs=4, parallelMode="eager", modelStrategy="auto", effortLevel="high", maxRetries=3, minAssertionsPerTest=1, maxMockDepth=2.

## Step 4: Session Model/Effort Detection

- Detect session model and effort. Assume session is opus/high (this is a complex spec, user likely running capable model).
- Ceiling: opus/high. Complex agents can get opus/high, simpler agents get sonnet/high.

## Step 5: Entry Point Detection

- Mode 1: Natural language spec. No "add tests", no "implement against", no plan file.

## Step 6: Phase 0 — Design Gate

### Trigger Evaluation

- Spec mentions 3+ distinct features: registration, login, password reset. **YES — triggers**.
- Spec involves external integrations: JWT tokens, email notification, password hashing. **YES**.
- Ambiguities present: What email validation rules? How long do reset tokens last? What happens on too many failed logins? **YES**.

**Decision**: RUN the design gate.

### Step 0a: Clarifying Questions (one at a time)

**Q1**: "Should password reset tokens expire? If so, after how long?"
- User answers: "Yes, 1 hour."

**Q2**: "Should registration send a verification email, or are accounts active immediately?"
- User answers: "Active immediately, no verification email."

**Q3**: "What should happen after too many failed login attempts — lockout, CAPTCHA, or just tracking?"
- User answers: "Lock the account for 15 minutes after 5 failed attempts."

### Step 0b: Propose Approaches (MANDATORY trade-off proposals)

**Trade-off 1: Token Strategy**
- Option A: JWT tokens (stateless, scalable, but cannot revoke individual tokens)
- Option B: Session-based auth (revocable, but requires a session store)
- Option C: JWT with refresh tokens (compromise — short-lived access tokens, revocable refresh tokens)

User selects: Option C (JWT with refresh tokens).

**Trade-off 2: Password Hashing**
- Option A: bcrypt (well-proven, CPU-bound)
- Option B: argon2 (more modern, memory-hard, better resistance to GPU attacks)

User selects: Option A (bcrypt).

### Step 0c: Design Summary

```
## Design Summary

### Components
- UserRegistration: email validation, bcrypt password hashing, duplicate detection
- UserLogin: credential verification, JWT access token (15m) + refresh token (7d), failed attempt tracking with lockout
- PasswordReset: secure token generation, 1-hour expiry, email notification

### Data Flow
Registration -> store user (email, hashed password) -> return user object
Login -> verify credentials -> check lockout -> generate JWT pair -> return tokens
Password Reset -> generate token -> store with expiry -> send email -> validate token -> update password

### Key Decisions
- JWT with refresh tokens for auth (short-lived access, revocable refresh)
- bcrypt for password hashing
- Account lockout after 5 failed attempts for 15 minutes
- Accounts active immediately (no email verification)
- Reset tokens expire after 1 hour

### Out of Scope
- Email verification on registration
- OAuth/social login
- Role-based access control
- Rate limiting beyond login lockout
```

### Step 0d: User Approval

"Proceed with this design? [confirm/modify/cancel]"

User confirms. Design summary stored in state file under `designSummary`.

**HARD GATE passed.**

## Step 7: Phase 1 — Framework Detection

1. Auto-detect from package.json: vitest in devDependencies, tsconfig.json present.
2. Result: language=typescript, testRunner=vitest, testCommand="npx vitest run", testDir="src/__tests__/".

## Step 8: Phase 2 — Work Decomposition

Analyze spec: 3 distinct features with dependencies.

### Work Units

**Unit 1: user-registration [code]**
- spec-contract: Create user with email validation (format check), bcrypt password hashing, duplicate email detection. Returns user object (id, email, createdAt). Throws on invalid email, duplicate email, weak password.
- dependsOn: `[]`
- testFiles: `src/__tests__/user-registration.test.ts`
- implFiles: `src/user-registration.ts`

**Unit 2: user-login [code]**
- spec-contract: Authenticate with email/password, return JWT access token (15m) + refresh token (7d), track failed attempts, lock account after 5 failures for 15 minutes. Throws on invalid credentials, locked account.
- dependsOn: `[user-registration]` (needs user storage/lookup)
- testFiles: `src/__tests__/user-login.test.ts`
- implFiles: `src/user-login.ts`

**Unit 3: password-reset [code]**
- spec-contract: Generate cryptographically secure reset token, store with 1-hour expiry, send email notification, validate token on reset, update password with bcrypt hash, invalidate used token. Throws on invalid/expired token, user not found.
- dependsOn: `[user-registration]` (needs user storage/lookup)
- testFiles: `src/__tests__/password-reset.test.ts`
- implFiles: `src/password-reset.ts`

### Complexity Assessment

| Unit | Complexity | Signals |
|------|-----------|---------|
| user-registration | Integration | Multi-concern (validation, hashing, storage), cross-unit dependency source |
| user-login | Architecture | JWT generation, lockout logic, failed attempt state, depends on registration |
| password-reset | Architecture | Token crypto, expiry, email integration, depends on registration |

### Model Assignment (session ceiling opus/high)

| Role | user-registration | user-login | password-reset |
|------|------------------|------------|----------------|
| Test Writer | sonnet/high | opus/high | opus/high |
| Code Writer | sonnet/high | sonnet/high | sonnet/high |
| Spec Compliance | sonnet/high | opus/high | opus/high |
| Adversarial | sonnet/high | opus/high | opus/high |
| Code Quality | sonnet/high | sonnet/high | sonnet/high |

### User Confirmation

```
## TDD Work Plan

Framework: vitest (auto-detected)
Mode: natural-language-spec
Work units: 3

### Unit 1: user-registration [code]
Spec: Create user with email validation, bcrypt hashing, duplicate detection
Files: src/__tests__/user-registration.test.ts -> src/user-registration.ts
Dependencies: none
Complexity: Integration (sonnet/high)

### Unit 2: user-login [code]
Spec: Authenticate user, JWT access+refresh tokens, lockout after 5 failed attempts
Files: src/__tests__/user-login.test.ts -> src/user-login.ts
Dependencies: [user-registration]
Complexity: Architecture (opus/high for Test Writer, reviewers)

### Unit 3: password-reset [code]
Spec: Generate reset token, 1-hour expiry, email notification, validate and update
Files: src/__tests__/password-reset.test.ts -> src/password-reset.ts
Dependencies: [user-registration]
Complexity: Architecture (opus/high for Test Writer, reviewers)

Execution plan (eager dispatch, max 4 concurrent):
  Ready immediately: user-registration
  After user-registration: user-login, password-reset (parallel)

Proceed? [confirm/modify/cancel]
```

User confirms.

## Step 9: Phase 3 — State Initialization

1. No existing `.tdd-state.json` — create new.
2. Add state/session/spec-contract files to `.gitignore`.
3. Initialize `tdd-session.jsonl`.
4. Store design summary in state.

## Step 10: Phase 4 — Agent Team Orchestration

### Ready Queue Initialization (Eager Dispatch)

- Build DAG: user-registration -> {user-login, password-reset}
- Ready queue: `[user-registration]` (no deps)
- Dispatch user-registration (1 of max 4 concurrent slots).

---

### UNIT: user-registration (Slot 1)

#### Step 4a: Spawn Test Writer

- Template from `reference/test-writer-prompt.md`.
- Includes: spec-contract, design summary from Phase 0, vitest framework, test file path.
- Model: sonnet/high (Integration complexity).
- Test Writer writes tests covering:
  - Valid registration returns user object with id, email, createdAt
  - Rejects invalid email formats
  - Hashes password (stored value != plaintext)
  - Detects duplicate email
  - Edge cases: empty email, empty password, very long email
- Creates `spec-contract-user-registration.md`.
- Reports **DONE**.
- Lead verifies both files exist on disk.

#### Step 4b: RED Verification

1. Tests exist — PASS.
2. Tests fail — `npx vitest run src/__tests__/user-registration.test.ts` returns non-zero ("Cannot find module"). PASS.
3. Correct failure type — import errors. PASS.
4. Assertion density — multiple expects per test. PASS.
5. Behavior-over-implementation — no excessive mocking, no private method access. PASS.
6. Record checksums.

#### Step 4c: Spawn Code Writer

- Template from `reference/code-writer-prompt.md`.
- Read test file and spec-contract from disk (information barrier enforced).
- Model: sonnet/high.
- Code Writer implements `src/user-registration.ts`: email validation regex, bcrypt hash, in-memory user store (or interface), duplicate check.
- Reports **DONE**.

#### Step 4d: GREEN Verification

1. Checksums match — PASS.
2. No skip/focus markers — PASS.
3. All tests pass — PASS.
4. No hardcoded returns — PASS (heuristic).

#### Step 4e: Spec Compliance Review

- Spawn reviewer (sonnet/high) with spec-contract, design summary, test + impl files.
- Checks: all registration requirements implemented and tested.
- **Verdict: COMPLIANT**.

#### Step 4f: Adversarial Review

- Spawn reviewer (sonnet/high) with spec-contract, test + impl files, scoring rubric.
- Checks: edge cases, no cheating, no coupling, good assertions.
- Reference anti-patterns doc — no mock-heavy testing (registration is self-contained).
- **Verdict: PASS**.

#### Step 4g: Code Quality Review

- Spawn reviewer (sonnet/high) with impl, tests, git diff.
- Checks: single responsibility, clear naming, no overbuilding.
- **Assessment: Approved**.

**user-registration COMPLETED.**

### Eager Dispatch: After user-registration completes

- Check remaining units: user-login depends on [user-registration] — now satisfied. Added to ready queue.
- password-reset depends on [user-registration] — now satisfied. Added to ready queue.
- Ready queue: `[user-login, password-reset]`
- Dispatch both (2 slots, within max 4 cap). **Both run concurrently.**

---

### UNIT: user-login (Slot 1) — runs in parallel with password-reset

#### Step 4a: Spawn Test Writer

- Model: opus/high (Architecture complexity — ambiguous lockout logic, JWT concerns).
- Includes design summary with lockout rules and JWT+refresh decision.
- Test Writer writes tests:
  - Successful login returns access token and refresh token
  - Rejects wrong password
  - Rejects non-existent email
  - Tracks failed attempts
  - Locks account after 5 failures
  - Rejects login on locked account
  - Unlocks after 15 minutes
  - JWT contains correct claims (user id, expiry)
  - Refresh token is different from access token
- Creates `spec-contract-user-login.md`.
- Reports **DONE**.

#### Step 4b: RED Verification

1. Tests exist — PASS.
2. Tests fail — non-zero exit. PASS.
3. Correct failure type — import/module errors. PASS.
4. Assertion density — adequate. PASS.
5. Behavior-over-implementation — check mocking. Login tests may mock a user store; verify mock count is reasonable (< 2x test functions). PASS.
6. Record checksums.

#### Step 4c: Spawn Code Writer

- Model: sonnet/high (Code Writers always sonnet).
- Read test file and spec-contract from disk.
- Implements JWT generation, credential verification, attempt tracking, lockout logic.
- Reports **DONE**.

#### Step 4d: GREEN Verification

1. Checksums match — PASS.
2. No skip markers — PASS.
3. All tests pass — PASS (may take 1-2 retries if JWT timing tests are tricky).
4. No hardcoded returns — PASS.

#### Step 4e: Spec Compliance Review

- Model: opus/high (Architecture).
- Reviewer verifies: lockout after 5 attempts, 15-minute window, JWT expiry times, refresh token behavior — all per design summary.
- **Verdict: COMPLIANT**.

#### Step 4f: Adversarial Review

- Model: opus/high.
- Deep review: can lockout be bypassed? Are JWT secrets hardcoded? Does attempt tracking reset properly? Edge case: exactly 5 attempts. Edge case: login at minute 14:59 of lockout.
- **Verdict: PASS** (or FAIL with specific issues, triggering revision cycle).

#### Step 4g: Code Quality Review

- Model: sonnet/high.
- **Assessment: Approved**.

**user-login COMPLETED.**

---

### UNIT: password-reset (Slot 2) — runs in parallel with user-login

#### Step 4a: Spawn Test Writer

- Model: opus/high (Architecture — crypto tokens, email integration, expiry logic).
- Includes design summary with token expiry (1 hour), email notification requirement.
- Test Writer writes tests:
  - Generates cryptographically random reset token
  - Token has 1-hour expiry
  - Sends email notification with reset link
  - Valid token allows password update
  - Expired token is rejected
  - Used token cannot be reused
  - Non-existent user handled gracefully
  - New password is bcrypt hashed
  - Edge cases: request reset twice, reset with same password
- Creates `spec-contract-password-reset.md`.
- Reports **DONE**.

#### Step 4b: RED Verification

- Standard checks all pass. Email notification tests likely mock the email sender — check mock depth <= maxMockDepth (2). PASS.
- Record checksums.

#### Step 4c: Spawn Code Writer

- Model: sonnet/high.
- Implements token generation (crypto.randomBytes), storage with expiry, email function (interface/mock-ready), password update with bcrypt.
- Reports **DONE**.

#### Step 4d: GREEN Verification

- All checks pass.

#### Step 4e: Spec Compliance Review

- Model: opus/high.
- Verify: 1-hour expiry, token invalidation after use, email notification, bcrypt for new password.
- **Verdict: COMPLIANT**.

#### Step 4f: Adversarial Review

- Model: opus/high.
- Deep review: token predictability, timing attacks, email enumeration, token reuse prevention.
- **Verdict: PASS**.

#### Step 4g: Code Quality Review

- Model: sonnet/high.
- **Assessment: Approved**.

**password-reset COMPLETED.**

---

## Step 11: Phase 5 — Final Review

1. Run FULL test suite: `npx vitest run`. All tests across 3 test files pass.
2. Verify pristine output: no warnings, no skipped, no pending.
3. Holistic review: check that user-login and password-reset correctly interface with user-registration's user store/types.
4. Cross-unit integration: verify login works with registered users, password-reset works with registered users.
5. If integration issues found (e.g., type mismatches between units), fix before proceeding.

## Step 12: Phase 6 — Report Generation

Generate `tdd-report.md`:
- 3/3 units completed
- ~25-30 total tests
- ~30-40 total assertions
- 0 anti-cheat violations
- All reviews passed
- Model assignments recorded per unit

Generate `tdd-session.jsonl` with all events.

## Step 13: Phase 7 — Cleanup

1. Shut down all teammates.
2. Delete `spec-contract-user-registration.md`, `spec-contract-user-login.md`, `spec-contract-password-reset.md`.
3. Final state file update.
4. Present report.
5. Suggest: "Run `npx vitest run` to verify, then commit. Consider adding integration tests for the full auth flow."
