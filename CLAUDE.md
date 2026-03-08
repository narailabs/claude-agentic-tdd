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
```

## Development

This plugin is structured as:
- `.claude/skills/tdd/SKILL.md` — main orchestration skill
- `.claude/skills/tdd/reference/` — supporting documentation
- `.claude-plugin/plugin.json` — marketplace manifest
- `skills/tdd/` — local dev mirror

To test locally, copy `.claude/skills/tdd/` to your test project's `.claude/skills/tdd/`.
