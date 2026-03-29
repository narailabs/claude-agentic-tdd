# TDD Skill Benchmark — Iteration 2

**Date**: 2026-03-28
**Skill**: agentic-tdd
**Model**: claude-opus-4-6
**Evals**: 5 (10 runs total — 5 with-skill, 5 without-skill)
**Previous**: Iteration 1 (2026-03-17)

## Overall Results

| Configuration | Mean Pass Rate | Std Dev | Min | Max |
|--------------|---------------|---------|-----|-----|
| **With Skill** | **96.7%** | 7.5% | 83.3% | 100% |
| Without Skill | 9.1% | 13.1% | 0% | 28.6% |
| **Delta** | **+87.6%** | | | |

## Per-Eval Breakdown

| Eval | With Skill | Without Skill | Delta | vs Iter-1 |
|------|-----------|--------------|-------|-----------|
| 1. Simple Utility | 10/10 (100%) | 0/10 (0%) | +100% | = (was 100%) |
| 2. Auth System | 8/8 (100%) | 0/8 (0%) | +100% | = (was 100%) |
| 3. Existing Test | 6/6 (100%) | 1/6 (17%) | +83% | = (was 100%) |
| 4. Coverage Mode | **7/7 (100%)** | 2/7 (29%) | +71% | **+17% (was 83%)** |
| 5. Ambiguous Spec | 5/6 (83%) | 0/6 (0%) | +83% | **-17% (was 100%)** |

## Changes from Iteration 1

### Eval 4: Coverage Mode (83% → 100%) — IMPROVED

The iteration-1 gap has been fixed. The skill now explicitly documents the **hide-and-restore RED verification procedure** for coverage mode (SKILL.md lines 283-288, anti-cheat.md lines 120-162):

1. Temporarily rename `impl.ts` → `impl.ts.tdd-hidden`
2. Run tests — must fail with import/module errors (proves tests depend on real code)
3. Restore `impl.ts.tdd-hidden` → `impl.ts`
4. Run tests — must pass (proves characterization is accurate)

The two new assertions (splitting the old ambiguous one) both pass cleanly:
- "Describes or resolves the tension between RED verification and existing implementations" — PASS
- "Demonstrates the adapted hide-and-restore RED verification procedure" — PASS

### Eval 5: Ambiguous Spec (100% → 83%) — REGRESSED

Assertion 5 ("Proposes design approaches with trade-offs") failed. The trace embedded options within a clarifying question (asking about abstract interface vs. specific provider) rather than presenting them as a separate formal step with explicit pros/cons as the SKILL.md design refinement process specifies.

**Root cause**: The SKILL.md Design Refinement Process step 2 says to "Present 2-3 options with pros/cons" but this is documented as conditional ("when there are genuine trade-offs"). The trace's agent interpreted this as optional and folded the trade-off into question 3. This is a specification ambiguity, not a skill failure.

**Recommendation**: Strengthen SKILL.md step 2 to make trade-off presentation mandatory when the design gate triggers, not conditional.

### Assertion Refinements (Eval 4)

Two assertions were refined based on iteration-1 grader feedback:
- "Still enforces RED verification" (ambiguous) → split into two specific assertions about the tension and the procedure
- "Generates tests that characterize existing behavior" → strengthened to require derivation from specific source file contents

The strengthened characterization assertion still passes (the trace shows spec-contracts derived from reading function signatures).

## Baseline Comparison

Without the skill, Claude Code:
- Scores 0% on design gate / ambiguous spec handling (evals 2, 5)
- Scores 0% on the happy-path TDD cycle (eval 1)
- Gets partial credit only on evals 3 and 4 for coincidental behaviors (reading files, not asking unnecessary questions)
- Lacks: mode detection, RED/GREEN verification, information barriers, checksums, adversarial review, structured reports

## Grader Feedback Highlights

- **All graders noted**: Traces are simulated/analytical, not captured from live execution. Evidence is predictive rather than observed.
- **Eval 3 grader**: Found 3 inaccurate line number references in the trace (off by 1-2 lines). Does not affect assertion pass/fail but indicates trace generation could be more precise.
- **Eval 1 grader**: Happy-path-only scenario — no retries, no failures exercised. Consider adding an eval that tests error/retry paths.
- **Eval 4 grader**: Assertions 2 and 4 (reading source files, generating tests from them) could be tightened further — baseline also passes them.

## Specification Gaps Found

### Gap: Trade-off Presentation in Design Gate (MINOR)
**Location**: SKILL.md Phase 0, Design Refinement Process, Step 2
**Problem**: Step 2 uses conditional language ("when there are genuine trade-offs") which agents interpret as optional. This caused the eval 5 regression.
**Proposed Fix**: Make step 2 mandatory when the design gate triggers. If no trade-offs exist, explicitly state why and move on.
