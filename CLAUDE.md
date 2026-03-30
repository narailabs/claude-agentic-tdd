# agentic-tdd

Enforced Test-Driven Development plugin for Claude Code using agent teams.

## Installation

```bash
claude plugin install agentic-tdd@narai
```

## Prerequisites

Agent teams must be enabled:
```json
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
```

## Usage

```
/tdd implement a user authentication system with registration, login, and password reset
/tdd add test coverage for src/utils/
/tdd implement against src/__tests__/calculator.test.ts
/tdd "build a REST API for todo items" --skip-failed
/tdd "build a payment system" --design
/tdd "simple utility function" --skip-design --parallel 1
```

### Flags

| Flag | Description |
|------|-------------|
| `--skip-failed` | Skip units that fail after max retries |
| `--design` | Force the design gate (Phase 0) |
| `--skip-design` | Skip the design gate |
| `--parallel <N>` | Max concurrent agent pipelines (default: 4) |
| `--effort <level>` | `low`, `medium`, `high` (default), `max` |
| `--model-strategy <s>` | `auto` (default), `standard` (all sonnet), `capable` (all opus) |
| `--resume` | Resume from existing .tdd-state.json |

## Architecture (v4.0)

Hybrid: SKILL.md orchestrates agent teams, TypeScript scripts enforce verification.

```
SKILL.md (orchestration)              TypeScript scripts (enforcement)
─────────────────────────             ──────────────────────────────────
TeamCreate agent team             →   scripts/verify-red.ts (exit 0/1)
SendMessage to Test Writer        →   scripts/verify-green.ts (exit 0/1)
SendMessage to Code Writer        →   scripts/update-state.ts
SendMessage to 3 Reviewers        →   scripts/check-state.ts (anti-fabrication)
TeamDelete at cleanup             →   scripts/generate-report.ts
Read tool for info barrier        →   scripts/init-state.ts
```

Script output is JSON to stdout + exit code. Both the model and the user see it in the conversation — verification results cannot be fabricated.

## Development

```
skills/tdd/
  SKILL.md                    # Orchestration (~370 lines)
  scripts/                    # 8 verification scripts (called via Bash)
    verify-red.ts, verify-green.ts, update-state.ts, check-state.ts,
    init-state.ts, detect-framework.ts, generate-report.ts, log-event.ts
  reference/                  # 12 prompt templates (loaded via Read tool)
src/                          # Shared TypeScript library
  verification.ts             # Core anti-cheat (checksums, assertions, tests)
  types.ts                    # All types and enums
  state.ts, sessionLog.ts     # State management
  detection.ts, prompts.ts    # Framework detection, template loading
  report.ts                   # Report generation
```
