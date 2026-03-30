# Error Handling and Systematic Debugging

## Error Handling

Handle errors at every phase:

### Agent Team Creation Failure
If creating the agent team fails (env var not set, API error):
- Show clear error message with fix instructions
- Save state file so user can retry after fixing the issue

### Teammate Crash or Timeout
If a teammate stops unexpectedly:
- Log the error in the session log
- Attempt to re-spawn the teammate (counts as a retry)
- After maxRetries: escalate to user or skip (per config)

### Test Command Not Found
If the detected test command fails with "command not found":
- Ask the user for the correct test command
- Update the state file with the corrected command
- Retry the verification

### File Permission Errors
If unable to read/write test or implementation files:
- Report the specific path and error
- Ask user to fix permissions

### Interrupted Session
If the session is interrupted mid-flow:
- State file preserves progress (atomic writes)
- On next `/tdd` invocation, detect state file and offer resume
- Any in-progress teammate work is lost; restart from the current phase

### Team Cleanup on Error
Always attempt team cleanup even if the session errors:
- Shut down any remaining teammates
- Update state file with error status
- Generate partial report if any work completed

## Systematic Debugging Protocol

When tests fail during GREEN verification or final review and the Code Writer cannot fix them after `maxRetries`, switch to systematic debugging instead of immediately escalating.

### The 4-Phase Debug Process

**Phase D1: Root Cause Investigation**
- Read the failing test output carefully. What is the actual vs expected value?
- Trace the code path from test input to the point of failure.
- Check: is this a logic bug, a dependency issue, a type mismatch, or a missing feature?

**Phase D2: Pattern Analysis**
- Is this the same failure as a previous retry? If the Code Writer keeps making the same mistake, the problem is likely architectural.
- Are multiple tests failing for the same root cause? Fix the root cause, not the symptoms.
- After 3+ failed fixes for the same issue: STOP. The design may be wrong. Consider going back to Phase 0 for this work unit.

**Phase D3: Hypothesis and Test**
- Form a specific hypothesis: "The bug is in X because Y"
- **Write a regression test first** that isolates the bug. This test must fail, confirming the hypothesis.
- Only then fix the implementation.

**Phase D4: Verification**
- Run the new regression test — it should pass.
- Run ALL tests for this work unit — they should all pass.
- Run the full test suite — no regressions in other units.

### When to Trigger

- Code Writer fails 2+ times on the same test
- GREEN verification fails with non-obvious errors
- Integration tests fail in Phase 5

### Escalation

If Phase D2 suggests an architectural problem:
1. Log the findings
2. Present to the user: "This unit's implementation is fighting the design. The test expects X but the architecture makes X difficult because Y. Options: (a) revise the design, (b) revise the test expectations, (c) accept increased complexity."
3. Wait for user decision before proceeding.
