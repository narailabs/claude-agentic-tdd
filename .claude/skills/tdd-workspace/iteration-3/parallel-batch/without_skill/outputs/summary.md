# Summary: Default Claude Code Behavior on Parallel-Batch REST API (Iteration 3)

## Verdict

Default Claude Code would produce a **functional REST API** with all four CRUD endpoints implemented and superficially tested. However, it would treat four explicitly independent endpoints as a single monolithic task, missing every opportunity for parallel decomposition, concurrent execution, and independent verification. This eval case exposes the most distinctive capability gap of the TDD skill: parallel agent dispatch for independent work units.

## Answers to the Key Questions

### 1. Would it decompose into parallel batches?
**No.** Default Claude Code does not decompose the request into four discrete work units. Despite the prompt explicitly stating "all endpoints are independent -- no dependencies between them," Claude treats this as a single implementation task. There is no dependency graph, no batch computation, and no execution plan. The four endpoints are written sequentially in a single file by a single thread.

### 2. Would it use concurrent agent dispatch?
**No.** Default Claude Code operates as a single sequential agent. It does not dispatch Test Writer or Code Writer agents in parallel. It does not use the Agent tool to fan out work across endpoints. The independence of endpoints -- which makes this a textbook case for parallelism -- is completely unexploited.

### 3. Would it apply a three-stage review pipeline?
**No.** There is no review pipeline. No spec compliance review checks whether each endpoint satisfies its stated contract. No adversarial review probes for edge cases (malformed IDs, duplicate POSTs, concurrent deletes). No code quality review checks for anti-patterns. The code is written, tests are written to match, tests pass, done.

### 4. Would it run integration tests?
**Not deliberately.** Claude runs `jest` once at the end, executing whatever tests were written. These tests individually exercise each endpoint but do not constitute a deliberate integration pass that verifies cross-endpoint consistency (e.g., create via POST, verify via GET, delete via DELETE, confirm 404 on subsequent GET).

### 5. Would tests be written before code?
**No.** All implementation is written first for all four endpoints, then tests are written afterward to match what was built. No endpoint ever has a failing test before its implementation exists. There is no RED/GREEN cycle, per-endpoint or otherwise.

## Assertion Results

| # | Assertion | Type | Result |
|---|-----------|------|--------|
| 1 | Decomposes into 4 work units with no dependencies | behavioral | **FAIL** |
| 2 | Computes a single parallel batch containing all 4 units | behavioral | **FAIL** |
| 3 | Presents execution plan showing concurrent Batch 1 | behavioral | **FAIL** |
| 4 | Dispatches multiple Test Writers simultaneously | behavioral | **FAIL** |
| 5 | Each unit goes through full RED->GREEN->review cycle | completeness | **FAIL** |
| 6 | Applies three-stage review pipeline | verification | **FAIL** |
| 7 | Runs final integration test after all units complete | verification | **FAIL** |

**Score: 0/7 assertions met.**

This is the only eval case with a clean zero score. The parallel-batch scenario tests the most advanced orchestration capability of the TDD skill, and default Claude Code has no analog for any of it.

## Why Zero (Not Even Partial Credit)

In other eval cases (auth-system, plan-execution), default Claude Code sometimes earns partial credit for implicit behaviors that approximate a TDD skill feature. For example, building registration before login implicitly respects a dependency order, even without formal dependency tracking.

In this case, there is nothing to grant partial credit on:
- **Decomposition**: Claude does not identify four units; it sees one task.
- **Batching**: Without decomposition, there is nothing to batch.
- **Concurrency**: Without batches, there is nothing to run concurrently.
- **Independent cycles**: Without decomposition, there are no independent RED/GREEN cycles.
- **Review pipeline**: This is absent regardless of decomposition.
- **Integration test**: Running jest once is not a deliberate integration pass.

The independence signal in the prompt -- which is the entire point of this eval case -- is invisible to default Claude Code's execution model.

## Risk Assessment

| Risk | Severity | Likelihood |
|------|----------|------------|
| Tests that pass by construction but miss endpoint-specific edge cases | High | High |
| No independent verification that each endpoint works in isolation | Medium | High |
| Missing cross-endpoint integration scenarios (create-then-read-then-delete) | Medium | High |
| Slower wall-clock execution due to sequential processing | Low | Certain |
| No per-endpoint state tracking for crash recovery | Low | Medium |

## What This Eval Case Uniquely Reveals

This is the only eval case where the prompt explicitly signals parallelism potential. It tests whether the system can:

1. Parse domain independence ("endpoints are independent") into execution independence (run them in parallel)
2. Translate a flat list of requirements into a structured execution plan with batches
3. Dispatch multiple agent pairs concurrently
4. Maintain independent quality gates per work unit even when executing in parallel

Default Claude Code fails at the first step: recognizing that "independent" is an execution strategy signal, not just a domain fact. This is the widest gap between default behavior and TDD skill behavior across all eval cases.

## Bottom Line

Default Claude Code optimizes for producing a working result as quickly as possible through sequential implementation. For a set of four independent endpoints -- a scenario tailor-made for parallel execution -- it misses the opportunity entirely. The endpoints are written one after another in a single file, tests are appended after all code exists, and the independence declaration is treated as informational context rather than an execution directive. The TDD skill, by contrast, would decompose, batch, dispatch concurrently, verify independently, and review through a three-stage pipeline -- producing not just working code but independently verified, spec-compliant code with a structured audit trail.
