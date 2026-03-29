# Summary: Default Claude Code Behavior for Coverage Mode (Iteration 2)

## Prompt

`/tdd add test coverage for src/utils/ --skip-design`

## What Default Claude Code Would Do

1. **Ignore `/tdd` as a command** -- treat entire input as natural language, no skill invoked
2. **Ignore `--skip-design` flag** -- no design gate exists to skip
3. **Read source files** in `src/utils/` to understand existing code (shallow, no structured analysis)
4. **Check test framework** via `package.json` or existing test files
5. **Write all tests in a single pass** -- one test file per source file, derived from reading implementation internals
6. **Run tests once** -- fix test-side errors if any fail, declare success
7. **Produce an informal conversational summary** -- no structured report, no metrics

## Assertion-by-Assertion Verdict

| # | Assertion | Pass? | Why |
|---|-----------|-------|-----|
| 1 | Detects entry point mode 2 (existing codebase coverage mode) | NO | No mode classification exists in default Claude |
| 2 | Reads and analyzes existing source files before writing tests | YES | Trivially satisfied -- any code assistant reads files first |
| 3 | Skips design gate because --skip-design flag was passed | NO | No design gate to skip; absence is incidental, not causal |
| 4 | Generates tests derived from specific source contents (signatures, types, edge cases) | PARTIAL | Tests reference real functions but are implementation-coupled, not behavioral |
| 5 | Describes or resolves RED verification tension with existing implementations | NO | No concept of RED verification or the tension it creates in coverage mode |
| 6 | Demonstrates hide-and-restore RED verification for coverage mode | NO | Would never temporarily hide implementation files to verify test dependency |
| 7 | Produces a structured report showing coverage additions | NO | Only informal conversational summary, no metrics or structured output |

**Expected score: 1-1.5 out of 7** (one clear pass, one partial)

## Key Questions Answered

### Does it analyze existing code first?
**Partially.** It reads files and identifies exports/signatures, but the analysis is unstructured -- no spec-contracts, no dependency mapping, no work unit decomposition, no critical-function prioritization.

### Does it write characterization tests?
**No.** It writes confirmation tests that mirror the implementation. True characterization tests describe behavior independently and are verified to catch regressions. Default Claude's tests describe what the code happens to do internally, not what it should do as a contract.

### Does it verify the tests?
**Minimally.** It runs tests once to check they pass. It does not verify they are meaningful, non-tautological, or capable of detecting regressions.

### Does it use any adapted RED verification for existing code?
**No.** Default Claude has no RED verification concept at all. The adapted hide-and-restore procedure (temporarily remove implementation to prove tests depend on real code, then restore to prove characterization is accurate) is entirely absent. Claude would find this procedure unnecessary and would not perform it unprompted.

### Does it produce a structured report?
**No.** The output is a conversational summary (e.g., "I added tests for X, Y, Z, all passing"). No assertion counts, no coverage metrics, no per-unit breakdowns, no session logs, no machine-readable format.

## Discriminating Gaps (vs. TDD Skill)

The five strongest differentiators between default Claude and the TDD skill for this eval case:

1. **Hide-and-restore RED verification** -- entirely absent without the skill; a novel procedure that proves tests are not tautological when implementation pre-exists
2. **RED verification tension awareness** -- default Claude does not recognize the conceptual conflict between "tests should fail first" and "code already exists"
3. **Entry point mode classification** -- default Claude has no pipeline routing based on request type
4. **Structured reporting** -- default Claude's output is conversational, not a metrics-backed report
5. **Design gate as a formal concept** -- cannot skip what does not exist; flag is meaningless without the skill

## Bottom Line

Default Claude Code produces syntactically correct, passing tests by reading the implementation and writing assertions to match. The tests provide coverage metrics but not confidence. They lack characterization rigor (no proof they catch regressions), RED verification (no check for tautological tests), and structured output (no report). The most critical gap is the complete absence of the hide-and-restore verification procedure, which is the TDD skill's core mechanism for ensuring test quality in coverage mode.
