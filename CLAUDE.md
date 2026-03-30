# agentic-tdd

Enforced Test-Driven Development plugin for Claude Code using agent teams.

## Installation

```bash
# From marketplace (after registration)
claude plugin install agentic-tdd@narai

# From GitHub
claude plugin install narailabs/claude-agentic-tdd
```

## Prerequisites

Agent teams must be enabled. Add to `.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

## Usage

```
/tdd implement a user authentication system with registration, login, and password reset
/tdd add test coverage for src/utils/
/tdd implement against src/__tests__/calculator.test.ts
/tdd "build a REST API for todo items" --skip-failed
/tdd "build a payment system" --design          # force design gate
/tdd "simple utility function" --skip-design    # skip design gate
```

### Flags

| Flag | Description |
|------|-------------|
| `--skip-failed` | Skip work units that fail after max retries instead of escalating |
| `--design` | Force the design gate (Phase 0) even for simple specs |
| `--skip-design` | Skip the design gate entirely |
| `--parallel <N>` | Max concurrent agent pipelines (default: 4, use 1 for sequential) |
| `--effort <level>` | Reasoning effort: `medium`, `high` (default), or `max` |
| `--model-strategy <s>` | `auto` (default), `standard` (all sonnet), `capable` (all opus) |

## Development

This plugin is structured as:
- `skills/tdd/SKILL.md` — main orchestration skill (Phases 0-7)
- `skills/tdd/reference/` — supporting documentation
  - `framework-detection.md` — auto-detect test frameworks (10+ languages)
  - `state-management.md` — state file schema and incremental resume
  - `anti-cheat.md` — RED/GREEN verification rules and anti-rationalization table
  - `test-writer-prompt.md` — Test Writer agent template
  - `code-writer-prompt.md` — Code Writer agent template (information barrier)
  - `adversarial-reviewer-prompt.md` — adversarial reviewer template
  - `spec-compliance-reviewer-prompt.md` — spec compliance reviewer template
  - `code-quality-reviewer-prompt.md` — code quality reviewer template (structure, naming, discipline)
  - `implementer-prompt.md` — implementer agent template for non-code tasks (Mode 4)
  - `testing-anti-patterns.md` — 5 common testing anti-patterns with gate functions
  - `report-format.md` — report and session log schema
- `.claude-plugin/plugin.json` — marketplace manifest

To test locally, copy `skills/tdd/` to your test project's `.claude/skills/tdd/`.
