# Summary: Coverage Mode Trace Analysis (Iteration 2)

## What was traced

A step-by-step execution of `/tdd add test coverage for src/utils/ --skip-design` through all phases of the TDD skill (SKILL.md and all 9 reference files). This iteration-2 trace evaluates the skill after the coverage-mode RED verification gap from iteration-1 was addressed.

## Entry Point Detection

The skill correctly identifies Mode 2 ("existing-codebase") by matching the phrase "add test coverage for" against entry point patterns. Sets `entryPoint = "existing-codebase"`.

## --skip-design Flag Handling

Two independent skip conditions apply:
1. The `--skip-design` flag explicitly parsed from arguments (SKILL.md line 133).
2. Mode 2 auto-skips the design gate (SKILL.md line 107): "Skip by default (characterizing existing code, not designing new features). Only trigger if the user explicitly passes `--design`."

Both conditions cause Phase 0 to be skipped. The `--skip-design` flag is now redundant for Mode 2 (an improvement from iteration-1 where Mode 2 auto-skip was not explicit). `designSummary = null`.

## Reading Source Files Before Writing Tests

The orchestrator reads each source file in `src/utils/` to produce reverse-engineered spec-contracts. For each file, it extracts exported function signatures, parameter/return types, observable behavior, and edge case handling. These behavioral descriptions become the spec-contracts that the Test Writer receives -- the same format as Mode 1, but derived from existing code rather than forward requirements.

## Coverage Mode RED Verification (The Iteration-2 Fix)

This was the primary gap identified in iteration-1. The skill now has explicit documentation at two levels:

**SKILL.md lines 283-288** describe the procedure:
1. Hide the implementation (temporarily rename source files)
2. Run tests -- verify they fail with import/module errors
3. Restore the implementation
4. Run tests -- verify they pass

**reference/anti-cheat.md "Coverage Mode RED Verification"** provides the full detail:
- Exact bash commands (`mv` to `.tdd-hidden` suffix, run tests, `mv` back)
- Success/failure criteria at each step
- Re-prompt messages for each failure mode
- Explicit list of which standard checks still apply (Tests Exist, Assertion Density, Behavior-Over-Implementation, Record Checksums)

The hide-and-restore approach preserves anti-cheat intent (proving tests are not tautological) while accommodating existing implementations. This resolves the iteration-1 tension where literal application of "tests must fail" would cause an infinite retry loop in coverage mode.

## Code Writer No-Op Path

SKILL.md lines 110-111 now explicitly state: "Code Writer: May be a no-op if characterization tests already pass against existing code. If tests pass immediately, skip Code Writer and proceed to review."

Since the hide-and-restore RED verification Step 4 already confirmed tests pass against the existing implementation, the orchestrator skips the Code Writer entirely. This is the expected happy path for pure characterization work.

## Report Generation

The report follows `reference/report-format.md` template with coverage-mode adaptations:
- Entry point shown as `existing-codebase`
- RED verification shows "passed (hide-and-restore)" instead of standard "passed"
- Code Writer shows "skipped (no-op)" with 0 attempts
- Implementation files noted as "pre-existing, unchanged"
- Anti-cheat log confirms no violations; hide-and-restore confirmed genuine dependency

## What Changed from Iteration-1

| Aspect | Iteration-1 (Gap) | Iteration-2 (Fixed) |
|--------|-------------------|---------------------|
| RED verification for Mode 2 | Not documented; identified as gap | Explicit hide-and-restore procedure in SKILL.md and anti-cheat.md |
| Design gate auto-skip for Mode 2 | Not explicit; `--skip-design` needed | SKILL.md line 107 auto-skips; line 132 lists Mode 2 as skip condition |
| Code Writer skip path | Not described | SKILL.md lines 110-111 explicitly allow no-op |
| Which checks still apply | Implicit | anti-cheat.md lines 156-162 explicitly list applicable checks |

## What Works Well

1. **Hide-and-restore is clean**: Temporary rename with `.tdd-hidden` suffix is reversible and unlikely to conflict with existing files.
2. **Two-step verification is rigorous**: Proving both that tests fail without impl (not tautological) AND pass with impl (characterization accurate) is thorough.
3. **Assertion density checks** are more valuable in coverage mode -- exact return values can be verified.
4. **Behavior-over-implementation checks** are critical -- temptation to test internals is higher when source is visible.
5. **Adversarial review** provides strong value identifying untested code paths in existing code.
6. **Spec compliance review** can surface dead code or undocumented functions.

## Remaining Considerations

1. **Characterization enshrines bugs**: Tests describe what the code DOES, not necessarily what it SHOULD do. This is inherent to characterization testing, not a skill defect.
2. **Multi-file implementations**: If a source file imports from another source file in the same directory, hiding one file could cause cascading failures beyond simple import errors. The skill could address this by hiding only the direct import path.
3. **Re-export patterns**: If `src/utils/index.ts` re-exports from individual files, hiding a single file may cause the barrel import to fail differently than expected.

## Files Referenced

- `/Users/narayan/src/claude-agentic-tdd/.claude/skills/tdd/SKILL.md` -- main orchestration (lines 283-288 for coverage RED verification, lines 105-116 for Mode 2 adaptations)
- `/Users/narayan/src/claude-agentic-tdd/.claude/skills/tdd/reference/anti-cheat.md` -- Coverage Mode RED Verification section (lines 120-162)
- `/Users/narayan/src/claude-agentic-tdd/.claude/skills/tdd/reference/test-writer-prompt.md` -- Test Writer template
- `/Users/narayan/src/claude-agentic-tdd/.claude/skills/tdd/reference/code-writer-prompt.md` -- Code Writer template (information barrier)
- `/Users/narayan/src/claude-agentic-tdd/.claude/skills/tdd/reference/framework-detection.md` -- auto-detection algorithm
- `/Users/narayan/src/claude-agentic-tdd/.claude/skills/tdd/reference/state-management.md` -- state file schema
- `/Users/narayan/src/claude-agentic-tdd/.claude/skills/tdd/reference/adversarial-reviewer-prompt.md` -- adversarial review template
- `/Users/narayan/src/claude-agentic-tdd/.claude/skills/tdd/reference/spec-compliance-reviewer-prompt.md` -- spec compliance template
- `/Users/narayan/src/claude-agentic-tdd/.claude/skills/tdd/reference/testing-anti-patterns.md` -- 5 anti-patterns
- `/Users/narayan/src/claude-agentic-tdd/.claude/skills/tdd/reference/report-format.md` -- report and session log schema
