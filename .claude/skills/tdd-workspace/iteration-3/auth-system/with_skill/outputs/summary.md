# Summary: Auth System TDD Skill Trace

## Spec

"build a user authentication system with registration (email validation, password hashing, duplicate detection), login (JWT tokens, failed attempt tracking), and password reset (token generation, expiry, email notification)"

## Key Findings

### Design Gate (Phase 0) -- TRIGGERED

Three trigger conditions were met simultaneously:
1. 3+ distinct features (registration, login, password reset)
2. External integrations (JWT, email, bcrypt)
3. Ambiguity in data flow (lockout semantics, token invalidation scope, email sync vs async)

The design gate process:

- **3 clarifying questions** asked one at a time (not as a questionnaire): reset token expiry duration, failed login consequence, email sync vs async.
- **2 trade-off presentations** (mandatory -- the skill says "Every spec complex enough to trigger the design gate has at least one meaningful trade-off"):
  - Token strategy: Stateless JWT vs JWT+Refresh+Blacklist vs Session-based
  - Hashing algorithm: bcrypt vs argon2
- **Design summary** produced with Components, Data Flow, Key Decisions, and Out of Scope sections.
- **Hard gate**: No decomposition until user confirms the design.

### Dependency Analysis

| Unit | Depends On | Batch |
|------|-----------|-------|
| user-registration | (none) | 1 |
| user-login | user-registration | 2 |
| password-reset | user-registration | 2 |

Batch 2 runs both units in parallel (both depend only on Batch 1, not on each other).

### Three-Stage Review Pipeline

Each work unit passes through three sequential review stages. Order is strictly enforced:

```
Stage 1: Spec Compliance Review
  - Requirement matrix (each spec item: implemented? tested?)
  - Missing requirements, scope creep, API contract accuracy
  - MUST pass before Stage 2

Stage 2: Adversarial Review
  - Try to break tests, catch cheating, find coverage gaps
  - Watches for 5 documented anti-patterns from testing-anti-patterns.md
  - MUST pass before Stage 3

Stage 3: Code Quality Review
  - Structure, naming, discipline, testing quality, file sizes
  - MUST pass before unit is marked complete
```

If any stage fails, the pair revises and that stage re-runs. Later stages do not run until earlier ones pass.

### Agent Count

15 total agents spawned across the session:
- 3 Test Writers (one per unit)
- 3 Code Writers (one per unit)
- 3 Spec Compliance Reviewers (one per unit)
- 3 Adversarial Reviewers (one per unit)
- 3 Code Quality Reviewers (one per unit)

### Anti-Cheat Guardrails Applied

**RED verification** (per unit):
1. Test files exist on disk
2. Tests fail without implementation (non-zero exit)
3. Failures are correct type (module not found, not syntax errors)
4. Assertion density meets threshold (>= 1 meaningful assertion per test)
5. Behavior-over-implementation (no excessive mocking, no private method access)
6. Checksums recorded for later comparison

**GREEN verification** (per unit):
1. Test file checksums unchanged (Code Writer did not modify tests)
2. No skip/focus markers added (.skip, .only, xit, etc.)
3. All tests pass (exit code 0)
4. Heuristic check for hardcoded returns

**Information barrier**: Code Writer receives test file contents and spec-contract read from disk only. Never receives the Test Writer's prompt, reasoning, or implementation hints.

### Mandatory Trade-Off Presentation

The skill explicitly requires presenting 2-3 options with pros/cons for at least one key architectural decision whenever the design gate triggers. The trace shows two trade-offs presented:

1. **Token strategy** -- 3 options (stateless JWT, JWT+refresh+blacklist, session-based) with pros/cons for each. This is the most architecturally significant decision because it determines revocability, scalability, and complexity.

2. **Hashing algorithm** -- 2 options (bcrypt, argon2) with security and ecosystem trade-offs.

The skill says: "Every spec complex enough to trigger the design gate has at least one meaningful trade-off... keep this brief but do not skip it entirely."

### Verification Anti-Rationalization

Phase 5 enforces the "IRON LAW": no completion claim without fresh verification evidence. The skill provides an explicit table of excuses and rebuttals that apply to all agents including the orchestrator itself. Every entry resolves to the same action: "Run the tests."

### Error Handling Coverage

The skill defines handling for: agent creation failure, teammate crash/timeout, test command not found, file permission errors, interrupted sessions, and team cleanup on error. A systematic debugging protocol activates after 2+ Code Writer failures on the same test, using a 4-phase process (root cause, pattern analysis, hypothesis+test, verification).

## Trace Completeness

The trace covers all 8 phases of the skill (0-7):

| Phase | Content |
|-------|---------|
| 0: Design Gate | Trigger evaluation, 3 clarifying questions, 2 trade-off presentations, design summary, user approval hard gate |
| 1: Framework Detection | Detection algorithm, hypothetical vitest result |
| 2: Work Decomposition | 3 units, dependency graph, batch plan, user confirmation |
| 3: State Initialization | State file creation, gitignore, session log |
| 4: Agent Orchestration | Full pipeline for all 3 units across 2 batches, with all 5 agent types and both RED and GREEN verification |
| 5: Final Review | Full test suite, pristine output, holistic review, cross-unit integration, anti-rationalization |
| 6: Report Generation | tdd-report.md and tdd-session.jsonl |
| 7: Cleanup | Agent shutdown, spec-contract deletion, state update, next steps |
