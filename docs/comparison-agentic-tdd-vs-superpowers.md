# Agentic-TDD vs Superpowers TDD — Comparison

## Overview

This document compares [agentic-tdd](https://github.com/narailabs/claude-agentic-tdd) (this project) with the TDD skill from [obra/superpowers](https://github.com/obra/superpowers) (v5.0.2, by Jesse Vincent).

## Architecture

| | **Agentic-TDD** | **Superpowers** |
|---|---|---|
| **Scope** | Single-purpose TDD plugin | Full dev workflow (brainstorm → plan → implement → review → merge) |
| **TDD enforcement** | Dedicated 7-phase orchestration engine | TDD is one skill among ~10, enforced by convention across the pipeline |
| **Agent model** | Agent teams: Test Writer + Code Writer + Adversarial Reviewer per work unit | Subagent-driven: sequential Implementer + Spec Reviewer + Code Quality Reviewer per task |
| **Parallelism** | Parallel work units (up to `maxParallelPairs`) based on dependency graph | Sequential tasks only (to avoid conflicts) |
| **State persistence** | `.tdd-state.json` enables resume/restart across sessions | No explicit state file; relies on plan docs and git history |

## TDD Enforcement

| | **Agentic-TDD** | **Superpowers** |
|---|---|---|
| **Information barrier** | Code Writer never sees Test Writer's reasoning — only test files + spec from disk | Implementer sees the full task description (which includes both test and impl steps) |
| **RED verification** | Automated 5-check gate: tests exist, tests fail, correct failure type, assertion density, behavior-over-impl check | Manual discipline: "run it, confirm it fails for the expected reason" |
| **GREEN verification** | Automated 4-check gate: checksum immutability, no skip markers, all pass, hardcoded-return detection | "Run the test, confirm it passes, confirm no other tests broke" |
| **Adversarial review** | Dedicated agent tries to *break* the tests and catch cheating | Two-stage review (spec compliance → code quality) but not adversarial |
| **Anti-cheat checksums** | Test file checksums prevent Code Writer from modifying tests | No checksum mechanism |

## Strengths

### Agentic-TDD Pros

- **Stronger mechanical enforcement** — checksums, automated verification gates, and information barriers make it structurally harder to cheat
- **Self-contained** — one plugin does one thing well; no dependency on a larger workflow
- **Parallel execution** — can run multiple test/impl pairs concurrently
- **Framework auto-detection** — supports 10+ languages/frameworks out of the box
- **Resumable sessions** — state file allows picking up where you left off
- **Adversarial review** — dedicated agent whose sole job is to find weaknesses

### Superpowers Pros

- **End-to-end workflow** — TDD is embedded in a complete pipeline from brainstorming through branch merge
- **Design-first discipline** — hard gate preventing code before design approval
- **Richer review pipeline** — separate spec compliance and code quality reviewers
- **Anti-rationalization tables** — explicit rebuttals for common TDD-skipping excuses (cultural enforcement, not just mechanical)
- **Model cost optimization** — uses cheaper models for simple tasks, expensive for complex
- **Broader ecosystem** — systematic debugging, verification-before-completion, and plan writing all reinforce TDD habits
- **More battle-tested** — v5.0.2, actively maintained, broader community

## Weaknesses

### Agentic-TDD Cons

- Requires experimental `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (not stable yet)
- No upstream design/planning phase — jumps straight to decomposition
- No model selection strategy (cost optimization)
- Narrower scope means no guidance for debugging, planning, or review outside TDD

### Superpowers Cons

- TDD enforcement is primarily **convention-based** (prompt instructions), not mechanically verified
- No checksums or automated anti-cheat gates — relies on agent compliance
- Sequential-only execution (no parallelism)
- Heavier setup — you get the entire workflow system whether you want it or not
- No persistent state file for resuming interrupted TDD sessions

## Recommendation Matrix

| Use case | Better choice |
|---|---|
| Strict, mechanically-enforced TDD with anti-cheat | **Agentic-TDD** |
| Complete dev workflow where TDD is one piece | **Superpowers** |
| Parallel test/impl pair execution | **Agentic-TDD** |
| Design → plan → implement → review → merge pipeline | **Superpowers** |
| Resumable sessions | **Agentic-TDD** |
| Cost optimization (model selection) | **Superpowers** |

## Conclusion

These tools are **complementary more than competing**. Agentic-TDD is a deep, mechanically-enforced TDD engine. Superpowers is a broad development methodology where TDD is enforced by convention across a richer pipeline. You could theoretically use Agentic-TDD's enforcement engine *within* a Superpowers-style workflow to get the best of both worlds.
