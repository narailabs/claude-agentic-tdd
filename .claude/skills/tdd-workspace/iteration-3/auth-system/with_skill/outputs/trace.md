# Execution Trace: /tdd build a user authentication system

**Spec**: build a user authentication system with registration (email validation, password hashing, duplicate detection), login (JWT tokens, failed attempt tracking), and password reset (token generation, expiry, email notification)

**Entry Point Mode**: Mode 1 (Natural Language Spec)

---

## Prerequisites Check

1. **Agent teams**: Verify `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set in environment or `.claude/settings.json`. If not set, display:
   > Agent teams are required for agentic-tdd. Enable them by adding `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"` to the `env` section of your `.claude/settings.json`, then restart Claude Code.

2. **Git repository**: Verify current directory is a git repo (needed for diff checks during GREEN verification). If not, warn but continue.

**Result**: Both prerequisites pass. Proceed.

---

## Argument Parsing

- **Specification text**: "build a user authentication system with registration (email validation, password hashing, duplicate detection), login (JWT tokens, failed attempt tracking), and password reset (token generation, expiry, email notification)"
- **Flags**: None (`--skip-failed`, `--config`, `--design`, `--skip-design` all absent)

---

## Configuration Loading

1. Check for `.tdd.config.json` at project root. Not found.
2. Check project `CLAUDE.md` for `## TDD Configuration` section. Not found.
3. Apply defaults:
   ```
   antiCheat.minAssertionsPerTest: 1
   antiCheat.maxRetries: 3
   antiCheat.maxMockDepth: 2
   antiCheat.flagPrivateMethodTests: true
   execution.maxParallelPairs: 3
   execution.parallelMode: "auto"
   execution.skipFailedAfterRetries: false
   execution.modelStrategy: "auto"
   reporting.generateReport: true
   reporting.generateSessionLog: true
   ```

---

## Entry Point Detection

The user provided a natural language description. This is **Mode 1: Natural Language Spec** (default). All work units will be type `"code"`.

---

## PHASE 0: DESIGN GATE (Triggered)

### Trigger Evaluation

The design gate trigger conditions are checked:

| Condition | Evaluation |
|-----------|-----------|
| Spec mentions 3+ distinct features/components | **YES** - registration, login, password reset = 3 distinct features |
| External integrations (APIs, databases, auth providers) | **YES** - JWT tokens, email notification, password hashing imply external dependencies |
| Ambiguous about data flow, ownership, or error handling | **YES** - How do failed attempts interact with account lockout? Does password reset invalidate existing JWT tokens? Is email notification synchronous or async? |
| User passed `--design` flag | No |

**Decision**: At least 3 trigger conditions are met. The design gate FIRES.

### Step 1: Clarifying Questions (asked one at a time)

**Question 1**: "Should password reset tokens expire? If so, after how long?"

> This is asked because the spec says "expiry" but does not specify the duration. The answer affects token storage strategy (short-lived tokens can be in-memory; long-lived ones need persistent storage) and security posture.

*User responds*: e.g., "Yes, 1 hour expiry."

**Question 2**: "What should happen after multiple failed login attempts -- account lockout, CAPTCHA, rate limiting, or just logging?"

> The spec mentions "failed attempt tracking" but not the consequence. This determines whether the login module needs a lockout state machine, an external CAPTCHA service integration, or just a counter.

*User responds*: e.g., "Lock the account after 5 failed attempts for 15 minutes."

**Question 3**: "Should password reset email notification be sent synchronously (blocking the API response) or queued asynchronously?"

> This determines whether the password-reset module has a hard dependency on an email service or just enqueues a message. It affects error handling (what if email fails?) and the API response contract.

*User responds*: e.g., "Async -- queue the email and return immediately."

### Step 2: Propose Approaches (Mandatory Trade-Off Presentation)

The skill identifies at least one key architectural decision with 2-3 options, pros, and cons. This step is NEVER skipped for specs that trigger the design gate.

**Trade-off: Token Strategy for Authentication**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Stateless JWT** | JWT access tokens with no server-side session store | Scalable, no DB lookups on every request, works across microservices | Cannot revoke individual tokens, must wait for expiry. Logout is "fake" (client deletes token but it remains valid). Password reset cannot invalidate existing sessions. |
| **B: JWT + Refresh Token + Blacklist** | Short-lived JWT access tokens (15 min) + longer-lived refresh tokens stored server-side | Tokens are effectively revocable via refresh token invalidation, password reset can invalidate all sessions by revoking refresh tokens | Needs server-side storage for refresh tokens and blacklist, more complex implementation |
| **C: Session-based auth** | Server-side session store (Redis/DB), session ID in cookie | True revocation, simple mental model, password reset trivially kills all sessions | Requires session store infrastructure, less suitable for API-first/mobile clients, harder to scale horizontally |

*User selects*: e.g., Option B.

**Trade-off: Password Hashing Algorithm**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: bcrypt** | Industry standard, tunable work factor | Mature, widely supported, well-understood security properties | CPU-bound, no memory-hardness (vulnerable to ASIC attacks at scale) |
| **B: argon2** | Winner of Password Hashing Competition, memory-hard | Resistant to GPU/ASIC attacks, tunable memory and time parameters | Less library support in some ecosystems, newer (less battle-tested in production) |

*User selects*: e.g., Option A (bcrypt).

### Step 3: Design Summary

```
## Design Summary

### Components
- UserRegistration: email validation (format + uniqueness check), password hashing (bcrypt), user persistence
- UserLogin: credential verification, JWT access token generation (15 min expiry), refresh token generation and storage, failed attempt tracking with account lockout (5 attempts / 15 min lockout)
- PasswordReset: reset token generation (crypto-random), token storage with 1-hour TTL, token validation, password update, async email notification (queued)

### Data Flow
- Registration: client -> validate email -> check duplicate -> hash password -> store user -> return user (sans password)
- Login: client -> find user by email -> check lockout status -> verify password -> generate JWT + refresh token -> store refresh token -> return tokens
- Password Reset (request): client -> find user by email -> generate reset token -> store token with expiry -> queue email notification -> return success
- Password Reset (execute): client -> validate reset token + check expiry -> hash new password -> update user -> invalidate all refresh tokens for user -> delete reset token -> return success

### Key Decisions
- JWT + refresh token strategy: revocable sessions, short-lived access tokens (15 min)
- bcrypt for password hashing: mature, well-supported
- Account lockout: 5 failed attempts triggers 15-minute lockout
- Async email: password reset queues email notification, does not block response
- Password reset invalidates all existing sessions (revokes refresh tokens)

### Out of Scope
- Email verification on registration (accounts are active immediately)
- OAuth/social login
- Multi-factor authentication
- Role-based access control
- Rate limiting beyond failed login tracking
```

### Step 4: User Approval

Present: "Proceed with this design? [confirm/modify/cancel]"

**HARD GATE**: No decomposition (Phase 2) until the user confirms. If modified, iterate. If cancelled, stop entirely.

*User responds*: "confirm"

**Result**: Design summary is stored in state file under `designSummary`. It will be passed to the Test Writer alongside each work unit's spec-contract.

---

## PHASE 1: FRAMEWORK DETECTION

Following `reference/framework-detection.md`, the detection algorithm runs:

1. **Check `.tdd.config.json`**: Not found.
2. **Check project CLAUDE.md**: No `## TDD Configuration` section.
3. **Auto-detect from project files**:
   - Check for `package.json`: If found, scan `dependencies` and `devDependencies` for `vitest`, `jest`, `mocha`, etc.
   - Check for `tsconfig.json` or `.ts` files to determine TypeScript vs JavaScript.
   - If `scripts.test` is defined in `package.json`, prefer it as the test command.
   - If no `package.json`, check `pyproject.toml`, `go.mod`, `Cargo.toml`, etc. in order.
4. **Fallback**: If nothing detected, ask user: "What is your test command?"

**Hypothetical result** (assuming a TypeScript/Vitest project):
```
framework:
  language: "typescript"
  testRunner: "vitest"
  testCommand: "npx vitest run"
  testFilePattern: "**/*.test.ts"
  sourceDir: "src/"
  testDir: "src/__tests__/"
```

---

## PHASE 2: WORK DECOMPOSITION

### Dependency Analysis

The skill analyzes the spec for inter-unit dependencies:

- **user-registration**: Independent. No dependencies on other units. Produces the user model and creation logic that other units need.
- **user-login**: Depends on `user-registration`. Login needs a registered user to authenticate against. Imports user lookup and password verification that registration establishes.
- **password-reset**: Depends on `user-registration`. Password reset needs an existing user to reset the password for. Also needs the password hashing function from registration. Additionally, per the design decision, password reset invalidates refresh tokens, which creates a dependency on the token storage interface established by login. However, password-reset and user-login are independent of each other at the interface level (both depend on user-registration, not on each other). The token invalidation can be modeled as a shared interface.

**Decision**: `user-login` and `password-reset` both depend on `user-registration` but NOT on each other. They can execute in parallel in Batch 2.

### Model Assignment (Auto Strategy)

Per `execution.modelStrategy: "auto"`, each unit is assessed for complexity:

| Unit | Complexity | Rationale | Test Writer | Code Writer | Reviewers |
|------|-----------|-----------|-------------|-------------|-----------|
| user-registration | standard | Multi-concern (validation, hashing, duplicate check), but well-defined spec, 1-2 files | sonnet | sonnet | sonnet |
| user-login | standard | Multi-concern (credential check, JWT, failed attempts, lockout), integration with user store | sonnet | sonnet | sonnet |
| password-reset | standard | Multi-concern (token gen, expiry, email queue, session invalidation), integration with user store and token store | sonnet | sonnet | sonnet |

All units involve multi-file coordination and integration concerns, so they are "standard" complexity -- sonnet for all agents.

### Work Plan Presentation

```
## TDD Work Plan

Framework: vitest (auto-detected)
Mode: natural-language-spec
Parallel: auto (max 3 concurrent)
Work units: 3

### Unit 1: user-registration [code]
Spec: Create user with email format validation, bcrypt password hashing, and
      duplicate email detection. Return user object without password hash.
Files: src/__tests__/user-registration.test.ts -> src/user-registration.ts
Dependencies: none

### Unit 2: user-login [code]
Spec: Authenticate user with email/password, return JWT access token (15 min)
      and refresh token. Track failed attempts, lock account after 5 failures
      for 15 minutes.
Files: src/__tests__/user-login.test.ts -> src/user-login.ts
Dependencies: [user-registration]

### Unit 3: password-reset [code]
Spec: Generate crypto-random reset token with 1-hour TTL, validate token on
      reset execution, update password (bcrypt), invalidate all refresh tokens,
      queue async email notification.
Files: src/__tests__/password-reset.test.ts -> src/password-reset.ts
Dependencies: [user-registration]

Execution plan:
  Batch 1: user-registration
  Batch 2 (parallel): user-login, password-reset

Proceed? [confirm/modify/cancel]
```

*User responds*: "confirm"

---

## PHASE 3: STATE INITIALIZATION

1. **Check for existing `.tdd-state.json`**: Not found. Create new.
2. **Gitignore management**: Check `.gitignore` for entries. Add if missing:
   ```
   # agentic-tdd state and intermediate files
   .tdd-state.json
   tdd-session.jsonl
   spec-contract-*.md
   ```
3. **Initialize state file**: Create `.tdd-state.json` with:
   - `version: "1.0.0"`, new `sessionId` (UUID v4), timestamps
   - `spec`: the original user specification text
   - `designSummary`: the approved design summary from Phase 0
   - `entryPoint: "natural-language-spec"`
   - `framework`: the detected framework info
   - `config`: the merged configuration
   - `workUnits`: 3 units, all status `"pending"`
4. **Initialize session log**: Create `tdd-session.jsonl`, write `session.start` event.

---

## PHASE 4: AGENT TEAM ORCHESTRATION

### BATCH 1: user-registration

#### Step 4a: Spawn Test Writer (user-registration)

The lead reads `reference/test-writer-prompt.md` and fills the template with:
- `{spec_contract}`: "Create user with email format validation, bcrypt password hashing, and duplicate email detection. Return user object without password hash. Inputs: email (string), password (string). Outputs: user object {id, email, createdAt}. Errors: invalid email format, duplicate email, weak password."
- `{language}`: "typescript"
- `{test_runner}`: "vitest"
- `{test_command}`: "npx vitest run"
- `{test_file_paths}`: "src/__tests__/user-registration.test.ts"
- `{project_conventions_from_claude_md}`: From project CLAUDE.md or "No specific conventions."
- `{min_assertions}`: 1
- `{unit_id}`: "user-registration"
- The approved design summary is included alongside the spec-contract.

The Test Writer is spawned as a teammate. It writes:
- `src/__tests__/user-registration.test.ts` -- test file with describe blocks for:
  - Email validation (valid format passes, invalid format throws)
  - Password hashing (password is hashed, not stored in plaintext)
  - Duplicate detection (second registration with same email throws)
  - Return value shape (user object has id, email, createdAt; no password)
  - Edge cases (empty email, empty password, null inputs)
- `src/__tests__/spec-contract-user-registration.md` -- machine-readable spec contract

The lead verifies BOTH files exist on disk. If either is missing, re-prompt the Test Writer.

**State update**: `workUnits[0].status = "test-writing"` -> then `"red-verification"` after Test Writer completes.

#### Step 4b: RED Verification (user-registration)

Following `reference/anti-cheat.md`, Mode 1 (Standard RED):

**Check 1: Tests Exist**
```bash
test -f "src/__tests__/user-registration.test.ts"
```
Result: File exists. PASS.

**Check 2: Tests Fail (RED Phase)**
```bash
npx vitest run src/__tests__/user-registration.test.ts 2>&1; echo "EXIT_CODE:$?"
```
Expected: Exit code != 0 (tests fail because `src/user-registration.ts` does not exist).
- If exit code == 0: ANTI-CHEAT VIOLATION -- tests are tautological. Re-prompt Test Writer: "Your tests pass without any implementation. This means they test nothing meaningful. Rewrite them to test actual behavior that requires implementation code."
- If exit code != 0: PASS. Proceed.

**Check 3: Correct Failure Type**
Parse test output. Expected failures:
- "Cannot find module '../user-registration'" or "Module not found"
- NOT: "SyntaxError" in the test file itself, NOT: test framework config errors

If failures are syntax errors in the test: Re-prompt Test Writer with error output.

**Check 4: Assertion Density**
Read `src/__tests__/user-registration.test.ts`. Count assertion patterns (`expect(`, `.toBe(`, `.toEqual(`, `.toThrow(`, etc.) per test function.
- Total assertions / total test functions >= `minAssertionsPerTest` (1).
- Exclude trivial assertions: `expect(true).toBe(true)`, `toBeDefined()` as sole assertion.
- If below threshold: Re-prompt with assertion density feedback.

**Check 5: Behavior-Over-Implementation**
Scan for anti-patterns:
- Excessive mocking: Count mock/spy/stub declarations. If mocks > 2x test functions, flag.
- Private method testing: Check for `._privateMethod`, `.__private`, internal state assertions.
- Implementation mirroring: Tests naming internal helper functions.
- If flagged (per `antiCheat.flagPrivateMethodTests: true`): Re-prompt with behavior feedback.

**Record Checksums**
```bash
shasum -a 256 "src/__tests__/user-registration.test.ts" | cut -d' ' -f1
```
Store checksum in state file under `redVerification.testFileChecksums`.

**State update**: `workUnits[0].redVerification.status = "passed"`, record `failureCount`, `assertionCount`.

#### Step 4c: Spawn Code Writer (user-registration)

The lead reads `reference/code-writer-prompt.md` and fills the template.

**CRITICAL -- Information Barrier Enforcement**:
The lead reads the test file from DISK (not from Test Writer output):
```bash
cat src/__tests__/user-registration.test.ts
```
The lead reads the spec-contract from DISK:
```bash
cat src/__tests__/spec-contract-user-registration.md
```

The Code Writer prompt contains ONLY:
- `{test_file_contents_verbatim}`: Contents of test file read from disk
- `{spec_contract_file_contents}`: Contents of spec-contract read from disk
- `{language}`: "typescript"
- `{test_runner}`: "vitest"
- `{test_command}`: "npx vitest run"
- `{impl_file_paths}`: "src/user-registration.ts"
- `{project_conventions_from_claude_md}`: Project conventions or "No specific conventions."

The Code Writer prompt MUST NOT contain:
- The Test Writer's prompt or reasoning
- Any implementation hints beyond the spec-contract
- Any other work unit's code

**Lead Verification Checklist** (from `code-writer-prompt.md`):
- [x] Prompt contains test file contents read from DISK
- [x] Prompt contains spec-contract read from DISK
- [x] Prompt does NOT contain any Test Writer prompt text
- [x] Prompt does NOT contain "Test Writer", "Agent A", or references to test authoring
- [x] Test file checksums have been recorded for GREEN verification

The Code Writer is spawned. It creates `src/user-registration.ts` with:
- `registerUser(email: string, password: string)` function
- Email validation (regex or library)
- bcrypt password hashing
- Duplicate detection logic (against a user store)
- Returns `{ id, email, createdAt }` without password hash

**State update**: `workUnits[0].status = "code-writing"` -> then `"green-verification"` after Code Writer completes.

#### Step 4d: GREEN Verification (user-registration)

**Check 1: Test Files Unchanged**
```bash
shasum -a 256 "src/__tests__/user-registration.test.ts" | cut -d' ' -f1
```
Compare against stored checksum. If different: ANTI-CHEAT VIOLATION. Discard Code Writer changes, re-prompt: "You modified test files, which is forbidden. Write implementation code ONLY."

**Check 2: No Skip/Focus Markers Added**
```bash
grep -n 'xit\b\|xdescribe\b\|\.skip\b\|@pytest\.mark\.skip\|@skip\|t\.Skip\|@Ignore\|@Disabled\|pending(' "src/__tests__/user-registration.test.ts"
grep -n '\.only\b\|fdescribe\b\|fit\b' "src/__tests__/user-registration.test.ts"
```
If new matches found: ANTI-CHEAT VIOLATION. Re-prompt.

**Check 3: All Tests Pass**
```bash
npx vitest run src/__tests__/user-registration.test.ts 2>&1; echo "EXIT_CODE:$?"
```
If exit code != 0: Re-prompt Code Writer with failure output (up to `maxRetries: 3`).
If exit code == 0: PASS.

**Check 4: No Hardcoded Returns (Heuristic)**
Read `src/user-registration.ts`. Look for:
- Functions that consist only of `return [literal]`
- Switch statements with literal returns matching test expectations
- Implementations shorter than 3 lines for non-trivial specs
If suspicious: Flag in report (do not block; adversarial reviewer will catch thoroughly).

**State update**: `workUnits[0].greenVerification.status = "passed"`.

#### Step 4e: Spec Compliance Review (user-registration)

**ORDERING RULE**: This MUST run before adversarial review.

The lead reads `reference/spec-compliance-reviewer-prompt.md` and fills the template:
- `{spec_contract}`: Read from disk: `src/__tests__/spec-contract-user-registration.md`
- `{design_summary}`: The approved design summary from state file
- `{test_file_contents}`: Read from disk: `src/__tests__/user-registration.test.ts`
- `{impl_file_contents}`: Read from disk: `src/user-registration.ts`
- `{unit_name}`: "user-registration"

The Spec Compliance Reviewer checks:

1. **Requirement Coverage** -- For each requirement in the spec-contract:
   | # | Requirement | Implemented | Tested | Notes |
   |---|------------|-------------|--------|-------|
   | 1 | Email format validation | YES/NO/PARTIAL | YES/NO | |
   | 2 | bcrypt password hashing | YES/NO/PARTIAL | YES/NO | |
   | 3 | Duplicate email detection | YES/NO/PARTIAL | YES/NO | |
   | 4 | Return user without password | YES/NO/PARTIAL | YES/NO | |
   | 5 | Error on invalid email | YES/NO/PARTIAL | YES/NO | |

2. **Missing Requirements** -- Implied requirements nobody addressed (e.g., case-insensitive email matching, email trimming).

3. **Scope Creep** -- Extra features not in spec (e.g., password strength validation beyond spec).

4. **API Contract Accuracy** -- Function signatures match spec, return types correct, error types correct.

5. **Integration Readiness** -- Does it export what `user-login` and `password-reset` will need?

**Verdict**: COMPLIANT or NON-COMPLIANT.
- If NON-COMPLIANT: Send pair back for revision. Test Writer adds missing tests, Code Writer re-implements. Then re-run spec compliance.
- If COMPLIANT: Proceed to adversarial review.

#### Step 4f: Adversarial Review (user-registration)

**ORDERING RULE**: Only runs after spec compliance passes.

The lead reads `reference/adversarial-reviewer-prompt.md` and fills the template:
- `{spec_contract}`: Read from disk: `src/__tests__/spec-contract-user-registration.md`
- `{test_file_contents}`: Read from disk: `src/__tests__/user-registration.test.ts`
- `{impl_file_contents}`: Read from disk: `src/user-registration.ts`
- `{unit_name}`: "user-registration"
- `{min_assertions}`: 1

The Adversarial Reviewer checks (referencing `testing-anti-patterns.md`):

1. **Test Completeness**: Are all behaviors tested? Edge cases? Negative cases?
2. **Test Quality**: Meaningful assertions? Independent tests? Adequate density?
3. **Implementation Quality**: Follows spec? Minimum code? Obvious bugs?
4. **Cheating Detection**: Hardcoded returns? Test-aware code? Shallow implementation? Mock exploitation?
5. **Coverage Gaps**: Untested code paths? One-sided conditional branches?

**Anti-patterns from `testing-anti-patterns.md` actively watched for**:
- Anti-Pattern 1: Testing mock behavior instead of real code
- Anti-Pattern 2: Test-only methods in production code
- Anti-Pattern 3: Mocking without understanding side effects
- Anti-Pattern 4: Incomplete mock objects
- Anti-Pattern 5: Integration tests as afterthought

**Verdict**: PASS or FAIL.
- If FAIL: Log findings, send pair back for revision (Test Writer rewrites addressing gaps, Code Writer re-implements). Then re-run adversarial review.
- If PASS: Proceed to code quality review.

#### Step 4g: Code Quality Review (user-registration)

**ORDERING RULE**: Only runs after adversarial review passes. Full pipeline: Spec Compliance -> Adversarial -> Code Quality.

The lead reads `reference/code-quality-reviewer-prompt.md` and fills the template:
- Implementation file contents: `src/user-registration.ts`
- Test file contents: `src/__tests__/user-registration.test.ts`
- Git diff for this work unit

The Code Quality Reviewer checks:
1. **Structure**: Single responsibility, well-defined interfaces, independent testability
2. **Naming and Clarity**: Names describe what things do, not how they work
3. **Discipline**: No overbuilding (YAGNI), no unnecessary abstraction, follows existing patterns
4. **Testing**: Tests verify behavior not implementation, comprehensive without brittle
5. **Size**: New files not unreasonably large

**Verdict**: Approved or Needs Changes.
- If Needs Changes (critical or important issues): Send back to Code Writer for fixes, then re-review.
- If Approved: Mark work unit as completed in state file.

**State update**: `workUnits[0].status = "completed"`.

---

### BATCH 2: user-login AND password-reset (PARALLEL)

Both units' dependencies (`[user-registration]`) are now in Batch 1, which is complete. Per `execution.maxParallelPairs: 3` and `parallelMode: "auto"`, both units execute concurrently.

The following two pipelines run simultaneously:

---

#### Pipeline A: user-login

##### Step 4a: Spawn Test Writer (user-login)

Spec-contract includes: "Authenticate user with email/password, return JWT access token (15 min) and refresh token. Track failed attempts, lock account after 5 failures for 15 minutes. User lookup depends on user-registration module."

Design summary is included.

Test Writer creates:
- `src/__tests__/user-login.test.ts` with tests for:
  - Successful login returns JWT access token and refresh token
  - JWT token has correct expiry (15 min)
  - Invalid email returns error
  - Invalid password returns error and increments failed attempt counter
  - 5th failed attempt locks account
  - Locked account rejects login even with correct password
  - Account unlocks after 15 minutes
  - Failed attempt counter resets on successful login
  - Edge cases: empty credentials, null inputs, already locked account
- `src/__tests__/spec-contract-user-login.md`

Verify both files exist on disk.

##### Step 4b: RED Verification (user-login)

Same 5-check process as user-registration:
1. Tests exist: PASS
2. Tests fail (RED): Expected -- `src/user-login.ts` does not exist. Exit code != 0. PASS
3. Correct failure type: "Cannot find module" errors. PASS
4. Assertion density: >= 1 per test function. PASS
5. Behavior-over-implementation: No excessive mocking, no private method access. PASS

Record checksums. State update.

##### Step 4c: Spawn Code Writer (user-login)

Information barrier enforced. Code Writer receives:
- Test file contents (read from disk)
- Spec-contract contents (read from disk)
- Framework info
- Target: `src/user-login.ts`

Code Writer creates `src/user-login.ts` with:
- `loginUser(email, password)` function
- User lookup (imports from user-registration)
- Password verification (bcrypt compare)
- JWT generation with 15 min expiry
- Refresh token generation and storage
- Failed attempt tracking with lockout logic

##### Step 4d: GREEN Verification (user-login)

1. Test files unchanged: Compare checksums. PASS
2. No skip/focus markers: PASS
3. All tests pass: `npx vitest run src/__tests__/user-login.test.ts` -> Exit code 0. PASS
4. No hardcoded returns: Heuristic check. PASS

##### Step 4e: Spec Compliance Review (user-login)

Reviewer verifies all login requirements are met: JWT generation, refresh tokens, failed attempt tracking, lockout at 5 attempts, 15-minute lockout window, counter reset on success. Checks integration readiness with user-registration.

Verdict: COMPLIANT -> proceed.

##### Step 4f: Adversarial Review (user-login)

Reviewer attempts to break tests. Checks for: timing-related edge cases in lockout, JWT token content validation, refresh token uniqueness, whether failed attempt tracking is per-user or global.

Verdict: PASS -> proceed.

##### Step 4g: Code Quality Review (user-login)

Reviewer checks structure, naming, discipline, testing quality, file sizes.

Verdict: Approved. `workUnits[1].status = "completed"`.

---

#### Pipeline B: password-reset (runs concurrently with Pipeline A)

##### Step 4a: Spawn Test Writer (password-reset)

Spec-contract includes: "Generate crypto-random reset token with 1-hour TTL, validate token on reset execution, update password (bcrypt), invalidate all refresh tokens for user, queue async email notification."

Design summary is included.

Test Writer creates:
- `src/__tests__/password-reset.test.ts` with tests for:
  - Request reset generates a token
  - Token is crypto-random (not guessable)
  - Token has 1-hour expiry
  - Valid token allows password reset
  - Expired token is rejected
  - Invalid/malformed token is rejected
  - Password is hashed with bcrypt after reset
  - All refresh tokens are invalidated on reset
  - Email notification is queued (not sent synchronously)
  - Reset for non-existent email returns success (no email enumeration)
  - Token is single-use (cannot be reused after reset)
  - Edge cases: empty token, empty password, null inputs
- `src/__tests__/spec-contract-password-reset.md`

Verify both files exist on disk.

##### Step 4b: RED Verification (password-reset)

Same 5-check process:
1. Tests exist: PASS
2. Tests fail (RED): `src/password-reset.ts` does not exist. PASS
3. Correct failure type: Module not found. PASS
4. Assertion density: >= 1 per test. PASS
5. Behavior-over-implementation: PASS

Record checksums. State update.

##### Step 4c: Spawn Code Writer (password-reset)

Information barrier enforced. Code Writer receives test file and spec-contract from disk only.

Code Writer creates `src/password-reset.ts` with:
- `requestPasswordReset(email)` -- generates token, stores with TTL, queues email
- `executePasswordReset(token, newPassword)` -- validates token, hashes password, updates user, invalidates refresh tokens, deletes token

##### Step 4d: GREEN Verification (password-reset)

1. Test files unchanged: PASS
2. No skip/focus markers: PASS
3. All tests pass: PASS
4. No hardcoded returns: PASS

##### Step 4e: Spec Compliance Review (password-reset)

Reviewer verifies: token generation, 1-hour TTL, validation, password update with bcrypt, refresh token invalidation, async email queueing, single-use tokens.

Verdict: COMPLIANT -> proceed.

##### Step 4f: Adversarial Review (password-reset)

Reviewer checks: token entropy, timing attacks on token validation, race conditions on token use, whether email enumeration is prevented, whether the email queue interface is realistic.

Verdict: PASS -> proceed.

##### Step 4g: Code Quality Review (password-reset)

Reviewer checks structure, naming, discipline, testing quality, file sizes.

Verdict: Approved. `workUnits[2].status = "completed"`.

---

**Batch 2 completion**: Both Pipeline A and Pipeline B must complete (including all reviews) before proceeding to Phase 5. The lead waits for the slower pipeline.

---

## PHASE 5: FINAL REVIEW -- VERIFICATION BEFORE COMPLETION

**IRON LAW**: No completion claim without fresh verification evidence. "It should work" is not evidence. Only actual test output is evidence.

### Step 1: Run Full Test Suite

```bash
npx vitest run 2>&1; echo "EXIT_CODE:$?"
```

The lead reads the ACTUAL output. Does NOT assume success.

### Step 2: Verify Pristine Output

Check for:
- All tests pass (exit code 0)
- No warnings
- No skipped tests
- No pending tests
- Clean green output only

If the test runner reports anything other than clean green: investigate before proceeding.

### Step 3: Holistic Code Review

Review all generated code together:
- Naming conflicts between units?
- Missing connections (does login actually import from registration correctly?)
- Inconsistent error handling patterns?
- Inconsistent data model between units?

### Step 4: Cross-Unit Integration Check

- Does `user-login` correctly use the user model from `user-registration`?
- Does `password-reset` correctly invalidate refresh tokens created by `user-login`?
- Do the bcrypt calls in `user-registration` and `password-reset` use consistent settings?
- Are shared types/interfaces compatible?

### Verification Anti-Rationalization

The lead applies the anti-rationalization table from SKILL.md. If ANY agent (including the lead itself) says:
- "Tests should pass now" -> Run them. "Should" is not "did."
- "I'm confident this works" -> Confidence without evidence is delusion. Run the tests.
- "The fix is obvious" -> Obvious fixes cause subtle bugs. Run the tests.
- "Only changed one line" -> One-line changes break everything. Run the tests.
- "Same pattern as before" -> Patterns don't guarantee correctness. Run the tests.

If integration issues are found: Report with evidence (actual test output) and fix before proceeding.

---

## PHASE 6: REPORT GENERATION

Per `reporting.generateReport: true` and `reporting.generateSessionLog: true`.

### tdd-report.md

Generated following `reference/report-format.md`:

```markdown
# TDD Session Report

**Date**: [ISO-8601 timestamp]
**Specification**: build a user authentication system with registration (email validation, password hashing, duplicate detection), login (JWT tokens, failed attempt tracking), and password reset (token generation, expiry, email notification)
**Framework**: typescript / vitest
**Entry Point**: natural-language-spec

## Summary

| Metric | Value |
|--------|-------|
| Work units | 3/3 |
| Tests written | ~30-40 |
| Assertions | ~50-70 |
| Anti-cheat violations | 0 |
| Adversarial reviews | 3/3 passed |
| Retries | 0 |

## Work Units

### user-registration -- completed
Spec: Create user with email validation, bcrypt hashing, duplicate detection

| Phase | Status | Attempts | Notes |
|-------|--------|----------|-------|
| Test Writer | completed | 1 | |
| RED Verification | passed | -- | N failures, M assertions |
| Code Writer | completed | 1 | |
| GREEN Verification | passed | -- | all tests pass |
| Spec Compliance | compliant | -- | N/N requirements covered |
| Adversarial Review | passed | -- | |
| Code Quality | approved | -- | |

Files: src/__tests__/user-registration.test.ts, src/user-registration.ts

### user-login -- completed
[same structure]

### password-reset -- completed
[same structure]

## Anti-Cheat Log
No violations encountered.

## Final Integration Check
- All tests passing: yes
- Integration issues found: none
```

### tdd-session.jsonl

Event log with entries for every phase transition, spawned/completed agents, verification results, and session completion.

---

## PHASE 7: CLEANUP

1. **Clean up agent team**: Shut down all remaining teammates (Test Writers, Code Writers, Reviewers).
2. **Remove intermediate artifacts**: Delete all `spec-contract-*.md` files:
   - `src/__tests__/spec-contract-user-registration.md`
   - `src/__tests__/spec-contract-user-login.md`
   - `src/__tests__/spec-contract-password-reset.md`
3. **Final state file update**: Mark session as complete.
4. **Present report**: Show the user the contents of `tdd-report.md`.
5. **Suggest next steps**:
   - Run the full test suite one more time: `npx vitest run`
   - Review generated code before committing
   - Commit the changes
   - Note: `tdd-report.md` is NOT gitignored -- user may want to commit it

Note: `tdd-report.md` is intentionally NOT gitignored -- it is a deliverable.

---

## ERROR HANDLING PATHS (would trigger if encountered)

Throughout execution, the skill monitors for:

- **Agent team creation failure**: Show error message with fix instructions, save state for retry.
- **Teammate crash or timeout**: Log error, re-spawn (counts as retry), escalate after maxRetries.
- **Test command not found**: Ask user for correct command, update state, retry.
- **File permission errors**: Report specific path and error, ask user to fix.
- **Interrupted session**: State file preserves progress. Next `/tdd` invocation detects state file, offers resume/restart/add-units.
- **Team cleanup on error**: Always attempt cleanup even on error -- shut down teammates, update state, generate partial report.

### Systematic Debugging Protocol (would trigger if GREEN verification fails repeatedly)

If the Code Writer fails 2+ times on the same test, the 4-phase debug process activates:
- **D1 Root Cause Investigation**: Read failing output, trace code path, identify bug category.
- **D2 Pattern Analysis**: Same failure as before? Same root cause for multiple tests? After 3+ failed fixes, stop -- design may be wrong.
- **D3 Hypothesis and Test**: Form hypothesis, write regression test first, then fix.
- **D4 Verification**: Run regression test, run unit tests, run full suite.

If D2 suggests architectural problem: Present to user with options (revise design, revise tests, accept complexity).

---

## COMPLETE AGENT ROSTER

| Agent | Count | When Spawned | Model (auto) |
|-------|-------|-------------|--------------|
| Test Writer | 3 (one per unit) | Step 4a per unit | sonnet |
| Code Writer | 3 (one per unit) | Step 4c per unit | sonnet |
| Spec Compliance Reviewer | 3 (one per unit) | Step 4e per unit | sonnet |
| Adversarial Reviewer | 3 (one per unit) | Step 4f per unit | sonnet |
| Code Quality Reviewer | 3 (one per unit) | Step 4g per unit | sonnet |
| **Total agents spawned** | **15** | | |

Note: Batch 2 agents for user-login and password-reset are spawned concurrently (up to maxParallelPairs=3).

---

## THREE-STAGE REVIEW PIPELINE (per unit)

```
Spec Compliance Review  -->  Adversarial Review  -->  Code Quality Review
       (Stage 1)                 (Stage 2)                (Stage 3)
   "Does it match          "Can we break it?         "Is it built well?"
    the spec?"              Is it cheating?"
```

**Ordering is strict**: Each stage must PASS before the next runs.
- If spec compliance fails: pair revises, then re-run spec compliance (not adversarial).
- If adversarial review fails: pair revises, then re-run adversarial (not code quality).
- If code quality review fails: Code Writer fixes, then re-run code quality.

This prevents wasting review effort on code that doesn't meet basic requirements.

---

## FILES CREATED BY SESSION

| File | Purpose | Gitignored |
|------|---------|-----------|
| `.tdd-state.json` | Session progress tracking | Yes |
| `tdd-session.jsonl` | Event log | Yes |
| `spec-contract-user-registration.md` | Machine-readable spec (deleted in cleanup) | Yes |
| `spec-contract-user-login.md` | Machine-readable spec (deleted in cleanup) | Yes |
| `spec-contract-password-reset.md` | Machine-readable spec (deleted in cleanup) | Yes |
| `tdd-report.md` | Session report (deliverable) | **No** |
| `src/__tests__/user-registration.test.ts` | Tests | No |
| `src/__tests__/user-login.test.ts` | Tests | No |
| `src/__tests__/password-reset.test.ts` | Tests | No |
| `src/user-registration.ts` | Implementation | No |
| `src/user-login.ts` | Implementation | No |
| `src/password-reset.ts` | Implementation | No |
