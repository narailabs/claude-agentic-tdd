---
name: tdd
description: >
  Enforced Test-Driven Development with agent teams. Decomposes features into
  test-first agent pairs with anti-cheat guardrails. Use when: (1) user invokes
  /tdd command, (2) user says "implement X with tests" or "TDD" or "test-driven",
  (3) adding test coverage to existing code with TDD approach, (4) implementing
  against a user-provided failing test, (5) executing an implementation plan with
  mixed code and non-code tasks.
---

# Agentic TDD

Enforced Test-Driven Development powered by a TypeScript orchestrator using the Claude Agent SDK.
The orchestrator inherits authentication from the active Claude Code session and controls the
pipeline deterministically — code loops enforce every phase, SDK hooks prevent test modification,
and crypto checksums verify file integrity.

## Invocation

When this skill triggers, run the orchestrator via Bash. The orchestrator inherits OAuth from
the current Claude Code session automatically.

Determine the plugin root directory (where this SKILL.md lives — go up from `skills/tdd/` to
the repo root). Then invoke:

```bash
cd {plugin_root} && npx tsx src/cli.ts {user_spec} {flags}
```

Where `{user_spec}` is the specification from `$ARGUMENTS` (quoted), and `{flags}` are any
flags the user passed. The orchestrator runs in the user's current working directory but loads
its source from the plugin root.

Example — if the user says `/tdd implement a user auth system --parallel 2`:
```bash
cd /path/to/plugin && CWD=$(pwd) npx tsx src/cli.ts "implement a user auth system" --parallel 2
```

The orchestrator handles everything autonomously from here: framework detection, decomposition,
agent dispatch, verification, reviews, and report generation. Stream the output to the user.

If the orchestrator exits with code 0: present the report summary to the user.
If it exits with code 1: show the error output and suggest `--resume` to continue.

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--skip-failed` | Skip units that fail after retries | false |
| `--design` | Force design gate (Phase 0) | false |
| `--skip-design` | Skip design gate | false |
| `--effort <level>` | `low`, `medium`, `high`, `max` | high |
| `--parallel <N>` | Max concurrent agent pipelines | 4 |
| `--model-strategy <s>` | `auto`, `standard` (all sonnet), `capable` (all opus) | auto |
| `--resume` | Resume from .tdd-state.json | false |

## What Happens Inside

The TypeScript orchestrator runs 8 phases as deterministic code:

0. **Design Gate** (optional) — clarifying questions + trade-offs (interactive via stdin/stdout)
1. **Framework Detection** — auto-detect from package.json, pyproject.toml, go.mod, etc.
2. **Work Decomposition** — spec analysis for ambiguities, decompose into units, user confirms
3. **State Initialization** — .tdd-state.json + tdd-session.jsonl (asserts existence before Phase 4)
4. **Agent Team Orchestration** — per unit, enforced by code:
   - Test Writer → RED verification (crypto checksums) → Code Writer (SDK hooks block test edits) → GREEN verification → Spec Compliance Review → Adversarial Review → Code Quality Review
   - Each review is a real `query()` SDK call with parsed verdict
   - Retry loops with configurable max retries
   - Async parallel execution with semaphore concurrency control
5. **Final Review** — full test suite + **holistic spec compliance** (opus agent checks FULL spec against ALL code)
6. **Report Generation** — tdd-report.md built from state file data (refuses if any units still pending)
7. **Cleanup** — delete spec-contracts, present report, suggest next steps

## Artifacts

| File | Purpose | Gitignored? |
|------|---------|-------------|
| `.tdd-state.json` | Pipeline state for resume | Yes |
| `tdd-session.jsonl` | Event log | Yes |
| `spec-contract-*.md` | Per-unit spec (deleted in cleanup) | Yes |
| `tdd-report.md` | Final report | **No** (deliverable) |
