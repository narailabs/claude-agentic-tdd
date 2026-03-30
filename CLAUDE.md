# agentic-tdd

Enforced Test-Driven Development plugin for Claude Code using the Agent SDK.

## Installation

```bash
# From marketplace
claude plugin install agentic-tdd@narai

# From GitHub
claude plugin install narailabs/claude-agentic-tdd
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
| `--skip-failed` | Skip work units that fail after max retries instead of escalating |
| `--design` | Force the design gate (Phase 0) even for simple specs |
| `--skip-design` | Skip the design gate entirely |
| `--parallel <N>` | Max concurrent agent pipelines (default: 4, use 1 for sequential) |
| `--effort <level>` | Reasoning effort: `low`, `medium`, `high` (default), or `max` |
| `--model-strategy <s>` | `auto` (default), `standard` (all sonnet), `capable` (all opus) |
| `--resume` | Resume from existing .tdd-state.json |

## Architecture

v3.0 uses a TypeScript orchestrator powered by the Claude Agent SDK. The pipeline is deterministic — orchestration logic is code (for-loops, not prompts), verification is done by Node.js (crypto checksums, subprocess test execution), and SDK hooks prevent test file modification.

```
TypeScript Orchestrator (deterministic)     Claude Agents (creative, via SDK)
─────────────────────────────────────      ──────────────────────────────────
Pipeline sequencing (for loops)        →   Test Writer
State file management (JSON)           →   Code Writer (info barrier enforced)
Checksum verification (crypto)         →   Spec Compliance Reviewer
Test execution (subprocess)            →   Adversarial Reviewer
Assertion scanning (regex)             →   Code Quality Reviewer
Hook enforcement (PreToolUse)          →   Final Holistic Reviewer
Report generation (template)           →   Decomposer / Design Gate
```

## Development

```
src/                          # TypeScript orchestrator
  cli.ts                      # Entry point
  orchestrator.ts             # Main pipeline (Phases 0-7)
  types.ts                    # All types and enums
  state.ts                    # .tdd-state.json management
  verification.ts             # Anti-cheat: checksums, assertions, test execution
  hooks.ts                    # PreToolUse hooks for enforcement
  agents/                     # Agent dispatch modules
    base.ts                   # SDK query() wrapper
    testWriter.ts, codeWriter.ts, reviewers.ts, etc.
skills/tdd/
  SKILL.md                    # Thin wrapper (~60 lines)
  reference/                  # Prompt templates (loaded by prompts.ts)
```

### Running locally

```bash
npm install
npx tsx src/cli.ts "implement a capitalize function" --parallel 1
```
