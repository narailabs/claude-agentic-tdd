# TDD Skill Execution Trace: User Authentication System

**Task Prompt**: `/tdd build a user authentication system with registration (email validation, password hashing, duplicate detection), login (JWT tokens, failed attempt tracking), and password reset (token generation, expiry, email notification)`

**Date**: 2026-03-28

---

## Prerequisites Check

The Team Manager (main Claude Code session) performs two checks before any work:

1. **Agent teams enabled**: Reads environment/settings for `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. If absent, halts with instructions to add it to `.claude/settings.json`.
2. **Git repository**: Runs `git rev-parse --is-inside-work-tree`. If not a repo, warns but continues.

Both pass. Proceed.

---

## Argument Parsing

Parsed from `$ARGUMENTS`:
- **Specification text**: "build a user authentication system with registration (email validation, password hashing, duplicate detection), login (JWT tokens, failed attempt tracking), and password reset (token generation, expiry, email notification)"
- **Flags**: none (`--skip-failed`, `--config`, `--design`, `--skip-design` all absent)

---

## Configuration Loading

1. Check for `.tdd.config.json` at project root -- not found.
2. Check project `CLAUDE.md` for `## TDD Configuration` section -- not found (the CLAUDE.md for this repo is about the plugin itself, not a consuming project).
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

---

## Entry Point Detection

The spec is a natural language description ("build a user authentication system..."). No mention of "add tests to" or "implement against this test." This is **Mode 1: Natural language spec**.

---

## Phase 0: Design Gate

### Trigger Evaluation

The skill checks whether the design gate should trigger. The conditions are:

> Run the design gate when ANY of:
> - The spec mentions 3+ distinct features or components
> - The spec involves external integrations (APIs, databases, auth providers)
> - The spec is ambiguous about data flow, ownership, or error handling
> - The user explicitly requests design review (`--design` flag)

**Analysis of this spec:**
- **3+ distinct features**: YES -- registration, login, password reset are 3 distinct feature areas, each with sub-features.
- **External integrations**: YES -- JWT tokens imply a token signing library, password hashing implies bcrypt/argon2, email notification implies an email service or SMTP.
- **Ambiguity**: YES -- the spec does not specify: token expiry duration, account lockout policy on failed attempts, email verification flow, data storage layer.

**Result**: Design gate TRIGGERS (all three conditions met).

### Step 1: Clarifying Questions (asked one at a time)

**Question 1**:
> "Should password reset tokens expire? If so, after how long?"

*Simulated user answer*: "Yes, 1 hour expiry."

**Question 2**:
> "What should happen when login fails multiple times -- lockout after N attempts, temporary delay, CAPTCHA, or just track the count?"

*Simulated user answer*: "Lock the account after 5 failed attempts. Unlock after 30 minutes."

**Question 3**:
> "Should registration send a verification email before the account is active, or should accounts be active immediately after registration?"

*Simulated user answer*: "Accounts are active immediately. No email verification for now, but password reset does send an email."

### Step 2: Propose Approaches (genuine trade-offs)

The Team Manager identifies one key architectural trade-off:

> **Token Strategy**:
> - Option A: JWT tokens (stateless, scalable, but cannot be individually revoked once issued)
> - Option B: Opaque tokens stored in a database (revocable, but requires a token store and DB lookup on every request)
> - Option C: JWT with a refresh token pattern (short-lived JWT + long-lived refresh token in DB, balances both)
>
> Recommendation: Option A (JWT) is simplest and matches the spec's explicit mention of "JWT tokens."

*Simulated user answer*: "Option A, plain JWT."

### Step 3: Design Summary

```
## Design Summary

### Components
- UserRepository: In-memory store for user records (email, hashed password, metadata)
- RegistrationService: Validates email format, checks for duplicates, hashes password, creates user
- LoginService: Validates credentials, tracks failed attempts, enforces lockout, issues JWT
- PasswordResetService: Generates reset tokens, validates token + expiry, updates password, sends email notification
- TokenService: Signs and verifies JWTs with configurable secret and expiry
- EmailService: Interface for sending emails (password reset notifications)

### Data Flow
1. Registration: input -> email validation -> duplicate check -> password hash -> store user -> return user
2. Login: input -> find user -> check lockout -> verify password -> reset/increment fail count -> issue JWT
3. Password Reset: request -> find user -> generate token -> store token+expiry -> send email -> (later) validate token -> hash new password -> update user

### Key Decisions
- JWT (stateless): No token revocation. Tokens expire after configurable duration (default 1h).
- bcrypt for password hashing: Industry standard, configurable salt rounds.
- Account lockout: 5 failed attempts triggers 30-minute lockout. Failed count resets on successful login.
- Reset token: Cryptographically random string, stored with SHA-256 hash, 1-hour expiry.
- Email service: Abstract interface -- tests use a mock/spy. No real SMTP in unit tests.
- In-memory storage: No database dependency. Repository pattern allows swapping to real DB later.

### Out of Scope
- Email verification on registration
- Token refresh/revocation
- OAuth/social login
- Rate limiting beyond account lockout
- Password complexity rules (beyond non-empty)
- Session management
```

### Step 4: User Approval Gate

> "Proceed with this design? [confirm/modify/cancel]"

**HARD GATE**: No decomposition proceeds until the user confirms. The Team Manager blocks here.

*Simulated user answer*: "confirm"

The approved design summary is stored in the state file under `designSummary`.

---

## Phase 1: Framework Detection

The Team Manager reads `reference/framework-detection.md` and follows the detection algorithm:

1. Check `.tdd.config.json` -- not found.
2. Check `CLAUDE.md` for `## TDD Configuration` -- not found.
3. Auto-detect from project files:
   - Run `cat package.json 2>/dev/null` -- check for JS/TS project.
   - Check for `tsconfig.json` -- determines TypeScript vs JavaScript.

**Assuming a TypeScript/Node.js project with Vitest** (based on the SKILL.md example using vitest):

```
framework:
  language: "typescript"
  testRunner: "vitest"
  testCommand: "npx vitest run"
  testFilePattern: "**/*.test.ts"
  sourceDir: "src/"
  testDir: "src/__tests__/"
```

If no package.json exists, the Team Manager asks:
> "I could not detect a test framework. What test runner do you use, and what command runs tests?"

---

## Phase 2: Work Decomposition

The Team Manager analyzes the spec and design summary and decomposes into work units:

### Work Unit 1: `user-registration`
- **id**: `user-registration`
- **name**: User Registration
- **spec-contract**: "Create a user registration system. Inputs: email (string), password (string). Outputs: User object with id, email, hashedPassword, createdAt. Behavior: (1) Validate email format using regex -- reject malformed emails with descriptive error. (2) Check for duplicate email in repository -- reject with 'email already registered' error. (3) Hash password using bcrypt with configurable salt rounds (default 10). (4) Store user in repository. (5) Return created user object (without plain password). Edge cases: empty email, empty password, null inputs, email with whitespace, case-insensitive duplicate detection."
- **dependsOn**: `[]` (no dependencies)
- **testFiles**: `["src/__tests__/user-registration.test.ts"]`
- **implFiles**: `["src/user-registration.ts"]`

### Work Unit 2: `user-login`
- **id**: `user-login`
- **name**: User Login
- **spec-contract**: "Create a user login system. Inputs: email (string), password (string). Outputs: JWT token string on success. Behavior: (1) Find user by email -- return 'invalid credentials' error if not found (do not reveal whether email exists). (2) Check if account is locked -- return 'account locked' error if locked with unlock time. (3) Verify password against stored bcrypt hash. (4) On success: reset failed attempt count, generate JWT containing userId and email, return token. (5) On failure: increment failed attempt count. If count reaches 5, lock account for 30 minutes. Return 'invalid credentials' (same message as user-not-found). Edge cases: already-locked account, lockout expiry (auto-unlock after 30 min), concurrent login attempts, empty credentials."
- **dependsOn**: `["user-registration"]` (needs User type and repository)
- **testFiles**: `["src/__tests__/user-login.test.ts"]`
- **implFiles**: `["src/user-login.ts"]`

### Work Unit 3: `password-reset`
- **id**: `password-reset`
- **name**: Password Reset
- **spec-contract**: "Create a password reset system. Three operations: (A) Request reset: Input: email. Behavior: find user, generate cryptographically random token, hash it with SHA-256, store hash+expiry (1 hour), call email service with reset link containing raw token. Always return success even if email not found (prevent email enumeration). (B) Validate token: Input: raw token. Behavior: hash raw token, find matching stored hash, check expiry. Return valid/invalid. (C) Execute reset: Input: raw token, new password. Behavior: validate token, hash new password with bcrypt, update user record, invalidate the token, return success. Edge cases: expired token, already-used token, invalid token format, empty new password, requesting reset for non-existent email."
- **dependsOn**: `["user-registration"]` (needs User type and repository)
- **testFiles**: `["src/__tests__/password-reset.test.ts"]`
- **implFiles**: `["src/password-reset.ts"]`

### Dependency Analysis

```
user-registration (no deps)
   |
   +-- user-login (depends on user-registration)
   |
   +-- password-reset (depends on user-registration)
```

- `user-registration` runs first (it is a dependency of the others).
- `user-login` and `password-reset` are independent of each other and can run in parallel after `user-registration` completes.

### Model Assignment (auto strategy)

Each work unit is assessed for complexity:

| Unit | Complexity | Test Writer | Code Writer | Reviewer |
|------|-----------|-------------|-------------|----------|
| `user-registration` | Standard (multi-file, some edge cases, bcrypt dependency) | sonnet | sonnet | sonnet |
| `user-login` | Complex (JWT integration, lockout state machine, timing logic) | opus | sonnet | opus |
| `password-reset` | Complex (crypto token generation, expiry, email integration, multi-step flow) | opus | sonnet | opus |

### User Confirmation

```
## TDD Work Plan

Framework: vitest (auto-detected)
Mode: natural-language-spec
Work units: 3

### Unit 1: user-registration
Spec: Create user with email validation, password hashing, and duplicate detection
Files: src/__tests__/user-registration.test.ts -> src/user-registration.ts
Dependencies: none

### Unit 2: user-login
Spec: Authenticate user with email/password, return JWT token, track failed attempts, enforce lockout
Files: src/__tests__/user-login.test.ts -> src/user-login.ts
Dependencies: [user-registration]

### Unit 3: password-reset
Spec: Generate reset token, validate token with expiry, update password, send email notification
Files: src/__tests__/password-reset.test.ts -> src/password-reset.ts
Dependencies: [user-registration]

Execution plan: Unit 1 first (dependency), then Units 2 and 3 in parallel.

Proceed? [confirm/modify/cancel]
```

*Simulated user answer*: "confirm"

---

## Phase 3: State Initialization

1. Check for existing `.tdd-state.json` -- not found. Create new state file.
2. Add to `.gitignore` (append if exists, create if not):
   ```
   # agentic-tdd state and intermediate files
   .tdd-state.json
   tdd-session.jsonl
   spec-contract-*.md
   ```
3. Initialize `tdd-session.jsonl` with:
   ```json
   {"timestamp":"2026-03-28T10:00:00Z","event":"session.start","unitId":null,"data":{"spec":"build a user authentication system...","entryPoint":"natural-language-spec","framework":{"language":"typescript","testRunner":"vitest","testCommand":"npx vitest run"}}}
   ```
4. Write `.tdd-state.json` with full schema: session ID, spec, design summary, framework config, all 3 work units in `pending` status, default config values.

---

## Phase 4: Agent Team Orchestration

### ========================================
### WORK UNIT 1: user-registration
### ========================================

#### Step 4a: Spawn Test Writer

The Team Manager spawns a Test Writer teammate using the template from `reference/test-writer-prompt.md`.

**Prompt sent to Test Writer** (filled template):
- `{spec_contract}`: The user-registration spec-contract from decomposition
- `{language}`: "typescript"
- `{test_runner}`: "vitest"
- `{test_command}`: "npx vitest run"
- `{test_file_paths}`: "src/__tests__/user-registration.test.ts"
- `{project_conventions_from_claude_md}`: "No specific conventions."
- `{min_assertions}`: 1
- `{unit_id}`: "user-registration"

The design summary is also included alongside the spec-contract.

**Test Writer produces** (representative output):

File: `src/__tests__/user-registration.test.ts`
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { registerUser, UserRepository } from '../user-registration';

describe('User Registration', () => {
  let repo: UserRepository;

  beforeEach(() => {
    repo = new UserRepository();
  });

  describe('successful registration', () => {
    it('should create a user with a valid email and password', async () => {
      const user = await registerUser(repo, { email: 'test@example.com', password: 'securePass123' });
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should hash the password and not store it in plain text', async () => {
      const user = await registerUser(repo, { email: 'test@example.com', password: 'securePass123' });
      expect(user.hashedPassword).toBeDefined();
      expect(user.hashedPassword).not.toBe('securePass123');
    });

    it('should store the user in the repository', async () => {
      const user = await registerUser(repo, { email: 'test@example.com', password: 'securePass123' });
      const found = await repo.findByEmail('test@example.com');
      expect(found).toBeDefined();
      expect(found!.id).toBe(user.id);
    });
  });

  describe('email validation', () => {
    it('should reject an empty email', async () => {
      await expect(registerUser(repo, { email: '', password: 'securePass123' }))
        .rejects.toThrow('Invalid email');
    });

    it('should reject a malformed email without @ symbol', async () => {
      await expect(registerUser(repo, { email: 'notanemail', password: 'securePass123' }))
        .rejects.toThrow('Invalid email');
    });

    it('should reject a malformed email without domain', async () => {
      await expect(registerUser(repo, { email: 'user@', password: 'securePass123' }))
        .rejects.toThrow('Invalid email');
    });

    it('should trim whitespace from email before validation', async () => {
      const user = await registerUser(repo, { email: '  test@example.com  ', password: 'securePass123' });
      expect(user.email).toBe('test@example.com');
    });
  });

  describe('duplicate detection', () => {
    it('should reject registration with an already registered email', async () => {
      await registerUser(repo, { email: 'test@example.com', password: 'pass1' });
      await expect(registerUser(repo, { email: 'test@example.com', password: 'pass2' }))
        .rejects.toThrow('Email already registered');
    });

    it('should detect duplicates case-insensitively', async () => {
      await registerUser(repo, { email: 'Test@Example.com', password: 'pass1' });
      await expect(registerUser(repo, { email: 'test@example.com', password: 'pass2' }))
        .rejects.toThrow('Email already registered');
    });
  });

  describe('password validation', () => {
    it('should reject an empty password', async () => {
      await expect(registerUser(repo, { email: 'test@example.com', password: '' }))
        .rejects.toThrow('Password is required');
    });
  });

  describe('null/undefined inputs', () => {
    it('should reject null email', async () => {
      await expect(registerUser(repo, { email: null as any, password: 'pass' }))
        .rejects.toThrow();
    });

    it('should reject null password', async () => {
      await expect(registerUser(repo, { email: 'test@example.com', password: null as any }))
        .rejects.toThrow();
    });
  });
});
```

File: `src/__tests__/spec-contract-user-registration.md`
```markdown
# Spec Contract: user-registration

## Summary
User registration service that validates email, hashes passwords, detects duplicates, and stores users.

## Public API
- `registerUser(repo: UserRepository, input: { email: string, password: string }): Promise<User>`
- `class UserRepository` with `findByEmail(email: string): Promise<User | null>`, `save(user: User): Promise<User>`

## Expected Behavior
1. Valid email + password -> returns User with id, email, hashedPassword, createdAt
2. Empty/malformed email -> throws "Invalid email"
3. Duplicate email (case-insensitive) -> throws "Email already registered"
4. Empty password -> throws "Password is required"
5. Password is hashed with bcrypt, never stored in plain text
6. Email is trimmed of whitespace before processing

## Constraints
- bcrypt for password hashing
- Case-insensitive email comparison for duplicate detection
```

**Post-completion verification**: The Team Manager checks that BOTH files exist on disk:
- `src/__tests__/user-registration.test.ts` -- exists
- `src/__tests__/spec-contract-user-registration.md` -- exists

State file updated: `user-registration.status = "red-verification"`

#### Step 4b: RED Verification

The Team Manager runs the full RED verification sequence from `reference/anti-cheat.md`.

**Check 1: Tests Exist**
```bash
test -f "src/__tests__/user-registration.test.ts"
```
Result: File exists. PASS.

**Check 2: Tests Fail (RED Phase)**
```bash
npx vitest run src/__tests__/user-registration.test.ts 2>&1; echo "EXIT_CODE:$?"
```

Expected output:
```
FAIL  src/__tests__/user-registration.test.ts
  User Registration
    successful registration
      x should create a user with a valid email and password
      x should hash the password and not store it in plain text
      x should store the user in the repository
    email validation
      x should reject an empty email
      ...

Error: Cannot find module '../user-registration'
...
EXIT_CODE:1
```

Exit code is 1 (non-zero). Tests FAIL. This is correct for RED phase. PASS.

**Check 3: Correct Failure Type**

Parse output for failure reasons. The errors are "Cannot find module '../user-registration'" -- this is an acceptable import error. Not a syntax error in the test file. PASS.

**Check 4: Assertion Density**

The Team Manager reads the test file and counts assertion patterns:
- Pattern matches: `expect(` appears in every `it()` block.
- Test functions counted: 11 (based on `it(` occurrences)
- Assertion patterns counted: approximately 17 (`expect(...)` calls total)
- Density: 17/11 = ~1.5 assertions per test. Exceeds minimum of 1. PASS.

Trivial assertion check: No `expect(true).toBe(true)`, no sole `toBeDefined()` assertions (they appear alongside other meaningful assertions). PASS.

**Check 5: Behavior-Over-Implementation**

Scan for anti-patterns:
- **Excessive mocking**: Count mock/spy/stub declarations. Zero mocks in this file. PASS.
- **Private method testing**: No `._private` or `.__internal` access patterns. PASS.
- **Implementation mirroring**: Tests are organized by behavior (registration, email validation, duplicate detection), not by internal method names. PASS.

**Record Checksums**:
```bash
shasum -a 256 "src/__tests__/user-registration.test.ts" | cut -d' ' -f1
```
Result: `a1b2c3d4e5f6...` (stored in state under `redVerification.testFileChecksums`)

Session log event:
```json
{"timestamp":"2026-03-28T10:05:00Z","event":"red.verification.passed","unitId":"user-registration","data":{"failureCount":11,"assertionCount":17}}
```

State file updated: `user-registration.redVerification.status = "passed"`

#### Step 4c: Spawn Code Writer (INFORMATION BARRIER enforced)

**CRITICAL -- Information Barrier Verification Checklist** (from `reference/code-writer-prompt.md`):

Before spawning, the Team Manager verifies:
- [x] Prompt contains test file contents **read from DISK** (not from Test Writer output messages)
- [x] Prompt contains spec-contract **read from DISK** (`spec-contract-user-registration.md`)
- [x] Prompt does NOT contain any Test Writer prompt text
- [x] Prompt does NOT contain "Test Writer", "Agent A", or references to the test authoring process
- [x] Test file checksums have been recorded for GREEN verification

**What the Code Writer receives** (filled template from `reference/code-writer-prompt.md`):
- `{test_file_contents_verbatim}`: The full content of `src/__tests__/user-registration.test.ts` (read from disk by the Team Manager)
- `{spec_contract_file_contents}`: The full content of `src/__tests__/spec-contract-user-registration.md` (read from disk)
- `{language}`: "typescript"
- `{test_runner}`: "vitest"
- `{test_command}`: "npx vitest run"
- `{impl_file_paths}`: "src/user-registration.ts"
- `{project_conventions_from_claude_md}`: "No specific conventions."

**What the Code Writer does NOT receive**:
- The Test Writer's prompt or instructions
- The Test Writer's reasoning about why certain tests were written
- Any implementation hints beyond what the spec-contract states
- Any other work unit's code (no login or password-reset references)

**Code Writer produces** (representative output):

File: `src/user-registration.ts`
```typescript
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

export interface User {
  id: string;
  email: string;
  hashedPassword: string;
  createdAt: Date;
}

export class UserRepository {
  private users: Map<string, User> = new Map();

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return user;
      }
    }
    return null;
  }

  async save(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }
}

export async function registerUser(
  repo: UserRepository,
  input: { email: string; password: string }
): Promise<User> {
  if (!input.email || typeof input.email !== 'string') {
    throw new Error('Invalid email');
  }

  const trimmedEmail = input.email.trim();

  if (!trimmedEmail || !trimmedEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    throw new Error('Invalid email');
  }

  if (!input.password || typeof input.password !== 'string' || input.password.length === 0) {
    throw new Error('Password is required');
  }

  const existing = await repo.findByEmail(trimmedEmail);
  if (existing) {
    throw new Error('Email already registered');
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);

  const user: User = {
    id: randomUUID(),
    email: trimmedEmail,
    hashedPassword,
    createdAt: new Date(),
  };

  return repo.save(user);
}
```

State file updated: `user-registration.status = "green-verification"`

#### Step 4d: GREEN Verification

**Check 1: Test Files Unchanged (Checksum Verification)**
```bash
shasum -a 256 "src/__tests__/user-registration.test.ts" | cut -d' ' -f1
```
Result: `a1b2c3d4e5f6...` -- matches stored checksum. PASS. The Code Writer did not tamper with test files.

**Check 2: No Skip/Focus Markers Added**
```bash
grep -n 'xit\b\|xdescribe\b\|\.skip\b\|@pytest\.mark\.skip\|@skip\|t\.Skip\|@Ignore\|@Disabled\|pending(' "src/__tests__/user-registration.test.ts"
grep -n '\.only\b\|fdescribe\b\|fit\b' "src/__tests__/user-registration.test.ts"
```
Result: No matches. No skip or focus markers. PASS.

**Check 3: All Tests Pass**
```bash
npx vitest run src/__tests__/user-registration.test.ts 2>&1; echo "EXIT_CODE:$?"
```

Expected output:
```
 PASS  src/__tests__/user-registration.test.ts (11 tests)
  User Registration
    successful registration
      v should create a user with a valid email and password
      v should hash the password and not store it in plain text
      v should store the user in the repository
    email validation
      v should reject an empty email
      v should reject a malformed email without @ symbol
      v should reject a malformed email without domain
      v should trim whitespace from email before validation
    duplicate detection
      v should reject registration with an already registered email
      v should detect duplicates case-insensitively
    password validation
      v should reject an empty password
    null/undefined inputs
      v should reject null email
      v should reject null password

Test Files  1 passed (1)
Tests  11 passed (11)
EXIT_CODE:0
```

Exit code 0. All 11 tests pass. PASS.

**Check 4: No Hardcoded Returns (Heuristic)**

Read `src/user-registration.ts`. Scan for:
- Functions consisting only of `return [literal]` -- No. Functions contain real logic (validation, hashing, repository calls).
- Switch statements with literal returns -- None present.
- Implementations shorter than 3 lines for non-trivial specs -- No, the implementation is substantial.

Result: Not suspicious. PASS (heuristic only, not blocking).

Session log event:
```json
{"timestamp":"2026-03-28T10:10:00Z","event":"green.verification.passed","unitId":"user-registration","data":{}}
```

#### Step 4e: Spec Compliance Review

The Team Manager spawns a Spec Compliance Reviewer teammate (template from `reference/spec-compliance-reviewer-prompt.md`).

**Reviewer receives**:
- `{spec_contract}`: Content of `spec-contract-user-registration.md` (read from disk)
- `{design_summary}`: The approved design summary from Phase 0 (read from state file)
- `{test_file_contents}`: Content of `src/__tests__/user-registration.test.ts` (read from disk)
- `{impl_file_contents}`: Content of `src/user-registration.ts` (read from disk)

**ORDERING RULE**: Spec compliance MUST pass BEFORE adversarial review runs.

**Reviewer output** (representative):

```markdown
## Spec Compliance Review: User Registration

### Verdict: COMPLIANT

### Requirement Matrix

| # | Requirement | Implemented | Tested | Notes |
|---|------------|-------------|--------|-------|
| 1 | Valid email+password creates user with id, email, hashedPassword, createdAt | YES | YES | |
| 2 | Empty/malformed email throws "Invalid email" | YES | YES | |
| 3 | Duplicate email (case-insensitive) throws "Email already registered" | YES | YES | |
| 4 | Empty password throws "Password is required" | YES | YES | |
| 5 | Password hashed with bcrypt | YES | YES | Verified not stored in plain text |
| 6 | Email trimmed of whitespace | YES | YES | |

### Missing Requirements
None

### Scope Creep
None -- implementation is minimal.

### API Contract Issues
None -- exports match spec exactly.

### Blocking Issues (must fix before proceeding)
None
```

Verdict: COMPLIANT. Proceed to adversarial review.

#### Step 4f: Adversarial Review

The Team Manager spawns an Adversarial Reviewer teammate (template from `reference/adversarial-reviewer-prompt.md`).

**Reviewer receives**:
- `{spec_contract}`: Content of `spec-contract-user-registration.md` (read from disk)
- `{test_file_contents}`: Content of `src/__tests__/user-registration.test.ts` (read from disk)
- `{impl_file_contents}`: Content of `src/user-registration.ts` (read from disk)
- Scoring rubric from the template
- The 5 known anti-patterns from `testing-anti-patterns.md`

**Reviewer output** (representative):

```markdown
## Adversarial Review: User Registration

### Verdict: PASS

### Test Completeness: 4/5
Good coverage of happy path, email validation, duplicates, and edge cases. Minor gap: no test for
extremely long email addresses or special characters in local part.

### Test Quality: 5/5
Tests are behavior-focused. Descriptive names. No shared mutable state (fresh repo in beforeEach).
Good assertion density.

### Implementation Quality: 5/5
Minimum implementation matching the spec. No dead code. Proper error handling.

### Cheating Detection: CLEAN
No hardcoded returns. No test-aware code. Implementation uses real bcrypt and real logic.

### Coverage Gaps
- No test for email with special characters (e.g., "user+tag@example.com") -- minor.

### Critical Issues (must fix)
None

### Recommendations (should fix)
1. Consider adding a test for very long email inputs.
```

Verdict: PASS. Work unit `user-registration` marked as **completed** in state file.

Session log event:
```json
{"timestamp":"2026-03-28T10:15:00Z","event":"unit.completed","unitId":"user-registration","data":{}}
```

---

### ========================================
### WORK UNITS 2 & 3 (PARALLEL EXECUTION)
### ========================================

Since `user-login` and `password-reset` both depend on `user-registration` (now completed) but NOT on each other, they execute in parallel (up to `maxParallelPairs: 3`).

### ----------------------------------------
### WORK UNIT 2: user-login (parallel track A)
### ----------------------------------------

#### Step 4a: Spawn Test Writer

**Prompt sent to Test Writer** (key differences from unit 1):
- `{spec_contract}`: The user-login spec-contract, covering JWT issuance, failed attempt tracking, and lockout logic
- `{test_file_paths}`: "src/__tests__/user-login.test.ts"
- `{unit_id}`: "user-login"
- Model: **opus** (complex unit per auto strategy)

Design summary is included so the Test Writer knows about the lockout policy (5 attempts, 30-minute lockout).

**Test Writer produces** `src/__tests__/user-login.test.ts` with approximately:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loginUser, LoginService } from '../user-login';
import { UserRepository, registerUser } from '../user-registration';
import jwt from 'jsonwebtoken';

describe('User Login', () => {
  let repo: UserRepository;
  let loginService: LoginService;
  const JWT_SECRET = 'test-secret';

  beforeEach(async () => {
    repo = new UserRepository();
    loginService = new LoginService(repo, JWT_SECRET);
    // Seed a test user
    await registerUser(repo, { email: 'user@example.com', password: 'correctPassword' });
  });

  describe('successful login', () => {
    it('should return a JWT token for valid credentials', async () => {
      const token = await loginService.login('user@example.com', 'correctPassword');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should include userId and email in the JWT payload', async () => {
      const token = await loginService.login('user@example.com', 'correctPassword');
      const payload = jwt.verify(token, JWT_SECRET) as any;
      expect(payload.email).toBe('user@example.com');
      expect(payload.userId).toBeDefined();
    });

    it('should reset failed attempt count on successful login', async () => {
      // Fail twice, then succeed
      try { await loginService.login('user@example.com', 'wrong'); } catch {}
      try { await loginService.login('user@example.com', 'wrong'); } catch {}
      const token = await loginService.login('user@example.com', 'correctPassword');
      expect(token).toBeDefined();
      // Fail once more -- should not be locked (count was reset)
      try { await loginService.login('user@example.com', 'wrong'); } catch {}
      // Should still be able to try again (not locked after 1 fail)
      await expect(loginService.login('user@example.com', 'correctPassword'))
        .resolves.toBeDefined();
    });
  });

  describe('invalid credentials', () => {
    it('should throw "Invalid credentials" for wrong password', async () => {
      await expect(loginService.login('user@example.com', 'wrongPassword'))
        .rejects.toThrow('Invalid credentials');
    });

    it('should throw "Invalid credentials" for non-existent email (no enumeration)', async () => {
      await expect(loginService.login('nobody@example.com', 'anyPassword'))
        .rejects.toThrow('Invalid credentials');
    });

    it('should use the same error message for wrong password and non-existent user', async () => {
      const wrongPasswordError = await loginService.login('user@example.com', 'wrong')
        .catch((e: Error) => e.message);
      const noUserError = await loginService.login('nobody@example.com', 'any')
        .catch((e: Error) => e.message);
      expect(wrongPasswordError).toBe(noUserError);
    });
  });

  describe('account lockout', () => {
    it('should lock account after 5 failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        try { await loginService.login('user@example.com', 'wrong'); } catch {}
      }
      await expect(loginService.login('user@example.com', 'correctPassword'))
        .rejects.toThrow('Account locked');
    });

    it('should include unlock time in lockout error', async () => {
      for (let i = 0; i < 5; i++) {
        try { await loginService.login('user@example.com', 'wrong'); } catch {}
      }
      try {
        await loginService.login('user@example.com', 'correctPassword');
      } catch (e: any) {
        expect(e.message).toContain('Account locked');
      }
    });

    it('should unlock account after 30 minutes', async () => {
      for (let i = 0; i < 5; i++) {
        try { await loginService.login('user@example.com', 'wrong'); } catch {}
      }
      // Advance time by 31 minutes
      vi.useFakeTimers();
      vi.advanceTimersByTime(31 * 60 * 1000);
      const token = await loginService.login('user@example.com', 'correctPassword');
      expect(token).toBeDefined();
      vi.useRealTimers();
    });
  });

  describe('edge cases', () => {
    it('should reject empty email', async () => {
      await expect(loginService.login('', 'password'))
        .rejects.toThrow('Invalid credentials');
    });

    it('should reject empty password', async () => {
      await expect(loginService.login('user@example.com', ''))
        .rejects.toThrow('Invalid credentials');
    });
  });
});
```

Also produces `src/__tests__/spec-contract-user-login.md`.

#### Step 4b: RED Verification (user-login)

**Check 2: Tests Fail**
```bash
npx vitest run src/__tests__/user-login.test.ts 2>&1; echo "EXIT_CODE:$?"
```
Output: `Cannot find module '../user-login'` -- exit code 1. PASS (correct RED state).

**Check 3: Correct Failure Type**: Import error for missing module. Acceptable. PASS.

**Check 4: Assertion Density**: ~12 test functions, ~20+ assertions. Density ~1.7. PASS.

**Check 5: Behavior-Over-Implementation**: Uses `vi.useFakeTimers()` for time manipulation (acceptable -- testing time-dependent behavior). No excessive mocking. PASS.

**Record Checksums**: `shasum -a 256 "src/__tests__/user-login.test.ts"` stored.

#### Step 4c: Spawn Code Writer (INFORMATION BARRIER)

**Code Writer receives**:
- Test file contents (read from disk)
- `spec-contract-user-login.md` (read from disk)
- Framework info
- Target: `src/user-login.ts`

**Code Writer does NOT receive**: Test Writer prompt, Test Writer reasoning, any reference to the test authoring process, any code from `password-reset`.

Code Writer produces `src/user-login.ts` implementing `LoginService` class with methods for credential verification, failed attempt tracking, lockout enforcement, and JWT signing.

#### Step 4d: GREEN Verification (user-login)

**Check 1: Checksum** -- test file unchanged. PASS.
**Check 2: No skip markers** -- clean. PASS.
**Check 3: Tests pass** -- all 12 tests pass. PASS.
**Check 4: No hardcoded returns** -- real bcrypt comparison, real JWT signing. PASS.

#### Step 4e: Spec Compliance Review (user-login)

Reviewer checks every requirement:
- JWT issuance with userId and email: IMPLEMENTED, TESTED
- Failed attempt tracking: IMPLEMENTED, TESTED
- Account lockout at 5 failures: IMPLEMENTED, TESTED
- 30-minute auto-unlock: IMPLEMENTED, TESTED
- Same error message for wrong password vs non-existent user: IMPLEMENTED, TESTED
- Reset count on success: IMPLEMENTED, TESTED

Verdict: **COMPLIANT**.

#### Step 4f: Adversarial Review (user-login)

Reviewer (opus model) checks:
- Edge case coverage: good -- empty inputs, non-existent users, lockout timing
- Test-implementation coupling: low -- tests assert on behavior (JWT contents, error messages), not internal state
- Coverage gaps: minor -- no test for concurrent login race conditions (noted as recommendation)
- Cheating detection: CLEAN
- Anti-pattern check (5 patterns from `testing-anti-patterns.md`): No violations

Verdict: **PASS**. Unit `user-login` marked **completed**.

---

### ----------------------------------------
### WORK UNIT 3: password-reset (parallel track B)
### ----------------------------------------

(Running simultaneously with user-login)

#### Step 4a: Spawn Test Writer

**Prompt sent to Test Writer**:
- `{spec_contract}`: The password-reset spec-contract covering token generation, expiry, and email notification
- `{test_file_paths}`: "src/__tests__/password-reset.test.ts"
- `{unit_id}`: "password-reset"
- Model: **opus** (complex unit)

**Test Writer produces** `src/__tests__/password-reset.test.ts` with approximately:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PasswordResetService } from '../password-reset';
import { UserRepository, registerUser } from '../user-registration';

describe('Password Reset', () => {
  let repo: UserRepository;
  let emailService: { sendResetEmail: ReturnType<typeof vi.fn> };
  let resetService: PasswordResetService;

  beforeEach(async () => {
    repo = new UserRepository();
    emailService = { sendResetEmail: vi.fn().mockResolvedValue(undefined) };
    resetService = new PasswordResetService(repo, emailService);
    await registerUser(repo, { email: 'user@example.com', password: 'oldPassword' });
  });

  describe('request reset', () => {
    it('should call email service with a reset token for existing user', async () => {
      await resetService.requestReset('user@example.com');
      expect(emailService.sendResetEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendResetEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.stringMatching(/.{32,}/)  // token should be a long random string
      );
    });

    it('should return success even for non-existent email (prevent enumeration)', async () => {
      await expect(resetService.requestReset('nobody@example.com'))
        .resolves.not.toThrow();
      expect(emailService.sendResetEmail).not.toHaveBeenCalled();
    });

    it('should generate a unique token each time', async () => {
      await resetService.requestReset('user@example.com');
      const firstToken = emailService.sendResetEmail.mock.calls[0][1];
      emailService.sendResetEmail.mockClear();
      await resetService.requestReset('user@example.com');
      const secondToken = emailService.sendResetEmail.mock.calls[0][1];
      expect(firstToken).not.toBe(secondToken);
    });
  });

  describe('validate token', () => {
    it('should return true for a valid, unexpired token', async () => {
      await resetService.requestReset('user@example.com');
      const token = emailService.sendResetEmail.mock.calls[0][1];
      const isValid = await resetService.validateToken(token);
      expect(isValid).toBe(true);
    });

    it('should return false for an expired token', async () => {
      await resetService.requestReset('user@example.com');
      const token = emailService.sendResetEmail.mock.calls[0][1];
      vi.useFakeTimers();
      vi.advanceTimersByTime(61 * 60 * 1000); // 61 minutes (past 1h expiry)
      const isValid = await resetService.validateToken(token);
      expect(isValid).toBe(false);
      vi.useRealTimers();
    });

    it('should return false for a completely invalid token', async () => {
      const isValid = await resetService.validateToken('bogus-token-12345');
      expect(isValid).toBe(false);
    });
  });

  describe('execute reset', () => {
    it('should update the user password when given a valid token', async () => {
      await resetService.requestReset('user@example.com');
      const token = emailService.sendResetEmail.mock.calls[0][1];
      await resetService.executeReset(token, 'newSecurePassword');

      // Verify old password no longer works by checking the hash changed
      const user = await repo.findByEmail('user@example.com');
      expect(user!.hashedPassword).toBeDefined();
      // The hash should be different from what it was before
    });

    it('should invalidate the token after use (cannot reuse)', async () => {
      await resetService.requestReset('user@example.com');
      const token = emailService.sendResetEmail.mock.calls[0][1];
      await resetService.executeReset(token, 'newPassword1');
      await expect(resetService.executeReset(token, 'newPassword2'))
        .rejects.toThrow('Invalid or expired token');
    });

    it('should reject reset with expired token', async () => {
      await resetService.requestReset('user@example.com');
      const token = emailService.sendResetEmail.mock.calls[0][1];
      vi.useFakeTimers();
      vi.advanceTimersByTime(61 * 60 * 1000);
      await expect(resetService.executeReset(token, 'newPassword'))
        .rejects.toThrow('Invalid or expired token');
      vi.useRealTimers();
    });

    it('should reject empty new password', async () => {
      await resetService.requestReset('user@example.com');
      const token = emailService.sendResetEmail.mock.calls[0][1];
      await expect(resetService.executeReset(token, ''))
        .rejects.toThrow();
    });

    it('should hash the new password with bcrypt', async () => {
      await resetService.requestReset('user@example.com');
      const token = emailService.sendResetEmail.mock.calls[0][1];
      await resetService.executeReset(token, 'brandNewPassword');
      const user = await repo.findByEmail('user@example.com');
      expect(user!.hashedPassword).not.toBe('brandNewPassword');
      expect(user!.hashedPassword.startsWith('$2')).toBe(true); // bcrypt prefix
    });
  });
});
```

Also produces `src/__tests__/spec-contract-password-reset.md`.

#### Step 4b: RED Verification (password-reset)

**Check 2: Tests Fail**:
Output: `Cannot find module '../password-reset'` -- exit code 1. PASS.

**Check 3: Correct Failure Type**: Import error. PASS.

**Check 4: Assertion Density**: ~11 test functions, ~16+ assertions. Density ~1.5. PASS.

**Check 5: Behavior-Over-Implementation**:
- The email service uses a `vi.fn()` mock, but it is the ONLY mock and is testing an external integration boundary (email sending). The tests also assert on observable outcomes (token validity, password hash changes), not just mock calls. The mock assertion in "should call email service" also checks arguments. This is within `maxMockDepth: 2` threshold.
- Anti-pattern check against `testing-anti-patterns.md`:
  - Pattern 1 (Testing Mock Behavior): The test "should call email service with a reset token" asserts on mock calls BUT also verifies the token format. The other tests verify real outcomes. Borderline but acceptable since email sending is a side effect that requires a mock.
  - Patterns 2-5: Not triggered.
- PASS.

**Record Checksums**: Stored.

#### Step 4c: Spawn Code Writer (INFORMATION BARRIER)

Code Writer receives test contents and spec-contract from disk. Does NOT receive Test Writer prompt, user-login code, or any reasoning about how tests were written.

Code Writer produces `src/password-reset.ts` implementing `PasswordResetService` class with `requestReset()`, `validateToken()`, and `executeReset()` methods, using crypto.randomBytes for token generation and SHA-256 for token storage.

#### Step 4d: GREEN Verification (password-reset)

**Check 1: Checksum** -- test file unchanged. PASS.
**Check 2: No skip markers** -- clean. PASS.
**Check 3: Tests pass** -- all 11 tests pass. PASS.
**Check 4: No hardcoded returns** -- real crypto operations. PASS.

#### Step 4e: Spec Compliance Review (password-reset)

Requirement matrix:
- Request reset for existing user sends email with token: IMPLEMENTED, TESTED
- Request reset for non-existent email returns success silently: IMPLEMENTED, TESTED
- Unique tokens each time: IMPLEMENTED, TESTED
- Token validation with expiry check: IMPLEMENTED, TESTED
- Execute reset updates password with bcrypt: IMPLEMENTED, TESTED
- Token invalidated after use: IMPLEMENTED, TESTED
- Expired token rejected: IMPLEMENTED, TESTED
- Empty new password rejected: IMPLEMENTED, TESTED

Verdict: **COMPLIANT**.

#### Step 4f: Adversarial Review (password-reset)

Reviewer checks:
- Edge cases: expired tokens, reused tokens, invalid tokens, empty passwords all tested
- Mock usage: single mock for email service at the integration boundary -- acceptable per the mock decision tree
- Cheating detection: CLEAN -- implementation uses real crypto, bcrypt, and SHA-256
- Anti-pattern check: No violations of the 5 documented patterns

Verdict: **PASS**. Unit `password-reset` marked **completed**.

---

## Phase 5: Final Review -- Verification Before Completion

**IRON LAW**: No completion claim without fresh verification evidence.

### Step 1: Run the FULL test suite

```bash
npx vitest run 2>&1; echo "EXIT_CODE:$?"
```

This runs ALL test files together:
- `src/__tests__/user-registration.test.ts`
- `src/__tests__/user-login.test.ts`
- `src/__tests__/password-reset.test.ts`

Expected output:
```
 PASS  src/__tests__/user-registration.test.ts (11 tests)
 PASS  src/__tests__/user-login.test.ts (12 tests)
 PASS  src/__tests__/password-reset.test.ts (11 tests)

Test Suites:  3 passed, 3 total
Tests:        34 passed, 34 total
EXIT_CODE:0
```

The Team Manager **reads the actual output** and does not assume success.

### Step 2: Verify pristine output

Check for:
- All tests pass: YES (34/34)
- No warnings: confirmed from output
- No skipped tests: confirmed (no `skip` in output)
- No pending tests: confirmed

### Step 3: Holistic code review

The Team Manager reviews all generated code looking for:
- **Naming conflicts**: `User` type used consistently across all files. `UserRepository` shared between units. No conflicts.
- **Import consistency**: `user-login.ts` and `password-reset.ts` both import from `user-registration.ts`. Imports resolve correctly.
- **Missing connections**: Login needs to compare bcrypt hashes (uses bcrypt.compare). Password reset needs to update hashed passwords (uses bcrypt.hash). Both correctly use the same bcrypt library.

### Step 4: Cross-unit integration check

- `user-login` depends on `UserRepository` and `User` type from `user-registration` -- verified compatible.
- `password-reset` depends on `UserRepository` and `User` type from `user-registration` -- verified compatible.
- `user-login` and `password-reset` don't directly depend on each other -- no integration concern.

The Team Manager verifies that a user registered with `registerUser()` can subsequently:
1. Log in via `LoginService` -- the user record in the repo has the correct `hashedPassword` field that `bcrypt.compare` can verify.
2. Request and execute a password reset -- the `PasswordResetService` can find the user by email and update their `hashedPassword`.

### Verification Anti-Rationalization

The Team Manager does NOT accept:
- "Tests should pass now" -- they verified by running them and reading the output.
- "I'm confident this works" -- confidence is not evidence; test output is evidence.
- "Same pattern as before" -- every suite was run fresh.

---

## Phase 6: Report Generation

### tdd-report.md

```markdown
# TDD Session Report

**Date**: 2026-03-28T10:00:00Z
**Specification**: build a user authentication system with registration (email validation, password hashing, duplicate detection), login (JWT tokens, failed attempt tracking), and password reset (token generation, expiry, email notification)
**Framework**: typescript / vitest
**Entry Point**: natural-language-spec

## Summary

| Metric | Value |
|--------|-------|
| Work units | 3/3 |
| Tests written | 34 |
| Assertions | ~53 |
| Anti-cheat violations | 0 |
| Adversarial reviews | 3/3 passed |
| Retries | 0 |

## Work Units

### User Registration -- completed

**Spec**: Create user with email validation, password hashing, and duplicate detection

| Phase | Status | Attempts | Notes |
|-------|--------|----------|-------|
| Test Writer | completed | 1 | 11 tests, model: sonnet |
| RED Verification | passed | -- | 11 failures (correct), 17 assertions |
| Code Writer | completed | 1 | model: sonnet |
| GREEN Verification | passed | -- | 11/11 pass |
| Spec Compliance | compliant | -- | 6/6 requirements covered |
| Adversarial Review | passed | -- | Score: 4.6/5 |

**Files created**:
- Tests: src/__tests__/user-registration.test.ts
- Implementation: src/user-registration.ts

**Reviewer findings**: Consider adding tests for special characters in email local part.

---

### User Login -- completed

**Spec**: Authenticate user with email/password, return JWT token, track failed attempts, enforce lockout

| Phase | Status | Attempts | Notes |
|-------|--------|----------|-------|
| Test Writer | completed | 1 | 12 tests, model: opus |
| RED Verification | passed | -- | 12 failures (correct), 20 assertions |
| Code Writer | completed | 1 | model: sonnet |
| GREEN Verification | passed | -- | 12/12 pass |
| Spec Compliance | compliant | -- | 6/6 requirements covered |
| Adversarial Review | passed | -- | Score: 4.5/5 |

**Files created**:
- Tests: src/__tests__/user-login.test.ts
- Implementation: src/user-login.ts

**Reviewer findings**: Consider testing concurrent login race conditions.

---

### Password Reset -- completed

**Spec**: Generate reset token, validate token with expiry, update password, send email notification

| Phase | Status | Attempts | Notes |
|-------|--------|----------|-------|
| Test Writer | completed | 1 | 11 tests, model: opus |
| RED Verification | passed | -- | 11 failures (correct), 16 assertions |
| Code Writer | completed | 1 | model: sonnet |
| GREEN Verification | passed | -- | 11/11 pass |
| Spec Compliance | compliant | -- | 8/8 requirements covered |
| Adversarial Review | passed | -- | Score: 4.4/5 |

**Files created**:
- Tests: src/__tests__/password-reset.test.ts
- Implementation: src/password-reset.ts

**Reviewer findings**: Mock usage for email service is appropriate at the integration boundary.

---

## Anti-Cheat Log

No violations encountered during this session.

| Unit | Phase | Violation | Resolution |
|------|-------|-----------|------------|
| (none) | -- | -- | -- |

## Final Integration Check

- All tests passing: yes (34/34)
- Integration issues found: none
- Full suite exit code: 0
```

### tdd-session.jsonl

Contains chronological event entries:
```
{"timestamp":"...","event":"session.start","unitId":null,"data":{"spec":"build a user authentication system...","entryPoint":"natural-language-spec","framework":{...}}}
{"timestamp":"...","event":"decomposition.complete","unitId":null,"data":{"units":[{"id":"user-registration","name":"User Registration","dependsOn":[]},{"id":"user-login","name":"User Login","dependsOn":["user-registration"]},{"id":"password-reset","name":"Password Reset","dependsOn":["user-registration"]}]}}
{"timestamp":"...","event":"user.confirmed","unitId":null,"data":{"unitCount":3}}
{"timestamp":"...","event":"team.created","unitId":null,"data":{"teamId":"..."}}
{"timestamp":"...","event":"test-writer.spawned","unitId":"user-registration","data":{"attempt":1}}
{"timestamp":"...","event":"test-writer.completed","unitId":"user-registration","data":{"testFiles":["src/__tests__/user-registration.test.ts"]}}
{"timestamp":"...","event":"red.verification.passed","unitId":"user-registration","data":{"failureCount":11,"assertionCount":17}}
{"timestamp":"...","event":"code-writer.spawned","unitId":"user-registration","data":{"attempt":1}}
{"timestamp":"...","event":"code-writer.completed","unitId":"user-registration","data":{"implFiles":["src/user-registration.ts"]}}
{"timestamp":"...","event":"green.verification.passed","unitId":"user-registration","data":{}}
{"timestamp":"...","event":"spec-review.compliant","unitId":"user-registration","data":{"requirementsCovered":6,"total":6}}
{"timestamp":"...","event":"adversarial.passed","unitId":"user-registration","data":{"findings":["Consider special char test"]}}
{"timestamp":"...","event":"unit.completed","unitId":"user-registration","data":{}}
{"timestamp":"...","event":"test-writer.spawned","unitId":"user-login","data":{"attempt":1}}
{"timestamp":"...","event":"test-writer.spawned","unitId":"password-reset","data":{"attempt":1}}
... (parallel events for both units through their full cycles)
{"timestamp":"...","event":"unit.completed","unitId":"user-login","data":{}}
{"timestamp":"...","event":"unit.completed","unitId":"password-reset","data":{}}
{"timestamp":"...","event":"integration.check","unitId":null,"data":{"passed":true,"totalTests":34,"failures":0}}
{"timestamp":"...","event":"session.complete","unitId":null,"data":{"summary":{"totalUnits":3,"completedUnits":3,"failedUnits":0,"totalTests":34,"totalAssertions":53,"antiCheatViolations":0}}}
```

---

## Phase 7: Cleanup

1. **Shut down teammates**: All Test Writer, Code Writer, and Reviewer teammates are shut down.
2. **Remove intermediate artifacts**: Delete all `spec-contract-*.md` files:
   - `src/__tests__/spec-contract-user-registration.md` -- deleted
   - `src/__tests__/spec-contract-user-login.md` -- deleted
   - `src/__tests__/spec-contract-password-reset.md` -- deleted
3. **Final state file update**: `.tdd-state.json` updated with all units completed.
4. **Present report**: The `tdd-report.md` content is shown to the user.
5. **Suggest next steps**:
   > Session complete. 3/3 work units implemented with 34 passing tests.
   >
   > Suggested next steps:
   > - Run the full test suite: `npx vitest run`
   > - Review the generated code for your project's conventions
   > - Commit changes: `git add -A && git commit -m "feat: add user authentication system"`
   > - Consider adding integration tests for the full signup -> login -> password reset flow

Note: `tdd-report.md` is intentionally NOT gitignored -- it is a deliverable the user may want to commit.

---

## Key System Properties Demonstrated

### Information Barrier
- The Code Writer for each unit received ONLY the test file (read from disk) and the spec-contract (read from disk).
- The Code Writer never saw the Test Writer's prompt, reasoning, or approach.
- The Code Writer for `user-login` never saw `password-reset` code, and vice versa.
- The Team Manager verified the barrier checklist before every Code Writer spawn.

### Checksum Verification
- After RED verification, `shasum -a 256` was run on each test file and the hash stored.
- After Code Writer completed, the same checksum was recomputed and compared.
- Any mismatch would trigger an ANTI-CHEAT VIOLATION, discarding Code Writer changes.

### Anti-Cheat Checks (complete list applied per unit)
1. **RED: Tests exist** -- file existence check
2. **RED: Tests fail** -- non-zero exit code required
3. **RED: Correct failure type** -- import errors, not syntax errors
4. **RED: Assertion density** -- count per test >= minAssertionsPerTest
5. **RED: Behavior-over-implementation** -- no excessive mocking, no private method access, no implementation mirroring
6. **GREEN: Test files unchanged** -- checksum comparison
7. **GREEN: No skip/focus markers** -- grep for xit, .skip, .only, etc.
8. **GREEN: All tests pass** -- zero exit code required
9. **GREEN: No hardcoded returns** -- heuristic scan of implementation
10. **Spec Compliance Review** -- requirement matrix against spec-contract
11. **Adversarial Review** -- 5-category scoring rubric + 5 anti-pattern checks

### Anti-Rationalization
- The Team Manager applied the anti-rationalization table at Phase 5, refusing to assume tests passed without running them.
- The IRON LAW was enforced: "Only actual test output is evidence."

### Dependency-Respecting Parallel Execution
- `user-registration` completed first (dependency of others).
- `user-login` and `password-reset` ran in parallel after that.
- State file tracked all concurrent pipelines.
- `maxParallelPairs: 3` allowed both parallel units to run simultaneously.
