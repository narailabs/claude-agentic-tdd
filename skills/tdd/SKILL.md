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

Enforced Test-Driven Development using a TypeScript orchestrator with the Claude Agent SDK.
The orchestrator controls the pipeline deterministically — Python-style for-loops ensure
every phase runs, hooks prevent test file modification, and verification is done in code
(hashlib checksums, subprocess test execution) rather than by trusting agent self-reports.

## How to Run

Parse `$ARGUMENTS` for the specification text and any flags, then invoke:

```bash
cd <plugin-root> && npx tsx src/cli.ts $ARGUMENTS
```

## Flags

| Flag | Description |
|------|-------------|
| `--skip-failed` | Skip units that fail after retries |
| `--design` | Force design gate |
| `--skip-design` | Skip design gate |
| `--effort <level>` | low, medium, high (default), max |
| `--parallel <N>` | Max concurrent pipelines (default: 4) |
| `--model-strategy <s>` | auto (default), standard (all sonnet), capable (all opus) |
| `--resume` | Resume from existing .tdd-state.json |

## Pipeline Overview

The TypeScript orchestrator runs 8 phases:

0. **Design Gate** (optional) — interactive clarifying questions + architectural trade-offs
1. **Framework Detection** — auto-detect test runner from project files
2. **Work Decomposition** — spec analysis for ambiguities, then decompose into units
3. **State Initialization** — create .tdd-state.json and tdd-session.jsonl
4. **Agent Team Orchestration** — per unit: Test Writer → RED → Code Writer → GREEN → Spec Compliance → Adversarial → Code Quality review (all enforced by code, not prompts)
5. **Final Review** — full test suite + holistic spec compliance review against the original spec
6. **Report Generation** — tdd-report.md from actual state file data
7. **Cleanup** — delete spec-contracts, present report

Each phase is a function call — none can be skipped. Reviews are real SDK agent dispatches
with parsed verdicts. The pipeline physically cannot reach "completed" without passing
through all three review stages.

## What Makes This Different

- **Can't fabricate reviews** — each review is a `query()` SDK call; Python-style loops ensure execution
- **Can't modify test files** — PreToolUse hook blocks Write/Edit to test paths
- **Can't skip verification** — checksums computed by Node crypto, tests run by subprocess
- **State is always consistent** — JSON written by TypeScript, not by the model
- **Final holistic review** — checks FULL spec against ALL code (catches gaps between units)

Report any errors from the CLI output to the user.
