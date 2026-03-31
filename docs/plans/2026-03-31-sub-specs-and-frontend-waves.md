# Design: Sub-Specs and Backend-Then-Frontend Waves

## Problem

The TDD skill treats all work units equally — backend API, business logic, and frontend all get the same thin spec-contract and run through the same pipeline. This produces functional but unpolished frontends. Comparison with SDD (which naturally splits backend and frontend into separate phases with dedicated specs) showed that a focused, detailed spec produces significantly better UI quality (693 LOC CSS vs 410, more polished design, better UX).

## Changes

Two related improvements to Phase 2 (decomposition) and Phase 4 (execution):

### 1. Enriched Sub-Specs for Complex Tasks

**When**: Decomposition produces 3+ units with inter-dependencies, or `--effort` is `high`/`max`.

**What changes in Phase 2**: After producing the work unit list, the orchestrator generates an enriched sub-spec for each unit. Today's spec-contract is a brief behavioral description. The enriched sub-spec adds:

- Input/output type definitions (function signatures, API request/response shapes)
- Error cases and expected error types
- Edge cases explicitly called out
- Interface contracts with other units (what this unit expects from its dependencies)
- For frontend units: actual API endpoints, response shapes, error formats (synthesized from backend)

**When to skip**: For 1-2 simple units (bugfixes, small changes, single-file edits), use the current spec-contract as-is. The decomposition step already knows the unit count — this is just a conditional branch.

**Impact on pipeline**: The Test Writer and Code Writer prompts already receive the spec-contract content. Enriched sub-specs just make that content richer. No template changes needed — the same `{spec_contract}` placeholder carries more information.

### 2. Backend-Then-Frontend Execution Waves

**Rule**: All backend units complete before any frontend unit starts. No mixing. Within each wave, units run in parallel up to `--parallel`.

**Phase 2 change**: After decomposition, auto-classify each unit as `backend` or `frontend`:

- **Frontend**: Unit's files are in typical frontend directories (`src/public/`, `src/components/`, `pages/`, `app/`, `*.html`, `*.css`, `*.jsx`, `*.tsx`, `*.vue`, `*.svelte`) OR its spec-contract describes UI rendering, user interaction, or visual output.
- **Backend**: Everything else (API routes, business logic, data models, server config, migrations, non-code tasks).

No new `unitType` value needed — this is an orchestration-level classification stored as a tag on each unit during decomposition. The existing `"code"` / `"task"` types are unchanged.

**Phase 4 change**: Replace the single execution loop with two waves:

```
Wave 1: Backend
  - Dispatch all backend units (parallel up to --parallel)
  - Full TDD pipeline for each (4a → 4b → 4c → 4d → 4e → 4f → 4g)
  - Wait for ALL backend units to reach COMPLETED or FAILED

Wave 2: Frontend (only starts after Wave 1 completes)
  - Read implemented backend code from disk (routes, types, API surface)
  - Synthesize enriched frontend sub-specs with actual endpoint details
  - Dispatch all frontend units (parallel up to --parallel)
  - Full TDD pipeline for each (Test Writer → RED → Code Writer → GREEN → reviews)
```

**Frontend sub-spec synthesis**: Between Wave 1 and Wave 2, the orchestrator:

1. Reads the implemented route files from disk (using Read tool)
2. Extracts: endpoint paths, HTTP methods, request body shapes, response shapes, error responses
3. Reads the original spec's frontend section
4. Combines both into a detailed frontend sub-spec per unit, including:
   - Available API endpoints with example request/response
   - Component/page responsibilities
   - User interaction flows (what happens on click, form submit, etc.)
   - State management approach (what data to fetch, when to refresh)
   - Error handling (what errors the API returns, how to display them)

This is what SDD's `ui-spec.md` was — a focused frontend spec informed by the actual backend. The TDD skill now generates this automatically.

**Framework detection for frontend**: During Phase 1, `detect-framework.ts` already identifies the test framework. For frontend units, the orchestrator also checks:

- React/Next.js: component tests with vitest + @testing-library/react
- Vue: component tests with vitest + @vue/test-utils
- Svelte: component tests with vitest + @testing-library/svelte
- Vanilla JS: no unit tests possible — frontend units use the `"task"` pipeline (implementer → spec-compliance + code-quality review, skip adversarial)

For framework-based frontends, the full TDD pipeline applies (tests first, then implementation). For vanilla JS, the task pipeline applies with reviews.

## What Doesn't Change

- Phase 0 (Design Gate): unchanged
- Phase 1 (Framework Detection): unchanged (already detects frontend frameworks)
- Phase 3 (State Initialization): unchanged
- Phase 5 (Final Review): unchanged (already does holistic cross-unit check)
- Phase 6-7 (Report, Cleanup): unchanged
- All 8 verification scripts: unchanged
- All reference prompt templates: unchanged (spec-contract placeholder carries richer content)
- Resume flow: unchanged (backend/frontend classification is re-derived from state)
- The `unitType` enum: unchanged (`"code"` / `"task"`)

## SKILL.md Changes Required

1. **Phase 2**: Add sub-spec generation logic and backend/frontend classification
2. **Phase 4**: Replace single loop with two-wave execution (backend → frontend)
3. **Between waves**: Add frontend sub-spec synthesis step (read backend code, generate enriched specs)
4. **Complexity threshold**: Add conditional for when to generate enriched sub-specs (3+ units or --effort high/max)

Estimated SKILL.md delta: ~40-50 lines added, ~10 lines modified.

## Verification

1. Run `/tdd` on the pizza spec — verify backend units complete first, then frontend starts with enriched sub-spec
2. Run `/tdd fix email validation` — verify simple task skips sub-spec generation
3. Run `/tdd` with `--effort max` on a 2-unit task — verify sub-specs are generated despite low unit count
4. Compare frontend quality (CSS LOC, design polish) against previous pizza-sdk/pizza-sdk-max runs
