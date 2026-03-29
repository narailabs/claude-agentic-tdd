# Summary: Coverage Mode Trace Analysis

## What was traced

A step-by-step execution of `/tdd add test coverage for src/utils/ --skip-design` through all phases of the TDD skill (SKILL.md and all 9 reference files).

## Entry Point Detection

The skill correctly identifies Mode 2 ("existing-codebase") by matching the phrase "add test coverage for" against the entry point patterns. This sets `entryPoint = "existing-codebase"` in the state file, which should inform all downstream phases.

## --skip-design Flag Handling

The flag is parsed from `$ARGUMENTS` and directly satisfies the skip condition in Phase 0: "Skip when: ... User passes `--skip-design`". The design gate is entirely bypassed with `designSummary = null`. This is appropriate for coverage mode since the existing code IS the design.

Note: The flag is technically redundant for Mode 2, but Mode 2 does not auto-skip the design gate. A large `src/utils/` directory with many files could trigger the "3+ distinct features" condition, making the explicit flag a good safeguard.

## The RED Verification Problem

This is the most significant finding. The anti-cheat system's RED verification (reference/anti-cheat.md, Check 2) requires that tests FAIL before the Code Writer runs. This rule is written for Mode 1 where no implementation exists. In coverage mode, the implementation is already on disk, so correctly-written characterization tests will PASS immediately.

As literally written, this would trigger an anti-cheat violation and an infinite retry loop. The skill must adapt RED verification for Mode 2. The recommended approach is a "remove-and-restore" strategy: temporarily hide the implementation file, verify tests fail with import errors (proving they're not tautological), restore the file, verify tests pass (proving the characterization is accurate).

The SKILL.md does not explicitly document this adaptation, which is a gap in the specification.

## How the Full Cycle Differs from New-Feature TDD

| Phase | Standard TDD | Coverage Mode |
|-------|-------------|---------------|
| Spec-contract | Designed from requirements | Reverse-engineered from reading existing source files |
| Test Writer | Writes tests for unbuilt features | Writes characterization tests for existing behavior |
| RED verification | Tests must fail (no impl) | Needs adaptation (impl exists) |
| Code Writer | Creates implementation from scratch | Verifies/adjusts existing implementation; often a no-op |
| GREEN verification | Standard gate | Almost trivially satisfied |
| Adversarial review | Balanced test + impl review | Focused on coverage gap detection |
| Primary value | Correctness of new code | Documentation and regression safety for existing code |

## Characterization Test Generation

The orchestrator reads each source file in `src/utils/`, analyzes exported functions and their behavior, and produces a spec-contract per file. The Test Writer then receives this spec-contract and writes tests as if the code doesn't exist -- it describes behavior through imports and assertions. The key quality metric is whether the tests would catch regressions if someone modified the existing code.

## What Works Well

1. **Framework detection** applies identically -- no mode-specific issues.
2. **Assertion density checks** are even more valuable for characterization tests (we can verify exact values).
3. **Behavior-over-implementation checks** are critical -- the temptation to test internals is higher when you can see the source.
4. **Adversarial review** provides strong value by identifying untested code paths in existing code.
5. **Spec compliance review** can surface dead code or functions missed by the characterization.
6. **Parallel execution** works well since utils are typically independent.

## What Needs Attention

1. **RED verification incompatibility** -- the primary gap. Needs mode-aware logic.
2. **Code Writer role ambiguity** -- in pure characterization mode, the Code Writer may have nothing to do if tests already pass against existing code. The skill doesn't describe a "skip Code Writer" path.
3. **Design gate auto-skip** -- Mode 2 should auto-skip the design gate without requiring `--skip-design`, similar to how Mode 3 does.
4. **Spec-contract accuracy** -- reverse-engineering specs from code can miss the INTENT behind the code. The characterization describes what the code DOES, not necessarily what it SHOULD do. Bugs get enshrined as "correct behavior."

## Files Referenced

- `/home/user/claude-agentic-tdd/.claude/skills/tdd/SKILL.md` -- main orchestration (Phases 0-7, entry point detection, argument parsing)
- `/home/user/claude-agentic-tdd/.claude/skills/tdd/reference/anti-cheat.md` -- RED/GREEN verification rules (source of the Mode 2 tension)
- `/home/user/claude-agentic-tdd/.claude/skills/tdd/reference/test-writer-prompt.md` -- Test Writer template
- `/home/user/claude-agentic-tdd/.claude/skills/tdd/reference/code-writer-prompt.md` -- Code Writer template (information barrier)
- `/home/user/claude-agentic-tdd/.claude/skills/tdd/reference/framework-detection.md` -- auto-detection algorithm
- `/home/user/claude-agentic-tdd/.claude/skills/tdd/reference/state-management.md` -- state file schema
- `/home/user/claude-agentic-tdd/.claude/skills/tdd/reference/adversarial-reviewer-prompt.md` -- adversarial review template
- `/home/user/claude-agentic-tdd/.claude/skills/tdd/reference/spec-compliance-reviewer-prompt.md` -- spec compliance template
- `/home/user/claude-agentic-tdd/.claude/skills/tdd/reference/testing-anti-patterns.md` -- 5 anti-patterns
- `/home/user/claude-agentic-tdd/.claude/skills/tdd/reference/report-format.md` -- report and session log schema
