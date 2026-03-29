# Default Claude Code Behavior Trace: User Authentication System (Iteration 2)

## Prompt Given

> /tdd build a user authentication system with registration (email validation, password hashing, duplicate detection), login (JWT tokens, failed attempt tracking), and password reset (token generation, expiry, email notification)

Since no TDD skill is loaded, `/tdd` is not a recognized slash command. Claude Code treats the entire string as a natural language request and proceeds with its default implementation-first behavior.

The prompt is notably more specific than a bare "build an auth system" -- it enumerates nine sub-requirements in parentheticals. This gives Claude Code more to work with, but does not change its fundamental approach.

---

## Phase-by-Phase Trace of Default Behavior

### Step 1: Intake and Implicit Planning (~5-10 seconds)

Claude Code reads the prompt and begins immediately. The parenthetical sub-requirements (email validation, password hashing, etc.) serve as an informal checklist but are not formalized into discrete work units or tracked as requirements.

**Would it ask design questions first?** No. Default Claude Code does not gate on design review. It would not ask:
- Which database to use (PostgreSQL, MongoDB, SQLite, in-memory)
- Whether JWT should use symmetric (HS256) or asymmetric (RS256) signing
- What constitutes a valid password policy (length, complexity)
- How many failed attempts before lockout, and for how long
- Whether "email notification" means real SMTP, a queue, or a stub
- Whether this is an Express API, a full-stack app, or a library
- What the token expiry duration should be for password reset

Instead, Claude Code infers reasonable defaults and proceeds. These defaults are undocumented -- the user cannot review or override them before code is written.

### Step 2: Technology Detection (~5-10 seconds)

Claude Code scans the workspace for existing project indicators: `package.json`, `tsconfig.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, etc.

If the workspace is empty or is the plugin repo itself, Claude Code picks a stack. The most likely choice is Node.js/TypeScript with Express, given the web-API nature of the request. It then scaffolds from scratch.

### Step 3: Implementation -- Code-First, Monolithic (~3-5 minutes)

This is where the bulk of time is spent. Claude Code writes implementation files directly, without any preceding test specification.

#### 3a. Project Scaffolding
```
Tool: Bash -> npm init -y
Tool: Bash -> npm install express bcrypt jsonwebtoken nodemailer uuid validator
Tool: Bash -> npm install -D typescript @types/express @types/bcrypt @types/jsonwebtoken jest ts-jest @types/jest supertest @types/supertest
Tool: Write -> tsconfig.json
Tool: Write -> src/index.ts (Express app entry)
Tool: Write -> src/app.ts (Express app factory, separated for testability)
```

#### 3b. User Model / Database Layer
```
Tool: Write -> src/models/User.ts
```
Defines a User interface with fields: id, email, passwordHash, failedAttempts, lockedUntil, resetToken, resetTokenExpiry. Uses an in-memory Map or a simple SQLite setup. No migration strategy, no schema validation.

#### 3c. Registration (email validation, password hashing, duplicate detection)
```
Tool: Write -> src/routes/auth.ts (or src/controllers/register.ts)
```
- POST /api/auth/register
- Email validation via regex or the `validator` library
- Password hashing with bcrypt (10-12 rounds, chosen implicitly)
- Duplicate detection: checks if email already exists in store
- Returns 201 on success, 400 on validation failure, 409 on duplicate

All three sub-requirements addressed in a single pass. No test written yet.

#### 3d. Login (JWT tokens, failed attempt tracking)
```
Tool: Edit -> src/routes/auth.ts (appended)
```
- POST /api/auth/login
- Finds user by email, compares password with bcrypt
- On success: generates JWT with user id/email, returns token
- On failure: increments failedAttempts counter
- Account lockout after N failures (N chosen implicitly, likely 5)
- JWT secret hardcoded or pulled from process.env.JWT_SECRET with a fallback

No test written yet. The failed attempt tracking logic is implemented inline without independent verification.

#### 3e. Password Reset (token generation, expiry, email notification)
```
Tool: Edit -> src/routes/auth.ts (appended) or Tool: Write -> src/routes/reset.ts
```
- POST /api/auth/forgot-password: generates a random token (uuid or crypto.randomBytes), stores it with an expiry timestamp on the user record, "sends" an email via nodemailer with a mock/ethereal transport
- POST /api/auth/reset-password: validates the token, checks expiry, hashes the new password, clears the token, resets failedAttempts

No test written yet. The email notification is likely stubbed with console.log or ethereal.email in development.

#### 3f. Auth Middleware
```
Tool: Write -> src/middleware/auth.ts
```
- Extracts JWT from Authorization header
- Verifies and decodes token
- Attaches user payload to request object
- Returns 401 on invalid/missing token

### Step 4: Tests Written AFTER All Implementation (~1-2 minutes)

**Would it write tests before code?** No. Default Claude Code writes tests after implementation is complete. The tests are shaped by what was built, not by what was specified.

```
Tool: Write -> src/__tests__/auth.test.ts (or split into register.test.ts, login.test.ts, reset.test.ts)
```

Typical test structure:
```
describe('Registration', () => {
  it('should register a new user with valid email and password')
  it('should reject invalid email format')
  it('should reject duplicate email')
  it('should hash the password (not store plaintext)')
})

describe('Login', () => {
  it('should return JWT token on valid credentials')
  it('should reject wrong password')
  it('should track failed login attempts')
  it('should lock account after N failed attempts')
})

describe('Password Reset', () => {
  it('should generate reset token and send email')
  it('should reset password with valid token')
  it('should reject expired reset token')
})
```

These tests are reasonable but suffer from a critical flaw: they were written by the same agent that wrote the implementation, with full knowledge of the implementation. The tests verify what was built, not what was specified.

### Step 5: Run Tests and Fix (~30-60 seconds)

```
Tool: Bash -> npx jest --verbose
```

If tests fail, Claude Code edits the implementation (or the tests) to make them pass. This is the reverse of TDD: instead of writing a failing test and then making it pass with implementation, Claude adjusts tests to match existing code.

```
Tool: Bash -> npx jest --verbose  (re-run after fixes)
```

### Step 6: Final Output

Claude Code presents a conversational summary of what was built. Something like:

> "I've built a user authentication system with the following endpoints..."

This summary is unstructured text, not a formal report.

---

## Evaluation Against Iteration-2 Assertions

| Assertion | Met? | Notes |
|-----------|------|-------|
| Triggers design gate -- asks clarifying questions before decomposing | **No** | Jumps straight to implementation |
| Produces design summary with components, data flow, key decisions | **No** | No design document produced |
| Decomposes into at least 3 work units | **No** | No formal decomposition; features built linearly |
| Identifies dependencies between units | **No** | Dependencies are implicit in build order only |
| Respects dependency order | **Partially** | Registration is built first by convention, but not tracked formally |
| Each work unit goes through RED->GREEN->review cycle | **No** | No RED phase; tests written after all code |
| Runs final integration test across all units | **No** | Only runs jest once at the end; no dedicated integration pass |
| Report shows all work units with individual phase statuses | **No** | Output is conversational text, not a structured report |

**Score: 0.5 out of 8 assertions** (partial credit on dependency ordering)

---

## What Default Claude Code Does NOT Do

### 1. No Design Gate
- Skips architecture review entirely
- Nine sub-requirements are treated as a checklist, not as a specification to analyze
- Implicit decisions (bcrypt rounds, JWT algorithm, lockout threshold, token expiry duration) are never surfaced for user review
- No data flow diagram or component identification

### 2. No Formal Decomposition
- No work unit definitions with clear inputs, outputs, and acceptance criteria
- No dependency graph (e.g., "login depends on registration because it needs user lookup")
- No parallelization analysis
- No tracking of unit completion status

### 3. Tests Written After Code (Code-First)
- **No RED phase**: every test is written with the implementation already in place
- The test author (Claude) has full knowledge of implementation details
- Tests tend to mirror implementation structure rather than testing behavioral contracts
- Risk of tautological tests: testing that bcrypt was called rather than that passwords are secure

### 4. No Agent Teams
- **Would it use agent teams?** No. Default Claude Code operates as a single sequential agent. There is no:
  - Test Writer agent (with information barrier from implementation)
  - Code Writer agent (constrained to only make existing tests pass)
  - Adversarial Reviewer agent (probing for weaknesses)
  - Spec Compliance Reviewer agent (checking requirements coverage)

### 5. No RED/GREEN Verification
- **Would it verify RED/GREEN phases?** No. There is no mechanism to:
  - Confirm that a test fails before implementation exists
  - Confirm that a test passes only after correct implementation
  - Detect tests that would pass against an empty stub
  - Run mutation testing or equivalent

### 6. No Anti-Pattern Detection
- No gate functions checking for:
  - Tautological tests
  - Over-mocking (e.g., mocking bcrypt in a way that never tests actual hashing)
  - Testing implementation details instead of behavior
  - Missing edge cases from the spec
  - Fragile test coupling to internal APIs

### 7. No State Management
- No `.tdd-state.json` or checkpoint file
- If the session crashes after implementing registration but before login, all context is lost
- No incremental resume capability

### 8. No Structured Report
- **Would it produce a structured report?** No.
- No work unit status table
- No coverage metrics breakdown per feature
- No spec compliance matrix mapping sub-requirements to tests
- No session log for audit purposes

---

## Specific Gaps for This Prompt's Sub-Requirements

The parenthetical sub-requirements create nine testable behaviors. Here is how default Claude Code handles each:

| Sub-Requirement | Likely Covered? | Quality of Coverage |
|-----------------|-----------------|---------------------|
| Email validation | Yes | Probably regex-based; may miss edge cases (internationalized emails, plus-addressing) |
| Password hashing | Yes | bcrypt used correctly, but rounds chosen without discussion |
| Duplicate detection | Yes | Basic "email exists" check; no concurrency handling |
| JWT tokens | Yes | Token generation works; algorithm/secret/expiry chosen implicitly |
| Failed attempt tracking | Likely | Counter logic written but edge cases (reset on success, timing) may be missed |
| Token generation (reset) | Yes | uuid or crypto.randomBytes; security of token entropy not analyzed |
| Token expiry | Likely | Timestamp comparison works; edge case of clock skew not considered |
| Email notification | Partial | Stubbed/mocked; actual email sending not verified |
| Account lockout logic | Likely | Threshold chosen implicitly; unlock-after-duration may be buggy |

---

## Estimated Timeline

| Activity | Time | % of Total |
|----------|------|------------|
| Project detection/scaffolding | ~15s | 4% |
| Implementation (all 3 features + middleware) | ~3-4min | 65% |
| Writing tests after implementation | ~1-2min | 22% |
| Running tests and fixing failures | ~30-60s | 9% |
| Design review | 0s | 0% |
| RED phase verification | 0s | 0% |
| Adversarial review | 0s | 0% |
| Structured reporting | 0s | 0% |
| **Total** | **~5-7min** | **100%** |

---

## Summary Comparison Table

| Capability | Default Claude Code | With TDD Skill |
|------------|-------------------|----------------|
| Design gate (Phase 0) | No | Yes -- asks clarifying Qs, produces design summary |
| Formal decomposition | No | Yes -- work units with dependency DAG |
| Test-first development | No (code-first) | Yes (RED before GREEN) |
| Information barrier | No (single agent sees all) | Yes (Test Writer cannot see implementation) |
| Agent teams | No (single thread) | Yes (Test Writer, Code Writer, Reviewers) |
| RED/GREEN verification | No | Yes (anti-cheat checks) |
| Anti-pattern detection | No | Yes (5 gate functions) |
| Adversarial review | No | Yes (dedicated reviewer agent) |
| Spec compliance review | No | Yes (dedicated reviewer agent) |
| State management/resume | No | Yes (.tdd-state.json checkpoints) |
| Structured reporting | No | Yes (report schema with status table) |
| Parallel work execution | No | Yes (independent units run concurrently) |
| Per-sub-requirement tracking | No | Yes (9 sub-requirements mapped to test cases) |
