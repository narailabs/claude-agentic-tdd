---
name: tdd
description: >
  Build features and full-stack apps using strict Test-Driven Development with
  agent teams, anti-cheat verification, and E2E browser testing. Always use this
  skill when the user wants to: build or implement something with tests, use TDD
  or test-driven development, implement a feature with "tests first" or "write
  tests before code", add test coverage to existing code, implement code against
  a failing test file, execute a multi-task implementation plan, build a full-stack
  app (backend + frontend), or invoke /tdd. Also use when the user mentions
  "red-green-refactor", "test-first", wants "no shortcuts" or "no cheating" in
  tests, asks to "resume" a TDD session, or wants comprehensive QA testing of
  their app. This skill handles everything from simple utilities to complex
  full-stack applications with React frontends and Express backends.
  Requires CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1.
---

# Agentic TDD

Enforced Test-Driven Development using Claude Code agent teams and TypeScript
verification scripts. Creative work (writing tests, writing code, reviewing)
runs in agent teammates. Deterministic checkpoints (RED/GREEN verification,
state management, checksums) run as scripts via Bash. This separation means
the model cannot fabricate verification results — script output is in the
conversation and speaks for itself.

## Prerequisites

Before anything else, verify the environment:

1. Check `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set to `1`. If not, tell
   the user to enable it and stop.
2. Confirm we are in a git repository (run `git rev-parse --is-inside-work-tree`).
   TDD state files need a working directory root.
3. Check if the Claude-in-Chrome browser extension is available by calling
   `mcp__claude-in-chrome__tabs_context_mcp`. If it responds, store
   `{chrome_available: true}`. If it errors or is not found, set `false`.
   Tell the user: "For best results, enable the Claude-in-Chrome extension —
   it allows full E2E testing of the frontend after implementation."
   This is a recommendation, not a blocker — the pipeline works without it.

## Plugin Root

Scripts live in the plugin, not the user's project. Determine `{plugin_root}`
by going up from this SKILL.md's location (`skills/tdd/`) to the directory
containing `package.json`. Store it — every script call uses it.

All script invocations follow this pattern:
```bash
cd {plugin_root} && npx tsx skills/tdd/scripts/{script}.ts --working-dir {user_cwd} [args...]
```

Where `{user_cwd}` is the user's current working directory (where their code lives).

## Arguments

Parse `$ARGUMENTS` for:
- **Spec text**: the feature description (everything not a flag)
- `--skip-failed`: skip units that fail after max retries instead of escalating
- `--design`: force Phase 0 design gate even for simple specs
- `--skip-design`: skip Phase 0 entirely
- `--effort <level>`: reasoning effort (`low`, `medium`, `high` (default), `max`)
- `--parallel <N>`: max concurrent unit pipelines (default 4)
- `--model-strategy <s>`: `auto`, `standard`, `capable`
- `--resume`: resume from existing `.tdd-state.json`

## Resume Flow (when `--resume` is set)

**Why**: Long-running TDD sessions may be interrupted by rate limits, network
failures, or the user closing the conversation. The state file captures enough
to resume safely without re-doing completed work or leaving half-done units in
an inconsistent state.

When `--resume` is present (or when `.tdd-state.json` exists and the user says
"resume" or "continue"):

### Step R1: Load and Verify State

```bash
cd {plugin_root} && npx tsx skills/tdd/scripts/check-state.ts \
  --working-dir {user_cwd}
```

If exit 1: show the violations to the user. For checksum mismatches or missing
files, the affected units must be restarted from scratch (mark them PENDING).
Fix the state before proceeding.

If exit 0 or after fixes: load the state file to get all work units, framework
info, config, entry mode, and spec.

### Step R1b: Code Audit Agent

Spawn an agent (Agent tool, no team) with tools: Read, Glob, Grep, Bash.
Prompt it to: run `{testCommand}`, validate completed unit files are non-empty,
report in-progress unit file state, check for orphaned spec-contract files.
Return JSON with `buildable`, `completedUnitsValid`, `completedUnitsInvalid`,
`inProgressState`. If `buildable: false`, fix compilation errors. If any
completed units are invalid, demote to PENDING. Present summary to user.

### Step R2: Restore Task List

Create a `TaskCreate` per work unit. Mark COMPLETED/FAILED units as `completed`.
Leave PENDING and interrupted units as `pending` (they will be restarted).

### Step R3: Determine Resume Point

Roll back each interrupted unit to its **last script-verified checkpoint**:

| Status at Interruption | Resume From |
|----|----|
| `PENDING` / `TEST_WRITING` | Step 4a (Test Writer) |
| `RED_VERIFICATION` (passed) / `CODE_WRITING` | Step 4c (Code Writer) |
| `RED_VERIFICATION` (failed) | Step 4a (Test Writer) |
| `GREEN_VERIFICATION` (passed) / `SPEC_REVIEW` | Step 4e (Spec Review) |
| `GREEN_VERIFICATION` (failed) | Step 4c (Code Writer) |
| `ADVERSARIAL_REVIEW` | Step 4f |
| `CODE_QUALITY_REVIEW` | Step 4g |

For fullstack units, check which pass was in progress (backend or frontend)
based on which files have been created. If backend files exist but frontend
files don't, resume from the frontend pass (mid-unit synthesis + Step 4a for
frontend). If neither exists, restart from the backend pass.

For units resuming from RED, read stored `testFileChecksums` from the state.

### Step R4: Skip to Phase 4

Resume skips Phases 0–3 (already in state). Log the resume event and continue
with Phase 4, respecting resume points from R3 and two-wave execution order.

---

## Phase 0: Design Gate (Optional, Conversational)

**Why**: Complex specs need clarification before decomposition. Ambiguity here
compounds into wrong tests and wrong code downstream.

Analyze the spec. The design gate is needed when: 3+ distinct features, external
integrations, or ambiguous requirements. Apply flag overrides:
- `--skip-design` => skip entirely
- `--design` => force even for simple specs

If triggered:
1. Ask the user one clarifying question at a time (do not dump a list)
2. Propose trade-offs where the spec is ambiguous
3. Synthesize a design summary once alignment is reached
4. Store the design summary for later phases

## Phase 1: Framework Detection (Script)

**Why**: The pipeline needs to know which test runner and command to use. The
script inspects package.json, pyproject.toml, go.mod, Cargo.toml, etc.

```bash
cd {plugin_root} && npx tsx skills/tdd/scripts/detect-framework.ts --working-dir {user_cwd} --spec "{spec}"
```

Read the JSON output. It returns `{framework, entryMode}`. If `framework` is
null, ask the user for the test command and language. Store the framework info
and entry mode for all subsequent phases.

## Phase 2: Work Decomposition (Model Reasoning)

**Why**: A monolithic spec produces monolithic tests. Decomposition creates
focused, independently verifiable units.

1. Analyze the spec and design summary (if any)
2. Scan for contradictions, ambiguous terms, and undefined relationships. If
   found, include them as "Spec Clarifications Needed" in the plan.
3. Produce work units, each with:
   - `id`: short kebab-case identifier
   - `name`: human-readable name
   - `specContract`: detailed behavioral contract for this unit
   - `unitType`: `"code"` or `"task"` (non-code work like configs, migrations)
   - `wave`: `"backend"`, `"frontend"`, or `"fullstack"` (see classification below)
   - `dependsOn`: list of unit IDs this depends on
   - `testFiles`: paths for test files to create
   - `implFiles`: paths for implementation files to create
   - `complexity`: `"mechanical"`, `"standard"`, or `"architecture"`

### Backend / Frontend / Fullstack Classification

After producing the unit list, classify each unit:

- **Backend**: API routes, business logic, data models, server config,
  migrations, non-code tasks — anything without UI.
- **Frontend**: Unit's files target typical frontend paths (`src/public/`,
  `src/components/`, `pages/`, `app/`, `*.html`, `*.css`, `*.jsx`, `*.tsx`,
  `*.vue`, `*.svelte`) OR its spec-contract describes UI rendering, user
  interaction, or visual output — with NO backend dependencies within the
  same unit.
- **Fullstack**: The unit has BOTH backend files (API routes, data layer)
  AND frontend files (components, pages) that belong together as one
  cohesive feature. Use this when splitting into separate backend +
  frontend units would be artificial — e.g., a "user profile" feature
  with an API endpoint and a React component, or a "search" feature
  with a query endpoint and a search results page.

Tag each unit with `wave: "backend"`, `wave: "frontend"`, or
`wave: "fullstack"`. For fullstack units, separate the file lists:
- `backendTestFiles` / `backendImplFiles`: API routes, models, etc.
- `frontendTestFiles` / `frontendImplFiles`: components, pages, etc.

Present units grouped by wave in the work plan so the user sees the
execution order.

### Enriched Sub-Specs

**When to generate**: If the decomposition produces 3+ units with inter-
dependencies, or `--effort` is `high` or `max`, generate enriched sub-specs
instead of basic spec-contracts. For 1-2 simple units, use basic contracts.

**What enriched sub-specs add** (beyond the basic behavioral description):
- Input/output type definitions (function signatures, API request/response shapes)
- Error cases with expected error types
- Edge cases explicitly called out
- Interface contracts with other units (what this unit consumes from dependencies)

Frontend sub-specs for `wave: "frontend"` units are NOT generated here — they
are synthesized later, between the backend and frontend waves, using the actual
implemented API (see Phase 4). For `wave: "fullstack"` units, the frontend
sub-spec is synthesized mid-unit after the backend pass completes (see
Fullstack Unit Pipeline in Phase 4).

### Frontend Technology Selection

**NON-NEGOTIABLE**: Before creating frontend work units, determine the stack.
This decision happens HERE — not later. File paths in the work plan MUST
reflect the chosen framework. Getting this wrong wastes an entire wave.

| Condition | Stack to use |
|---|---|
| Existing project has a framework (brownfield) | Use what's already there |
| Spec explicitly names a framework | Use what the spec says |
| Spec explicitly says "vanilla JS" or "no frameworks" | Vanilla HTML/CSS/JS |
| **Spec does NOT mention a frontend framework** | **React + Vite + Tailwind CSS + shadcn/ui** |

For the default React stack:
- First frontend unit must set up the project: `npm create vite@latest`
  (React + TypeScript template), install `tailwindcss`, `@tailwindcss/vite`,
  `shadcn/ui` dependencies, and `@testing-library/react` for tests
- All frontend file paths use `src/components/*.tsx`, NOT `public/app.js`
- The main entry (`App.tsx`) must import and render ALL tab/page components
- Do NOT fall back to vanilla JS unless the spec explicitly requests it

4. Present the work plan to the user and wait for confirmation

## Phase 3: State Initialization (Script)

**Why**: The state file enables resume after interruption and provides the
data source for the final report.

```bash
cd {plugin_root} && npx tsx skills/tdd/scripts/init-state.ts \
  --working-dir {user_cwd} \
  --spec "{spec}" \
  --entry-mode "{mode}" \
  --framework-json '{...}' \
  --work-units-json '[...]' \
  --force
```

Pass `--design-summary "{summary}"` if Phase 0 ran. Pass `--config-json '{...}'`
to override defaults (e.g., maxRetries, maxParallelPairs from flags).

Verify exit 0 and that the output confirms `stateFile` and `logFile` were created.

### Task List for Progress Tracking

After state initialization, create a task for each work unit using `TaskCreate`.
This gives the user a visible progress bar throughout execution.

- Set the task subject to the unit name (e.g., `"Menu System"`)
- Set the description to the unit's specContract summary
- Mark each task `in_progress` when its pipeline starts (Step 4a)
- Update the task's `activeForm` at each sub-step transition:
  - `"Writing tests..."` (Step 4a)
  - `"RED verification..."` (Step 4b)
  - `"Writing implementation..."` (Step 4c)
  - `"GREEN verification..."` (Step 4d)
  - `"Spec compliance review..."` (Step 4e)
  - `"Adversarial review..."` (Step 4f)
  - `"Code quality review..."` (Step 4g)
- Mark `completed` when all reviews pass

This is critical for user experience — without task updates, the task list vanishes
during agent team execution and the user has no visibility into progress.

## Phase 4: Agent Team Orchestration

**Generate a unique team name**: Derive `{team_name}` from the working directory
to avoid collisions when multiple `/tdd` sessions run concurrently on different
folders. Use: `tdd-` + first 8 characters of the SHA-256 hash of `{user_cwd}`.
For example, compute it via Bash:
```bash
echo -n "{user_cwd}" | shasum -a 256 | cut -c1-8
```
Then the team name is `"tdd-a1b2c3d4"`. Store `{team_name}` and use it for all
Agent tool dispatches and the final TeamDelete.

**Create the team**: Use `TeamCreate` to create a team named `{team_name}`.

**Flow control**: Once the user confirms the plan, execution is fully autonomous.
Do not pause between steps or wait for user input. Only stop for: blocked agents,
unresolvable failures after max retries, or missing information that only the
user can provide.

### Two-Wave Execution: Backend First, Then Frontend

Execute work units in two waves. **No mixing** — all backend and fullstack
units must reach COMPLETED (or FAILED with `--skip-failed`) before any
pure-frontend unit starts.

**Wave 1 — Backend + Fullstack**: Dispatch all `wave: "backend"` and
`wave: "fullstack"` units, respecting `dependsOn` order, up to `--parallel`
concurrent pipelines. Backend units follow the standard pipeline (Steps
4a–4g). Fullstack units follow the **Fullstack Unit Pipeline** below.
Wait for all Wave 1 units to finish.

**After Wave 1 — E2E Checkpoint** (if fullstack units exist and Chrome is
available): Fullstack units built both backend and frontend. Run E2E now
to catch integration bugs early — don't wait until the end. See
**E2E Checkpoint Protocol** below.

**Between waves — Frontend Sub-Spec Synthesis**: After Wave 1 E2E passes
(or if no fullstack units), before dispatching pure-frontend units:

1. Use the Read tool to read the implemented backend route files from disk
   (including backend files from fullstack units)
2. Extract: endpoint paths, HTTP methods, request body shapes, response shapes,
   error response formats
3. Read the original spec's frontend section
4. For each frontend unit, synthesize an enriched sub-spec that includes:
   - Available API endpoints with example request/response shapes
   - Component/page responsibilities from the spec
   - User interaction flows (what happens on click, submit, navigate)
   - Error handling (what errors the API returns, how to display them)
   - State management approach (what data to fetch, when to refresh)
5. Write each frontend sub-spec to `spec-contract-{unit.id}.md` on disk

This is the key quality difference — frontend agents get a detailed spec
informed by the actual backend implementation, not just the raw spec section.

**Wave 2 — Frontend**: Dispatch all `wave: "frontend"` units, up to `--parallel`
concurrent pipelines. For framework-based frontends (React, Vue, Svelte), use
the full TDD pipeline (Steps 4a–4g). For vanilla JS frontends (no test
framework), use the task pipeline (implementer → spec-compliance + code-quality
review, skip adversarial — same as Step 4h for non-code tasks).

If the spec has no pure-frontend units, Wave 2 is skipped entirely.

**After Wave 2 — E2E Checkpoint**: Run E2E on everything built so far (all
frontend + fullstack features). See **E2E Checkpoint Protocol** below. This
is the same protocol used after Wave 1 — applied again to catch any new
bugs from pure-frontend units.

### Fullstack Unit Pipeline

**Why**: Some features are a cohesive backend+frontend pair (e.g., "user
profile" with an API endpoint and a React component). Splitting these into
separate units across waves is artificial and loses context. Fullstack units
keep the feature together while still enforcing backend-before-frontend order.

For units with `wave: "fullstack"`, run TWO TDD passes within the same unit:

**Pass 1 — Backend** (uses `backendTestFiles` / `backendImplFiles`):
1. Step 4a: Test Writer — writes tests for backend files only
2. Step 4b: RED verification — on backend test files
3. Step 4c: Code Writer — implements backend files only
4. Step 4d: GREEN verification — on backend test files

**Mid-unit Frontend Sub-Spec Synthesis**:
After the backend pass completes (GREEN verified), before starting the
frontend pass:
1. Read the just-implemented backend files from disk
2. Extract the actual API surface (endpoints, request/response shapes, errors)
3. Synthesize a frontend sub-spec that includes the real API details
4. Update the unit's spec-contract with the frontend sub-spec

This is the same synthesis that happens between waves for pure-frontend
units — but here it happens mid-unit, informed by the backend code that
was just written within this same unit.

**Pass 2 — Frontend** (uses `frontendTestFiles` / `frontendImplFiles`):
1. Step 4a: Test Writer — writes tests for frontend files, using the
   enriched sub-spec with real API details
2. Step 4b: RED verification — on frontend test files
3. Step 4c: Code Writer — implements frontend files
4. Step 4d: GREEN verification — on frontend test files

**Mid-unit E2E Checkpoint** (if Chrome is available):
After the frontend pass's GREEN verification, before reviews, run the
**E2E Checkpoint Protocol** scoped to this unit's features. This catches
frontend/backend data contract mismatches within the unit immediately —
the exact bug class that killed pizza-sdk-max's Order Tracking tab.

**Combined Reviews** (run once on ALL files — backend + frontend together):
1. Step 4e: Spec compliance review — checks the full feature
2. Step 4f: Adversarial review — checks the full feature
3. Step 4g: Code quality review — checks the full feature

State updates: call `update-state.ts` after each verification (backend RED,
backend GREEN, frontend RED, frontend GREEN) so the resume flow knows
exactly where to restart if interrupted.

### E2E Checkpoint Protocol

This protocol is used at multiple points: after each fullstack unit's
frontend pass, after Wave 1 (if fullstack units exist), after Wave 2,
and in Phase 5b. The scope varies (single unit vs all features) but the
process is the same.

**Skip condition**: If `{chrome_available}` is false, skip E2E and note
it in the log. The protocol is mandatory when Chrome is available.

**Step 1 — Smoke test**:
1. Start the application server via Bash (background)
2. Wait 3 seconds, then `curl http://localhost:{port}`
3. Verify HTTP 200 and response contains expected content
4. If it fails, fix and re-check (max 2 attempts)

**Step 2 — E2E test the relevant features**:
1. Open a Chrome tab via `mcp__claude-in-chrome__tabs_create_mcp`
2. Navigate to the app URL
3. For each feature in scope (the unit's features, or all features):
   - Exercise the UI: click, type, navigate, submit forms
   - Verify page state via `mcp__claude-in-chrome__read_page`
   - Screenshot key checkpoints
   - Record PASS/FAIL with evidence
4. Append results to `{user_cwd}/qa-results.md`

**Step 3 — Fix bugs immediately via TDD team**:
If any test case FAILS, do NOT continue testing. Fix first:

1. **Stop testing.** Document the failure: test case ID, steps to
   reproduce, expected vs actual, screenshot evidence. Classify:
   data-contract mismatch, missing wiring, logic error, or display bug.
2. **Spawn a fix team.** Dispatch a teammate (using the existing
   `{team_name}`) with the bug report as its spec-contract. The
   teammate must:
   a. Write a failing unit test that reproduces the bug
   b. Run verify-red.ts to confirm the test fails
   c. Fix the implementation
   d. Run verify-green.ts to confirm the fix + test file unchanged
3. **Wait for the fix team to complete.** Do not proceed until the
   teammate reports the fix is GREEN-verified.
4. **Re-test the failing case via Chrome.** Verify it now passes.
5. **Continue testing** from where you stopped. If the fix introduced
   new failures, repeat this protocol (max 3 fix cycles per checkpoint).

This stop-fix-verify-continue loop ensures bugs are caught and fixed
at the point of discovery, not accumulated into a backlog.

For each work unit, execute steps 4a through 4g. Entry mode affects the flow:

### Entry Mode Branching

- **`natural-language-spec`** (default): Steps 4a–4g as written below.
- **`user-provided-test`**: **Skip 4a** — go to 4b with the user's test file.
- **`existing-codebase`** (coverage): Read existing source in Phase 2. Step 4b
  uses hide-and-restore (renames impl → tests fail → restore → Code Writer fixes).
- **`plan-execution`**: Code units → 4a–4g. Non-code task units → Step 4h.

### Step 4a: Test Writer

1. Use the Read tool to load `reference/test-writer-prompt.md` from the plugin
2. Extract the template block (between the ``` markers)
3. Fill all placeholders: `{spec_contract}`, `{language}`, `{test_runner}`,
   `{test_command}`, `{test_file_paths}`, `{min_assertions}`, `{unit_id}`,
   `{project_conventions_from_claude_md}`
4. Dispatch a teammate using the Agent tool with `team_name: {team_name}`.
   Give it tools: Read, Write, Glob, Grep, Bash. Send the filled prompt.
5. Wait for completion. If the agent responds with NEEDS_CLARIFICATION:
   resolve the ambiguity using the spec/design summary, then re-dispatch.
6. **Verify deliverables exist on disk** (both must exist before proceeding):
```bash
test -f {user_cwd}/{test_file_path} && test -f {user_cwd}/spec-contract-{unit_id}.md \
  && echo '{"filesExist":true}' || echo '{"filesExist":false,"error":"MISSING"}'
```
   If either file is missing, re-prompt the Test Writer. Do not proceed to RED.
7. Log the event:
```bash
cd {plugin_root} && npx tsx skills/tdd/scripts/log-event.ts \
  --working-dir {user_cwd} --event "test-writer.completed" --unit-id "{id}"
```

### Step 4b: RED Verification (Anti-Cheat Checkpoint)

**Why**: Tests must actually fail before implementation exists. If they pass
already, they prove nothing. The script runs the tests and checks for real
assertion failures, not just syntax errors.

```bash
cd {plugin_root} && npx tsx skills/tdd/scripts/verify-red.ts \
  --working-dir {user_cwd} \
  --test-files "{comma_separated_files}" \
  --test-command "{cmd}" \
  --language "{lang}" \
  --entry-mode "{mode}"
```

- **Exit 0**: Tests fail as expected. Extract `testFileChecksums` from the JSON
  output and store them — these are needed for GREEN verification to prove the
  Code Writer did not modify test files.
- **Exit 1**: Read the failure reason from JSON. Re-prompt the Test Writer with
  the error. Retry up to maxRetries (3).

**CHECKPOINT — update state immediately** (check-state.ts will block report
generation if this is missing):
```bash
cd {plugin_root} && npx tsx skills/tdd/scripts/update-state.ts \
  --working-dir {user_cwd} --unit-id "{id}" --status "RED_VERIFICATION" \
  --red-json '{...}'
```

### Step 4c: Code Writer (Information Barrier)

**Why**: The Code Writer must work from the test files on disk, not from the
Test Writer's conversation. This information barrier ensures the implementation
is driven by the tests alone, not by shared context.

1. Use the **Read tool** to read the test files from disk
2. Use the **Read tool** to read `spec-contract-{unit.id}.md` from disk
3. Use the Read tool to load `reference/code-writer-prompt.md` from the plugin
4. Fill the template with the disk-read contents: `{test_file_contents_verbatim}`,
   `{spec_contract_file_contents}`, `{language}`, `{test_runner}`, `{test_command}`,
   `{impl_file_paths}`, `{project_conventions_from_claude_md}`
5. Dispatch a teammate using the Agent tool with `team_name: {team_name}`.
   Give it tools: Read, Write, Glob, Grep, Bash. Send the filled prompt.
6. The prompt MUST NOT contain any Test Writer reasoning, approach, or history
7. Wait for completion. If the agent responds with NEEDS_CLARIFICATION:
   resolve using the spec-contract, then re-dispatch.

### Step 4d: GREEN Verification (Anti-Cheat Checkpoint)

**Why**: Two things must be true: tests pass, and test files are unchanged.
The checksum comparison catches a Code Writer that "cheats" by weakening tests.

```bash
cd {plugin_root} && npx tsx skills/tdd/scripts/verify-green.ts \
  --working-dir {user_cwd} \
  --test-files "{comma_separated_files}" \
  --test-command "{cmd}" \
  --checksums-json '{stored_checksums_from_red}' \
  --language "{lang}"
```

- **Exit 0**: Tests pass and test file checksums match RED checksums.
  Check `tscCheck` in the JSON output (see Step 4d2). Proceed.
- **Exit 1, `testFilesUnchanged: false`**: Anti-cheat violation. The Code Writer
  modified test files. The checksum proof is in the conversation and cannot be
  disputed. Re-prompt the Code Writer: restore original test files and fix the
  implementation instead.
- **Exit 1, `testsPassed: false`**: Tests still failing. Re-prompt the Code
  Writer with the test output. Retry up to maxRetries.
- **Exit 1, `skipMarkersFound` non-empty**: Code Writer added skip/ignore
  markers. Anti-cheat violation. Re-prompt to remove them.

**CHECKPOINT — update state immediately** (check-state.ts will block report
generation if this is missing):
```bash
cd {plugin_root} && npx tsx skills/tdd/scripts/update-state.ts \
  --working-dir {user_cwd} --unit-id "{id}" --status "GREEN_VERIFICATION" \
  --green-json '{...}'
```

### Step 4d2: TypeScript Compilation Check (Automatic)

**Why**: Tests can pass while the project has type errors — vitest bundles
its own types and ignores tsconfig gaps. A project that tests-pass but
fails `tsc --noEmit` has latent bugs (wrong types, missing imports, type
mismatches).

**This check is now built into `verify-green.ts`** when you pass
`--language typescript`. The output JSON includes a `tscCheck` field:
- `tscCheck.clean: true` — no errors, proceed to reviews.
- `tscCheck.clean: false` — read `tscCheck.errors`. Common fixes:
  - Missing vitest types: add `"types": ["vitest/globals"]` to tsconfig
  - Express `req.params` type: cast with `as string`
  - Missing module declarations: add `.d.ts` files
  Re-prompt the Code Writer with the compilation errors. Retry up to 2
  times. If still failing after fixes, log the errors and proceed to
  reviews (compilation issues are flagged in the report but don't block).

You do NOT need to run `tsc --noEmit` separately — just pass `--language`
to verify-green.ts and check the `tscCheck` field in the response.

### Step 4e: Spec Compliance Review

**Why**: Passing tests do not guarantee the spec is met. Tests may be incomplete,
or the implementation may satisfy tests while missing requirements.

1. Use the Read tool to read spec-contract, test files, and impl files from disk
2. Use the Read tool to load `reference/spec-compliance-reviewer-prompt.md`
3. Fill the template: `{spec_contract}`, `{design_summary}`, `{test_file_contents}`,
   `{impl_file_contents}`, `{unit_name}`
4. Dispatch a reviewer teammate using the Agent tool with `team_name: {team_name}`.
   Give it read-only tools: Read, Glob, Grep.
5. Parse the response for `COMPLIANT` or `NON-COMPLIANT`
6. If `NON-COMPLIANT`: send blocking issues back to the Code Writer (or Test
   Writer if tests are incomplete). After fixes, **re-run this review** — do
   not skip the re-review.

### Step 4f: Adversarial Review

**Why**: The adversarial reviewer tries to break the tests. It catches hardcoded
returns, shallow implementations, mock exploitation, and weak assertions that
the spec compliance review does not look for.

1. Use the Read tool to read spec-contract, test files, and impl files from disk
2. Use the Read tool to load `reference/adversarial-reviewer-prompt.md`
3. Fill the template: `{spec_contract}`, `{test_file_contents}`,
   `{impl_file_contents}`, `{unit_name}`, `{min_assertions}`
4. Dispatch a reviewer teammate with `team_name: {team_name}`. Read-only
   tools: Read, Glob, Grep.
5. Parse the response for `PASS` or `FAIL`
6. If `FAIL`: send critical issues back for revision, then **re-run this review**

### Step 4g: Code Quality Review

**Why**: Spec compliance and adversarial review check correctness. Code quality
checks structure, naming, discipline, and maintainability.

1. Use the Read tool to read impl files and test files from disk
2. Use the Read tool to load `reference/code-quality-reviewer-prompt.md`
3. Fill the template with what was implemented and the file contents
4. Dispatch a reviewer teammate with `team_name: {team_name}`. Read-only
   tools: Read, Glob, Grep.
5. Parse the response for `Approved` or `Needs Changes`
6. If `Needs Changes`: send issues back for fixes, then **re-run this review**

### Completing a Unit

After all three reviews pass, mark the unit completed:
```bash
cd {plugin_root} && npx tsx skills/tdd/scripts/update-state.ts \
  --working-dir {user_cwd} --unit-id "{id}" --status "COMPLETED"
```

Log the event:
```bash
cd {plugin_root} && npx tsx skills/tdd/scripts/log-event.ts \
  --working-dir {user_cwd} --event "unit.completed" --unit-id "{id}"
```

### Handling Task Units (Non-Code)

For units with `unitType: "task"`, use the implementer prompt instead of the
Test Writer / Code Writer split. Read `reference/implementer-prompt.md`, fill
the template, dispatch a teammate. After completion, run spec compliance review
and code quality review (skip adversarial review since there is no test/impl
pair to verify). Mark completed when reviews pass.

### Failure Handling

If a unit exhausts maxRetries at any step:
- If `--skip-failed`: mark as FAILED, log the event, continue to next unit
- Otherwise: stop and escalate to the user with the failure details

## Phase 5: Final Review

**Why**: Individual units may pass in isolation but conflict when integrated.
The final review catches cross-unit issues.

1. Run the full test suite (no specific files):
```bash
cd {user_cwd} && {testCommand}
```
2. Use the Read tool to read all implementation and test files
3. Perform a holistic spec compliance check: compare the FULL original spec
   against ALL code produced. Look for requirements that fell through the cracks
   between unit boundaries.
4. Spec gap retrospective: flag assumptions made, unused dependencies, and
   ambiguous interpretations encountered during the session

## Phase 5b: QA Test Plan and Final E2E

**NON-NEGOTIABLE**: This phase MUST run if the project has frontend units.
Do not skip it. Do not defer it. Do not proceed to Phase 6 without it.
The QA test plan is a deliverable — its absence means the session is incomplete.

**Why**: Unit tests and code reviews verify individual units. But real users
interact through the UI — clicking buttons, filling forms, navigating tabs.
Earlier E2E checkpoints (after waves) caught per-feature bugs. This final
pass catches cross-feature integration issues: flows that span multiple
tabs, data that should propagate across features, and full user journeys.

### Step 1: Generate QA Test Plan

Generate a comprehensive QA test plan at `{user_cwd}/qa-test-plan.md`.
Verify the file exists on disk after writing (`test -f`). The plan must
include cross-feature tests that earlier per-wave checkpoints could not
cover:

- **Cross-feature flows** — e.g., create customer → place order → track →
  deliver → check analytics reflects the order
- **Every CRUD operation** for every entity (create, read, update, delete)
- **Every UI tab/page** with step-by-step interaction sequences
- **Every form** with valid input, invalid input, and edge cases
- **Every status transition** and its UI feedback
- **All error states** — what the user should see for each error
- **Destructive actions** — cancel, delete — verify confirmation dialogs

Format each test case as:

```
### TC-{N}: {Test Case Name}
**Preconditions**: {setup needed}
**Steps**:
1. {action}
2. {action}
**Expected**: {what should happen}
```

### Step 2: Final E2E Run

Run the **E2E Checkpoint Protocol** (defined in Phase 4) scoped to ALL
features — the full QA test plan. This is the comprehensive pass that
exercises cross-feature flows. The stop-fix-verify-continue loop applies:
any bug found spawns a TDD fix team immediately.

If `{chrome_available}` is false: skip E2E testing, present the QA test plan
to the user, and suggest they run it manually or with the Chrome extension
in a future session.

## Phase 6: Report Generation (Script)

**Why**: The report is the deliverable. But it must not be generated from
inconsistent state — that would produce a misleading report.

**HARD GATE**: If the project has frontend units, verify `qa-test-plan.md`
exists before proceeding:
```bash
test -f {user_cwd}/qa-test-plan.md && echo "QA plan exists" || echo "MISSING"
```
If MISSING: **STOP. Go back and run Phase 5b.** Do not generate the report
without the QA test plan. If Chrome is available, `qa-results.md` must also
exist (E2E tests must have run). This gate exists because Phase 5b was
skipped in real-world runs, shipping apps with broken frontends.

Then verify state consistency:
```bash
cd {plugin_root} && npx tsx skills/tdd/scripts/check-state.ts \
  --working-dir {user_cwd}
```

If exit 1: the output lists violations (missing files, checksum mismatches,
units marked completed without verification). Go back and fix them before
proceeding. Do not generate a report from inconsistent state.

If exit 0: generate the report:
```bash
cd {plugin_root} && npx tsx skills/tdd/scripts/generate-report.ts \
  --working-dir {user_cwd}
```

The report is written to `{user_cwd}/tdd-report.md`.

## Phase 7: Cleanup

1. **Graceful teammate shutdown**: Send a shutdown request to every teammate
   via `SendMessage` with `message: {type: "shutdown_request"}`. Wait for
   shutdown confirmations (delivered as teammate messages).
2. **TeamDelete with retry**: Call `TeamDelete`. If it fails with
   "active member(s)", wait 10 seconds and retry (up to 3 attempts).
   If it still fails after retries, force cleanup:
   ```bash
   rm -rf ~/.claude/teams/{team_name} ~/.claude/tasks/{team_name}
   ```
3. Delete spec-contract files: `rm -f {user_cwd}/spec-contract-*.md`
4. Present the report summary to the user
5. Suggest next steps: commit the code, run the full test suite manually,
   review the report, etc.

## Red Flags — Never Do These

- **Fabricate verification results.** Script output is in the conversation. The
  user (and future auditors) can see exactly what the script returned.
- **Skip the re-review after fixes.** If a reviewer said NON-COMPLIANT or FAIL,
  the fix must be re-reviewed. No exceptions.
- **Pass Test Writer output to Code Writer.** The information barrier exists so
  the Code Writer is driven by tests, not by shared reasoning.
- **Mark a unit completed without all reviews passing.** The state file records
  what happened. check-state.ts will catch the inconsistency.
- **Generate a report when check-state.ts reports violations.** Fix first.
- **Proceed past exit code 1 without retrying or escalating.** A script failure
  means a verification failed. The model must act on it.
- **Skip Phase 5b when frontend units exist.** The QA test plan and E2E testing
  are mandatory for projects with frontend. `qa-test-plan.md` must exist before
  Phase 6. If Chrome is unavailable, the test plan is still generated.
- **Skip the frontend integration check after Wave 2.** Every frontend component
  must be wired into the app entry point and the app must serve HTTP 200.

## Artifacts

| File | Purpose | Gitignored |
|------|---------|------------|
| `.tdd-state.json` | Pipeline state for resume | Yes |
| `tdd-session.jsonl` | Structured event log | Yes |
| `spec-contract-*.md` | Per-unit spec contracts (deleted in cleanup) | Yes |
| `tdd-report.md` | Final session report | No (deliverable) |
| `qa-test-plan.md` | Manual QA test plan | No (deliverable) |
| `qa-results.md` | E2E test results (if Chrome available) | No (deliverable) |
