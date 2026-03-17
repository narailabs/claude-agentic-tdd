# Report Format

## tdd-report.md

Generate at the end of each session. Human-readable Markdown.

### Template

```markdown
# TDD Session Report

**Date**: [ISO-8601 timestamp]
**Specification**: [original user spec, first 200 chars]
**Framework**: [language] / [test runner]
**Entry Point**: [natural-language-spec | existing-codebase | user-provided-test]

## Summary

| Metric | Value |
|--------|-------|
| Work units | [completed]/[total] |
| Tests written | [count] |
| Assertions | [count] |
| Anti-cheat violations | [count] |
| Adversarial reviews | [passed]/[total] |
| Retries | [count] |

## Work Units

### [Unit Name] — [status emoji] [status]

**Spec**: [spec-contract summary, 1-2 sentences]

| Phase | Status | Attempts | Notes |
|-------|--------|----------|-------|
| Test Writer | [status] | [N] | [any notes] |
| RED Verification | [status] | — | [failure count], [assertion count] |
| Code Writer | [status] | [N] | [any notes] |
| GREEN Verification | [status] | — | [pass/fail] |
| Spec Compliance | [status] | — | [N]/[N] requirements covered |
| Adversarial Review | [status] | — | [pass/fail] |

**Files created**:
- Tests: [paths]
- Implementation: [paths]

**Reviewer findings**: [if any]

---

[repeat for each unit]

## Anti-Cheat Log

[List any violations encountered during the session]

| Unit | Phase | Violation | Resolution |
|------|-------|-----------|------------|
| [id] | [phase] | [description] | [re-prompted / skipped / user-resolved] |

## Final Integration Check

[Results of running the full test suite after all units complete]
- All tests passing: [yes/no]
- Integration issues found: [list if any]
```

## tdd-session.jsonl

One JSON object per line. Structured event log for debugging and replay.

### Event Schema

```json
{
  "timestamp": "ISO-8601",
  "event": "event-type",
  "unitId": "work-unit-id or null",
  "data": {}
}
```

### Event Types

| Event | When | Data |
|-------|------|------|
| `session.start` | Session begins | `{spec, entryPoint, framework}` |
| `session.resume` | Resumed from state file | `{completedUnits, pendingUnits}` |
| `decomposition.complete` | Work units created | `{units: [{id, name, dependsOn}]}` |
| `user.confirmed` | User approved plan | `{unitCount}` |
| `team.created` | Agent team created | `{teamId}` |
| `test-writer.spawned` | Test Writer teammate started | `{unitId, attempt}` |
| `test-writer.completed` | Test Writer finished | `{unitId, testFiles, duration}` |
| `test-writer.failed` | Test Writer failed | `{unitId, error, attempt}` |
| `red.verification.start` | RED checks begin | `{unitId}` |
| `red.verification.passed` | RED checks pass | `{unitId, failureCount, assertionCount}` |
| `red.verification.failed` | RED checks fail | `{unitId, reason, details}` |
| `code-writer.spawned` | Code Writer started | `{unitId, attempt}` |
| `code-writer.completed` | Code Writer finished | `{unitId, implFiles, duration}` |
| `code-writer.failed` | Code Writer failed | `{unitId, error, attempt}` |
| `green.verification.start` | GREEN checks begin | `{unitId}` |
| `green.verification.passed` | GREEN checks pass | `{unitId}` |
| `green.verification.failed` | GREEN checks fail | `{unitId, reason, details}` |
| `spec-review.spawned` | Spec compliance reviewer started | `{unitId}` |
| `spec-review.compliant` | Spec compliance passed | `{unitId, requirementsCovered, total}` |
| `spec-review.non-compliant` | Spec compliance failed | `{unitId, missingRequirements, scopeCreep}` |
| `adversarial.spawned` | Reviewer started | `{unitId}` |
| `adversarial.passed` | Reviewer approved | `{unitId, findings}` |
| `adversarial.failed` | Reviewer rejected | `{unitId, findings}` |
| `anti-cheat.violation` | Guardrail triggered | `{unitId, phase, violation, action}` |
| `unit.completed` | Work unit done | `{unitId}` |
| `unit.failed` | Work unit failed permanently | `{unitId, reason}` |
| `integration.check` | Final test suite run | `{passed, totalTests, failures}` |
| `session.complete` | Session finished | `{summary}` |
```
