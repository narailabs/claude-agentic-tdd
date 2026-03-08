---
name: tdd
description: >
  Enforced Test-Driven Development with agent teams. Decomposes features into
  test-first agent pairs with anti-cheat guardrails. Use when: (1) user invokes
  /tdd command, (2) user says "implement X with tests" or "TDD" or "test-driven",
  (3) adding test coverage to existing code with TDD approach, (4) implementing
  against a user-provided failing test. Requires CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1.
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
   execution.skipFailedAfterRetries: false
   reporting.generateReport: true
   reporting.generateSessionLog: true
   ```

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
- **spec-contract**: precise description of what this unit must do — inputs, outputs, side effects, error cases
- **dependsOn**: list of work unit IDs this depends on (empty if independent)
- **testFiles**: target test file paths
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
Work units: 3

### Unit 1: user-registration
Spec: Create user with email validation, password hashing, and duplicate detection
Files: src/__tests__/user-registration.test.ts → src/user-registration.ts
Dependencies: none

### Unit 2: user-login
Spec: Authenticate user with email/password, return JWT token, handle invalid credentials
Files: src/__tests__/user-login.test.ts → src/user-login.ts
Dependencies: [user-registration]

### Unit 3: password-reset
Spec: Generate reset token, validate token, update password
Files: src/__tests__/password-reset.test.ts → src/password-reset.ts
Dependencies: [user-registration]

Execution plan: Unit 1 first (dependency), then Units 2 and 3 in parallel.

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

After the Test Writer completes, run verification:

1. **Run tests**: Execute the test command via Bash. Capture exit code and output.
2. **Verify RED**: Tests MUST fail (exit code != 0). If tests pass → anti-cheat violation. Re-prompt the Test Writer (up to `maxRetries`).
3. **Verify correct failures**: Parse output. Failures should be "not found"/"not defined"/"undefined" — not syntax errors in the test file itself.
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

#### Step 4e: Adversarial Review

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

If the reviewer finds critical issues: log findings, send the pair back for revision (Test Writer re-writes tests addressing the gaps, then Code Writer re-implements).

If the reviewer passes: mark work unit as completed in state file.

### Parallel Execution

When the dependency graph allows parallel execution:
- Spawn multiple Test Writers simultaneously (up to `maxParallelPairs`)
- As each Test Writer completes, proceed with its RED → Code Writer → GREEN → Review pipeline independently
- Track all concurrent pipelines in the state file

## Phase 5: Final Review

After ALL work units complete:

1. Run the FULL test suite (all test files together) to check for integration issues
2. Review all generated code holistically — look for inconsistencies, naming conflicts, missing connections between units
3. If integration issues found: report them and suggest fixes

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

## Phase 7: Cleanup

1. Clean up the agent team (shut down any remaining teammates)
2. Remove intermediate artifacts: delete all `spec-contract-*.md` files created during the session
3. Final state file update
4. Present the report to the user
5. Suggest next steps (run full test suite, commit changes, etc.)

Note: `tdd-report.md` is intentionally NOT gitignored — it is a deliverable the user may want to commit.
