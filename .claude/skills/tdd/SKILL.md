---
name: tdd
description: >
  Enforced Test-Driven Development with agent teams. Decomposes features into
  test-first agent pairs with anti-cheat guardrails. Use when: (1) user invokes
  /tdd command, (2) user says "implement X with tests" or "TDD" or "test-driven",
  (3) adding test coverage to existing code with TDD approach, (4) implementing
  against a user-provided failing test, (5) executing an implementation plan with
  mixed code and non-code tasks. Requires CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1.
---

# Agentic TDD

Enforced Test-Driven Development using agent teams. Each feature is built by a pair:
one agent writes honest tests, another blindly implements to make them pass.
Anti-cheat guardrails ensure tests are meaningful and implementation is genuine.

## Prerequisites

Before proceeding, verify:

1. Agent teams enabled: check that `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set to `1` in settings or environment. If not, inform the user:
   > Agent teams are required for agentic-tdd. Enable them by adding `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"` to the `env` section of your `.claude/settings.json`, then restart Claude Code.

2. Git repository: the project should be a git repository (for diff checks during GREEN verification). If not, warn but continue.

## Arguments

Parse `$ARGUMENTS` for:
- The specification text (required) — what to implement
- `--skip-failed` — skip work units that fail after max retries instead of escalating
- `--config <path>` — path to a custom `.tdd.config.json`
- `--design` — force the design gate (Phase 0) even for simple specs
- `--skip-design` — skip the design gate entirely

If no arguments provided, ask the user what they want to implement.

## Configuration Loading

Load configuration in priority order:

1. **`.tdd.config.json`** (if exists at project root, or path specified by `--config`):
   ```bash
   cat .tdd.config.json 2>/dev/null
   ```
   Parse JSON. Apply values over defaults.

2. **Project CLAUDE.md** (if exists): Look for a `## TDD Configuration` section.
   Extract test conventions, framework preferences, and any custom rules.

3. **Defaults** (flat keys, mapped from nested `.tdd.config.json` structure):
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

### Model Cost Optimization

The `execution.modelStrategy` key controls how agents are assigned to work units:

| Strategy | Behavior |
|----------|----------|
| `"auto"` (default) | Assess each work unit's complexity and assign models accordingly |
| `"standard"` | Use the default model for all agents |
| `"fast"` | Use the cheapest capable model for all agents |
| `"capable"` | Use the most capable model for all agents |

When `"auto"` is selected, use the least powerful model that can handle each role. More capable models are slower and more expensive — use them only when the task demands it.

**Mechanical tasks** (isolated functions, clear spec, 1-2 files): use `haiku` for Test Writer and Code Writer, `sonnet` for reviewers. Most implementation tasks are mechanical when the spec-contract is well-written.

**Integration tasks** (multi-file coordination, pattern matching, cross-unit concerns): use `sonnet` for all agents.

**Architecture and judgment tasks** (ambiguous spec, many dependencies, design-sensitive): use `opus` for Test Writer and reviewers, `sonnet` for Code Writer.

Complexity signals:
- Touches 1-2 files with a complete spec → cheap model
- Touches multiple files with integration concerns → standard model
- Requires design judgment or broad codebase understanding → most capable model

The model assignment is recorded in the state file per work unit and displayed in the report.

When loading `.tdd.config.json`, flatten nested keys. Merged config is stored in the state file and passed to all teammates.

Reference these config keys at their decision points:
- `antiCheat.flagPrivateMethodTests` → RED verification behavior-over-implementation check
- `antiCheat.maxMockDepth` → RED verification excessive mocking check
- `reporting.generateReport` → Phase 6 report generation
- `reporting.generateSessionLog` → Phase 3 session log initialization

## Entry Point Detection

Determine the mode based on context:

1. **Natural language spec** (default): User provides a description like "implement user authentication with registration and login"
2. **Existing codebase**: User says "add tests to..." or "add test coverage for..." — generate characterization tests first, then new feature tests
3. **User-provided test**: User says "implement against this test..." or provides a failing test file — skip Test Writer, go directly to Code Writer
4. **Plan execution**: User says "execute plan..." or provides a plan file — extract tasks, classify each as code (TDD pipeline) or non-code (implementer dispatch), and execute

### Mode-Specific Adaptations

**Mode 2 (Existing Codebase)** requires special handling:
- **Design gate**: Skip by default (characterizing existing code, not designing new features). Only trigger if the user explicitly passes `--design`.
- **Test Writer**: Receives spec-contracts derived from reading existing source files (reverse-engineered behavior specs, not forward requirements).
- **RED verification**: Adapted — see "Coverage Mode RED Verification" below.
- **Code Writer**: May be a no-op if characterization tests already pass against existing code. If tests pass immediately, skip Code Writer and proceed to review.
- **GREEN verification**: Standard — tests must pass and test files must be unchanged.

**Mode 3 (User-Provided Test)** skips:
- Test Writer phase entirely
- RED verification (user owns the tests; trust their quality)
- Design gate

**Mode 4 (Plan Execution)** requires special handling:
- **Task extraction**: Read the plan file, extract all tasks with full text and context. Do NOT make subagents read the plan file — provide the full task text inline.
- **Task classification**: For each task, determine if it is a **code task** (needs implementation + tests) or a **non-code task** (migrations, configs, docs, scripts, infra).
  - Code tasks → full TDD pipeline (Test Writer → RED → Code Writer → GREEN → Review)
  - Non-code tasks → implementer dispatch (Implementer → Spec Compliance → Code Quality Review)
- **Dependency ordering**: Respect dependencies from the plan. Tasks that depend on prior tasks run after them.
- **Design gate**: Skip by default (plan already embodies design decisions). Only trigger if `--design` is passed.
- **Implementer subagent**: Read `reference/implementer-prompt.md` for the template. Non-code tasks are dispatched to an implementer subagent that implements, tests, commits, and self-reviews.
- **Status handling**: All subagents (Test Writer, Code Writer, Implementer) report status. See "Subagent Status Protocol" below.

## Phase 0: Design Gate (Optional)

When the specification is complex (multi-unit, ambiguous, or architecturally significant), run a design refinement step before decomposition. Skip this phase for simple specs or when `--skip-design` is passed.

### Trigger Conditions

Run the design gate when ANY of:
- The spec mentions 3+ distinct features or components
- The spec involves external integrations (APIs, databases, auth providers)
- The spec is ambiguous about data flow, ownership, or error handling
- The user explicitly requests design review (`--design` flag)

Skip when:
- Single-unit spec with clear inputs/outputs
- Existing codebase coverage mode (entry point mode 2) — unless `--design` is explicitly passed
- User-provided failing test (entry point mode 3)
- User passes `--skip-design`

### Design Refinement Process

1. **Clarifying questions**: Ask the user 1-3 targeted questions about ambiguities. Ask one at a time — do not dump a questionnaire. Examples:
   - "Should password reset tokens expire? If so, after how long?"
   - "Should registration send a verification email, or are accounts active immediately?"
   - "What should happen if login fails 5 times — lockout, CAPTCHA, or nothing?"

2. **Propose approaches**: Present 2-3 options with pros/cons for at least one key architectural decision. Every spec complex enough to trigger the design gate has at least one meaningful trade-off. Example:
   - "Option A: JWT tokens (stateless, scalable, but can't revoke)"
   - "Option B: Session-based auth (revocable, but needs session store)"
   If the trade-offs are straightforward, keep this brief — but do not skip it entirely.

3. **Design summary**: Once clarified, present a brief design document:
   ```
   ## Design Summary

   ### Components
   - [component]: [responsibility]

   ### Data Flow
   [brief description of how data moves between components]

   ### Key Decisions
   - [decision]: [rationale]

   ### Out of Scope
   - [what this spec explicitly does NOT cover]
   ```

4. **User approval**: "Proceed with this design? [confirm/modify/cancel]"

**HARD GATE**: No decomposition (Phase 2) until the design is approved. If the user modifies, iterate. If cancelled, stop.

Store the approved design summary in the state file under `designSummary`. Pass it to the Test Writer alongside the spec-contract for each work unit.

## Phase 1: Framework Detection

Read `reference/framework-detection.md` for the full detection algorithm.

Quick summary:
1. Check `.tdd.config.json` for explicit framework config
2. Check project CLAUDE.md for test conventions
3. Auto-detect from project files (package.json, pyproject.toml, go.mod, Cargo.toml, etc.)
4. If detection fails, ask the user for their test command

Store detected framework info: language, test runner, test command, file pattern, source dir, test dir.

## Phase 2: Work Decomposition

Analyze the specification and decompose into independent work units.

For each work unit, produce:
- **id**: kebab-case identifier (e.g., `user-registration`)
- **name**: human-readable name
- **type**: `"code"` (needs TDD pipeline) or `"task"` (non-code, uses implementer dispatch). In Modes 1-3, all units are `"code"`. In Mode 4, classify based on whether the task produces code that needs tests.
- **spec-contract**: precise description of what this unit must do — inputs, outputs, side effects, error cases
- **dependsOn**: list of work unit IDs this depends on (empty if independent)
- **testFiles**: target test file paths (code units only)
- **implFiles**: target implementation file paths

### Dependency Analysis

Examine the work units for dependencies:
- Units that import/use types or functions from other units are dependent
- Units that operate on the same data structures may need sequencing
- Independent units can run in parallel

### User Confirmation

Present the decomposition to the user:

```
## TDD Work Plan

Framework: vitest (auto-detected)
Mode: natural-language-spec
Parallel: auto (max 3 concurrent)
Work units: 3

### Unit 1: user-registration [code]
Spec: Create user with email validation, password hashing, and duplicate detection
Files: src/__tests__/user-registration.test.ts → src/user-registration.ts
Dependencies: none

### Unit 2: user-login [code]
Spec: Authenticate user with email/password, return JWT token, handle invalid credentials
Files: src/__tests__/user-login.test.ts → src/user-login.ts
Dependencies: [user-registration]

### Unit 3: password-reset [code]
Spec: Generate reset token, validate token, update password
Files: src/__tests__/password-reset.test.ts → src/password-reset.ts
Dependencies: [user-registration]

Execution plan:
  Batch 1: user-registration
  Batch 2 (parallel): user-login, password-reset

Proceed? [confirm/modify/cancel]
```

For Mode 4 (plan execution), the plan may include mixed types:

```
## TDD Work Plan

Framework: vitest (auto-detected)
Mode: plan-execution
Parallel: auto (max 3 concurrent)
Work units: 5 (3 code, 2 task)

### Unit 1: database-schema [task]
Spec: Create migration for users and sessions tables
Files: migrations/001_create_users.sql
Dependencies: none

### Unit 2: user-registration [code]
Spec: Create user with email validation, password hashing
Files: src/__tests__/user-registration.test.ts → src/user-registration.ts
Dependencies: [database-schema]

### Unit 3: env-config [task]
Spec: Set up environment config with JWT secret and DB connection
Files: src/config.ts, .env.example
Dependencies: none

### Unit 4: user-login [code]
Spec: Authenticate user, return JWT token
Files: src/__tests__/user-login.test.ts → src/user-login.ts
Dependencies: [user-registration, env-config]

### Unit 5: api-docs [task]
Spec: Generate OpenAPI spec for auth endpoints
Files: docs/openapi.yaml
Dependencies: [user-registration, user-login]

Execution plan:
  Batch 1 (parallel): database-schema, env-config
  Batch 2: user-registration
  Batch 3: user-login
  Batch 4: api-docs

Proceed? [confirm/modify/cancel]
```

Wait for user confirmation before proceeding. If the user wants to modify, adjust and re-present.

## Phase 3: State Initialization

Read `reference/state-management.md` for the full state file format.

1. Check for existing `.tdd-state.json` in the project root
   - If found: show progress, offer resume/restart/add-units
   - If not found: create new state file
2. Add `.tdd-state.json`, `tdd-session.jsonl`, and `spec-contract-*.md` to `.gitignore` if not already present
3. Initialize the session log (`tdd-session.jsonl`)

## Phase 4: Agent Team Orchestration

Create an agent team. You (the main session) are the team lead / Team Manager.

### Execution Loop

For each work unit (respecting dependency order and parallelism):

#### Step 4a: Spawn Test Writer

Read `reference/test-writer-prompt.md` for the full template.

Spawn a Test Writer teammate with a prompt containing:
- The spec-contract for this work unit ONLY
- Detected framework info (runner, conventions, file patterns)
- Target test file path(s)
- Project test conventions from CLAUDE.md (if any)
- EXPLICIT INSTRUCTIONS: Write tests that describe BEHAVIOR not implementation. Each test must have meaningful assertions. Do NOT write implementation code.

Wait for the Test Writer to complete.

After the Test Writer completes, verify that BOTH outputs exist on disk:
- The test file(s) at the specified path(s)
- The `spec-contract-{unit_id}.md` file in the same directory as the test file

The spec-contract file is a machine-readable artifact that the Code Writer and Adversarial
Reviewer will receive. If it wasn't created, re-prompt the Test Writer.

#### Step 4b: RED Verification

Read `reference/anti-cheat.md` for the full verification rules.

After the Test Writer completes, run verification. The process differs by entry point mode:

**Mode 1 (New Feature) — Standard RED Verification:**
1. **Run tests**: Execute the test command via Bash. Capture exit code and output.
2. **Verify RED**: Tests MUST fail (exit code != 0). If tests pass → anti-cheat violation. Re-prompt the Test Writer (up to `maxRetries`).
3. **Verify correct failures**: Parse output. Failures should be "not found"/"not defined"/"undefined" — not syntax errors in the test file itself.

**Mode 2 (Existing Codebase) — Coverage Mode RED Verification:**
1. **Hide the implementation**: Temporarily rename the source file(s) being characterized.
2. **Run tests**: They should fail with import/module errors (proving they actually depend on the real code).
3. **Restore the implementation**: Rename back.
4. **Run tests again**: They should PASS (proving characterization is accurate).
See `reference/anti-cheat.md` → "Coverage Mode RED Verification" for the full procedure.

**Mode 3 (User-Provided Test)**: Skip RED verification entirely.

**All modes** — these checks always apply:
4. **Check assertion density**: Read the test file. Count assertion patterns (`expect(`, `assert`, `.toBe(`, etc.) per test function. Must meet minimum threshold.
5. **Check behavior-over-implementation**: Scan for anti-patterns (excessive mocking, private method access, implementation-mirroring).

If any check fails: log the violation, provide feedback to the Test Writer, re-spawn with correction instructions. After `maxRetries` failures, escalate to user (or skip if `--skip-failed`).

Record checksums of all test files at this point (for GREEN verification later).

#### Step 4c: Spawn Code Writer

Read `reference/code-writer-prompt.md` for the full template.

**CRITICAL — Information Barrier**: The Code Writer prompt must contain ONLY:
- The test file contents (read from disk, not from Test Writer output)
- The `spec-contract-{unit_id}.md` contents (read from disk, not from Test Writer output)
- Detected framework info
- Target implementation file path(s)
- Project conventions from CLAUDE.md (if any)
- EXPLICIT INSTRUCTIONS: Make these tests pass. Do NOT modify any test files. Write minimum implementation needed.

The Code Writer prompt MUST NOT contain:
- The Test Writer's prompt or reasoning
- Any implementation hints beyond what the spec-contract states
- Any other work unit's code

Wait for the Code Writer to complete.

#### Step 4d: GREEN Verification

After the Code Writer completes:

1. **Verify test files unchanged**: Compare test file checksums against the ones recorded after RED verification. If ANY test file was modified → anti-cheat violation. Discard Code Writer changes, re-prompt.
2. **Check for skip markers**: Grep test files for newly added skip/ignore markers (`xit(`, `.skip`, `@pytest.mark.skip`, `t.Skip()`, `@Ignore`, `@Disabled`, `pending(`).
3. **Run tests**: Execute the test command. ALL tests must pass (exit code == 0).
4. If tests fail: re-prompt Code Writer with failure output (up to `maxRetries`).

#### Step 4e: Spec Compliance Review

Read `reference/spec-compliance-reviewer-prompt.md` for the full template.

Spawn a Spec Compliance Reviewer teammate with:
- The `spec-contract-{unit_id}.md` contents (read from disk)
- The design summary from state file (if Phase 0 was run)
- Test file contents (read from disk)
- Implementation file contents (read from disk)

The reviewer checks:
1. Requirement coverage — is every spec requirement implemented and tested?
2. Missing requirements — are there implied requirements nobody addressed?
3. Scope creep — does the implementation include features NOT in the spec?
4. API contract accuracy — do signatures and types match the spec?
5. Integration readiness — are interfaces compatible with dependent units?

If the reviewer finds NON-COMPLIANT issues: send the pair back for revision. The Test Writer adds missing tests, then the Code Writer re-implements.

If COMPLIANT: proceed to adversarial review.

**ORDERING RULE**: Spec compliance MUST pass before adversarial review runs. There is no value in reviewing code quality for an implementation that doesn't match the spec.

#### Step 4f: Adversarial Review

Read `reference/adversarial-reviewer-prompt.md` for the full template.

Spawn an Adversarial Reviewer teammate with:
- The `spec-contract-{unit_id}.md` contents (read from disk)
- Test file contents (read from disk)
- Implementation file contents (read from disk)
- The scoring rubric from `reference/adversarial-reviewer-prompt.md`

The reviewer checks:
1. Edge case coverage — are boundary conditions tested?
2. Test-implementation coupling — would tests break on valid refactoring?
3. Coverage gaps — obvious untested code paths?
4. Cheating detection — did implementation exploit test weaknesses?
5. Test quality — are assertions meaningful and specific?

Also reference `reference/testing-anti-patterns.md` — flag any of the 5 documented anti-patterns.

If the reviewer finds critical issues: log findings, send the pair back for revision (Test Writer re-writes tests addressing the gaps, then Code Writer re-implements).

If the reviewer passes: proceed to code quality review.

#### Step 4g: Code Quality Review

Read `reference/code-quality-reviewer-prompt.md` for the full template.

Spawn a Code Quality Reviewer teammate with:
- The implementation file contents (read from disk)
- The test file contents (read from disk)
- The git diff for this work unit (changes since before the unit started)

The reviewer checks:
1. Each file has one clear responsibility with a well-defined interface
2. Units are decomposed so they can be understood and tested independently
3. Names are clear and accurate (match what things do, not how they work)
4. No overbuilding — implementation does what the spec requires, nothing more
5. Code follows existing project patterns and conventions

If the reviewer finds **critical or important** issues: send back to Code Writer for fixes, then re-review.

If approved: mark work unit as completed in state file.

**ORDERING RULE**: Spec compliance → Adversarial review → Code quality. Each stage must pass before the next runs.

#### Step 4h: Non-Code Task Dispatch (Mode 4 Only)

For non-code tasks in plan execution mode, skip the TDD pipeline entirely. Instead:

1. Read `reference/implementer-prompt.md` for the template.
2. Spawn an Implementer teammate with:
   - The full task text from the plan (pasted inline, NOT a file reference)
   - Context about where this task fits in the overall plan
   - Working directory
3. Handle the implementer's status (see "Subagent Status Protocol" below).
4. If DONE or DONE_WITH_CONCERNS: proceed to spec compliance review (Step 4e), then code quality review (Step 4g). Skip adversarial review (it's TDD-specific).
5. If NEEDS_CONTEXT: provide the missing context and re-dispatch.
6. If BLOCKED: assess and either provide context, re-dispatch with a more capable model, break the task down, or escalate to the user.

### Subagent Status Protocol

All subagents (Test Writer, Code Writer, Implementer) report one of four statuses:

| Status | Meaning | Action |
|--------|---------|--------|
| **DONE** | Work complete, no concerns | Proceed to next phase |
| **DONE_WITH_CONCERNS** | Work complete, but doubts flagged | Read concerns before proceeding. If about correctness/scope, address first. If observations, note and proceed. |
| **NEEDS_CONTEXT** | Cannot proceed without information | Provide the missing context and re-dispatch |
| **BLOCKED** | Cannot complete the task | Assess: (1) context problem → provide more context, (2) reasoning limit → re-dispatch with more capable model, (3) task too large → break into smaller pieces, (4) plan is wrong → escalate to user |

**Never** ignore an escalation or force the same subagent to retry without changes. If a subagent says it's stuck, something needs to change.

### Parallel Execution

The skill builds a dependency graph from the work units and executes independent units concurrently. This applies to both TDD work units and non-code tasks in Mode 4.

#### Dependency Graph

Compute the execution order from the `dependsOn` fields:

1. **Topological sort**: Order units so dependencies complete before dependents.
2. **Identify parallel batches**: Group units that share no dependencies into concurrent batches.
   - Batch 1: all units with no dependencies (roots)
   - Batch 2: units whose dependencies are all in Batch 1
   - And so on until all units are scheduled.
3. **Present the execution plan** to the user in the work plan confirmation:
   ```
   Execution plan:
     Batch 1 (parallel): user-registration, config-setup
     Batch 2 (parallel): user-login, password-reset  [after: user-registration]
     Batch 3: integration-tests                       [after: user-login, password-reset]
   ```

#### Concurrent Dispatch

Within each batch, spawn agent teams concurrently (up to `maxParallelPairs`):
- **TDD units**: Spawn Test Writers simultaneously. As each completes, proceed with its RED → Code Writer → GREEN → Review pipeline independently.
- **Non-code tasks** (Mode 4): Spawn Implementer subagents simultaneously. As each completes, proceed with its Spec Compliance → Code Quality review pipeline.
- **Mixed batches**: TDD and non-code tasks in the same batch run concurrently — each follows its own pipeline.
- Track all concurrent pipelines in the state file.

Wait for ALL units in a batch to complete (including reviews) before starting the next batch.

#### Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `execution.maxParallelPairs` | `3` | Max concurrent agent teams per batch |
| `execution.parallelMode` | `"auto"` | `"auto"`: parallel when dependency graph allows. `"sequential"`: one unit at a time (useful for debugging or resource-constrained environments). `"parallel"`: force parallel even within dependency levels. |

When `parallelMode` is `"sequential"`, process units one at a time in topological order. This is slower but avoids file conflicts and reduces concurrent API load.

## Phase 5: Final Review — Verification Before Completion

**IRON LAW**: No completion claim without fresh verification evidence. "It should work" is not evidence. "I'm confident" is not evidence. Only actual test output is evidence.

After ALL work units complete:

1. **Run the FULL test suite** (all test files together) to check for integration issues. Read the actual output — do not assume success.
2. **Verify pristine output**: All tests pass, no warnings, no skipped tests, no pending tests. If the test runner reports anything other than clean green, investigate.
3. **Review all generated code holistically** — look for inconsistencies, naming conflicts, missing connections between units
4. **Cross-unit integration check**: Do units that depend on each other actually work together? Run any integration tests.
5. If integration issues found: report them with evidence (actual test output) and fix before proceeding.

### Verification Anti-Rationalization

Do NOT accept these from any agent (including yourself):

| Excuse | Response |
|--------|----------|
| "Tests should pass now" | Run them. Read the output. "Should" is not "did." |
| "I'm confident this works" | Confidence without evidence is delusion. Run the tests. |
| "The fix is obvious, no need to re-run" | Obvious fixes cause subtle bugs. Run the tests. |
| "Only changed one line" | One-line changes break everything. Run the tests. |
| "Same pattern as before" | Patterns don't guarantee correctness. Run the tests. |

## Phase 6: Report Generation

Read `reference/report-format.md` for templates.

Generate two files:

### tdd-report.md
```markdown
# TDD Session Report

## Summary
- Date: [timestamp]
- Specification: [original user spec]
- Framework: [detected framework]
- Work units: [N completed] / [N total]
- Total tests: [count]
- Total assertions: [count]
- Anti-cheat violations: [count]
- Adversarial review: [pass/fail counts]

## Work Units

### [Unit Name]
- Status: completed/failed
- Test file: [path]
- Implementation file: [path]
- Tests: [N passing]
- Assertions: [N]
- RED verification: passed (attempt [N])
- GREEN verification: passed (attempt [N])
- Adversarial review: passed
- Findings: [any reviewer notes]

[repeat for each unit]

## Anti-Cheat Log
[any violations encountered and how they were resolved]

## Recommendations
[any suggestions for improving test coverage or code quality]
```

### tdd-session.jsonl
One JSON object per line with: timestamp, event type, work unit ID, data.

## Error Handling

Handle errors at every phase:

### Agent Team Creation Failure
If creating the agent team fails (env var not set, API error):
- Show clear error message with fix instructions
- Save state file so user can retry after fixing the issue

### Teammate Crash or Timeout
If a teammate stops unexpectedly:
- Log the error in the session log
- Attempt to re-spawn the teammate (counts as a retry)
- After maxRetries: escalate to user or skip (per config)

### Test Command Not Found
If the detected test command fails with "command not found":
- Ask the user for the correct test command
- Update the state file with the corrected command
- Retry the verification

### File Permission Errors
If unable to read/write test or implementation files:
- Report the specific path and error
- Ask user to fix permissions

### Interrupted Session
If the session is interrupted mid-flow:
- State file preserves progress (atomic writes)
- On next `/tdd` invocation, detect state file and offer resume
- Any in-progress teammate work is lost; restart from the current phase

### Team Cleanup on Error
Always attempt team cleanup even if the session errors:
- Shut down any remaining teammates
- Update state file with error status
- Generate partial report if any work completed

## Systematic Debugging Protocol

When tests fail during GREEN verification or final review and the Code Writer cannot fix them after `maxRetries`, switch to systematic debugging instead of immediately escalating.

### The 4-Phase Debug Process

**Phase D1: Root Cause Investigation**
- Read the failing test output carefully. What is the actual vs expected value?
- Trace the code path from test input to the point of failure.
- Check: is this a logic bug, a dependency issue, a type mismatch, or a missing feature?

**Phase D2: Pattern Analysis**
- Is this the same failure as a previous retry? If the Code Writer keeps making the same mistake, the problem is likely architectural.
- Are multiple tests failing for the same root cause? Fix the root cause, not the symptoms.
- After 3+ failed fixes for the same issue: STOP. The design may be wrong. Consider going back to Phase 0 for this work unit.

**Phase D3: Hypothesis and Test**
- Form a specific hypothesis: "The bug is in X because Y"
- **Write a regression test first** that isolates the bug. This test must fail, confirming the hypothesis.
- Only then fix the implementation.

**Phase D4: Verification**
- Run the new regression test — it should pass.
- Run ALL tests for this work unit — they should all pass.
- Run the full test suite — no regressions in other units.

### When to Trigger

- Code Writer fails 2+ times on the same test
- GREEN verification fails with non-obvious errors
- Integration tests fail in Phase 5

### Escalation

If Phase D2 suggests an architectural problem:
1. Log the findings
2. Present to the user: "This unit's implementation is fighting the design. The test expects X but the architecture makes X difficult because Y. Options: (a) revise the design, (b) revise the test expectations, (c) accept increased complexity."
3. Wait for user decision before proceeding.

## Phase 7: Cleanup

1. Clean up the agent team (shut down any remaining teammates)
2. Remove intermediate artifacts: delete all `spec-contract-*.md` files created during the session
3. Final state file update
4. Present the report to the user
5. Suggest next steps (run full test suite, commit changes, etc.)

Note: `tdd-report.md` is intentionally NOT gitignored — it is a deliverable the user may want to commit.
