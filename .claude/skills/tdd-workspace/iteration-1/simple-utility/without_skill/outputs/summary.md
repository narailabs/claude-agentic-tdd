# Summary: Default Claude Code Behavior (Without TDD Skill)

## Prompt

```
/tdd implement a string utility module with functions: capitalize(str), truncate(str, maxLen), slugify(str)
```

## Key Findings

| Behavior | Default Claude Code | TDD Skill |
|---|---|---|
| **Write tests first?** | No -- implementation first, tests after (if at all) | Yes -- RED phase: tests written and verified to fail before any implementation |
| **Test framework detection?** | Ad-hoc, picks whatever seems standard | Systematic detection across 10+ languages via `framework-detection.md` |
| **RED/GREEN verification?** | No -- no verification that tests fail before implementation exists | Yes -- enforced RED then GREEN phases with anti-cheat rules |
| **Agent teams?** | No -- single agent writes both tests and implementation | Yes -- separate Test Writer (no impl access) and Code Writer (no test authoring) agents with information barrier |
| **Adversarial review?** | No | Yes -- dedicated adversarial reviewer checks for weak tests, anti-patterns, spec gaps |
| **Design gate?** | No -- jumps straight to coding | Yes -- Phase 0 decomposes spec into work units, optionally requires user approval |
| **Anti-pattern detection?** | No | Yes -- checks for 5+ testing anti-patterns (tautological tests, implementation-coupled tests, etc.) |
| **State management / resume?** | No -- if interrupted, start over | Yes -- state file tracks per-work-unit progress, supports incremental resume |
| **Structured reporting?** | No -- conversational summary only | Yes -- structured report with pass/fail per unit, phase logs, coverage |

## What Default Claude Gets Right

- Would produce a **working implementation** for this simple case
- Code quality would be reasonable (clean functions, proper exports)
- Might write tests, and those tests would likely pass
- Fast execution (under 60 seconds)

## What Default Claude Misses

1. **No independent test design** -- tests mirror implementation rather than defining behavior
2. **Edge cases likely missed** -- e.g., `truncate` when `maxLen < 3`, `slugify` with unicode, empty inputs for all functions, `capitalize` with already-capitalized or single-char strings
3. **No confidence tests are meaningful** -- tests written after implementation by the same context are confirmation bias, not verification
4. **No decomposition** -- all three functions treated as a single blob rather than independent work units with separate RED/GREEN cycles
5. **No adversarial pressure** -- nobody checks whether a subtly wrong implementation could still pass all the tests

## Bottom Line

For a simple utility module, default Claude Code would produce acceptable output. The gap between "works" and "verified correct with meaningful tests" is real but may not matter for trivial functions. The TDD skill's value increases sharply with complexity -- for anything involving state, concurrency, error handling, or integration between components, the lack of RED/GREEN verification and independent test authoring becomes a significant quality risk.
