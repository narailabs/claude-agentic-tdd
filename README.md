# agentic-tdd

Enforced Test-Driven Development for Claude Code using agent teams with anti-cheat guardrails.

## What It Does

agentic-tdd decomposes feature specifications into work units, then builds each unit using a strict TDD agent pair:

1. **Test Writer** — writes failing tests from a spec contract (never sees implementation)
2. **Code Writer** — implements to make tests pass (never sees Test Writer's reasoning)
3. **Spec Compliance Reviewer** — verifies implementation matches the spec contract
4. **Adversarial Reviewer** — tries to break the tests and find cheating

Anti-cheat guardrails verify at each step:
- RED: tests must fail before implementation exists
- GREEN: tests must pass after implementation, and test files must be unchanged (checksum verified)
- Assertion density, behavior-over-implementation checks, skip marker detection
- 5 documented testing anti-patterns are flagged automatically

## Installation

```bash
# From NarAI marketplace
claude plugin install agentic-tdd@narai

# Direct from GitHub
claude plugin install narailabs/claude-agentic-tdd
```

### Prerequisites

Enable agent teams in `.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

## Usage

### Implement a new feature

```
/tdd implement a calculator with add, subtract, multiply, and divide operations
```

### Add tests to existing code

```
/tdd add test coverage for src/services/
```

### Implement against existing tests

```
/tdd implement against src/__tests__/auth.test.ts
```

### Complex spec with design review

```
/tdd "build a payment system with Stripe integration" --design
```

### Simple utility, skip design

```
/tdd "URL parsing helper" --skip-design
```

### Flags

| Flag | Description |
|------|-------------|
| `--skip-failed` | Skip work units that fail after max retries (default: escalate to user) |
| `--config <path>` | Use a custom `.tdd.config.json` |
| `--design` | Force the design gate even for simple specs |
| `--skip-design` | Skip the design gate entirely |

## How It Works

### Phase 0: Design Gate (optional)

For complex or ambiguous specs, agentic-tdd runs a design refinement step — clarifying questions, trade-off analysis, and a design summary — before any code is written. Triggers automatically for multi-component specs or when `--design` is passed.

### Phase 1: Framework Detection

Auto-detects your test framework from project files (package.json, pyproject.toml, go.mod, Cargo.toml, etc.). Supports 10+ languages. Falls back to asking you if detection fails.

### Phase 2: Work Decomposition

Analyzes the spec and breaks it into independent work units with dependency tracking. Presents the plan for your confirmation before proceeding.

### Phase 3: State Persistence

Creates `.tdd-state.json` for session resume. If interrupted, the next `/tdd` invocation detects the state file and offers to resume.

### Phase 4: Agent Team Orchestration

For each work unit (parallel where dependencies allow):

1. **Test Writer** writes failing tests from the spec contract
2. **RED verification** confirms tests fail correctly (not syntax errors)
3. **Code Writer** implements to make tests pass (information barrier enforced)
4. **GREEN verification** confirms tests pass and test files are unchanged
5. **Spec Compliance Review** verifies the implementation matches the spec
6. **Adversarial Review** tries to break tests and catch cheating

### Phase 5: Final Verification

Runs the full test suite across all units to catch integration issues. No completion claim without fresh test output as evidence.

### Phase 6: Report

Generates `tdd-report.md` (human-readable summary) and `tdd-session.jsonl` (structured event log).

### Phase 7: Cleanup

Shuts down agents, removes intermediate artifacts (`spec-contract-*.md` files), updates state.

### Model Cost Optimization

The `execution.modelStrategy` config key controls agent model assignment:

| Strategy | Behavior |
|----------|----------|
| `"auto"` (default) | Assess complexity per work unit and assign models accordingly |
| `"standard"` | Default model for all agents |
| `"fast"` | Cheapest capable model for all agents |
| `"capable"` | Most capable model for all agents |

## Configuration

### `.tdd.config.json` (optional, project root)

```json
{
  "framework": {
    "testRunner": "vitest",
    "testCommand": "npx vitest run"
  },
  "antiCheat": {
    "minAssertionsPerTest": 2,
    "maxRetries": 3,
    "maxMockDepth": 2,
    "flagPrivateMethodTests": true
  },
  "execution": {
    "maxParallelPairs": 3,
    "modelStrategy": "auto"
  },
  "reporting": {
    "generateReport": true,
    "generateSessionLog": true
  }
}
```

### CLAUDE.md section (optional)

Add a `## TDD Configuration` section to your project's CLAUDE.md with test conventions.

## Entry Point Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **1. Natural language spec** | `/tdd implement X` | Full pipeline: design gate → decompose → test → implement → review |
| **2. Existing codebase** | `/tdd add test coverage for src/` | Characterization tests for existing code; RED verification hides source to prove test dependency |
| **3. User-provided test** | `/tdd implement against tests/foo.test.ts` | Skips Test Writer and RED verification; goes straight to Code Writer |

## Output

- Implementation files written to your project
- Test files written alongside
- `tdd-report.md` — human-readable summary of the session
- `tdd-session.jsonl` — structured event log for debugging (gitignored)

## License

MIT
