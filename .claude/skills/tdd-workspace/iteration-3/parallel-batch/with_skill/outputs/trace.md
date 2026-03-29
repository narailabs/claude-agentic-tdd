# Parallel Execution Trace: REST API with 4 Independent Endpoints

**Spec**: implement a REST API with: (1) GET /users endpoint, (2) POST /users endpoint, (3) GET /users/:id endpoint, (4) DELETE /users/:id endpoint

**Skill version**: SKILL.md (agentic-tdd)
**Entry point mode**: Mode 1 (Natural language spec)
**Date**: 2026-03-28

---

## Phase 0: Design Gate Evaluation

### Trigger Condition Check

The skill evaluates whether to run the design gate (SKILL.md lines 136-148):

- "The spec mentions 3+ distinct features or components" -- YES: 4 endpoints
- "The spec involves external integrations (APIs, databases, auth providers)" -- MAYBE: REST API implies HTTP framework
- "The spec is ambiguous about data flow, ownership, or error handling" -- NO: endpoints are straightforward CRUD
- User did not pass `--design` or `--skip-design`

**Decision**: The 3+ features trigger fires. The design gate RUNS.

### Design Refinement Process (SKILL.md lines 152-181)

**Step 1 -- Clarifying questions** (1-3, asked one at a time):

1. "Should the user data be persisted in a database or in-memory store?"
2. "What fields should a user have -- just name and email, or more?"
3. "Should DELETE return the deleted user or just a status confirmation?"

User answers (assumed for trace): in-memory store, `{id, name, email}`, return 204 No Content.

**Step 2 -- Propose approaches**:

- "Option A: Express.js with plain route handlers (simple, no ORM overhead)"
- "Option B: Express.js with a service layer separating route handling from data logic (more testable, slight overhead)"

User selects Option B.

**Step 3 -- Design summary**:

```
## Design Summary

### Components
- Router: Express route handlers for /users endpoints
- UserService: Business logic for CRUD operations
- In-memory store: Array-based user storage

### Data Flow
HTTP Request -> Router -> UserService -> In-Memory Store -> Response

### Key Decisions
- In-memory storage (no database)
- Service layer for testability
- 204 No Content for DELETE

### Out of Scope
- Authentication, pagination, validation beyond basic checks
```

**Step 4 -- User approval**: User confirms. Design stored in state file under `designSummary`.

**HARD GATE cleared**: Decomposition may now proceed.

---

## Phase 1: Framework Detection

Reference: `reference/framework-detection.md`

The skill runs detection in priority order:

1. Check `.tdd.config.json` -- not found
2. Check project CLAUDE.md for `## TDD Configuration` -- not found
3. Auto-detect from project files:
   - `cat package.json 2>/dev/null` -- finds `vitest` in devDependencies
   - `tsconfig.json` exists -- TypeScript project

**Detection result**:
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

## Phase 2: Work Decomposition

### 2.1 Decomposition into 4 Units

The skill analyzes the spec and produces 4 work units (SKILL.md lines 199-209):

| Field | Unit 1 | Unit 2 | Unit 3 | Unit 4 |
|-------|--------|--------|--------|--------|
| **id** | `get-users` | `post-users` | `get-user-by-id` | `delete-user-by-id` |
| **name** | GET /users | POST /users | GET /users/:id | DELETE /users/:id |
| **type** | `"code"` | `"code"` | `"code"` | `"code"` |
| **spec-contract** | Return list of all users as JSON array. Empty array if no users. Status 200. | Accept JSON body with name and email. Validate required fields. Create user with generated ID. Return 201 with created user. Return 400 for missing fields. | Accept user ID as URL parameter. Return user as JSON with status 200. Return 404 if user not found. | Accept user ID as URL parameter. Delete user from store. Return 204 No Content. Return 404 if user not found. |
| **dependsOn** | `[]` | `[]` | `[]` | `[]` |
| **testFiles** | `src/__tests__/get-users.test.ts` | `src/__tests__/post-users.test.ts` | `src/__tests__/get-user-by-id.test.ts` | `src/__tests__/delete-user-by-id.test.ts` |
| **implFiles** | `src/get-users.ts` | `src/post-users.ts` | `src/get-user-by-id.ts` | `src/delete-user-by-id.ts` |

### 2.2 Dependency Analysis

Per SKILL.md lines 212-215:

> "Examine the work units for dependencies:
> - Units that import/use types or functions from other units are dependent
> - Units that operate on the same data structures may need sequencing
> - Independent units can run in parallel"

**Analysis**:

- GET /users: No imports from other units. Reads from shared store but does not mutate it in a way that affects others.
- POST /users: No imports from other units. Writes to shared store, but other units do not depend on POST having been defined first.
- GET /users/:id: No imports from other units. Reads from store independently.
- DELETE /users/:id: No imports from other units. Mutates store but does not depend on other endpoints existing.

**Key observation**: All 4 endpoints share the in-memory store, but each unit's TEST can operate independently by seeding its own test data. No unit imports types or functions from another unit. Each has its own test file and implementation file.

**Result**: `dependsOn: []` for all 4 units. All are independent.

### 2.3 Topological Sort

The dependency graph is:

```
get-users        -> (no deps)
post-users       -> (no deps)
get-user-by-id   -> (no deps)
delete-user-by-id -> (no deps)
```

Topological sort algorithm:
1. Find all nodes with in-degree 0 (no dependencies): ALL 4 units
2. These form Batch 1
3. No remaining nodes -> sort complete

**Result**: Single batch containing all 4 units.

### 2.4 Execution Plan

Per SKILL.md lines 496-505, the system groups units with no dependencies into concurrent batches:

> "Batch 1: all units with no dependencies (roots)"

```
Execution plan:
  Batch 1 (parallel): get-users, post-users, get-user-by-id, delete-user-by-id
```

### 2.5 User Confirmation Prompt

The skill presents (SKILL.md lines 219-249):

```
## TDD Work Plan

Framework: vitest (auto-detected)
Mode: natural-language-spec
Parallel: auto (max 3 concurrent)
Work units: 4

### Unit 1: get-users [code]
Spec: Return list of all users as JSON array. Empty array if no users. Status 200.
Files: src/__tests__/get-users.test.ts -> src/get-users.ts
Dependencies: none

### Unit 2: post-users [code]
Spec: Accept JSON body with name and email. Validate fields. Create user with generated ID. Return 201. Return 400 for invalid input.
Files: src/__tests__/post-users.test.ts -> src/post-users.ts
Dependencies: none

### Unit 3: get-user-by-id [code]
Spec: Accept user ID as URL param. Return user JSON with 200. Return 404 if not found.
Files: src/__tests__/get-user-by-id.test.ts -> src/get-user-by-id.ts
Dependencies: none

### Unit 4: delete-user-by-id [code]
Spec: Accept user ID as URL param. Delete user. Return 204 No Content. Return 404 if not found.
Files: src/__tests__/delete-user-by-id.test.ts -> src/delete-user-by-id.ts
Dependencies: none

Execution plan:
  Batch 1 (parallel): get-users, post-users, get-user-by-id, delete-user-by-id

Proceed? [confirm/modify/cancel]
```

User confirms. Phase 2 complete.

---

## Phase 3: State Initialization

Reference: `reference/state-management.md`

1. Check for existing `.tdd-state.json` -- not found, create new
2. Add to `.gitignore`: `.tdd-state.json`, `tdd-session.jsonl`, `spec-contract-*.md`
3. Initialize session log `tdd-session.jsonl`

State file created with all 4 units at `status: "pending"`, config loaded with defaults including `maxParallelPairs: 3`.

Session log event:
```json
{"timestamp":"2026-03-28T...","event":"session.start","unitId":null,"data":{"spec":"implement a REST API with...","entryPoint":"natural-language-spec","framework":{"language":"typescript","testRunner":"vitest"}}}
{"timestamp":"2026-03-28T...","event":"decomposition.complete","unitId":null,"data":{"units":[{"id":"get-users","name":"GET /users","dependsOn":[]},{"id":"post-users","name":"POST /users","dependsOn":[]},{"id":"get-user-by-id","name":"GET /users/:id","dependsOn":[]},{"id":"delete-user-by-id","name":"DELETE /users/:id","dependsOn":[]}]}}
{"timestamp":"2026-03-28T...","event":"user.confirmed","unitId":null,"data":{"unitCount":4}}
```

---

## Phase 4: Agent Team Orchestration -- Batch 1 Execution

### 4.0 Model Assignment (auto strategy)

Per SKILL.md lines 76-89, with `modelStrategy: "auto"`:

All 4 units are **mechanical tasks** -- each is an isolated endpoint, clear spec, touches 1-2 files:

| Unit | Test Writer | Code Writer | Reviewers |
|------|-------------|-------------|-----------|
| get-users | haiku | haiku | sonnet |
| post-users | haiku | haiku | sonnet |
| get-user-by-id | haiku | haiku | sonnet |
| delete-user-by-id | haiku | haiku | sonnet |

### 4.1 Concurrent Dispatch of Test Writers

Per SKILL.md lines 508-513:

> "Within each batch, spawn agent teams concurrently (up to maxParallelPairs):
> TDD units: Spawn Test Writers simultaneously."

**maxParallelPairs = 3** (default config). Batch 1 has 4 units.

**Dispatch timeline**:

```
T=0  [DISPATCH] Test Writer: get-users       (slot 1/3)
T=0  [DISPATCH] Test Writer: post-users      (slot 2/3)
T=0  [DISPATCH] Test Writer: get-user-by-id  (slot 3/3)
T=0  [QUEUED]   Test Writer: delete-user-by-id (waiting -- all 3 slots occupied)
```

3 Test Writers run concurrently. The 4th is queued until a slot frees.

Each Test Writer receives the prompt from `reference/test-writer-prompt.md` filled with:
- Its unit's spec-contract ONLY
- Framework info (vitest, TypeScript)
- Target test file path
- Project conventions
- Instructions to write behavior tests with meaningful assertions
- Instruction to create `spec-contract-{unit_id}.md` artifact

### 4.2 Pipeline Progression (Per-Unit, Independent)

Each unit's pipeline proceeds independently after its Test Writer completes. The key insight: as each Test Writer finishes, its unit immediately enters RED verification while other Test Writers may still be running. When a slot opens, the queued unit's Test Writer is dispatched.

**Trace of the full concurrent execution** (times are illustrative):

```
T=0:00  [TW-SPAWN]  get-users, post-users, get-user-by-id (3 concurrent)
        [QUEUED]     delete-user-by-id

T=0:45  [TW-DONE]   get-users Test Writer completes
        [VERIFY]     Verify test file + spec-contract-get-users.md exist on disk
        [RED-START]  get-users enters RED verification
        [TW-SPAWN]  delete-user-by-id (slot freed, dequeued -> slot 3/3)

--- get-users RED verification (runs in parallel with other TW agents) ---

T=0:46  [RED-1]  Check: test file exists at src/__tests__/get-users.test.ts -> PASS
T=0:47  [RED-2]  Run: npx vitest run src/__tests__/get-users.test.ts
                 Exit code: 1 (tests fail -- no implementation) -> PASS (RED confirmed)
T=0:47  [RED-3]  Parse output: "Cannot find module '../get-users'" -> correct failure type -> PASS
T=0:48  [RED-4]  Count assertions: 4 expect() calls across 3 test functions
                 Density = 4/3 = 1.33 >= 1 (minAssertionsPerTest) -> PASS
T=0:48  [RED-5]  Behavior-over-implementation scan:
                 - Mock count: 0 (no excessive mocking)
                 - Private method access: none
                 - Implementation mirroring: none -> PASS
T=0:49  [RED-CHECKSUM] shasum -a 256 src/__tests__/get-users.test.ts -> stored
T=0:49  [RED-PASS] get-users RED verification passed

--- get-users Code Writer phase ---

T=0:50  [CW-SPAWN]  get-users Code Writer
                    Information barrier enforced:
                    - Test file contents: read from DISK (not TW output)
                    - spec-contract-get-users.md: read from DISK
                    - NO Test Writer prompt/reasoning included
                    - NO other unit's code included

T=1:00  [TW-DONE]   post-users Test Writer completes
        [VERIFY]     Verify test file + spec-contract-post-users.md exist on disk
        [RED-START]  post-users enters RED verification

--- post-users RED verification (parallel with get-users CW and other units) ---

T=1:01  [RED-1]  Test file exists -> PASS
T=1:02  [RED-2]  Tests fail (exit 1) -> PASS
T=1:02  [RED-3]  "Cannot find module '../post-users'" -> correct failure -> PASS
T=1:03  [RED-4]  Assertion density: 6 assertions / 4 tests = 1.5 >= 1 -> PASS
T=1:03  [RED-5]  Behavior scan clean -> PASS
T=1:04  [RED-CHECKSUM] stored
T=1:04  [RED-PASS] post-users RED verification passed

T=1:05  [CW-SPAWN]  post-users Code Writer (same information barrier rules)

T=1:10  [TW-DONE]   get-user-by-id Test Writer completes
        [VERIFY]     Verify test file + spec-contract-get-user-by-id.md exist on disk
        [RED-START]  get-user-by-id enters RED verification

--- get-user-by-id RED verification ---

T=1:11  [RED-1 through RED-5] All pass
T=1:14  [RED-PASS] get-user-by-id RED verification passed
T=1:15  [CW-SPAWN]  get-user-by-id Code Writer

T=1:20  [TW-DONE]   delete-user-by-id Test Writer completes
        [VERIFY]     Verify files exist on disk
        [RED-START]  delete-user-by-id RED verification

T=1:24  [RED-PASS] delete-user-by-id RED verification passed
T=1:25  [CW-SPAWN]  delete-user-by-id Code Writer

--- Code Writers complete (each independently) ---

T=1:35  [CW-DONE]   get-users Code Writer completes
        [GREEN-START] get-users GREEN verification

--- get-users GREEN verification ---

T=1:35  [GREEN-1] Checksum compare: shasum -a 256 src/__tests__/get-users.test.ts
                  Matches stored checksum -> test file unchanged -> PASS
T=1:36  [GREEN-2] grep for skip/focus markers in test file -> none found -> PASS
T=1:36  [GREEN-3] Run: npx vitest run src/__tests__/get-users.test.ts
                  Exit code: 0, all tests pass -> PASS
T=1:37  [GREEN-4] Heuristic: scan implementation for hardcoded returns -> clean
T=1:37  [GREEN-PASS] get-users GREEN verification passed

--- get-users enters three-stage review pipeline ---

T=1:40  [CW-DONE]   post-users Code Writer completes
        [GREEN-START] post-users GREEN verification
        ...
T=1:44  [GREEN-PASS] post-users GREEN verification passed

T=1:50  [CW-DONE]   get-user-by-id Code Writer completes
T=1:54  [GREEN-PASS] get-user-by-id GREEN verification passed

T=1:55  [CW-DONE]   delete-user-by-id Code Writer completes
T=1:59  [GREEN-PASS] delete-user-by-id GREEN verification passed
```

### 4.3 Three-Stage Review Pipeline (Per Unit)

Reference: SKILL.md lines 412, 457 -- "ORDERING RULE: Spec compliance -> Adversarial review -> Code quality. Each stage must pass before the next runs."

Each unit goes through the review stages sequentially within itself, but different units' reviews run concurrently (subject to maxParallelPairs).

#### Stage 1: Spec Compliance Review (Step 4e)

Reference: `reference/spec-compliance-reviewer-prompt.md`

For each unit, a Spec Compliance Reviewer teammate is spawned with:
- `spec-contract-{unit_id}.md` contents (read from disk)
- Design summary from state file
- Test file contents (read from disk)
- Implementation file contents (read from disk)

**get-users** Spec Compliance Review:
```
## Spec Compliance Review: GET /users

### Verdict: COMPLIANT

### Requirement Matrix
| # | Requirement | Implemented | Tested | Notes |
|---|------------|-------------|--------|-------|
| 1 | Return all users as JSON array | YES | YES | |
| 2 | Empty array when no users | YES | YES | |
| 3 | Status 200 | YES | YES | |

### Missing Requirements: None
### Scope Creep: None
### Blocking Issues: None
```

**post-users** Spec Compliance Review:
```
### Verdict: COMPLIANT
Requirements: accept body, validate name+email, generate ID, return 201,
return 400 for missing fields -- all covered.
```

**get-user-by-id** Spec Compliance Review:
```
### Verdict: COMPLIANT
Requirements: accept ID param, return 200 with user, return 404 if not found -- all covered.
```

**delete-user-by-id** Spec Compliance Review:
```
### Verdict: COMPLIANT
Requirements: accept ID param, delete user, return 204, return 404 if not found -- all covered.
```

All 4 units pass spec compliance. Proceed to adversarial review.

#### Stage 2: Adversarial Review (Step 4f)

Reference: `reference/adversarial-reviewer-prompt.md`, `reference/testing-anti-patterns.md`

For each unit, an Adversarial Reviewer teammate is spawned with:
- spec-contract (from disk)
- test file contents (from disk)
- implementation file contents (from disk)
- scoring rubric

The reviewer checks against the 5-point checklist and the 5 documented anti-patterns.

**get-users** Adversarial Review:
```
## Adversarial Review: GET /users

### Verdict: PASS
### Test Completeness: 4/5 -- covers happy path and empty state
### Test Quality: 4/5 -- meaningful assertions on response body and status
### Implementation Quality: 4/5 -- minimal, correct
### Cheating Detection: CLEAN -- no hardcoded returns, no test-aware code
### Coverage Gaps: None critical
### Critical Issues: None
### Recommendations:
1. Consider testing with large numbers of users (performance boundary)
```

**post-users** Adversarial Review:
```
### Verdict: PASS
Cheating Detection: CLEAN
Recommendations: Consider testing duplicate email handling
```

**get-user-by-id** Adversarial Review:
```
### Verdict: PASS
Cheating Detection: CLEAN
Recommendations: Consider testing with invalid ID formats (non-numeric)
```

**delete-user-by-id** Adversarial Review:
```
### Verdict: PASS
Cheating Detection: CLEAN
Recommendations: Consider testing double-delete (idempotency)
```

All 4 units pass adversarial review. Proceed to code quality review.

#### Stage 3: Code Quality Review (Step 4g)

Reference: `reference/code-quality-reviewer-prompt.md`

For each unit, a Code Quality Reviewer teammate is spawned with:
- Implementation file contents (from disk)
- Test file contents (from disk)
- Git diff for this unit

The reviewer checks: single responsibility, naming, YAGNI discipline, project patterns, test quality.

**get-users** Code Quality Review:
```
Assessment: Approved
Strengths: Single clear responsibility, clean interface, follows project patterns
Issues: None critical or important
```

**post-users** Code Quality Review:
```
Assessment: Approved
Strengths: Validation logic is clear, correct exports
Issues: None critical
Minor: Consider extracting validation to a shared utility
```

**get-user-by-id** Code Quality Review:
```
Assessment: Approved
```

**delete-user-by-id** Code Quality Review:
```
Assessment: Approved
```

All 4 units pass code quality review. Each is marked `status: "completed"` in the state file.

### 4.4 Batch 1 Completion

Per SKILL.md line 515: "Wait for ALL units in a batch to complete (including reviews) before starting the next batch."

All 4 units in Batch 1 are complete. There is no Batch 2 (single-batch execution plan). Phase 4 is done.

---

## Phase 5: Final Review -- Integration Verification

Reference: SKILL.md lines 528-549

### Step 1: Run Full Test Suite

```bash
npx vitest run 2>&1
```

The skill runs ALL test files together (not individually as in per-unit verification). This catches:
- Import conflicts between units
- Shared state corruption (e.g., one unit's test data leaking into another)
- Missing shared dependencies (e.g., the store module)

**Expected output**: All tests across all 4 test files pass.

### Step 2: Verify Pristine Output

Check: no warnings, no skipped tests, no pending tests. The output must be "clean green."

### Step 3: Holistic Code Review

The skill reviews all generated code across units:
- Are there naming conflicts? (e.g., two files exporting the same name)
- Are there missing connections? (e.g., shared store module needed by all units)
- Is the user data model consistent across endpoints?

### Step 4: Cross-Unit Integration Check

Although units have no formal dependencies, they share the in-memory store conceptually. The integration check verifies:
- POST /users creates a user that GET /users returns
- POST /users creates a user that GET /users/:id can find
- DELETE /users/:id removes a user that GET /users no longer returns

If integration tests do not already exist, the skill may generate them or flag this for the user.

### Step 5: Verification Anti-Rationalization

Per SKILL.md lines 539-549, the skill applies the anti-rationalization table. It does NOT accept:
- "Tests should pass now" -- it actually runs them and reads output
- "Same pattern as before" -- it verifies each unit independently

**Integration check result**: All tests pass. No integration issues found.

---

## Phase 6: Report Generation

Reference: `reference/report-format.md`

Two files generated:

### tdd-report.md

```markdown
# TDD Session Report

**Date**: 2026-03-28T...
**Specification**: implement a REST API with GET /users, POST /users, GET /users/:id, DELETE /users/:id
**Framework**: TypeScript / Vitest
**Entry Point**: natural-language-spec

## Summary

| Metric | Value |
|--------|-------|
| Work units | 4/4 |
| Tests written | ~16 |
| Assertions | ~24 |
| Anti-cheat violations | 0 |
| Adversarial reviews | 4/4 passed |
| Retries | 0 |

## Work Units

### GET /users -- completed
| Phase | Status | Attempts |
|-------|--------|----------|
| Test Writer | completed | 1 |
| RED Verification | passed | -- |
| Code Writer | completed | 1 |
| GREEN Verification | passed | -- |
| Spec Compliance | compliant | -- |
| Adversarial Review | passed | -- |
| Code Quality | approved | -- |

[...repeated for all 4 units...]

## Anti-Cheat Log
No violations.

## Final Integration Check
All tests passing: yes
Integration issues found: none
```

### tdd-session.jsonl

Complete event log with timestamps for every spawn, verification, and review.

---

## Phase 7: Cleanup

1. Shut down all remaining teammates (agent team cleanup)
2. Delete intermediate artifacts: `spec-contract-get-users.md`, `spec-contract-post-users.md`, `spec-contract-get-user-by-id.md`, `spec-contract-delete-user-by-id.md`
3. Final state file update (all units completed)
4. Present report to user
5. Suggest: "Run `npx vitest run` to verify, then commit your changes."

---

## Parallel Execution Analysis

### Concurrency Timeline (Visual)

```
Time  Slot 1              Slot 2              Slot 3              Queue
----  ------------------  ------------------  ------------------  ------------------
0:00  TW:get-users        TW:post-users       TW:get-user-by-id  delete-user-by-id
0:45  RED:get-users        |                   |                  TW:delete-user-by-id
0:50  CW:get-users         |                   |                   |
1:00   |                  RED:post-users        |                   |
1:05   |                  CW:post-users         |                   |
1:10   |                   |                  RED:get-user-by-id    |
1:15   |                   |                  CW:get-user-by-id     |
1:20   |                   |                   |                  RED:delete-user-by-id
1:25   |                   |                   |                  CW:delete-user-by-id
1:35  GREEN:get-users       |                   |                   |
1:37  REVIEW:get-users      |                   |                   |
1:40   |                  GREEN:post-users       |                   |
1:44   |                  REVIEW:post-users      |                   |
1:50   |                   |                  GREEN:get-user-by-id   |
1:54   |                   |                  REVIEW:get-user-by-id  |
1:55   |                   |                   |                  GREEN:delete-user-by-id
1:59   |                   |                   |                  REVIEW:delete-user-by-id
```

### Key Observations

1. **Single batch**: Topological sort produces exactly 1 batch because all `dependsOn` arrays are empty.

2. **3+1 concurrency**: With maxParallelPairs=3 and 4 units, 3 Test Writers are dispatched at T=0, and the 4th is queued. When the first Test Writer completes (get-users at T=0:45), it frees a slot for delete-user-by-id's Test Writer.

3. **Pipeline independence**: After each Test Writer completes, its unit proceeds through RED -> Code Writer -> GREEN -> Review independently. The pipelines do not wait for each other within the batch.

4. **Review ordering is strict within each unit**: For every unit, the three-stage review is sequential: Spec Compliance must pass before Adversarial, Adversarial must pass before Code Quality. But different units' reviews run in parallel.

5. **Batch completion gate**: Phase 5 (integration) does not start until ALL 4 units have completed their entire pipeline including code quality review.

6. **Total agent spawns per unit**: 6 agents (Test Writer + Code Writer + Spec Compliance Reviewer + Adversarial Reviewer + Code Quality Reviewer = 5, plus the lead monitoring). Across 4 units: 20 subagent spawns.

7. **Information barrier maintained**: Each Code Writer receives only its own test file and spec-contract read from disk, never the Test Writer's prompt or reasoning.

### Agent Spawn Summary

| Agent Type | Total Spawns | Concurrency Pattern |
|-----------|-------------|-------------------|
| Test Writer | 4 | 3 concurrent + 1 queued at T=0 |
| Code Writer | 4 | Up to 3 concurrent (as TW/RED complete) |
| Spec Compliance Reviewer | 4 | Up to 3 concurrent (as GREEN completes) |
| Adversarial Reviewer | 4 | Up to 3 concurrent (as spec review completes) |
| Code Quality Reviewer | 4 | Up to 3 concurrent (as adversarial review completes) |
| **Total** | **20** | Capped at 3 concurrent agent teams |
