# Eval 6: plan-execution — Baseline Summary

## Eval
`/tdd execute docs/plan.md` — 5 tasks with dependencies, mixed code/non-code

## Baseline Behavior (Without Skill)

| Assertion Point | Present? | Notes |
|----------------|----------|-------|
| Agent teams | NO | Single-session, no subagents for tasks |
| Tests written first | NO | Implementation-first for all tasks |
| RED verification | NO | No RED phase for any task |
| GREEN verification | NO | No tamper detection |
| Information barriers | NO | Same session handles all tasks |
| Formal reviews | NO | No spec compliance, adversarial, or code quality review |
| Task classification (code vs. non-code) | NO | All tasks handled identically |
| Dependency DAG construction | NO | Sequential execution in document order |
| Eager dispatch | NO | No parallel execution of independent tasks |
| Subagent Status Protocol | NO | No DONE/BLOCKED/NEEDS_CONTEXT escalation |
| Implementer dispatch for non-code | NO | Non-code tasks not given focused handling |
| Inline task provision | NO | No subagents to receive inline context |
| Model/effort by complexity | NO | Uniform handling for all tasks |
| State management / resume | NO | No .tdd-state.json; interrupted sessions lose progress |
| Report generation | NO | No structured output |

## Key Gaps

1. **Task classification is the critical gap**: A plan with mixed code/non-code tasks needs different pipelines for each. Code tasks need TDD (test-first, RED, GREEN, review). Non-code tasks need implementer dispatch with spec compliance review. Baseline applies neither.
2. **No parallel execution**: Independent tasks that could run concurrently are serialized. For 5 tasks with a diamond dependency graph, this can mean 5x slower execution vs. ~3x with eager dispatch.
3. **No dependency tracking**: If the plan's document order doesn't match dependency order, tasks may execute before their prerequisites.
4. **No resumability**: Plan execution is the longest-running mode. Session interruption is most likely here, and without state management, most costly.
5. **No subagent status protocol**: When a task hits a blocker (missing dependency, ambiguous requirement, wrong assumption), there's no structured escalation — Claude either guesses or stops.

## Expected Output Quality
- Task completion: likely completes all 5 tasks
- Order: follows document order (may or may not match dependencies)
- Code quality: code tasks lack TDD guardrails
- Non-code quality: non-code tasks lack focused review
- Integration: cross-task integration untested
- Efficiency: up to 5x slower than parallel execution
- Resumability: zero — interrupted sessions lose all progress
