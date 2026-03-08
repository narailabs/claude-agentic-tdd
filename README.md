# agentic-tdd

Enforced Test-Driven Development for Claude Code using agent teams with anti-cheat guardrails.

## What It Does

agentic-tdd decomposes feature specifications into work units, then builds each unit using a strict TDD agent pair:

1. **Test Writer** — writes failing tests from a spec contract (never sees implementation)
2. **Code Writer** — implements to make tests pass (never sees Test Writer's reasoning)
3. **Adversarial Reviewer** — tries to break the tests and find cheating

Anti-cheat guardrails verify at each step:
- RED: tests must fail before implementation exists
- GREEN: tests must pass after implementation, and test files must be unchanged
- Assertion density, behavior-over-implementation checks, skip marker detection

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

### Options

- `--skip-failed` — skip work units that fail after max retries (default: escalate to user)
- `--config <path>` — use a custom config file

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
    "maxRetries": 3
  },
  "execution": {
    "maxParallelPairs": 3
  }
}
```

### CLAUDE.md section (optional)

Add a `## TDD Configuration` section to your project's CLAUDE.md with test conventions.

## How It Works

1. Framework auto-detected from project files (or configured)
2. Spec decomposed into independent work units
3. User confirms the plan
4. For each unit: Test Writer → RED verification → Code Writer → GREEN verification → Adversarial Review
5. Independent units run in parallel; dependent units respect ordering
6. Final holistic review across all units
7. Report generated: `tdd-report.md` + `tdd-session.jsonl`

## Output

- Implementation files written to your project
- Test files written alongside
- `tdd-report.md` — human-readable summary of the session
- `tdd-session.jsonl` — structured event log for debugging (gitignored)

## License

MIT
