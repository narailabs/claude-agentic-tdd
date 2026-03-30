# Eval 7: parallel-batch — Baseline Trace (No TDD Skill)

## Input
`/tdd implement a REST API with 4 independent endpoints`

## What Default Claude Code Would Do

### Step 1: Interpret the command
Without the TDD skill, Claude interprets this as: "build a REST API with 4 endpoints." The word "independent" is noted but does not trigger any parallel execution strategy. Claude treats this as a standard feature request.

### Step 2: Implementation approach
Claude would build all 4 endpoints in a single pass:

1. Set up the API framework (Express, Fastify, etc.)
2. Write all 4 endpoint handlers in one or a few files
3. Write tests for the endpoints
4. Run tests
5. Report done

### Step 3: Actual file creation sequence

```
1. Write src/app.ts (or server.ts)         ← framework setup
2. Write src/routes/endpoint1.ts           ← handler 1
3. Write src/routes/endpoint2.ts           ← handler 2
4. Write src/routes/endpoint3.ts           ← handler 3
5. Write src/routes/endpoint4.ts           ← handler 4
6. Write src/__tests__/api.test.ts         ← all tests in one file
7. Run tests
8. Fix failures
9. Report done
```

### Step 4: The parallelism gap
This eval is specifically designed to test parallel execution. The 4 endpoints are explicitly independent — they share no state, no dependencies, and no data. The TDD skill would:

1. Decompose into 4 independent work units
2. Detect all have `dependsOn: []`
3. Dispatch all 4 concurrently (up to `maxParallelPairs: 4`)
4. Each runs its full pipeline in parallel: Test Writer -> RED -> Code Writer -> GREEN -> Reviews

Baseline Claude processes everything sequentially in a single session.

## Detailed Behavioral Analysis

### Would Claude use agent teams?
**NO.** Single-session execution. This is the eval where the performance difference is most dramatic. With agent teams, 4 independent endpoints can be developed concurrently — potentially 4x faster (wall-clock time). Baseline serializes all work.

### Would Claude write tests first?
**NO.** Implementation-first. All 4 endpoints written, then tests written to match.

### Would Claude verify RED?
**NO.** No RED verification for any endpoint.

### Would Claude verify GREEN?
**NO.** No tamper detection.

### Would Claude use information barriers?
**NO.** Same session writes all tests and all implementations. Tests are likely to mirror implementation patterns across all 4 endpoints rather than independently testing behavioral contracts.

### Would Claude do formal reviews?
**NO.** No adversarial review, no spec compliance review, no code quality review. Each endpoint gets zero independent validation.

### Would Claude detect that endpoints are independent?
**NO.** The TDD skill's Phase 2 (Work Decomposition) performs dependency analysis and explicitly identifies independent work units. It then presents an execution plan showing all 4 can run concurrently. Baseline Claude does not perform dependency analysis.

### Would Claude use eager dispatch?
**NO.** This is the primary gap for this eval. With 4 independent endpoints:

**TDD Skill (eager dispatch, 4 concurrent)**:
```
Time ─────────────────────────────────>
Slot 1: [TW1 → RED1 → CW1 → GREEN1 → Review1]
Slot 2: [TW2 → RED2 → CW2 → GREEN2 → Review2]
Slot 3: [TW3 → RED3 → CW3 → GREEN3 → Review3]
Slot 4: [TW4 → RED4 → CW4 → GREEN4 → Review4]
         ─── then final integration review ───
Total: ~1 pipeline duration + integration
```

**Baseline (sequential)**:
```
Time ─────────────────────────────────────────────────>
[Write EP1] → [Write EP2] → [Write EP3] → [Write EP4] → [Write all tests] → [Run tests]
Total: ~4x implementation time + 1x test time
```

The speedup is not just wall-clock time — it's also quality. Independent Test Writer / Code Writer pairs for each endpoint mean each gets focused attention rather than being part of a monolithic batch.

### Would Claude decompose into work units with user confirmation?
**NO.** No work plan presentation. No user confirmation of decomposition. Claude decides the structure and proceeds.

### Would Claude assign model/effort by endpoint complexity?
**NO.** All 4 endpoints get the same model and effort, even if some are simple CRUD and others involve complex business logic, file uploads, or pagination.

### Would Claude track state per work unit?
**NO.** No per-endpoint progress tracking. If the session is interrupted after completing 2 endpoints, the context is lost. With the TDD skill, the state file tracks each work unit independently, allowing resume at the exact point of interruption.

### Would Claude run a final integration review?
**WEAKLY.** Claude might run all tests together at the end, but there's no formal Phase 5 (Final Review) with:
- Full test suite execution with actual output reading
- Cross-unit integration check
- Verification anti-rationalization ("tests should pass" is not evidence)
- Holistic code review for naming conflicts and inconsistencies

## Anti-Patterns Present in Baseline

1. **No parallel execution**: 4 independent endpoints serialized through one session
2. **No work unit decomposition**: All endpoints handled as one monolithic feature
3. **No eager dispatch**: Maximum throughput loss for fully independent work
4. **Implementation-first**: All 4 implementations before any tests
5. **No RED/GREEN verification**: For any endpoint
6. **No information barrier**: Same session writes all tests and all code
7. **No formal reviews**: No per-endpoint adversarial/spec-compliance/quality review
8. **No dependency analysis**: Independence not formally identified
9. **No user confirmation of plan**: Claude decides structure unilaterally
10. **No per-unit state tracking**: Cannot resume at a specific endpoint
11. **No model/effort differentiation**: Simple and complex endpoints treated identically
12. **Weak integration check**: No formal Phase 5 verification

## Performance Impact Estimate

For 4 independent endpoints, assuming each takes T minutes through the full pipeline:

| Approach | Wall-clock time | Quality checks per endpoint |
|----------|----------------|---------------------------|
| TDD Skill (4 concurrent) | ~T + integration | 5 (RED, GREEN, Spec, Adversarial, Quality) |
| Baseline (sequential) | ~4T | 0 |

The TDD skill provides both faster execution AND higher quality — a rare case where the faster approach is also the more thorough one.
