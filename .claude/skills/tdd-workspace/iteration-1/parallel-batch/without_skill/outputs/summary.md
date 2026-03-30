# Eval 7: parallel-batch — Baseline Summary

## Eval
`/tdd implement a REST API with 4 independent endpoints`

## Baseline Behavior (Without Skill)

| Assertion Point | Present? | Notes |
|----------------|----------|-------|
| Agent teams | NO | Single-session; 4 independent endpoints serialized |
| Tests written first | NO | Implementation-first for all endpoints |
| RED verification | NO | No RED phase for any endpoint |
| GREEN verification | NO | No tamper detection |
| Information barriers | NO | Same session writes all tests + all code |
| Formal reviews | NO | No per-endpoint adversarial/spec/quality review |
| Task classification | NO | No decomposition into work units |
| Dependency analysis | NO | Independence not formally identified |
| Eager dispatch | NO | No parallel execution despite full independence |
| Model/effort by complexity | NO | Uniform handling for all endpoints |
| Work decomposition | NO | All endpoints handled as monolithic feature |
| User confirmation of plan | NO | Structure decided unilaterally |
| Per-unit state tracking | NO | Cannot resume at specific endpoint |
| Integration review | WEAK | May run tests together but no formal Phase 5 |
| Report generation | NO | No structured output |

## Key Gaps

1. **Parallel execution is the critical gap**: 4 fully independent endpoints are the ideal case for concurrent agent teams. The TDD skill would run all 4 in parallel, each with its own Test Writer / Code Writer pair and full review pipeline. Baseline serializes everything, potentially 4x slower.
2. **No per-endpoint quality verification**: Each endpoint deserves its own RED/GREEN cycle and independent reviews. Baseline batches everything, so a weak endpoint hides among stronger ones.
3. **No decomposition**: The user said "4 independent endpoints" but baseline treats this as one feature, not 4 work units. This means no independent progress tracking, no per-endpoint retry logic, and no concurrent development.
4. **Throughput ceiling**: This eval demonstrates the ceiling of single-session execution. Even a simple spec with clear parallelism cannot benefit from concurrent work in baseline.

## Expected Output Quality
- Functional code: likely correct for simple CRUD endpoints
- Test quality: tests written after code, likely shallow, grouped in one file
- Architecture: possibly acceptable but no independent quality review
- Performance: 4x slower than parallel TDD approach (wall-clock)
- Consistency: endpoints may have inconsistent patterns (no per-endpoint review to enforce standards)
- Error handling: likely inconsistent across endpoints without independent spec compliance review
