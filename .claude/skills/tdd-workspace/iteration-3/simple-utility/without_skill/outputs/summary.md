# Summary: Default Claude Code Behavior (Without TDD Skill) -- Iteration 2

## Prompt

```
/tdd implement a string utility module with functions: capitalize(str) that capitalizes the first letter, truncate(str, maxLen) that truncates with ellipsis, and slugify(str) that converts to URL-safe slugs
```

## Key Findings

| Behavior | Default Claude Code | TDD Skill |
|---|---|---|
| **Write tests first?** | No -- implementation first, tests after (if at all) | Yes -- RED phase: tests written and verified to fail before any implementation |
| **Test framework detection?** | Ad-hoc, picks whatever seems standard | Systematic detection across 10+ languages via `framework-detection.md` |
| **RED/GREEN verification?** | No -- no verification that tests fail before implementation | Yes -- enforced RED then GREEN phases with anti-cheat rules |
| **Agent teams / information barrier?** | No -- single agent writes both tests and implementation | Yes -- separate Test Writer (no impl access) and Code Writer (no test authoring) with information barrier enforced via disk reads |
| **Adversarial review?** | No | Yes -- dedicated adversarial reviewer checks for weak tests, anti-patterns, spec gaps |
| **Spec compliance review?** | No | Yes -- reviewer validates implementation against original spec |
| **Design gate / decomposition?** | No -- jumps straight to coding | Yes -- Phase 0 decomposes spec into work units, optionally requires user approval |
| **Anti-pattern detection?** | No | Yes -- checks for 5+ testing anti-patterns (tautological tests, implementation-coupled tests, etc.) |
| **State management / resume?** | No -- if interrupted, start over | Yes -- state file tracks per-work-unit progress, supports incremental resume |
| **Structured reporting?** | No -- conversational summary only | Yes -- structured report with pass/fail per unit, phase logs, coverage |

## Assertion Results

**0-1 out of 10 assertions satisfied.** Default Claude fails essentially all eval assertions:
- No test-first ordering (assertion 3)
- No RED phase verification (assertion 4)
- No information barrier (assertions 5, 6)
- No adversarial review (assertion 8)
- No structured report (assertion 9)
- No work decomposition plan presented to user (assertion 2)

## What Default Claude Gets Right

- Would produce a **working implementation** for this simple case
- Code quality would be reasonable (clean functions, proper exports, TypeScript types)
- Might write tests, and those tests would likely pass
- Fast execution (under 60 seconds, 3-5 tool calls)

## What Default Claude Misses

1. **No independent test design** -- tests mirror implementation rather than defining behavior from the specification
2. **Edge cases likely missed** -- e.g., `truncate` when `maxLen < 3`, `truncate` at exact boundary, `slugify` with unicode, `slugify` with only special characters, `capitalize` with non-alpha first character, empty string handling across all functions
3. **No confidence tests are meaningful** -- tests written after (and by the same agent as) implementation are confirmation bias, not independent verification
4. **No decomposition** -- all three functions treated as a single blob rather than independent work units with separate RED/GREEN cycles
5. **No adversarial pressure** -- nobody checks whether a subtly wrong implementation could still pass all the tests
6. **Spec ambiguities unresolved** -- no clarification of what "ellipsis" means (three dots vs unicode), whether capitalize should lowercase the rest, or what "URL-safe" means for unicode input

## Bottom Line

For a simple utility module, default Claude Code would produce functional output quickly. The implementation would likely be correct for common cases. However, the absence of test-first methodology means there is no independent verification of correctness, edge cases go unexamined, and the tests (if written) serve as documentation of what the code happens to do rather than a specification of what it should do. The gap between "works for happy path" and "verified correct with meaningful, independent tests" is the core value proposition of the TDD skill.
