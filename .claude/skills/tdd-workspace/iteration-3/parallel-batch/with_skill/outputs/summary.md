# Parallel Execution Test Case: Summary

**Test case**: 4 independent REST API endpoints (GET /users, POST /users, GET /users/:id, DELETE /users/:id)
**Primary test dimension**: Parallel execution with maxParallelPairs=3 and 4 independent units

---

## What This Test Case Validates

This test case exercises the parallel execution machinery of the TDD skill. The 4 endpoints have zero inter-dependencies, which produces the simplest possible dependency graph (all roots, single batch) and maximizes concurrency pressure against the maxParallelPairs cap.

---

## Decomposition and Topological Sort

**Input**: 4 work units, each with `dependsOn: []`

**Dependency graph**: 4 disconnected nodes. No edges.

**Topological sort**: All 4 nodes have in-degree 0, so all are placed in Batch 1. The sort terminates after one pass -- no Batch 2 exists.

**Execution plan**: Single batch with all 4 units marked parallel.

```
Batch 1 (parallel): get-users, post-users, get-user-by-id, delete-user-by-id
```

This is the degenerate case for the batch scheduler: the maximum number of units that can run in a single batch.

---

## Parallel Dispatch Behavior

### maxParallelPairs Cap

The default configuration sets `execution.maxParallelPairs: 3`. With 4 units in the batch:

- **T=0**: 3 Test Writers dispatched concurrently (get-users, post-users, get-user-by-id)
- **Queued**: 1 Test Writer waiting (delete-user-by-id)
- **Slot freed**: When the first Test Writer completes (its unit moves to RED verification, which is done by the lead, not a subagent slot), the queued unit's Test Writer is dispatched

### Pipeline Independence

Once a Test Writer completes, its unit's pipeline (RED -> Code Writer -> GREEN -> Review) proceeds independently. This means:

- Unit A can be in Code Writing while Unit B is still in Test Writing
- Unit A can be in Review while Unit C is in GREEN verification
- Different units' three-stage reviews run concurrently

The cap applies to **concurrent agent teams**, not to concurrent pipeline stages.

### Observed Concurrency Pattern

```
Phase           Max concurrent agents at any point
-----------     ----------------------------------
Test Writing    3 (capped; 4th queued)
Code Writing    3 (capped; staggered starts as RED completes)
Spec Review     Up to 3 concurrent
Adversarial     Up to 3 concurrent
Code Quality    Up to 3 concurrent
```

---

## Three-Stage Review Pipeline

Each unit passes through 3 sequential review stages. The ordering rule (SKILL.md line 457) is strict:

```
Spec Compliance -> Adversarial Review -> Code Quality Review
```

### Stage 1: Spec Compliance Review
- **Purpose**: Does the implementation satisfy every requirement in the spec-contract?
- **Reviewer receives**: spec-contract, design summary, test files, impl files
- **Verdict**: COMPLIANT or NON-COMPLIANT
- **Gate**: NON-COMPLIANT blocks all subsequent reviews; pair sent back for revision

### Stage 2: Adversarial Review
- **Purpose**: Try to break the tests, find coverage gaps, detect cheating
- **Reviewer receives**: spec-contract, test files, impl files, scoring rubric
- **Also checks**: 5 documented anti-patterns from testing-anti-patterns.md
- **Verdict**: PASS or FAIL (with critical issues)
- **Gate**: FAIL sends pair back to Test Writer then Code Writer for revision

### Stage 3: Code Quality Review
- **Purpose**: Is the code well-built? Clean, maintainable, minimal?
- **Reviewer receives**: impl files, test files, git diff for unit
- **Checks**: SRP, naming, YAGNI, project patterns, test brittleness
- **Verdict**: Approved or Needs Changes
- **Gate**: Needs Changes (critical/important) sends back to Code Writer

### Why This Order Matters

1. No point reviewing code quality if the implementation does not match the spec
2. No point adversarial-testing code that is non-compliant
3. Code quality is the final polish after correctness and test integrity are confirmed

---

## Final Integration Testing

After all 4 units complete their pipelines (batch completion gate):

1. **Full test suite run**: `npx vitest run` -- all test files together
2. **Pristine output check**: no warnings, skipped tests, or pending tests
3. **Holistic code review**: naming conflicts, shared state consistency, missing connections
4. **Cross-unit integration**: verify the endpoints work together (POST creates what GET returns, DELETE removes what GET can no longer find)
5. **Anti-rationalization enforcement**: actual test output is the only acceptable evidence

---

## Agent Spawn Totals

| Agent Type | Per Unit | Total (4 units) |
|-----------|---------|-----------------|
| Test Writer | 1 | 4 |
| Code Writer | 1 | 4 |
| Spec Compliance Reviewer | 1 | 4 |
| Adversarial Reviewer | 1 | 4 |
| Code Quality Reviewer | 1 | 4 |
| **Total subagent spawns** | **5** | **20** |

(Assumes no retries. Each retry adds 1-2 additional spawns per failing phase.)

---

## Key Findings

### 1. The skill correctly produces a single-batch plan for fully independent units
All 4 units have empty `dependsOn` arrays. The topological sort places them all in Batch 1 with no subsequent batches.

### 2. The maxParallelPairs=3 cap creates a 3+1 dispatch pattern
3 Test Writers start at T=0; the 4th waits. As soon as one Test Writer completes and its unit moves to the next phase, the queued Test Writer is dispatched. This is the expected behavior from SKILL.md line 509: "spawn agent teams concurrently (up to maxParallelPairs)."

### 3. Pipeline stages are independent across units but sequential within each unit
Unit A's review does not block Unit B's Code Writer. But within Unit A, Spec Compliance must pass before Adversarial Review, which must pass before Code Quality Review.

### 4. The batch completion gate is respected
Phase 5 (integration) does not begin until all 4 units have completed their full pipelines, including all 3 review stages. This is per SKILL.md line 515: "Wait for ALL units in a batch to complete (including reviews) before starting the next batch."

### 5. Information barrier is maintained across all 4 concurrent pipelines
Each Code Writer receives only its own unit's test file and spec-contract, read from disk. No cross-contamination between units. This is especially important in parallel execution where multiple Code Writers may be active simultaneously.

### 6. Design gate fires due to 3+ features
Even though the endpoints are simple, the trigger "3+ distinct features or components" causes the design gate (Phase 0) to run. Users who want to skip it for simple multi-unit specs should use `--skip-design`.

### 7. Twenty subagent spawns for a 4-unit plan
Each unit requires 5 subagent spawns (TW + CW + 3 reviewers). For 4 units, that is 20 spawns total. This is the minimum (no retries). The maxParallelPairs cap keeps at most 3 running simultaneously, so the system manages resource consumption while maintaining throughput.
