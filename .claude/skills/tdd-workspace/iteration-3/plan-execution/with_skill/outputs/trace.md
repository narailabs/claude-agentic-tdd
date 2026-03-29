# Plan Execution Trace: /tdd execute docs/plan.md

## Scenario

**Input**: `/tdd execute docs/plan.md`
**Plan contents**: 5 tasks:
1. Create database migration for users table (non-code)
2. Implement user registration with email validation (code)
3. Implement user login with JWT (code)
4. Set up environment config (non-code)
5. Write API docs (non-code)

**Dependencies**:
- Task 2 depends on Task 1
- Task 3 depends on Tasks 2 and 4
- Task 5 depends on Tasks 2 and 3

---

## 1. Mode Detection: How "execute docs/plan.md" Triggers Mode 4

### Skill Entry Point

The TDD skill's `---` front matter (SKILL.md line 5) declares trigger condition "(5) executing an implementation plan with mixed code and non-code tasks." When the user invokes `/tdd execute docs/plan.md`, the skill activates.

### Argument Parsing (SKILL.md lines 29-35)

`$ARGUMENTS` = `execute docs/plan.md`. No flags detected (`--skip-failed`, `--config`, `--design`, `--skip-design` are all absent).

### Entry Point Detection (SKILL.md lines 99-107)

The orchestrator evaluates the specification text against four mode patterns:

| Mode | Detection Pattern | Match? |
|------|------------------|--------|
| Mode 1 | Natural language spec (default) | No -- "execute" + file path present |
| Mode 2 | "add tests to..." or "add test coverage for..." | No |
| Mode 3 | "implement against this test..." or failing test file | No |
| **Mode 4** | **"execute plan..." or provides a plan file** | **YES** |

The keyword `execute` combined with the file path `docs/plan.md` matches Mode 4 (Plan Execution). SKILL.md line 106: "User says 'execute plan...' or provides a plan file -- extract tasks, classify each as code (TDD pipeline) or non-code (implementer dispatch), and execute."

### Mode 4-Specific Adaptations Applied (SKILL.md lines 124-131)

Per SKILL.md lines 124-131, Mode 4 triggers these behaviors:
- **Task extraction**: Read `docs/plan.md`, extract all 5 tasks with full text and context. The full task text is provided inline to subagents -- they do NOT read the plan file themselves.
- **Task classification**: Each task classified as `"code"` or `"task"` based on type field.
- **Dependency ordering**: Respect dependencies from the plan.
- **Design gate**: Skip by default (plan already embodies design decisions). Only trigger if `--design` is passed. Since no `--design` flag is present, Phase 0 is skipped.
- **Implementer subagent**: Non-code tasks dispatched via `reference/implementer-prompt.md` template.
- **Status handling**: All subagents report using the four-status protocol.

---

## 2. Task Classification: Code vs Non-Code (Type Field)

### Classification Logic (SKILL.md lines 200-208)

During Phase 2 (Work Decomposition), each task gets a `type` field. SKILL.md line 204: "In Mode 4, classify based on whether the task produces code that needs tests."

The classification decision for each task:

| Task | Description | Type | Rationale |
|------|------------|------|-----------|
| 1. Database migration | Create migration for users table | `"task"` | Migrations are SQL DDL scripts -- no application logic to unit test. Listed explicitly in `reference/implementer-prompt.md` line 8 as a non-code category ("Database migrations"). |
| 2. User registration | Implement user registration with email validation | `"code"` | Produces application logic (email validation, registration flow) that requires behavioral tests. |
| 3. User login with JWT | Implement user login with JWT | `"code"` | Produces application logic (authentication, JWT generation) that requires behavioral tests. |
| 4. Environment config | Set up environment config | `"task"` | Configuration files -- no testable application logic. Listed in `reference/implementer-prompt.md` line 9 ("Configuration files"). |
| 5. API docs | Write API docs | `"task"` | Documentation -- no code at all. Listed in `reference/implementer-prompt.md` line 10 ("Documentation"). |

### How Type Determines Pipeline

SKILL.md lines 125-127:
- `"code"` tasks -> **Full TDD pipeline**: Test Writer -> RED -> Code Writer -> GREEN -> Spec Compliance -> Adversarial Review -> Code Quality Review
- `"task"` tasks -> **Implementer dispatch**: Implementer -> Spec Compliance -> Code Quality Review

---

## 3. Pipeline Routing: Code Tasks vs Non-Code Tasks

### Code Task Pipeline (Tasks 2 and 3)

For each code task, the full seven-step pipeline from Phase 4 executes:

**Step 4a: Spawn Test Writer** (SKILL.md lines 318-331)
- Orchestrator reads `reference/test-writer-prompt.md` for the template.
- Spawns a Test Writer teammate with: spec-contract for this unit ONLY, detected framework info, target test file paths, project conventions, and explicit behavioral-test instructions.
- Waits for completion. Verifies both the test file and `spec-contract-{unit_id}.md` exist on disk.

**Step 4b: RED Verification** (SKILL.md lines 339-361)
- Since this is Mode 4 but the code tasks are new implementations (not characterizing existing code), the standard Mode 1 RED verification applies.
- Reads `reference/anti-cheat.md` for the full procedure.
- Check 1: Tests exist on disk.
- Check 2: Run tests -- they MUST fail (exit code != 0). If tests pass, anti-cheat violation.
- Check 3: Verify correct failure type (import/module errors, not syntax errors in test file).
- Check 4: Assertion density -- count assertion patterns per test function, must meet `minAssertionsPerTest` (default 1).
- Check 5: Behavior-over-implementation scan -- check for excessive mocking, private method testing, implementation mirroring.
- Record test file checksums via `shasum -a 256`.

**Step 4c: Spawn Code Writer** (SKILL.md lines 363-380)
- Reads `reference/code-writer-prompt.md` for the template.
- INFORMATION BARRIER enforced: Code Writer receives ONLY test file contents (read from disk), spec-contract contents (read from disk), framework info, target impl file paths, project conventions.
- Code Writer MUST NOT receive: Test Writer's prompt/reasoning, implementation hints, other units' code.
- Waits for completion.

**Step 4d: GREEN Verification** (SKILL.md lines 384-390)
- Check 1: Compare test file checksums against RED-phase recordings. If changed, anti-cheat violation -- discard Code Writer changes, re-prompt.
- Check 2: Grep for newly added skip/ignore/focus markers in test files.
- Check 3: Run tests -- ALL must pass (exit code == 0). If fail, re-prompt Code Writer up to `maxRetries`.

**Step 4e: Spec Compliance Review** (SKILL.md lines 394-412)
- Reads `reference/spec-compliance-reviewer-prompt.md`.
- Spawns Spec Compliance Reviewer with: spec-contract, design summary (null -- Phase 0 skipped), test files, impl files.
- Checks: requirement coverage, missing requirements, scope creep, API contract accuracy, integration readiness.
- Verdict: COMPLIANT or NON-COMPLIANT. If NON-COMPLIANT, send pair back for revision.
- MUST pass before adversarial review runs (ordering rule, SKILL.md line 412).

**Step 4f: Adversarial Review** (SKILL.md lines 416-437)
- Reads `reference/adversarial-reviewer-prompt.md`.
- Spawns Adversarial Reviewer with: spec-contract, test files, impl files, scoring rubric.
- Checks: edge case coverage, test-implementation coupling, coverage gaps, cheating detection, test quality.
- Also references `reference/testing-anti-patterns.md` for the 5 documented anti-patterns.
- Verdict: PASS or FAIL. If FAIL, send pair back for revision.

**Step 4g: Code Quality Review** (SKILL.md lines 441-457)
- Reads `reference/code-quality-reviewer-prompt.md`.
- Spawns Code Quality Reviewer with: impl files, test files, git diff for this work unit.
- Checks: single responsibility, independent testability, clear naming, no overbuilding, follows project patterns.
- If critical/important issues found, send back to Code Writer. Otherwise, mark unit completed.

**ORDERING RULE** (SKILL.md line 457): Spec Compliance -> Adversarial Review -> Code Quality. Each must pass before the next.

### Non-Code Task Pipeline (Tasks 1, 4, and 5)

For each non-code task, the implementer dispatch from Step 4h executes:

**Step 4h: Implementer Dispatch** (SKILL.md lines 459-472)
1. Orchestrator reads `reference/implementer-prompt.md` for the template.
2. Spawns an Implementer teammate with:
   - Full task text from the plan, pasted inline (NOT a file reference -- SKILL.md line 124 is explicit)
   - Context about where this task fits in the overall plan and what tasks depend on it
   - Working directory
3. Handles the implementer's status response (see Section 5 below).
4. If DONE or DONE_WITH_CONCERNS: proceeds to two-stage review (see Section 6).
5. If NEEDS_CONTEXT: provides missing context and re-dispatches.
6. If BLOCKED: assesses and either provides context, re-dispatches with more capable model, breaks task down, or escalates to user.

The Implementer subagent follows the template from `reference/implementer-prompt.md`:
- Implements exactly what the task specifies
- Writes tests where applicable (following TDD: test first, watch fail, then implement)
- Verifies implementation works
- Commits work
- Self-reviews before reporting
- Reports with one of the four statuses

---

## 4. Dependency Graph and Batch Computation

### Dependency Specification

From the scenario:
- Task 1 (database-migration): no dependencies
- Task 2 (user-registration): depends on [Task 1]
- Task 3 (user-login): depends on [Task 2, Task 4]
- Task 4 (env-config): no dependencies
- Task 5 (api-docs): depends on [Task 2, Task 3]

### Topological Sort Algorithm (SKILL.md lines 492-505)

The orchestrator computes execution order from `dependsOn` fields:

1. **Identify roots** (no dependencies): Tasks 1, 4
2. **Compute levels**: For each remaining task, its batch = max(batch of all dependencies) + 1

```
Task 1 (database-migration): deps=[] -> Batch 1
Task 4 (env-config):         deps=[] -> Batch 1
Task 2 (user-registration):  deps=[1] -> max(Batch(1)) + 1 = Batch 2
Task 3 (user-login):         deps=[2,4] -> max(Batch(2), Batch(1)) + 1 = Batch 3
Task 5 (api-docs):           deps=[2,3] -> max(Batch(2), Batch(3)) + 1 = Batch 4
```

### Execution Plan

```
Batch 1 (parallel): database-migration [task], env-config [task]
Batch 2:            user-registration [code]        [after: database-migration]
Batch 3:            user-login [code]                [after: user-registration, env-config]
Batch 4:            api-docs [task]                  [after: user-registration, user-login]
```

### Parallel Execution Rules (SKILL.md lines 507-524)

- Within each batch, spawn agents concurrently up to `maxParallelPairs` (default 3).
- **Batch 1**: Two non-code tasks run in parallel. Both spawn Implementer subagents simultaneously. Each follows its own review pipeline independently.
- **Batch 2**: Single code task. Full TDD pipeline.
- **Batch 3**: Single code task. Full TDD pipeline.
- **Batch 4**: Single non-code task. Implementer dispatch.
- Wait for ALL units in a batch to complete (including all reviews) before starting the next batch (SKILL.md line 515).
- Mixed batches (like Batch 1 with two task-type units) run concurrently -- each follows its own pipeline.

### User Confirmation (SKILL.md lines 219-296)

Before execution begins, the orchestrator presents the plan:

```
## TDD Work Plan

Framework: [auto-detected]
Mode: plan-execution
Parallel: auto (max 3 concurrent)
Work units: 5 (2 code, 3 task)

### Unit 1: database-migration [task]
Spec: Create database migration for users table
Files: migrations/001_create_users.sql
Dependencies: none

### Unit 2: user-registration [code]
Spec: Implement user registration with email validation
Files: src/__tests__/user-registration.test.ts -> src/user-registration.ts
Dependencies: [database-migration]

### Unit 3: env-config [task]
Spec: Set up environment config
Files: src/config.ts, .env.example
Dependencies: none

### Unit 4: user-login [code]
Spec: Implement user login with JWT
Files: src/__tests__/user-login.test.ts -> src/user-login.ts
Dependencies: [user-registration, env-config]

### Unit 5: api-docs [task]
Spec: Write API docs
Files: docs/openapi.yaml
Dependencies: [user-registration, user-login]

Execution plan:
  Batch 1 (parallel): database-migration, env-config
  Batch 2: user-registration          [after: database-migration]
  Batch 3: user-login                 [after: user-registration, env-config]
  Batch 4: api-docs                   [after: user-registration, user-login]

Proceed? [confirm/modify/cancel]
```

The orchestrator waits for user confirmation before proceeding.

---

## 5. Subagent Status Protocol

### The Four Statuses (SKILL.md lines 473-484)

ALL subagents (Test Writer, Code Writer, Implementer) report one of four statuses:

| Status | Meaning | Orchestrator Action |
|--------|---------|---------------------|
| **DONE** | Work complete, no concerns | Proceed to next phase |
| **DONE_WITH_CONCERNS** | Work complete, but doubts flagged | Read concerns before proceeding. If about correctness/scope, address first. If observations, note and proceed. |
| **NEEDS_CONTEXT** | Cannot proceed without information | Provide the missing context and re-dispatch |
| **BLOCKED** | Cannot complete the task | Assess: (1) context problem -> provide more context, (2) reasoning limit -> re-dispatch with more capable model, (3) task too large -> break into smaller pieces, (4) plan is wrong -> escalate to user |

### Status Handling Per Agent Type

**Test Writer** (code tasks only):
- DONE: Proceed to RED verification.
- DONE_WITH_CONCERNS: Read concerns. If concerns are about spec ambiguity, address before RED verification. If about test coverage completeness, note and proceed.
- NEEDS_CONTEXT: Provide missing information (e.g., project conventions, framework details) and re-dispatch.
- BLOCKED: Assess -- may need a more capable model, or the spec-contract may be incomplete.

**Code Writer** (code tasks only):
- DONE: Proceed to GREEN verification.
- DONE_WITH_CONCERNS: Read concerns. If about test correctness, review before running GREEN. If about implementation trade-offs, note and proceed.
- NEEDS_CONTEXT: Provide missing info (e.g., dependency APIs) and re-dispatch.
- BLOCKED: Assess -- may need more capable model, may indicate spec/test problems.

**Implementer** (non-code tasks only):
- DONE: Proceed to spec compliance review + code quality review.
- DONE_WITH_CONCERNS: Read concerns. If about correctness/scope, address first. If observations (e.g., "file grew beyond plan's intent" per `reference/implementer-prompt.md` line 59), note and proceed.
- NEEDS_CONTEXT: Provide the missing context and re-dispatch.
- BLOCKED: Assess using the four options: (1) context problem, (2) reasoning limit, (3) task too large, (4) plan is wrong -> escalate to user.

### Critical Rule (SKILL.md line 484)

"**Never** ignore an escalation or force the same subagent to retry without changes. If a subagent says it's stuck, something needs to change."

### Implementer-Specific Guidance (reference/implementer-prompt.md)

The Implementer prompt template includes explicit escalation guidance (lines 66-73):
- STOP and escalate when: task requires architectural decisions with multiple valid approaches, needs to understand code beyond what was provided, uncertain about correctness, involves restructuring not anticipated by the plan.
- Self-review checklist (lines 79-83): completeness, quality, discipline, testing.
- Report format (lines 88-95): status, what was implemented, what was tested, files changed, self-review findings, issues/concerns.

---

## 6. Three-Stage Review (Code Tasks) vs Two-Stage Review (Non-Code Tasks)

### Code Tasks: Three-Stage Review

Code tasks (Tasks 2 and 3) go through all three review stages in strict order:

**Stage 1: Spec Compliance Review** (Step 4e)
- Reviewer: Spec Compliance Reviewer (from `reference/spec-compliance-reviewer-prompt.md`)
- Input: spec-contract, design summary, test files, impl files
- Checks: requirement coverage matrix, missing requirements, scope creep, API contract accuracy, integration readiness
- Verdict: COMPLIANT or NON-COMPLIANT
- If NON-COMPLIANT: pair goes back for revision. Test Writer adds missing tests, Code Writer re-implements.
- MUST pass before Stage 2.

**Stage 2: Adversarial Review** (Step 4f)
- Reviewer: Adversarial Reviewer (from `reference/adversarial-reviewer-prompt.md`)
- Input: spec-contract, test files, impl files
- Checks: edge case coverage, test-implementation coupling, coverage gaps, cheating detection (hardcoded returns, test-aware code, shallow implementation, mock exploitation), test quality
- Also checks for the 5 anti-patterns from `reference/testing-anti-patterns.md`: (1) testing mock behavior, (2) test-only methods, (3) mocking without understanding, (4) incomplete mocks, (5) integration tests as afterthought
- Scoring: Test Completeness [/5], Test Quality [/5], Implementation Quality [/5], Cheating Detection [CLEAN/SUSPICIOUS/CAUGHT]
- Verdict: PASS or FAIL
- If FAIL: pair goes back for revision.
- MUST pass before Stage 3.

**Stage 3: Code Quality Review** (Step 4g)
- Reviewer: Code Quality Reviewer (from `reference/code-quality-reviewer-prompt.md`)
- Input: impl files, test files, git diff for this work unit
- Checks: single responsibility, independent testability, clear naming, no overbuilding (YAGNI), follows project patterns, file size
- Issues categorized as: Critical (must fix), Important (should fix), Minor (nice to fix)
- Verdict: Approved or Needs Changes
- If Needs Changes (critical/important): send back to Code Writer, then re-review.
- If Approved: mark work unit as completed in state file.

### Non-Code Tasks: Two-Stage Review

Non-code tasks (Tasks 1, 4, and 5) skip the adversarial review because it is TDD-specific. They go through:

**Stage 1: Spec Compliance Review** (Step 4e, via Step 4h)
- Same reviewer and process as code tasks.
- SKILL.md line 469: "If DONE or DONE_WITH_CONCERNS: proceed to spec compliance review (Step 4e), then code quality review (Step 4g). Skip adversarial review (it's TDD-specific)."

**Stage 2: Code Quality Review** (Step 4g, via Step 4h)
- `reference/code-quality-reviewer-prompt.md` line 1 confirms: "Use this template after spec compliance review and adversarial review (for TDD tasks) or after spec compliance review (for non-code tasks) have passed."
- Same reviewer and process as code tasks.
- If Approved: mark work unit as completed.

### Why No Adversarial Review for Non-Code Tasks

The adversarial review (Step 4f) is fundamentally TDD-specific. It checks:
- Test-implementation coupling (assumes TDD pair structure)
- Cheating detection (assumes Code Writer tried to game tests)
- Coverage gaps (assumes test coverage is the contract)
- The 5 testing anti-patterns (all assume mock/test structure)

None of these apply to database migrations, config files, or documentation.

---

## 7. Final Holistic Review (Phase 5)

### Trigger

After ALL 5 work units across ALL 4 batches have completed (including all their reviews), Phase 5 begins (SKILL.md lines 528-548).

### The Iron Law (SKILL.md line 529)

"**IRON LAW**: No completion claim without fresh verification evidence. 'It should work' is not evidence. 'I'm confident' is not evidence. Only actual test output is evidence."

### Phase 5 Steps

**Step 1: Run the FULL test suite** (SKILL.md line 533)
- All test files run together, not individually. This catches integration issues between units.
- The orchestrator runs the detected test command without specifying individual files.
- Reads the actual output -- does not assume success.

**Step 2: Verify pristine output** (SKILL.md line 534)
- All tests pass.
- No warnings.
- No skipped tests.
- No pending tests.
- If the test runner reports anything other than clean green, investigate.

**Step 3: Holistic code review** (SKILL.md line 535)
- Review all generated code together -- look for inconsistencies, naming conflicts, missing connections between units.
- For this scenario: do `user-registration` and `user-login` share types correctly? Does the JWT config from `env-config` actually get consumed by `user-login`? Does the migration schema match what the registration code expects?

**Step 4: Cross-unit integration check** (SKILL.md line 536)
- Do units that depend on each other actually work together?
- Task 2 (registration) depends on Task 1 (migration): does the registration code match the schema?
- Task 3 (login) depends on Task 2 (registration) and Task 4 (config): does login use the correct user model and config values?
- Task 5 (docs) depends on Tasks 2 and 3: do the docs match the actual API?
- Run any integration tests.

**Step 5: Fix if needed** (SKILL.md line 537)
- If integration issues found: report with evidence (actual test output) and fix before proceeding.

### Verification Anti-Rationalization (SKILL.md lines 541-549)

The orchestrator rejects these excuses from any agent (including itself):

| Excuse | Response |
|--------|----------|
| "Tests should pass now" | Run them. Read the output. "Should" is not "did." |
| "I'm confident this works" | Confidence without evidence is delusion. Run the tests. |
| "The fix is obvious, no need to re-run" | Obvious fixes cause subtle bugs. Run the tests. |
| "Only changed one line" | One-line changes break everything. Run the tests. |
| "Same pattern as before" | Patterns don't guarantee correctness. Run the tests. |

---

## 8. Complete Execution Timeline

### Phase 0: Design Gate -- SKIPPED
- Reason: Mode 4 skips by default (SKILL.md line 128: "plan already embodies design decisions"). No `--design` flag present.

### Phase 1: Framework Detection
- Orchestrator reads `reference/framework-detection.md`.
- Checks `.tdd.config.json`, project CLAUDE.md, then auto-detects from project files.
- Stores: language, test runner, test command, file pattern, source dir, test dir.

### Phase 2: Work Decomposition
- Reads `docs/plan.md`, extracts all 5 tasks.
- Classifies each as `"code"` or `"task"`.
- Computes dependency graph and batch plan.
- Presents work plan to user. Waits for confirmation.

### Phase 3: State Initialization
- Checks for existing `.tdd-state.json` (resume/restart/fresh).
- Creates `.tdd-state.json` with all 5 work units in `"pending"` status.
- Adds `.tdd-state.json`, `tdd-session.jsonl`, `spec-contract-*.md` to `.gitignore`.
- Initializes `tdd-session.jsonl` session log.
- State file records: `"entryPoint": "plan-execution"`, all config values, all work units with dependencies and type fields.

### Phase 4: Agent Team Orchestration

#### Batch 1: database-migration + env-config (parallel)

**Task 1: database-migration [task]**
```
State: pending -> implementing
1. Read reference/implementer-prompt.md
2. Spawn Implementer with full task text inline, context, working dir
3. Implementer works: implements migration, self-reviews
4. Implementer reports: DONE (or other status -> handle per protocol)
5. Spawn Spec Compliance Reviewer (Stage 1)
   - Verdict: COMPLIANT -> proceed
   - Verdict: NON-COMPLIANT -> send back to Implementer
6. Spawn Code Quality Reviewer (Stage 2)
   - Verdict: Approved -> mark completed
   - Verdict: Needs Changes -> send back, re-review
State: completed
```

**Task 4: env-config [task]** (runs in parallel with Task 1)
```
State: pending -> implementing
1. Read reference/implementer-prompt.md
2. Spawn Implementer with full task text inline, context, working dir
3. Implementer works: creates config files, self-reviews
4. Implementer reports: DONE (or other status -> handle per protocol)
5. Spawn Spec Compliance Reviewer (Stage 1)
6. Spawn Code Quality Reviewer (Stage 2)
State: completed
```

**Wait**: Both Task 1 and Task 4 must fully complete (including reviews) before Batch 2 starts.

#### Batch 2: user-registration [code]

**Task 2: user-registration [code]**
```
State: pending -> test-writing
1. Spawn Test Writer (reference/test-writer-prompt.md)
   - Receives: spec-contract, framework info, test file paths, conventions
   - Creates: test file + spec-contract-user-registration.md
   - Reports status (DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED)

State: test-writing -> red-verification
2. RED Verification (reference/anti-cheat.md)
   - Check 1: Test file exists
   - Check 2: Tests fail (exit != 0)
   - Check 3: Correct failure type (import errors, not syntax errors)
   - Check 4: Assertion density >= minAssertionsPerTest
   - Check 5: Behavior-over-implementation scan
   - Record checksums

State: red-verification -> code-writing
3. Spawn Code Writer (reference/code-writer-prompt.md)
   - INFORMATION BARRIER: receives ONLY test contents + spec-contract (from disk)
   - Creates implementation files
   - Reports status

State: code-writing -> green-verification
4. GREEN Verification (reference/anti-cheat.md)
   - Check 1: Test file checksums unchanged
   - Check 2: No skip/focus markers added
   - Check 3: All tests pass (exit == 0)
   - Check 4: No hardcoded returns (heuristic)

State: green-verification -> spec-review
5. Spec Compliance Review (reference/spec-compliance-reviewer-prompt.md)
   - Checks requirement matrix, missing reqs, scope creep, API contract, integration readiness
   - Verdict: COMPLIANT -> proceed

State: spec-review -> adversarial-review
6. Adversarial Review (reference/adversarial-reviewer-prompt.md)
   - Checks completeness, quality, implementation quality, cheating, coverage gaps
   - References testing-anti-patterns.md for 5 anti-patterns
   - Verdict: PASS -> proceed

State: adversarial-review -> code-quality-review
7. Code Quality Review (reference/code-quality-reviewer-prompt.md)
   - Checks structure, naming, discipline, testing, size
   - Verdict: Approved -> mark completed

State: completed
```

**Wait**: Task 2 must fully complete (including all 3 reviews) before Batch 3.

#### Batch 3: user-login [code]

**Task 3: user-login [code]**
```
Same pipeline as Task 2:
1. Spawn Test Writer -> reports status
2. RED Verification (5 checks + checksum recording)
3. Spawn Code Writer (information barrier enforced) -> reports status
4. GREEN Verification (4 checks)
5. Spec Compliance Review -> COMPLIANT
6. Adversarial Review -> PASS
7. Code Quality Review -> Approved
State: completed
```

**Wait**: Task 3 must fully complete before Batch 4.

#### Batch 4: api-docs [task]

**Task 5: api-docs [task]**
```
Same pipeline as Tasks 1 and 4:
1. Spawn Implementer -> reports status
2. Spec Compliance Review -> COMPLIANT
3. Code Quality Review -> Approved
State: completed
```

### Phase 5: Final Review
- Run FULL test suite (all test files together)
- Verify pristine output (all pass, no warnings/skips)
- Holistic code review across all units
- Cross-unit integration check
- Fix any issues with evidence

### Phase 6: Report Generation
- Generate `tdd-report.md` (reference/report-format.md)
- Summary includes: 5/5 work units completed, test counts, assertion counts, anti-cheat violations, adversarial review results
- Work unit detail for each of the 5 units with phase-by-phase status
- `tdd-session.jsonl` contains event log

### Phase 7: Cleanup
- Shut down any remaining teammates
- Remove intermediate artifacts: delete all `spec-contract-*.md` files
- Final state file update
- Present report to user
- Suggest next steps (run full test suite, commit changes, etc.)
- Note: `tdd-report.md` is NOT gitignored -- it is a deliverable.

---

## 9. Total Agent Spawns Summary

| Batch | Task | Agent Spawns |
|-------|------|-------------|
| 1 | database-migration [task] | 1 Implementer + 1 Spec Compliance Reviewer + 1 Code Quality Reviewer = 3 |
| 1 | env-config [task] | 1 Implementer + 1 Spec Compliance Reviewer + 1 Code Quality Reviewer = 3 |
| 2 | user-registration [code] | 1 Test Writer + 1 Code Writer + 1 Spec Compliance Reviewer + 1 Adversarial Reviewer + 1 Code Quality Reviewer = 5 |
| 3 | user-login [code] | 1 Test Writer + 1 Code Writer + 1 Spec Compliance Reviewer + 1 Adversarial Reviewer + 1 Code Quality Reviewer = 5 |
| 4 | api-docs [task] | 1 Implementer + 1 Spec Compliance Reviewer + 1 Code Quality Reviewer = 3 |
| **Total** | | **19 subagent spawns** (minimum, no retries) |

### Agent Spawns By Type

| Agent Type | Count | Used For |
|------------|-------|----------|
| Test Writer | 2 | Code tasks (2, 3) |
| Code Writer | 2 | Code tasks (2, 3) |
| Implementer | 3 | Non-code tasks (1, 4, 5) |
| Spec Compliance Reviewer | 5 | All tasks (1, 2, 3, 4, 5) |
| Adversarial Reviewer | 2 | Code tasks only (2, 3) |
| Code Quality Reviewer | 5 | All tasks (1, 2, 3, 4, 5) |

---

## 10. Key Design Decisions Evidenced in Trace

1. **Information barrier is absolute**: Code Writer never sees Test Writer's prompt, reasoning, or approach. Only disk artifacts cross the boundary. (SKILL.md lines 363-380, code-writer-prompt.md lines 5-10)

2. **Plan text is inlined, never referenced**: Subagents receive full task text inline. They do NOT read the plan file. (SKILL.md line 124: "provide the full task text inline")

3. **Review ordering is strict**: Spec Compliance must pass before Adversarial Review, which must pass before Code Quality Review. (SKILL.md line 457)

4. **Batches are dependency-gated**: No unit in Batch N+1 starts until ALL units in Batch N complete with all reviews. (SKILL.md line 515)

5. **Non-code tasks skip adversarial review**: The adversarial review is TDD-specific (cheating detection, test quality). Non-code tasks get 2-stage review. (SKILL.md line 469)

6. **Status protocol is universal**: All subagents use the same 4-status protocol regardless of agent type. (SKILL.md lines 473-484)

7. **Design gate skipped for plans**: Mode 4 assumes the plan embodies design decisions. Only `--design` flag overrides. (SKILL.md line 128)

8. **Checksums enforce immutability**: Test files are checksum-locked after RED verification. Any modification by Code Writer is an anti-cheat violation. (anti-cheat.md lines 110-117, 170-178)
