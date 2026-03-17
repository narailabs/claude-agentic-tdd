# TDD Skill Execution Trace: User Authentication System

## Prompt

```
/tdd build a user authentication system with registration (email validation, password hashing, duplicate detection), login (JWT tokens, failed attempt tracking), and password reset (token generation, expiry, email notification)
```

---

## Pre-Phase: Prerequisites and Argument Parsing

### Step 1: Verify Agent Teams Enabled

Claude checks that `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set to `1` in the environment or `.claude/settings.json`. If not set, it halts with:

> Agent teams are required for agentic-tdd. Enable them by adding `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"` to the `env` section of your `.claude/settings.json`, then restart Claude Code.

### Step 2: Verify Git Repository

Claude checks if the current directory is a git repository (needed for diff checks during GREEN verification). If not, it warns but continues.

### Step 3: Parse Arguments

- **Specification text**: "build a user authentication system with registration (email validation, password hashing, duplicate detection), login (JWT tokens, failed attempt tracking), and password reset (token generation, expiry, email notification)"
- **Flags detected**: none (`--skip-failed`, `--config`, `--design`, `--skip-design` are all absent)

### Step 4: Configuration Loading

1. Check for `.tdd.config.json` at project root -- not found (assumed).
2. Check project `CLAUDE.md` for a `## TDD Configuration` section -- not present (the CLAUDE.md is about the plugin itself, not a user project).
3. Apply defaults:
   ```
   antiCheat.minAssertionsPerTest: 1
   antiCheat.maxRetries: 3
   antiCheat.maxMockDepth: 2
   antiCheat.flagPrivateMethodTests: true
   execution.maxParallelPairs: 3
   execution.skipFailedAfterRetries: false
   execution.modelStrategy: "auto"
   reporting.generateReport: true
   reporting.generateSessionLog: true
   ```

### Step 5: Entry Point Detection

The user provided a natural language spec. This is **mode 1: Natural language spec** (default). No existing tests or pre-written test files are referenced.

---

## Phase 0: Design Gate

### Trigger Evaluation

The skill checks whether the design gate should trigger. Trigger conditions (ANY match activates):

| Condition | Applies? | Reason |
|-----------|----------|--------|
| Spec mentions 3+ distinct features/components | **YES** | Registration, login, and password reset are 3 distinct features |
| Spec involves external integrations | **YES** | JWT tokens (crypto), email notification (email service), password hashing (crypto library) |
| Spec is ambiguous about data flow, ownership, or error handling | **YES** | Several ambiguities exist (see below) |
| User passed `--design` flag | No | Not passed |

**Result: Design gate TRIGGERS.** Multiple conditions are met.

### Step 0a: Clarifying Questions (One at a Time)

Claude identifies ambiguities in the spec and asks **1-3 targeted questions**, one at a time. It does NOT dump a questionnaire.

**Question 1:**
> "Should password reset tokens expire? If so, after how long? And should there be a limit on how many active reset tokens a user can have?"

The user has mentioned "expiry" in the spec, so Claude knows tokens expire, but the duration is unspecified. The user responds (e.g., "1 hour, one active token at a time").

**Question 2:**
> "What should happen when login fails multiple times -- should the account be locked after N attempts, should there be a cooldown period, or should it just track the count for auditing?"

The user mentioned "failed attempt tracking" but not the consequence. The user responds (e.g., "Lock the account after 5 failed attempts, unlock after 30 minutes").

**Question 3:**
> "For email notification on password reset, should the system actually send emails (requiring an email service dependency), or should it expose a notification interface that a consumer can plug an email provider into?"

This clarifies the integration boundary. The user responds (e.g., "Use a notification interface -- don't couple to a specific email provider").

### Step 0b: Propose Approaches (Trade-offs)

Claude identifies a genuine trade-off and presents options:

> **Token storage for JWT:**
> - Option A: Stateless JWT only (scalable, but tokens can't be revoked until they expire)
> - Option B: JWT + token blacklist/allowlist (revocable, but needs a store)
> - Option C: Short-lived JWT + refresh tokens (balanced -- short window of vulnerability, refresh tokens can be revoked)

The user selects an option (e.g., Option A: stateless JWT for simplicity).

### Step 0c: Design Summary

Claude presents the design document:

```
## Design Summary

### Components
- UserRegistration: handles account creation with email validation, password hashing (bcrypt), and duplicate email detection
- UserLogin: authenticates users via email/password, issues JWT tokens, tracks failed attempts, locks accounts after 5 failures (30-min auto-unlock)
- PasswordReset: generates time-limited reset tokens (1 hour expiry), validates tokens, updates passwords, notifies via a pluggable notification interface
- UserStore: shared data layer (in-memory or interface-based) for user persistence

### Data Flow
- Registration creates a user record with hashed password in UserStore
- Login reads from UserStore, verifies password, issues JWT
- Password reset generates a token stored alongside the user, validates on submission, updates the password hash

### Key Decisions
- Stateless JWT (no revocation mechanism) -- simplicity over revocability
- Pluggable notification interface rather than concrete email service
- Account lockout after 5 failed attempts with 30-minute auto-unlock
- Password reset tokens: 1 hour expiry, one active token per user
- bcrypt for password hashing

### Out of Scope
- Email verification on registration (accounts active immediately)
- OAuth / social login
- Session management / token refresh
- Rate limiting beyond failed login tracking
- Actual email sending (notification interface only)
```

### Step 0d: User Approval

> "Proceed with this design? [confirm/modify/cancel]"

**HARD GATE**: No decomposition until the user confirms. Assume the user confirms.

The design summary is stored in the state file under `designSummary`.

---

## Phase 1: Framework Detection

Claude follows `reference/framework-detection.md`:

1. Check `.tdd.config.json` for explicit framework config -- not found.
2. Check project CLAUDE.md for test conventions -- not present for the target project.
3. Auto-detect from project files:
   - Run `cat package.json 2>/dev/null` -- if found, check for vitest/jest/mocha in dependencies.
   - Check for `tsconfig.json` to determine TypeScript vs JavaScript.
   - Check for `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.

**Assumed detection result** (typical Node/TypeScript project):

```
framework:
  language: "typescript"
  testRunner: "vitest"
  testCommand: "npx vitest run"
  testFilePattern: "**/*.test.ts"
  sourceDir: "src/"
  testDir: "src/__tests__/"
```

If detection fails, Claude asks the user: "What test command should I use to run tests?"

---

## Phase 2: Work Decomposition

Claude analyzes the specification and the approved design summary. It produces work units:

### Dependency Analysis

Claude examines relationships between components:

1. **UserRegistration** depends on nothing -- it creates users in the store. It defines the user data model and the UserStore interface.
2. **UserLogin** depends on `user-registration` -- it needs to look up users by email and verify hashed passwords. It imports the UserStore and the password hashing function from registration.
3. **PasswordReset** depends on `user-registration` -- it needs to look up users and update their password hashes. It also uses the UserStore interface.
4. **UserLogin** and **PasswordReset** do NOT depend on each other -- they are independent consumers of the registration module.

### Work Units Produced

```
## TDD Work Plan

Framework: vitest (auto-detected)
Mode: natural-language-spec
Work units: 3

### Unit 1: user-registration
Spec: Create user accounts with email format validation (reject invalid emails),
      password hashing (bcrypt, never store plaintext), and duplicate email detection
      (reject registration if email already exists). Returns user object with id,
      email, and createdAt. Exposes UserStore interface and hashPassword utility.
Files: src/__tests__/user-registration.test.ts -> src/user-registration.ts
Dependencies: none
Complexity: standard (multi-file, crypto dependency, shared interface)
Model assignment: sonnet (Test Writer), sonnet (Code Writer), sonnet (Reviewer)

### Unit 2: user-login
Spec: Authenticate user by email/password. On success, return a signed JWT token
      containing userId and email. On failure, increment failed attempt counter.
      After 5 consecutive failures, lock the account for 30 minutes. Return
      appropriate error types for: invalid credentials, account locked, user not found.
Files: src/__tests__/user-login.test.ts -> src/user-login.ts
Dependencies: [user-registration]
Complexity: standard (JWT signing, lockout logic, time-dependent behavior)
Model assignment: sonnet (Test Writer), sonnet (Code Writer), sonnet (Reviewer)

### Unit 3: password-reset
Spec: Generate a cryptographically random reset token for a given email. Store token
      with 1-hour expiry, one active token per user (new request invalidates old token).
      Validate token on submission. On valid token: update password hash, invalidate
      token, call notification interface. On invalid/expired token: return error.
      Notification interface: { notify(email: string, type: string, data: object): void }
Files: src/__tests__/password-reset.test.ts -> src/password-reset.ts
Dependencies: [user-registration]
Complexity: standard (token generation, time-dependent expiry, notification interface)
Model assignment: sonnet (Test Writer), sonnet (Code Writer), sonnet (Reviewer)

Execution plan: Unit 1 first (dependency for Units 2 and 3),
               then Units 2 and 3 in parallel.

Proceed? [confirm/modify/cancel]
```

### User Confirmation

Claude waits for the user to confirm. If the user modifies (e.g., wants to split registration into smaller units, or change file paths), Claude adjusts and re-presents. Assume the user confirms.

---

## Phase 3: State Initialization

### Step 3a: Check for Existing State

```bash
cat .tdd-state.json 2>/dev/null
```

If found: show progress, offer resume/restart/add-units.
If not found: create new state file.

### Step 3b: Gitignore Management

Check `.gitignore` for required entries. If missing, append:

```
# agentic-tdd state and intermediate files
.tdd-state.json
tdd-session.jsonl
spec-contract-*.md
```

### Step 3c: Create State File

Write `.tdd-state.json` with:
- `version: "1.0.0"`
- `sessionId`: new UUID
- `startedAt`: current ISO-8601 timestamp
- `spec`: the original user specification
- `designSummary`: the approved design summary from Phase 0
- `entryPoint`: "natural-language-spec"
- `framework`: detected framework info
- `config`: merged configuration
- `workUnits`: array of 3 units, all with `status: "pending"`
- `summary`: initialized counters

### Step 3d: Initialize Session Log

Create `tdd-session.jsonl` with first event:

```json
{"timestamp":"2026-03-17T...","event":"session.start","unitId":null,"data":{"spec":"build a user authentication system...","entryPoint":"natural-language-spec","framework":{"language":"typescript","testRunner":"vitest"}}}
```

Log decomposition event:

```json
{"timestamp":"...","event":"decomposition.complete","unitId":null,"data":{"units":[{"id":"user-registration","name":"User Registration","dependsOn":[]},{"id":"user-login","name":"User Login","dependsOn":["user-registration"]},{"id":"password-reset","name":"Password Reset","dependsOn":["user-registration"]}]}}
```

Log user confirmation:

```json
{"timestamp":"...","event":"user.confirmed","unitId":null,"data":{"unitCount":3}}
```

---

## Phase 4: Agent Team Orchestration

Claude (the Team Manager) creates an agent team and begins the execution loop.

### Execution Order Based on Dependency Graph

```
Level 0: user-registration (no dependencies)
Level 1: user-login, password-reset (both depend only on user-registration)
```

**Execution plan:**
1. Run `user-registration` first (alone).
2. Once `user-registration` completes, run `user-login` and `password-reset` in parallel (up to `maxParallelPairs: 3`, and we only need 2).

---

### UNIT 1: user-registration (Sequential -- runs first)

#### Step 4a: Spawn Test Writer

Update state: `user-registration.status = "test-writing"`

Log event: `test-writer.spawned` with `unitId: "user-registration"`, `attempt: 1`

Claude spawns a Test Writer teammate with a prompt built from `reference/test-writer-prompt.md`:

**Prompt contents:**
- Spec-contract for `user-registration` ONLY:
  > Create user accounts with email format validation (reject invalid emails), password hashing (bcrypt, never store plaintext), and duplicate email detection (reject registration if email already exists). Returns user object with id, email, and createdAt. Exposes UserStore interface and hashPassword utility.
- Framework info: TypeScript, Vitest, `npx vitest run`
- Target test file: `src/__tests__/user-registration.test.ts`
- Project conventions (from CLAUDE.md if any)
- Minimum assertions per test: 1
- Unit ID: `user-registration`
- Design summary from Phase 0 (passed alongside spec-contract)

**Expected Test Writer output:**
The Test Writer creates two files:
1. `src/__tests__/user-registration.test.ts` -- containing tests like:
   - `describe('registerUser')`:
     - "should create a user with valid email and password"
     - "should return user object with id, email, and createdAt"
     - "should hash the password (not store plaintext)"
     - "should reject invalid email formats" (multiple cases)
     - "should reject duplicate email addresses"
     - "should reject empty/missing email"
     - "should reject empty/missing password"
   - `describe('hashPassword')`:
     - "should return a hash different from the input"
     - "should produce different hashes for different passwords"
     - "should produce consistent verification (bcrypt compare)"

2. `src/__tests__/spec-contract-user-registration.md` -- machine-readable spec-contract artifact

Claude verifies both files exist on disk. If either is missing, re-prompts the Test Writer.

Log event: `test-writer.completed` with `unitId: "user-registration"`

#### Step 4b: RED Verification

Update state: `user-registration.status = "red-verification"`

Log event: `red.verification.start`

**Check 1: Tests Exist**
```bash
test -f "src/__tests__/user-registration.test.ts"
```
Pass -- file exists.

**Check 2: Tests Fail (RED Phase)**
```bash
npx vitest run src/__tests__/user-registration.test.ts 2>&1; echo "EXIT_CODE:$?"
```
Expected: exit code != 0. Tests fail because `src/user-registration.ts` does not exist.
Failure messages like: "Cannot find module '../user-registration'"

If tests PASS (exit code 0) -> ANTI-CHEAT VIOLATION. Re-prompt: "Your tests pass without any implementation. This means they test nothing meaningful. Rewrite them to test actual behavior that requires implementation code."

**Check 3: Correct Failure Type**
Parse output for acceptable failures:
- "Cannot find module" -- ACCEPTABLE
- "is not a function" -- ACCEPTABLE
- SyntaxError in test file -- UNACCEPTABLE (re-prompt Test Writer)

**Check 4: Assertion Density**
Read `src/__tests__/user-registration.test.ts`. Count assertion patterns (`expect(`, `.toBe(`, `.toEqual(`, `.toThrow(`, etc.) per test function. Must be >= 1 per test.

Exclude trivial assertions: `expect(true).toBe(true)`, `expect(x).toBeDefined()` as sole assertion.

**Check 5: Behavior-Over-Implementation**
Scan for anti-patterns:
- Excessive mocking (mocks > 2x test functions) -- likely clean for this unit
- Private method testing (`obj._private`) -- should not be present
- Implementation mirroring -- should not be present

All checks pass.

**Record Checksums:**
```bash
shasum -a 256 "src/__tests__/user-registration.test.ts" | cut -d' ' -f1
```
Store checksum in state file under `redVerification.testFileChecksums`.

Log event: `red.verification.passed` with failure count and assertion count.

#### Step 4c: Spawn Code Writer

Update state: `user-registration.status = "code-writing"`

Log event: `code-writer.spawned` with `unitId: "user-registration"`, `attempt: 1`

Claude reads from disk (NOT from Test Writer output -- information barrier):
1. `src/__tests__/user-registration.test.ts` -- test file contents
2. `src/__tests__/spec-contract-user-registration.md` -- spec-contract contents

**Lead Verification Checklist** (before spawning):
- [x] Prompt contains test file contents read from DISK
- [x] Prompt contains spec-contract read from DISK
- [x] Prompt does NOT contain any Test Writer prompt text
- [x] Prompt does NOT contain "Test Writer", "Agent A", or references to test authoring
- [x] Test file checksums have been recorded

Claude spawns a Code Writer teammate with the prompt from `reference/code-writer-prompt.md`:
- Test file contents (verbatim from disk)
- Spec-contract contents (from disk)
- Framework info
- Implementation file: `src/user-registration.ts`
- Rules: no modifying tests, no skip markers, minimum implementation, no hardcoding

**Expected Code Writer output:**
Creates `src/user-registration.ts` with:
- `registerUser(email, password, store)` function
- Email validation (regex or library)
- Password hashing with bcrypt
- Duplicate detection via store lookup
- UserStore interface definition
- Proper error handling and types

Log event: `code-writer.completed`

#### Step 4d: GREEN Verification

Update state: `user-registration.status = "green-verification"`

Log event: `green.verification.start`

**Check 1: Test Files Unchanged**
```bash
shasum -a 256 "src/__tests__/user-registration.test.ts" | cut -d' ' -f1
```
Compare against stored checksum. Must match exactly.

If mismatch -> ANTI-CHEAT VIOLATION. Discard Code Writer changes (`git checkout` the test files), re-prompt: "You modified test files, which is forbidden."

**Check 2: No Skip/Focus Markers Added**
```bash
grep -n 'xit\b\|xdescribe\b\|\.skip\b\|\.only\b\|fdescribe\b\|fit\b' "src/__tests__/user-registration.test.ts"
```
No new matches expected.

**Check 3: All Tests Pass**
```bash
npx vitest run src/__tests__/user-registration.test.ts 2>&1; echo "EXIT_CODE:$?"
```
Expected: exit code == 0, all tests pass.

If tests fail: re-prompt Code Writer with failure output (up to 3 retries).

**Check 4: No Hardcoded Returns (Heuristic)**
Read `src/user-registration.ts`. Look for functions consisting only of `return [literal]`. Flag in report if suspicious but don't block.

Log event: `green.verification.passed`

#### Step 4e: Spec Compliance Review

Update state: `user-registration.status = "spec-review"`

Log event: `spec-review.spawned`

Claude reads from disk:
- `spec-contract-user-registration.md`
- Design summary from state file
- `src/__tests__/user-registration.test.ts`
- `src/user-registration.ts`

Spawns a Spec Compliance Reviewer teammate with the template from `reference/spec-compliance-reviewer-prompt.md`.

**Reviewer checks:**
1. Requirement coverage -- every spec requirement (email validation, password hashing, duplicate detection, user object shape) is implemented and tested
2. Missing requirements -- e.g., "Does the UserStore interface export what login and password-reset will need?"
3. Scope creep -- no extra features beyond spec
4. API contract accuracy -- function signatures match spec
5. Integration readiness -- does it export the interfaces that `user-login` and `password-reset` will import?

**Expected verdict: COMPLIANT** (assuming the Code Writer did a good job)

If NON-COMPLIANT: send pair back for revision. Test Writer adds missing tests, then Code Writer re-implements.

Log event: `spec-review.compliant`

#### Step 4f: Adversarial Review

Update state: `user-registration.status = "adversarial-review"`

Log event: `adversarial.spawned`

Claude reads from disk and spawns an Adversarial Reviewer with the template from `reference/adversarial-reviewer-prompt.md`.

**Reviewer checks (per the checklist):**
1. Test completeness -- edge cases for email validation (unicode, very long emails, SQL injection attempts), password edge cases (empty string, very long password, unicode)
2. Test quality -- meaningful assertions, independent tests, good naming
3. Implementation quality -- follows spec, minimal code, proper error handling
4. Cheating detection -- no hardcoded returns, no test-aware code, no shallow implementations
5. Coverage gaps -- all conditional branches tested?

**Also checks for the 5 anti-patterns from `testing-anti-patterns.md`:**
1. Testing Mock Behavior -- are mocks used only where necessary?
2. Test-Only Methods -- no `_resetForTesting()` in production code?
3. Mocking Without Understanding -- side effects replicated?
4. Incomplete Mocks -- mock objects have all needed fields?
5. Integration Tests as Afterthought -- adequate real testing?

**Expected verdict: PASS** (with possible minor recommendations)

If FAIL with critical issues: send pair back for revision. Test Writer rewrites tests addressing gaps, then Code Writer re-implements.

Log event: `adversarial.passed`

**Mark unit as completed:**
Update state: `user-registration.status = "completed"`

Log event: `unit.completed` with `unitId: "user-registration"`

---

### UNITS 2 AND 3: user-login AND password-reset (Parallel)

Both units depend only on `user-registration`, which is now complete. `maxParallelPairs` is 3, and we need 2 slots. Both pipelines launch simultaneously.

**Claude spawns two Test Writers in parallel.**

---

### UNIT 2: user-login (Pipeline A)

#### Step 4a: Spawn Test Writer

Update state: `user-login.status = "test-writing"`

Spec-contract for this unit:
> Authenticate user by email/password. On success, return a signed JWT token containing userId and email. On failure, increment failed attempt counter. After 5 consecutive failures, lock the account for 30 minutes. Return appropriate error types for: invalid credentials, account locked, user not found.

The prompt also includes the design summary from Phase 0.

**Expected tests:**
- `describe('loginUser')`:
  - "should return JWT token on valid credentials"
  - "should include userId and email in JWT payload"
  - "should throw InvalidCredentialsError for wrong password"
  - "should throw UserNotFoundError for non-existent email"
  - "should increment failed attempt counter on failed login"
  - "should lock account after 5 consecutive failed attempts"
  - "should throw AccountLockedError when account is locked"
  - "should auto-unlock account after 30 minutes"
  - "should reset failed attempt counter on successful login"
  - "should reject empty email"
  - "should reject empty password"

Also creates `src/__tests__/spec-contract-user-login.md`.

#### Steps 4b-4f: Same Pipeline as Unit 1

- **RED verification**: Tests fail because `src/user-login.ts` doesn't exist. Checksum recorded.
- **Code Writer**: Receives test file and spec-contract from disk. Creates `src/user-login.ts` with login function, JWT signing, attempt tracking, lockout logic.
- **GREEN verification**: Checksums match, no skip markers, all tests pass.
- **Spec compliance review**: All requirements covered, integration readiness confirmed (imports from user-registration work correctly).
- **Adversarial review**: Checks time-dependent tests (lockout window), JWT token structure, edge cases.

---

### UNIT 3: password-reset (Pipeline B -- runs in parallel with Pipeline A)

#### Step 4a: Spawn Test Writer

Update state: `password-reset.status = "test-writing"`

Spec-contract for this unit:
> Generate a cryptographically random reset token for a given email. Store token with 1-hour expiry, one active token per user (new request invalidates old token). Validate token on submission. On valid token: update password hash, invalidate token, call notification interface. On invalid/expired token: return error. Notification interface: `{ notify(email: string, type: string, data: object): void }`

**Expected tests:**
- `describe('requestPasswordReset')`:
  - "should generate a reset token for a valid user"
  - "should throw UserNotFoundError for non-existent email"
  - "should invalidate previous token when new one is requested"
  - "should generate cryptographically random tokens"
- `describe('resetPassword')`:
  - "should update password hash with valid token"
  - "should invalidate the token after use"
  - "should call notification interface on successful reset"
  - "should throw InvalidTokenError for non-existent token"
  - "should throw ExpiredTokenError for expired token (>1 hour)"
  - "should reject empty new password"
  - "should hash the new password (not store plaintext)"
- `describe('notification interface')`:
  - "should call notify with email, type='password-reset', and relevant data"

Also creates `src/__tests__/spec-contract-password-reset.md`.

#### Steps 4b-4f: Same Pipeline as Unit 1

- **RED verification**: Tests fail because `src/password-reset.ts` doesn't exist.
- **Code Writer**: Creates `src/password-reset.ts` with token generation, storage, validation, expiry checking, notification dispatch.
- **GREEN verification**: All tests pass, no cheating detected.
- **Spec compliance review**: Confirms notification interface matches spec, token expiry implemented correctly.
- **Adversarial review**: Checks time-dependent behavior (expiry), token randomness, notification interface contract.

---

### Parallel Execution Timeline

```
Time ---->

[user-registration: TW -> RED -> CW -> GREEN -> SpecReview -> AdvReview -> DONE]
                                                                                  |
        [user-login:     TW -> RED -> CW -> GREEN -> SpecReview -> AdvReview -> DONE]
        [password-reset: TW -> RED -> CW -> GREEN -> SpecReview -> AdvReview -> DONE]
```

Where:
- TW = Test Writer
- RED = RED verification
- CW = Code Writer
- GREEN = GREEN verification
- SpecReview = Spec Compliance Review
- AdvReview = Adversarial Review

The two Level-1 pipelines run concurrently. Each pipeline proceeds independently through its stages. The Team Manager tracks both pipelines in the state file.

---

## Phase 5: Final Review -- Integration Check

**IRON LAW**: No completion claim without fresh verification evidence.

### Step 5a: Run Full Test Suite

```bash
npx vitest run 2>&1; echo "EXIT_CODE:$?"
```

This runs ALL test files together:
- `src/__tests__/user-registration.test.ts`
- `src/__tests__/user-login.test.ts`
- `src/__tests__/password-reset.test.ts`

Claude reads the actual output. It does NOT assume success.

### Step 5b: Verify Pristine Output

Check for:
- All tests pass (exit code 0)
- No warnings
- No skipped tests
- No pending tests

If the test runner reports anything other than clean green, investigate.

### Step 5c: Holistic Code Review

Claude reviews all generated code together, looking for:
- **Naming conflicts**: Do all three modules use consistent naming for shared types (User, UserStore, etc.)?
- **Import compatibility**: Does `user-login.ts` correctly import from `user-registration.ts`? Does `password-reset.ts`?
- **Interface consistency**: Does the UserStore interface used by login and password-reset match what registration exports?
- **Type compatibility**: Are user objects returned by registration compatible with what login and password-reset expect?

### Step 5d: Cross-Unit Integration Check

Specific integration concerns for this auth system:

1. **Registration -> Login flow**: Can a user registered via `registerUser()` actually log in via `loginUser()` using the same store? Is the password hash format compatible between registration (bcrypt hash) and login (bcrypt compare)?

2. **Registration -> Password Reset flow**: Can a registered user request a password reset? After reset, can they log in with the new password?

3. **Login lockout -> Password Reset**: If an account is locked due to failed login attempts, can the user still reset their password? (This is an integration edge case the design may not have addressed.)

If integration issues are found: Claude reports them with evidence (actual test output) and fixes before proceeding. This may involve:
- Adding integration test cases
- Fixing import paths
- Resolving type mismatches

### Step 5e: Verification Anti-Rationalization

Claude explicitly rejects any self-rationalization:
- Does NOT say "tests should pass now" -- it RUNS them
- Does NOT say "I'm confident this works" -- it verifies with output
- Does NOT skip re-running after "obvious" fixes

---

## Phase 6: Report Generation

### tdd-report.md

Claude generates the report following `reference/report-format.md`:

```markdown
# TDD Session Report

**Date**: 2026-03-17T[timestamp]Z
**Specification**: build a user authentication system with registration (email validation,
password hashing, duplicate detection), login (JWT tokens, failed attempt tracking), and
password reset (token generation, expiry, email notification)
**Framework**: TypeScript / Vitest
**Entry Point**: natural-language-spec

## Summary

| Metric | Value |
|--------|-------|
| Work units | 3/3 |
| Tests written | ~30 |
| Assertions | ~45+ |
| Anti-cheat violations | 0 |
| Adversarial reviews | 3/3 passed |
| Retries | 0 |

## Work Units

### User Registration -- completed

**Spec**: Create user accounts with email validation, password hashing, duplicate detection

| Phase | Status | Attempts | Notes |
|-------|--------|----------|-------|
| Test Writer | completed | 1 | -- |
| RED Verification | passed | -- | X failures, Y assertions |
| Code Writer | completed | 1 | -- |
| GREEN Verification | passed | -- | all tests pass |
| Spec Compliance | compliant | -- | N/N requirements covered |
| Adversarial Review | passed | -- | -- |

**Files created**:
- Tests: src/__tests__/user-registration.test.ts
- Implementation: src/user-registration.ts

### User Login -- completed
[similar structure]

### Password Reset -- completed
[similar structure]

## Anti-Cheat Log

No violations encountered.

## Final Integration Check

- All tests passing: yes
- Integration issues found: none (or list if any were found and fixed)

## Recommendations

- Consider adding integration tests for the full registration -> login -> password reset flow
- Consider adding rate limiting for password reset requests
- JWT secret should be configurable via environment variable
```

### tdd-session.jsonl

Appends final events:

```json
{"timestamp":"...","event":"integration.check","unitId":null,"data":{"passed":true,"totalTests":30,"failures":0}}
{"timestamp":"...","event":"session.complete","unitId":null,"data":{"summary":{"totalUnits":3,"completedUnits":3,"failedUnits":0,"totalTests":30,"totalAssertions":45,"antiCheatViolations":0}}}
```

---

## Phase 7: Cleanup

### Step 7a: Clean Up Agent Team

Shut down any remaining teammates (all should be done by now).

### Step 7b: Remove Intermediate Artifacts

Delete all `spec-contract-*.md` files:
- `src/__tests__/spec-contract-user-registration.md`
- `src/__tests__/spec-contract-user-login.md`
- `src/__tests__/spec-contract-password-reset.md`

### Step 7c: Final State File Update

Update `.tdd-state.json` with final status.

### Step 7d: Present Report

Claude presents the report to the user with a summary of what was built.

### Step 7e: Suggest Next Steps

> Session complete. 3/3 work units passed all verification.
>
> Files created:
> - `src/user-registration.ts` (with tests)
> - `src/user-login.ts` (with tests)
> - `src/password-reset.ts` (with tests)
>
> Suggested next steps:
> 1. Run the full test suite: `npx vitest run`
> 2. Review the generated code
> 3. Commit the changes
> 4. Consider adding end-to-end integration tests for the full auth flow

---

## Key Behavioral Notes

### Design Gate Behavior
The Design Gate triggered because ALL three trigger conditions were met (3+ features, external integrations, ambiguous data flow). The questions were targeted and asked one at a time -- not dumped as a questionnaire. The design summary explicitly documented what was out of scope, preventing scope creep during implementation.

### Dependency Handling
The decomposition correctly identified that `user-login` and `password-reset` both depend on `user-registration` but NOT on each other. This created a two-level dependency graph enabling parallelism after the first unit completes.

### Parallel Execution
After `user-registration` completed (including all 6 sub-steps), both `user-login` and `password-reset` launched simultaneously. Each ran its full TW -> RED -> CW -> GREEN -> SpecReview -> AdvReview pipeline independently. The `maxParallelPairs: 3` config allowed both to run (only 2 needed).

### Information Barrier
For each Code Writer spawn, the Team Manager read test files and spec-contracts from DISK -- never passing Test Writer output directly. The Code Writer never saw the Test Writer's prompt, reasoning, or approach. This ensures the implementation is genuinely driven by the tests, not by shared knowledge of how the tests were designed.

### Anti-Cheat Enforcement
Every unit went through:
1. RED verification (tests must fail without implementation)
2. Checksum recording of test files
3. GREEN verification (test checksums must match, no skip markers, all tests pass)
4. Spec compliance review (requirements coverage)
5. Adversarial review (cheating detection, anti-pattern scanning)

### Final Integration Check
The full test suite was run after all units completed. Cross-unit compatibility was verified (shared UserStore interface, password hash compatibility, import paths). No "should work" rationalizations were accepted -- only actual test output.
