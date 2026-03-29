# Default Claude Code Behavior Trace: User Authentication System

## Prompt Given

> /tdd build a user authentication system with registration (email validation, password hashing, duplicate detection), login (JWT tokens, failed attempt tracking), and password reset (token generation, expiry, email notification)

Since no TDD skill is loaded, `/tdd` is not recognized as a slash command. Claude Code would treat the entire string as a natural language request and proceed with its default behavior.

---

## Phase-by-Phase Trace of Default Behavior

### Step 1: Initial Assessment (~5 seconds)

Claude Code would read the prompt and immediately begin planning implementation. It would **not** ask clarifying design questions. Default behavior is to be helpful and start building rather than interrogating the user.

**What it skips:**
- No questions about database choice (SQL vs NoSQL)
- No questions about token algorithm preferences (HS256 vs RS256)
- No questions about password policy requirements
- No questions about rate limiting strategy
- No questions about email provider integration
- No architecture design document or review gate

**What it does instead:** Infers reasonable defaults (e.g., bcrypt, HS256 JWT, in-memory or SQLite, nodemailer) and proceeds.

### Step 2: Technology Detection (~10 seconds)

Claude Code scans the project for `package.json`, `tsconfig.json`, `requirements.txt`, `go.mod`, etc. to determine the tech stack. If the project is empty, it picks a stack (most likely Node.js/TypeScript with Express) and scaffolds from scratch.

### Step 3: Implementation Plan (Internal, Not Externalized)

Claude Code forms a rough mental plan but **does not write it down or present it for review**. The plan is implicit in the order it generates files. A likely ordering:

1. Project scaffolding (package.json, tsconfig, folder structure)
2. Database models/schema
3. Registration endpoint
4. Login endpoint
5. Password reset endpoint
6. Middleware (auth, validation)
7. Tests (if written at all)

### Step 4: Execution - Monolithic Code Generation

This is where default Claude Code spends the bulk of its time. The typical execution trace:

#### 4a. Project Scaffolding
```
Tool: Bash -> npm init -y
Tool: Bash -> npm install express bcrypt jsonwebtoken nodemailer uuid
Tool: Bash -> npm install -D typescript @types/express @types/bcrypt jest ts-jest @types/jest
Tool: Write -> tsconfig.json
Tool: Write -> src/index.ts (Express app entry point)
```

#### 4b. Database Layer
```
Tool: Write -> src/models/User.ts
  - User interface with id, email, passwordHash, failedAttempts, lockedUntil, etc.
  - In-memory store OR SQLite setup
  - No migration strategy
```

#### 4c. Registration (all at once)
```
Tool: Write -> src/routes/auth.ts
  - POST /register endpoint
  - Email validation (regex or validator library)
  - Password hashing with bcrypt
  - Duplicate email check
  - Returns 201 with user object
```

#### 4d. Login (appended to same file or new file)
```
Tool: Edit -> src/routes/auth.ts (or Tool: Write -> src/routes/login.ts)
  - POST /login endpoint
  - Password comparison with bcrypt
  - JWT generation on success
  - Failed attempt counter increment on failure
  - Account lockout after N failures
```

#### 4e. Password Reset
```
Tool: Edit -> src/routes/auth.ts (or Tool: Write -> src/routes/reset.ts)
  - POST /forgot-password -> generates reset token, stores with expiry
  - POST /reset-password -> validates token, checks expiry, updates password
  - Email sending via nodemailer (likely with a mock/stub transport)
```

#### 4f. Middleware
```
Tool: Write -> src/middleware/auth.ts
  - JWT verification middleware
  - Attaches user to request object
```

#### 4g. Tests (written AFTER implementation)
```
Tool: Write -> src/__tests__/auth.test.ts
  - Tests for registration (happy path, duplicate email, invalid email)
  - Tests for login (success, wrong password, locked account)
  - Tests for password reset (generate token, use token, expired token)
```

#### 4h. Run Tests
```
Tool: Bash -> npx jest
  - Fix any failures by editing implementation
  - Re-run until green
```

### Step 5: Final Verification
```
Tool: Bash -> npx jest (confirm all pass)
Tool: Bash -> npx tsc --noEmit (type check)
```

Claude Code presents a summary of what was built.

---

## Critical Analysis: What Default Claude Code Does NOT Do

### 1. No Design Gate
- Does not ask the user to confirm architecture before coding
- Does not produce a design document
- Does not consider alternative approaches
- Does not identify risks or unknowns upfront
- Assumptions are implicit and undocumented

### 2. No Formal Decomposition with Dependency Analysis
- Does not break the system into discrete work units
- Does not analyze dependencies between components
- Does not identify which units can be built in parallel
- Does not create a dependency graph
- Work order is linear and intuitive rather than optimized

### 3. Tests Are Written AFTER Code (Code-First, Not Test-First)
- Implementation is written first, tests are written to match
- This means tests verify what was built, not what was specified
- Tests are shaped by implementation details, not by requirements
- **No RED phase**: tests are never seen failing before the implementation exists
- **No anti-cheat verification**: no check that tests actually test meaningful behavior
- Risk of tautological tests that pass by construction

### 4. No Agent Teams or Parallel Execution
- All work is done sequentially in a single thread
- No Test Writer agent with an information barrier from implementation
- No separate Code Writer agent
- No adversarial reviewer agent
- No spec compliance reviewer
- Everything is done by the same "mind" that can see all code at once

### 5. No Formal Verification Checks
- No RED/GREEN/REFACTOR cycle enforcement
- No mutation testing or equivalent
- No check that tests fail when implementation is removed
- No anti-pattern detection (testing implementation details, mock-heavy tests, etc.)
- No coverage analysis beyond what jest reports by default
- No adversarial review pass

### 6. No State Management or Incremental Resume
- If the session is interrupted, all context is lost
- No `.tdd-state.json` or equivalent checkpoint file
- Cannot resume from a specific phase
- No audit trail of decisions made

### 7. No Structured Reporting
- Final output is conversational, not structured
- No work unit status table
- No coverage metrics summary
- No spec compliance matrix
- No session log for future reference

---

## Typical Failure Modes of Default Behavior

### Failure Mode 1: Coupled Tests
Tests are written by the same agent that wrote the code. The tests tend to mirror the implementation structure rather than testing behavior from the outside. If the implementation has a bug in its logic, the test may encode the same flawed logic.

### Failure Mode 2: Missing Edge Cases
Without a dedicated test-writing phase driven by the spec, edge cases are often missed:
- What happens when the reset token is used twice?
- What happens with concurrent registration of the same email?
- What happens when JWT secret is rotated?
- What if the email service is down during password reset?
- Unicode in email addresses?
- Timing attacks on password comparison?

### Failure Mode 3: Implicit Architecture Decisions
The choice of in-memory storage vs. a real database, the JWT algorithm, the password hashing rounds, the lockout policy -- all are chosen implicitly without user input. These may not match the user's actual requirements.

### Failure Mode 4: No Incremental Validation
The entire system is built before any testing occurs. If a fundamental design choice is wrong (e.g., the user wanted OAuth2, not JWT), significant rework is needed.

### Failure Mode 5: Monolithic File Structure
Default Claude Code often produces fewer, larger files rather than well-decomposed modules. The auth routes file may contain registration, login, and reset logic all interleaved.

---

## Estimated Timeline

| Activity | Time | % of Total |
|----------|------|------------|
| Project detection/scaffolding | ~15s | 5% |
| Implementation (all features) | ~3-5min | 70% |
| Writing tests (after the fact) | ~1-2min | 20% |
| Fixing test failures | ~30s | 5% |
| **Total** | **~5-8min** | **100%** |

Note: Design is 0% of time. Test-first verification is 0% of time. Adversarial review is 0% of time.

---

## Summary Comparison Table

| Capability | Default Claude Code | With TDD Skill |
|------------|-------------------|----------------|
| Design gate | No | Yes (Phase 0) |
| Spec decomposition | Informal/implicit | Formal work units with DAG |
| Test-first development | No (code-first) | Yes (RED before GREEN) |
| Information barrier | No (single agent) | Yes (Test Writer cannot see impl) |
| Agent teams | No | Yes (Test Writer, Code Writer, Reviewers) |
| RED/GREEN verification | No | Yes (anti-cheat checks) |
| Anti-pattern detection | No | Yes (5 pattern gates) |
| Adversarial review | No | Yes (dedicated reviewer agent) |
| Spec compliance review | No | Yes (dedicated reviewer agent) |
| State management/resume | No | Yes (.tdd-state.json) |
| Structured reporting | No | Yes (report schema) |
| Parallel work execution | No | Yes (independent units) |
