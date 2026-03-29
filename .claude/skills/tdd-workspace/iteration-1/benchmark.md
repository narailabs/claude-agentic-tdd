# TDD Skill Benchmark — Iteration 1

**Date**: 2026-03-17
**Skill**: agentic-tdd
**Model**: claude-opus-4-6
**Evals**: 5 (10 runs total — 5 with-skill, 5 without-skill)

## Overall Results

| Configuration | Mean Pass Rate | Std Dev | Min | Max |
|--------------|---------------|---------|-----|-----|
| **With Skill** | **96.6%** | 7.5% | 83.3% | 100% |
| Without Skill | 8.8% | 8.0% | 0% | 17% |
| **Delta** | **+87.8%** | | | |

## Per-Eval Breakdown

| Eval | With Skill | Without Skill | Delta |
|------|-----------|--------------|-------|
| 1. Simple Utility | 10/10 (100%) | 1/10 (10%) | +90% |
| 2. Auth System | 8/8 (100%) | 0/8 (0%) | +100% |
| 3. Existing Test | 6/6 (100%) | 1/6 (17%) | +83% |
| 4. Coverage Mode | 5/6 (83%) | 1/6 (17%) | +67% |
| 5. Ambiguous Spec | 6/6 (100%) | 0/6 (0%) | +100% |

## Key Findings

### What Works Well (100% pass rate)

1. **Happy-path TDD cycle** (Eval 1): Framework detection → decomposition → RED → GREEN → review → report all traced correctly
2. **Design gate for complex specs** (Eval 2): Correctly triggers Phase 0 for multi-component auth system, asks targeted questions, produces design summary, handles dependencies
3. **Entry point mode 3** (Eval 3): Correctly skips Test Writer, preserves user's test file, maintains all verification steps
4. **Ambiguous spec handling** (Eval 5): Design gate triggers, asks one question at a time, proposes trade-offs, hard-gates on approval

### What Needs Improvement (< 100%)

1. **Coverage mode RED verification** (Eval 4, 83%): The skill has a specification gap — RED verification requires tests to FAIL, but in coverage mode the implementation already exists, so characterization tests pass immediately. The skill doesn't document how to adapt RED verification for this case.

### Baseline Comparison

Without the skill, Claude:
- Does NOT use agent teams or information barriers
- Does NOT enforce RED/GREEN verification cycles
- Does NOT perform adversarial review
- Does NOT do formal work decomposition with dependency analysis
- May or may not write tests first (inconsistent)
- Does NOT produce structured TDD reports

## Specification Gaps Found

### Gap 1: Coverage Mode RED Verification (CRITICAL)
**Location**: SKILL.md Phase 4b + anti-cheat.md
**Problem**: RED verification requires `exit code != 0` (tests must fail). In coverage mode (entry point 2), the implementation already exists on disk, so properly-written characterization tests will PASS immediately. This creates an infinite retry loop or false anti-cheat violation.
**Proposed Fix**: Add a "coverage mode adaptation" section:
- Temporarily hide/rename the implementation file
- Run tests — they should fail with import/module errors (proving they actually import the real code)
- Restore the implementation file
- Run tests again — they should pass (proving characterization is accurate)

### Gap 2: Mode 2 Design Gate Behavior (MINOR)
**Problem**: The skill doesn't explicitly say whether Mode 2 should auto-skip the design gate (like Mode 3 does). A `--skip-design` flag is needed, but for pure coverage it's arguably always appropriate to skip.
**Proposed Fix**: Add Mode 2 to the "Skip when" list in Phase 0.

### Gap 3: Code Writer Role in Coverage Mode (MINOR)
**Problem**: In pure characterization mode, the Code Writer may have nothing to do (implementation already exists). The skill doesn't define this "no-op" outcome.
**Proposed Fix**: Document that in coverage mode, the Code Writer phase is optional — if tests already pass, skip to review.

## Eval Quality Feedback

From graders:
- Eval 4 assertion about RED verification is ambiguous — should clarify whether it means "adapted verification" or "standard verification"
- Consider adding assertions for user confirmation hard gates in Phase 2
- "Generates characterization tests" assertion could be stronger — check for specific source file analysis, not just the word "characterization"
