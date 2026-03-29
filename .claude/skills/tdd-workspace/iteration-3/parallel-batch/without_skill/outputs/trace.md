# Default Claude Code Behavior Trace: Parallel-Batch REST API (Iteration 3)

## Prompt Given

> /tdd implement a REST API with: (1) GET /users endpoint, (2) POST /users endpoint, (3) GET /users/:id endpoint, (4) DELETE /users/:id endpoint. All endpoints are independent -- no dependencies between them.

Since no TDD skill is loaded, `/tdd` is not a recognized slash command. Claude Code treats the entire string as a natural language request and proceeds with its default implementation-first behavior.

The critical feature of this prompt is the explicit independence declaration: "All endpoints are independent -- no dependencies between them." This is a parallelization signal. The question is whether default Claude Code recognizes and acts on it.

---

## Phase-by-Phase Trace of Default Behavior

### Step 1: Parse the Request (~5 seconds)

Claude Code reads the prompt and identifies four endpoints to implement:
1. GET /users -- list all users
2. POST /users -- create a new user
3. GET /users/:id -- retrieve a single user by ID
4. DELETE /users/:id -- delete a user by ID

Claude recognizes these as a standard CRUD subset (no PUT/PATCH). The "all endpoints are independent" note is absorbed as context but does not trigger any special processing mode. Claude does not:
- Formalize these as four discrete work units
- Build a dependency graph (trivially, four nodes with zero edges)
- Compute parallel batches
- Determine that all four can execute simultaneously

Instead, Claude treats this as "build a REST API with four endpoints" and proceeds sequentially.

### Step 2: Technology Detection (~5-10 seconds)

Claude Code scans the workspace for existing project indicators: `package.json`, `tsconfig.json`, `requirements.txt`, `go.mod`, etc.

For an empty or unrelated workspace, Claude picks a stack. The most likely choice is Node.js/TypeScript with Express (or possibly Fastify), given the REST API nature of the request. It then scaffolds from scratch.

**Would it ask what framework to use?** No. Default Claude Code does not gate on technology decisions. It picks Express/TypeScript by convention and proceeds.

### Step 3: Implementation -- Sequential, Monolithic (~2-4 minutes)

Claude Code writes all implementation code first, without any preceding tests. The four endpoints are built in a single pass, typically in one or two files.

#### 3a. Project Scaffolding
```
Tool: Bash -> npm init -y
Tool: Bash -> npm install express
Tool: Bash -> npm install -D typescript @types/express @types/node jest ts-jest @types/jest supertest @types/supertest
Tool: Write -> tsconfig.json
Tool: Write -> src/app.ts (Express app factory)
Tool: Write -> src/index.ts (server entry point)
```

#### 3b. In-Memory Data Store
```
Tool: Write -> src/store.ts (or inline in routes file)
```
Defines a simple in-memory array or Map of users. Something like:
```typescript
interface User { id: string; name: string; email: string; }
const users: User[] = [];
```

No database, no persistence, no migration strategy discussed with the user.

#### 3c. All Four Endpoints in One Pass
```
Tool: Write -> src/routes/users.ts
```

Claude writes all four route handlers in a single file, sequentially:

1. **GET /users** -- returns the full users array as JSON with 200 status
2. **POST /users** -- parses request body, generates an ID (uuid or incrementing counter), pushes to array, returns 201 with the new user
3. **GET /users/:id** -- finds user by ID in the array, returns 200 if found, 404 if not
4. **DELETE /users/:id** -- finds user by ID, removes from array, returns 204 if found, 404 if not

All four are written by the same agent in the same tool call or in rapid succession. There is no separation of concerns by endpoint, no independent development cycle per endpoint, and no verification between endpoints.

**Critical observation: Claude writes all four endpoints as a single implementation unit.** The explicit statement "all endpoints are independent" is ignored as an execution strategy signal. Claude does not parallelize anything.

#### 3d. Wire Routes to App
```
Tool: Edit -> src/app.ts (add router import and app.use('/users', usersRouter))
```

### Step 4: Tests Written AFTER All Implementation (~1-2 minutes)

Claude writes tests only after all four endpoints are implemented. The tests are shaped by the existing code, not by the spec.

```
Tool: Write -> src/__tests__/users.test.ts
```

Typical test structure:
```
describe('GET /users', () => {
  it('should return an empty array when no users exist')
  it('should return all users')
})

describe('POST /users', () => {
  it('should create a new user and return 201')
  it('should return the created user with an id')
  it('should return 400 for invalid input')   // maybe
})

describe('GET /users/:id', () => {
  it('should return a user by id')
  it('should return 404 for non-existent id')
})

describe('DELETE /users/:id', () => {
  it('should delete a user and return 204')
  it('should return 404 for non-existent id')
})
```

These tests use `supertest` to make HTTP requests against the Express app. They are reasonable integration-style tests, but they share a critical flaw: the same agent that wrote the implementation also wrote the tests, with full knowledge of how the endpoints work internally.

**Would tests be written per-endpoint in independent cycles?** No. All tests are written in a single file, in a single pass, after all code exists.

### Step 5: Run Tests and Fix (~30-60 seconds)

```
Tool: Bash -> npx jest --verbose
```

If any tests fail, Claude edits the implementation or the tests to make them pass. This is the reverse of TDD.

```
Tool: Bash -> npx jest --verbose  (re-run after fixes)
```

### Step 6: Final Output

Claude presents a conversational summary:

> "I've built a REST API with four endpoints for managing users: GET /users, POST /users, GET /users/:id, and DELETE /users/:id. All tests pass."

No structured report, no per-endpoint status, no coverage breakdown.

---

## Evaluation Against Assertions

| # | Assertion | Met? | Notes |
|---|-----------|------|-------|
| 1 | Decomposes into 4 work units with no dependencies between them | **No** | All four endpoints treated as one monolithic task |
| 2 | Computes a single parallel batch containing all 4 units | **No** | No batch computation; no concept of parallel batches |
| 3 | Presents the execution plan showing all units run concurrently in Batch 1 | **No** | No execution plan presented; no concurrency |
| 4 | Dispatches multiple Test Writers simultaneously (up to maxParallelPairs) | **No** | No agent dispatch; single sequential thread |
| 5 | Each unit independently goes through the full RED->GREEN->review cycle | **No** | No RED phase; tests written after all code |
| 6 | Applies the three-stage review pipeline: spec compliance, adversarial, code quality | **No** | No review pipeline of any kind |
| 7 | Runs a final integration test after all units complete | **No** | Runs jest once at the end, but this is the only test run, not a dedicated integration pass |

**Score: 0 out of 7 assertions met.**

---

## What Default Claude Code Does NOT Do

### 1. No Decomposition into Work Units

The prompt explicitly names four independent endpoints. The TDD skill would recognize each as a discrete work unit with its own acceptance criteria, test file, and implementation cycle. Default Claude Code lumps them into a single task.

- No `WorkUnit[]` data structure
- No dependency analysis (which would trivially yield an empty edge set)
- No assignment of individual endpoints to separate agents
- The explicit "all endpoints are independent" hint is information that Claude absorbs as background context but does not operationalize

### 2. No Parallel Batch Computation

With four independent units and zero dependencies, the optimal execution plan is a single batch of four concurrent work streams. The TDD skill would:
- Build a DAG with four nodes and zero edges
- Compute batches via topological sort: `[Batch 1: [GET /users, POST /users, GET /users/:id, DELETE /users/:id]]`
- Present this plan to the user before execution
- Dispatch up to `maxParallelPairs` (default 3) agents simultaneously, with the 4th queued

Default Claude Code does none of this. It processes endpoints linearly within a single thread.

### 3. No Concurrent Agent Dispatch

This is the central capability gap for this eval case. The TDD skill would dispatch multiple Test Writer agents in parallel, each writing tests for a different endpoint, followed by parallel Code Writer agents. Default Claude Code:
- Has no concept of agent teams for this task
- Does not use the Agent tool to fan out work
- Does not exploit the independence of endpoints for parallel execution
- Processes everything in a single sequential stream

**Would Claude Code use any parallelism at all?** It might make multiple independent tool calls within a single turn (e.g., writing two files simultaneously), but this is tool-call-level parallelism, not work-unit-level parallelism. There is no concurrent RED/GREEN cycle across endpoints.

### 4. No Three-Stage Review Pipeline

The TDD skill applies three sequential review stages after each work unit completes its RED->GREEN cycle:
1. **Spec Compliance Review** -- verifies the implementation satisfies the stated requirements
2. **Adversarial Review** -- probes for edge cases, security issues, missing error handling
3. **Code Quality Review** -- checks for anti-patterns, maintainability, consistency

Default Claude Code has no review pipeline. The code is written, tests are added, tests pass, and the task is considered done.

### 5. No RED Phase or Anti-Cheat Verification

For each endpoint, the TDD skill would:
- Write tests first (RED phase)
- Run them to confirm they fail
- Write implementation to make them pass (GREEN phase)
- Verify that the tests actually failed before and pass after (anti-cheat)

Default Claude Code skips all of this. Tests are never observed in a failing state.

### 6. No Per-Endpoint Tracking

There is no state file tracking the progress of each endpoint independently. If the session crashes after implementing GET /users and POST /users, there is no checkpoint to resume from. The TDD skill would maintain `.tdd-state.json` with per-unit status (pending, red, green, review, done).

### 7. No Integration Test Pass

After all four endpoints are implemented, the TDD skill runs a dedicated integration test that exercises cross-endpoint scenarios:
- Create a user via POST, retrieve via GET /users/:id, verify presence in GET /users, delete via DELETE, confirm absence
- Verify ID consistency across endpoints
- Test error responses (404 after delete, etc.)

Default Claude Code runs `jest` once, which executes whatever tests were written. These tests may individually test each endpoint but do not constitute a deliberate integration test pass that verifies cross-endpoint consistency.

---

## Why This Eval Case Matters

This eval case is specifically designed to test parallel execution capabilities. The prompt makes independence explicit -- "all endpoints are independent -- no dependencies between them" -- precisely to see if the system:

1. **Recognizes** the independence declaration as an execution strategy signal
2. **Decomposes** the work into four units with zero dependencies
3. **Batches** all four into a single concurrent batch
4. **Dispatches** agents in parallel to exploit independence
5. **Maintains** independent RED->GREEN cycles per endpoint

Default Claude Code fails at step 1. It reads "all endpoints are independent" as a domain fact (the endpoints don't depend on each other at runtime) rather than as an execution directive (build them in parallel). This fundamental misinterpretation means steps 2-5 never happen.

---

## Estimated Timeline

| Activity | Time | % of Total |
|----------|------|------------|
| Project detection/scaffolding | ~15s | 5% |
| Implementation (all 4 endpoints, sequential) | ~2-3min | 55% |
| Writing tests after implementation | ~1-2min | 30% |
| Running tests and fixing failures | ~30s | 10% |
| Decomposition into work units | 0s | 0% |
| Parallel batch computation | 0s | 0% |
| Concurrent agent dispatch | 0s | 0% |
| Per-endpoint RED/GREEN cycles | 0s | 0% |
| Three-stage review pipeline | 0s | 0% |
| Integration test pass | 0s | 0% |
| **Total** | **~4-6min** | **100%** |

Compare with TDD skill (estimated): ~3-5min wall clock (parallel execution of 4 independent cycles, each ~2-3min, capped at 3 concurrent by default), but with dramatically richer verification per endpoint.

---

## Summary Comparison Table

| Capability | Default Claude Code | With TDD Skill |
|------------|-------------------|----------------|
| Recognizes 4 independent endpoints as separate work units | No (single monolithic task) | Yes (4 WorkUnit entries) |
| Builds dependency graph | No | Yes (4 nodes, 0 edges) |
| Computes parallel batches | No | Yes (1 batch of 4) |
| Presents execution plan before running | No | Yes (batch layout shown to user) |
| Dispatches concurrent agents | No (single sequential thread) | Yes (up to maxParallelPairs=3 simultaneous) |
| Per-endpoint RED phase (tests first) | No (all tests after all code) | Yes (each endpoint gets own failing test first) |
| Per-endpoint GREEN phase | No | Yes (each endpoint implemented to pass its tests) |
| Anti-cheat verification per endpoint | No | Yes (RED confirmed before GREEN) |
| Spec compliance review | No | Yes (per-endpoint reviewer) |
| Adversarial review | No | Yes (per-endpoint reviewer) |
| Code quality review | No | Yes (per-endpoint reviewer) |
| Independent state tracking per endpoint | No | Yes (.tdd-state.json per-unit status) |
| Dedicated integration test pass | No | Yes (cross-endpoint scenarios) |
| Structured report with per-unit status | No | Yes (table with RED/GREEN/review status per unit) |
| Total test runs (RED + GREEN + integration) | 1 (final only) | 9+ (RED, GREEN per endpoint, plus integration) |
