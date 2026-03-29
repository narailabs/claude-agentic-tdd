# TDD Skill Benchmark — Iteration 3

**Date**: 2026-03-29
**Skill**: agentic-tdd (with SDD merge)
**Model**: claude-opus-4-6
**Evals**: 7 (14 runs total — 7 with-skill, 7 without-skill)
**Previous**: Iteration 2 (2026-03-28)

## Overall Results

| Configuration | Mean Pass Rate | Std Dev | Min | Max |
|--------------|---------------|---------|-----|-----|
| **With Skill** | **100.0%** | 0.0% | 100% | 100% |
| Without Skill | 6.5% | 11.6% | 0% | 28.6% |
| **Delta** | **+93.5%** | | | |

## Per-Eval Breakdown

| Eval | With Skill | Without Skill | Delta | vs Iter-2 |
|------|-----------|--------------|-------|-----------|
| 1. Simple Utility | 10/10 (100%) | 0/10 (0%) | +100% | = |
| 2. Auth System | 8/8 (100%) | 0/8 (0%) | +100% | = |
| 3. Existing Test | 6/6 (100%) | 1/6 (17%) | +83% | = |
| 4. Coverage Mode | 7/7 (100%) | 2/7 (29%) | +71% | = |
| 5. Ambiguous Spec | **6/6 (100%)** | 0/6 (0%) | +100% | **+17% (was 83%)** |
| 6. Plan Execution (NEW) | **8/8 (100%)** | 0/8 (0%) | +100% | new |
| 7. Parallel Batch (NEW) | **7/7 (100%)** | 0/7 (0%) | +100% | new |

## Changes from Iteration 2

### Eval 5: Ambiguous Spec (83% → 100%) — FIXED
The trade-off presentation step in SKILL.md Phase 0 was changed from conditional ("when there are genuine trade-offs") to mandatory ("for at least one key architectural decision"). The trace now shows a separate formal trade-off proposal with labeled options and pros/cons, not options embedded in a clarifying question.

### Eval 6: Plan Execution (NEW — 100%)
Tests the new Mode 4 (plan execution) with 5 tasks: 2 code + 3 non-code, with complex dependencies producing 4 execution batches. All 8 assertions pass:
- Mode 4 detection, task classification (code vs task type field)
- Dual pipeline routing (TDD for code, implementer dispatch for non-code)
- Dependency graph with topological sort and batch computation
- Subagent status protocol (DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED)
- Final holistic review

### Eval 7: Parallel Batch (NEW — 100%)
Tests parallel execution with 4 independent REST endpoints. All 7 assertions pass:
- Single-batch computation from topological sort (all units independent)
- 3+1 concurrent dispatch pattern (capped at maxParallelPairs=3)
- Three-stage review pipeline (spec compliance → adversarial → code quality)
- Final integration test with cross-endpoint verification

### New Skill Features Validated
| Feature | Tested In | Status |
|---------|-----------|--------|
| Mode 4 (plan execution) | Eval 6 | PASS |
| Task classification (code/task) | Eval 6 | PASS |
| Implementer dispatch | Eval 6 | PASS |
| Code quality reviewer | Evals 1-7 | PASS |
| Subagent status protocol | Evals 3, 6, 7 | PASS |
| Parallel batch execution | Eval 7 | PASS |
| Dependency graph batching | Eval 6 | PASS |
| Mandatory trade-off presentation | Eval 5 | PASS |
| Sharpened model selection | Eval 1 | PASS |

## Iteration Progression

| Iteration | Date | Evals | With Skill | Delta | Key Change |
|-----------|------|-------|-----------|-------|------------|
| 1 | 2026-03-17 | 5 | 96.6% | +87.8% | Baseline |
| 2 | 2026-03-28 | 5 | 96.7% | +87.6% | Coverage mode fix, eval 5 regressed |
| 3 | 2026-03-29 | 7 | **100.0%** | **+93.5%** | SDD merge, eval 5 fix, 2 new evals |
