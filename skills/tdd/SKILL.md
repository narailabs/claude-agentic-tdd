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

## Non-Negotiable Requirements

These apply to EVERY run regardless of mode, complexity, or time pressure. Skipping any is a skill failure.

1. **State file**: `.tdd-state.json` MUST be created in Phase 3 and updated after every phase transition.
2. **Session log**: `tdd-session.jsonl` MUST be initialized in Phase 3 and appended to throughout.
3. **Three-stage review pipeline**: Every completed unit MUST pass Spec Compliance → Adversarial → Code Quality review (Steps 4e→4f→4g). A unit is NOT complete until all three pass. GREEN verification is the halfway point, not the finish line.
4. **Report**: `tdd-report.md` MUST be generated in Phase 6 before cleanup.
5. **RED Check 5**: Behavior-over-implementation scan MUST run on every unit (Modes 1 and 2).

## Arguments

Parse `$ARGUMENTS` for:
- The specification text (required) — what to implement
- `--skip-failed` — skip work units that fail after max retries instead of escalating
- `--design` — force the design gate (Phase 0) even for simple specs
- `--skip-design` — skip the design gate entirely
- `--effort <level>` — reasoning effort: `medium`, `high` (default), or `max`
- `--parallel <N>` — max concurrent agent pipelines (default: 4). Use `1` for sequential.
- `--model-strategy <strategy>` — `auto` (default), `standard` (all sonnet), or `capable` (all opus)

If no arguments provided, ask the user what they want to implement.

## Configuration

All configuration is via flags. If the project CLAUDE.md has a `## TDD Configuration` section, extract test conventions, framework preferences, and custom rules from it.

### Defaults

| Setting | Default | Flag |
|---------|---------|------|
| Max parallel pipelines | 4 | `--parallel <N>` |
| Model strategy | auto | `--model-strategy <auto\|standard\|capable>` |
| Effort level | high | `--effort <medium\|high\|max>` |
| Skip failed units | false | `--skip-failed` |
| Min assertions per test | 1 | — |
| Max retries per phase | 3 | — |
| Max mock depth | 2 | — |
| Flag private method tests | true | — |

Settings without flags are hardcoded defaults — sensible for all projects.

### Model and Effort Assignment

Each agent is assigned a **model** and **effort** level. The session's model/effort is the ceiling — the skill never escalates beyond it.

**`--model-strategy auto`** (default): Assess each work unit's complexity, then assign:
- **Mechanical tasks**: All agents use `sonnet` at configured effort.
- **Architecture tasks** (ambiguous spec, many deps, design-sensitive): Test Writers and reviewers get `opus` at configured effort. Code Writers stay `sonnet`.

**`--model-strategy standard`**: All agents use `sonnet` at configured effort.

**`--model-strategy capable`**: All agents use `opus` at configured effort.

Model and effort assignments are recorded in the state file and displayed in the report.

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
- User confirmation (single test file — the user's intent is already clear)

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
1. Check project CLAUDE.md for test conventions
2. Auto-detect from project files (package.json, pyproject.toml, go.mod, Cargo.toml, etc.)
3. If detection fails, ask the user for their test command

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

### Spec Analysis

Before presenting the plan, scan the specification for ambiguities that could lead to incorrect implementations. Specifically check for:

1. **Contradictions**: Do different parts of the spec disagree? (e.g., a method description says "return IDs" but a dependency note says "resolve names")
2. **Undefined relationships**: Does the spec define a field AND a method that seem related but doesn't say how they interact? (e.g., a stored `estimatedDelivery` field and a `estimateDelivery()` method — should the method update the field?)
3. **Ambiguous terms**: Are there industry terms with multiple interpretations? (e.g., "buy-2-get-1-free" — does it require 3 items or 2?)
4. **Missing edge cases**: What happens at boundaries the spec doesn't address?
5. **Dependency graph vs API mismatch**: Does the dependency graph claim a relationship that no method actually uses?

If findings exist, include them in the work plan as a **Spec Clarifications Needed** section so the user can resolve them before work begins. If no issues are found, skip this section and proceed straight to implementation — do not ask the user to confirm a clean spec.

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

Execution plan (eager dispatch, max 4 concurrent):
  Ready immediately: user-registration
  After user-registration: user-login, password-reset (parallel)

Proceed? [confirm/modify/cancel]
```

For Mode 4 (plan execution), the plan may include mixed types — use `[code]` and `[task]` labels. The execution plan shows eager dispatch dependency chains instead of rigid batches.

Wait for user confirmation before proceeding. If the user wants to modify, adjust and re-present.

## Phase 3: State Initialization

Read `reference/state-management.md` for the full state file format.

1. Check for existing `.tdd-state.json` in the project root
   - If found: show progress, offer resume/restart/add-units
   - If not found: create new state file
2. Add `.tdd-state.json`, `tdd-session.jsonl`, and `spec-contract-*.md` to `.gitignore` if not already present
3. Initialize the session log (`tdd-session.jsonl`)

**HARD GATE**: Phase 4 MUST NOT begin until `.tdd-state.json` and `tdd-session.jsonl` both exist on disk. Verify:
```bash
test -f .tdd-state.json && test -f tdd-session.jsonl && echo "READY" || echo "BLOCKED"
```
If BLOCKED, create the missing files before proceeding.

## Phase 4: Agent Team Orchestration

Create an agent team using the `TeamCreate` tool. You (the main session) are the team lead / Team Manager. All agents in this phase MUST be spawned as teammates via `TeamCreate`, not as standalone subagents via the `Agent` tool. Use `SendMessage` to communicate with teammates and receive their results. At cleanup (Phase 7), shut down the team with `TeamDelete`.

### Execution Loop

**Flow control**: User interaction is front-loaded — Phase 0 (design) and Phase 2 (confirmation) are the planned interaction points. Once the user confirms the work plan, Phases 3-7 are fully autonomous. Do not pause between steps, do not wait for user input, do not treat status updates as conversational turns. When a subagent completes, immediately proceed to the next step in the same turn. The only reasons to stop and consult the user during execution are: (1) a subagent is BLOCKED after retries, (2) a verification failure the skill cannot resolve, (3) missing information that wasn't covered during planning.

For each work unit (respecting dependency order and parallelism):

**Unit completion requires ALL of**: Test Writer → RED → Code Writer → GREEN → Spec Compliance → Adversarial → Code Quality. A unit that passes GREEN but skips reviews is NOT complete.

#### Step 4a: Spawn Test Writer

Read `reference/test-writer-prompt.md` for the full template.

Spawn a Test Writer teammate via `TeamCreate` with a prompt containing:
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
4. **Check assertion density**: Read the test file. Count assertion patterns (`expect(`, `assert`, `.toBe(`, etc.) per test function. Must meet minimum threshold. Also flag **weak assertions** where the spec implies exact values: `toBeGreaterThan(0)`, `toBeTruthy()`, `toBeDefined()` as sole assertion, `typeof x === 'number'` without checking value. These are trivially satisfied and must be replaced with exact expected values.
5. **Check behavior-over-implementation** (MANDATORY — do not skip): Scan for anti-patterns per `reference/anti-cheat.md` Check 5: excessive mocking (mocks > 2× test count), private method access, implementation-mirroring. Flag violations and re-prompt the Test Writer.

If any check fails: log the violation, provide feedback to the Test Writer, re-spawn with correction instructions. After `maxRetries` failures, escalate to user (or skip if `--skip-failed`).

Record checksums of all test files at this point (for GREEN verification later).

#### Step 4c: Spawn Code Writer

Read `reference/code-writer-prompt.md` for the full template. Spawn via `TeamCreate`.

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

**After GREEN passes: the unit is NOT complete.** Proceed immediately to the three-stage review pipeline (Steps 4e→4f→4g). Do not mark the unit complete. Do not skip to the next unit.

### Review Pipeline (MANDATORY — every unit, no exceptions)

Run all three reviews back-to-back without pausing. When one review returns a passing result, immediately spawn the next reviewer in the same turn. Do not output a status message and stop — continue executing.

**Pre-review gate**: Before dispatching ANY reviewer, verify on disk:
```bash
test -f "spec-contract-{unit_id}.md" && echo "SPEC CONTRACT EXISTS" || echo "MISSING — cannot review"
```
If the spec-contract file does not exist, the review CANNOT proceed. Go back and create it.

**Do Not Trust Self-Reports**: Reviewers are independent agents that verify by reading actual code from disk — not by trusting the orchestrator's memory of what happened. Each reviewer gets a fresh context with only the files they need. The orchestrator MUST NOT fabricate review results — it must dispatch the actual reviewer agent and read its response.

**Review loops**: If a reviewer finds issues, the implementer fixes them, then the SAME reviewer reviews AGAIN. Do not skip the re-review. Do not assume the fix was correct. Repeat until the reviewer approves.

#### Step 4e: Spec Compliance Review

Read `reference/spec-compliance-reviewer-prompt.md` for the full template.

Spawn a Spec Compliance Reviewer teammate via `TeamCreate` with:
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

If NON-COMPLIANT: send back for revision → Test Writer adds missing tests → Code Writer re-implements → **re-review** (dispatch the reviewer again, do not skip).

If COMPLIANT: proceed to adversarial review.

**ORDERING RULE**: Spec compliance MUST pass before adversarial review runs.

#### Step 4f: Adversarial Review

Read `reference/adversarial-reviewer-prompt.md` for the full template.

Spawn an Adversarial Reviewer teammate via `TeamCreate` with:
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

If critical issues found: send back for revision → fix → **re-review** (do not skip).

If PASS: proceed to code quality review.

#### Step 4g: Code Quality Review

Read `reference/code-quality-reviewer-prompt.md` for the full template.

Spawn a Code Quality Reviewer teammate via `TeamCreate` with:
- The implementation file contents (read from disk)
- The test file contents (read from disk)
- The git diff for this work unit (changes since before the unit started)

The reviewer checks:
1. Each file has one clear responsibility with a well-defined interface
2. Units are decomposed so they can be understood and tested independently
3. Names are clear and accurate (match what things do, not how they work)
4. No overbuilding — implementation does what the spec requires, nothing more
5. Code follows existing project patterns and conventions

If **critical or important** issues found: send back for fixes → **re-review** (do not skip).

If approved: mark work unit as completed in state file. **This is the ONLY point where a unit may be marked complete.** Update `.tdd-state.json` with review results — set unit status to `"completed"`, NOT leave it as `"pending"`.

**ORDERING RULE**: Spec compliance → Adversarial review → Code quality. Each stage must pass before the next runs. No exceptions. No skipping.

#### Step 4h: Non-Code Task Dispatch (Mode 4 Only)

For non-code tasks in plan execution mode, skip the TDD pipeline entirely. Instead:

1. Read `reference/implementer-prompt.md` for the template.
2. Spawn an Implementer teammate via `TeamCreate` with:
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

### Red Flags — Never Do These

- Fabricate review results — every review must be an actual agent dispatch with a real response
- Skip re-review after fixes (reviewer found issues → fix → review AGAIN)
- Mark a unit complete while its state file entry is still `"pending"`
- Generate a report claiming reviews passed without dispatching review agents
- Accept "close enough" on spec compliance — if the reviewer found issues, it's not done
- Leave `.tdd-state.json` showing `"pending"` for completed units
- Let the orchestrator's memory substitute for a reviewer reading actual code from disk
- Write test assertions like `toBeGreaterThan(0)` or `toBeTruthy()` where the spec implies exact values
- Accept test rationalizations like "handled elsewhere" without finding the actual handling code
- Proceed to the next unit while any review has open issues

### Parallel Execution

The skill uses **eager dispatch** — each unit starts as soon as its specific dependencies complete, not when an entire batch finishes. This maximizes throughput for long specs with complex dependency graphs.

#### Dependency Graph and Ready Queue

Build a DAG from the `dependsOn` fields, then maintain a **ready queue**:

1. **Initialize**: All units with no dependencies (`dependsOn: []`) are immediately ready.
2. **Dispatch**: Pop up to `maxParallelPairs` units from the ready queue and start them concurrently. Each unit follows its full pipeline (TDD or implementer) independently.
3. **On completion**: When a unit finishes (including all reviews), check all remaining units. Any unit whose dependencies are now ALL complete gets added to the ready queue.
4. **Repeat**: Dispatch newly ready units immediately, up to the concurrency cap.
5. **Done**: When the ready queue is empty and no units are in progress, all work is complete.

This means a unit that depends on one fast unit starts immediately when that unit finishes, without waiting for slower sibling units.

#### Concurrent Dispatch

When dispatching from the ready queue:
- **TDD units**: Start the Test Writer. As it completes, proceed through RED → Code Writer → GREEN → three-stage review, all within the same concurrency slot.
- **Non-code tasks** (Mode 4): Start the Implementer. As it completes, proceed through Spec Compliance → Code Quality review.
- **Mixed**: TDD and non-code units run concurrently — each follows its own pipeline.
- Track all in-progress pipelines in the state file. Update the ready queue on each completion.

A unit occupies one concurrency slot for its entire pipeline (from Test Writer through final review). When it completes, the slot frees for the next ready unit.

#### Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `execution.maxParallelPairs` | `4` | Max concurrent agent pipelines |
| `execution.parallelMode` | `"eager"` | `"eager"` (default): dispatch as soon as dependencies are met. `"sequential"`: one unit at a time in topological order (useful for debugging or resource-constrained environments). |

When `parallelMode` is `"sequential"`, process units one at a time in dependency order. This is slower but avoids file conflicts and simplifies debugging.

## Phase 5: Final Review — Verification Before Completion

**IRON LAW**: No completion claim without fresh verification evidence. "It should work" is not evidence. "I'm confident" is not evidence. Only actual test output is evidence.

After ALL work units complete:

1. **Run the FULL test suite** (all test files together) to check for integration issues. Read the actual output — do not assume success.
2. **Verify pristine output**: All tests pass, no warnings, no skipped tests, no pending tests. If the test runner reports anything other than clean green, investigate.
3. **Review all generated code holistically** — look for inconsistencies, naming conflicts, missing connections between units
4. **Cross-unit integration check**: Do units that depend on each other actually work together? Run any integration tests.
5. If integration issues found: report them with evidence (actual test output) and fix before proceeding.
6. **Spec gap retrospective**: Review the implementation for assumptions that weren't explicit in the spec. Look for:
   - Dependencies injected but never used (suggests a spec requirement was missed)
   - Ambiguous terms that were interpreted one way but could go another
   - Fields and methods with overlapping responsibility (who owns the data?)
   - Edge cases the implementation handles that the spec didn't define
   Include findings in the report under "Spec Gaps." These help the user improve their specs for future work.

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

**IRON LAW**: No cleanup (Phase 7) without a report. Generate the report BEFORE any cleanup.

**Content integrity check** — before generating the report, verify the state file is consistent:
```bash
grep -c '"status": "pending"' .tdd-state.json
```
If ANY work units are still `"pending"` but the session claims they're complete, the pipeline was not fully executed. Go back and complete the missing phases for those units — do not generate a report that claims completion for pending units.

Read `reference/report-format.md` for the full templates. Generate:
1. `tdd-report.md` — human-readable summary with per-unit phase statuses, review findings, and anti-cheat log. Report data MUST come from the state file, not from the orchestrator's memory.
2. Finalize `tdd-session.jsonl` — append `session.complete` event with summary

Verify the report exists:
```bash
test -f tdd-report.md && echo "REPORT EXISTS" || echo "REPORT MISSING"
```
If REPORT MISSING, generate it before proceeding to Phase 7.

## Error Handling and Debugging

Read `reference/error-handling.md` for the full error handling procedures (agent crashes, test command failures, permission errors, interrupted sessions) and the systematic debugging protocol (4-phase: root cause → pattern analysis → hypothesis test → verification).

Key principles:
- Always save state on error so the user can resume
- After `maxRetries`, switch to systematic debugging before escalating
- If the Code Writer keeps failing on the same test, the design may be wrong — escalate to user with options
- Always attempt team cleanup even on error

## Phase 7: Cleanup

**Pre-check** — verify all required artifacts before cleanup:
```bash
test -f tdd-report.md && echo "report: OK" || echo "report: MISSING"
test -f .tdd-state.json && echo "state: OK" || echo "state: MISSING"
```
If any artifact is MISSING, go back and create it (Phase 6 for report, Phase 3 for state).

1. Clean up the agent team using `TeamDelete` (shut down all remaining teammates)
2. Remove intermediate artifacts: delete all `spec-contract-*.md` files created during the session
3. Final state file update
4. Present the report to the user
5. Suggest next steps (run full test suite, commit changes, etc.)

Note: `tdd-report.md` is intentionally NOT gitignored — it is a deliverable the user may want to commit.
