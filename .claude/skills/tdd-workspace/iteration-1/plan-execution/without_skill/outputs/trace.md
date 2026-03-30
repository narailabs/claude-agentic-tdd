# Eval 6: plan-execution — Baseline Trace (No TDD Skill)

## Input
`/tdd execute docs/plan.md` — 5 tasks with dependencies, mixed code/non-code

## What Default Claude Code Would Do

### Step 1: Interpret the command
Without the TDD skill, Claude interprets this as: "read `docs/plan.md` and execute the tasks described in it." There is no Mode 4 (Plan Execution) detection. Claude treats the plan as a natural language document to follow.

### Step 2: How Claude reads and executes the plan
Claude would:
1. Read `docs/plan.md`
2. Understand the 5 tasks described
3. Execute them sequentially, one by one, in the order listed in the plan

### Step 3: Critical missing capabilities for plan execution

The TDD skill's Mode 4 provides:

**Task Classification**: Each task is classified as either:
- **Code task** (needs implementation + tests) -- gets full TDD pipeline
- **Non-code task** (migrations, configs, docs, scripts, infra) -- gets implementer dispatch

Baseline Claude does not classify tasks. All tasks are handled identically: read the task, do the thing, move on. This means:
- Code tasks don't get tests-first treatment
- Non-code tasks might get unnecessary test attempts
- The distinction between "needs TDD" and "just needs implementation" is lost

**Dependency Ordering**: The TDD skill builds a DAG from `dependsOn` fields and uses eager dispatch. Baseline Claude reads the plan top-to-bottom and executes sequentially, regardless of dependency structure.

**Inline Task Provision**: The TDD skill provides full task text inline to subagents (not file references). This ensures each agent has complete context. Baseline Claude might reference the plan file repeatedly.

### Step 4: Actual execution sequence

```
1. Read docs/plan.md
2. Task 1: execute (code + implementation, no tests)
3. Task 2: execute (code + implementation, no tests)
4. Task 3: execute (non-code task handled like code)
5. Task 4: execute (depends on 1+2 but dependency not tracked)
6. Task 5: execute (depends on others but order is coincidental)
7. Maybe run some tests at the end
8. Report done
```

## Detailed Behavioral Analysis

### Would Claude use agent teams?
**NO.** Single-session execution. Each task is handled by the same main session. No Test Writer / Code Writer pairs. No Implementer subagents for non-code tasks.

### Would Claude classify tasks as code vs. non-code?
**NO.** This is a critical gap for plan execution mode. The 5 tasks likely include a mix:
- Database migration (non-code: SQL/config)
- API endpoint implementation (code: needs TDD)
- Configuration setup (non-code: env files, configs)
- Business logic (code: needs TDD)
- Documentation (non-code: OpenAPI spec, README)

Without classification:
- Code tasks miss the TDD pipeline entirely
- Non-code tasks might get confused handling
- The appropriate review strategy (TDD reviews vs. implementer reviews) is not applied

### Would Claude write tests first for code tasks?
**NO.** Implementation-first for all tasks, regardless of whether they're code tasks that benefit from TDD.

### Would Claude verify RED/GREEN for code tasks?
**NO.** No RED or GREEN verification for any task.

### Would Claude use information barriers?
**NO.** Same session handles all tasks with full context bleed between them.

### Would Claude do formal reviews?
**NO.** No spec compliance review, no adversarial review, no code quality review. For plan execution, spec compliance review is especially important — it verifies each task's output matches the plan's requirements.

### Would Claude respect dependency ordering?
**WEAKLY.** Claude would likely execute tasks in the order listed in the plan document. If the plan happens to be in dependency order, this works. But:
- No formal DAG construction
- No dependency violation detection
- No concurrent execution of independent tasks
- If the plan lists tasks out of dependency order, Claude might execute them wrong

### Would Claude use eager dispatch for parallel tasks?
**NO.** This is a significant efficiency gap. If tasks 1, 2, and 3 are independent, the TDD skill would run them concurrently (up to maxParallelPairs). Baseline Claude runs them one after another.

With 5 tasks and a dependency graph like:
```
Task 1 (independent) ──→ Task 4
Task 2 (independent) ──→ Task 4
Task 3 (independent) ──→ Task 5
Task 4 ──→ Task 5
```

TDD skill execution time: ~3 sequential stages (1+2+3 parallel, then 4, then 5)
Baseline execution time: 5 sequential stages

### Would Claude use the Subagent Status Protocol?
**NO.** No DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED status reporting. If a task fails or has concerns, there's no structured escalation path.

### Would Claude handle mixed code/non-code appropriately?
**NO.** Without task classification:
- Code tasks: no TDD pipeline, no Test Writer, no Code Writer, no anti-cheat
- Non-code tasks: no Implementer template, no focused review
- Both: no spec compliance review against the plan's requirements

### Would Claude generate state for resumability?
**NO.** No `.tdd-state.json` tracking which tasks are complete. If the session is interrupted after task 3, all progress context is lost. The user must restart from scratch or manually determine what was done.

## Anti-Patterns Present in Baseline

1. **No task classification**: Code and non-code tasks handled identically
2. **No dependency DAG**: Sequential execution in document order, not dependency order
3. **No parallel execution**: Independent tasks run sequentially
4. **No eager dispatch**: Massive throughput loss for concurrent-eligible tasks
5. **No TDD pipeline for code tasks**: Tests not written first, no RED/GREEN, no anti-cheat
6. **No Implementer dispatch for non-code tasks**: Non-code tasks lack focused template
7. **No subagent status protocol**: No structured escalation for stuck tasks
8. **No spec compliance review**: Plan requirements not verified against outputs
9. **No state management**: Cannot resume interrupted plan execution
10. **No inline task provision**: Subagents (if they existed) would need to re-read the plan file
11. **Single-session bottleneck**: All 5 tasks serialized through one context
