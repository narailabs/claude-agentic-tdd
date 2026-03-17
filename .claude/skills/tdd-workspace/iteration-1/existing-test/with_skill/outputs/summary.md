# Summary: TDD Skill Trace for User-Provided Test Mode

## Entry Point Detection

The command `/tdd implement against src/__tests__/calculator.test.ts` triggers **Mode 3: User-Provided Test**. The phrase "implement against" combined with a test file path matches the third entry point rule in SKILL.md. This mode fundamentally changes which phases run.

## Phases Skipped

1. **Phase 0 (Design Gate)**: Explicitly skipped. SKILL.md lists "User-provided failing test (entry point mode 3)" as a skip condition. No clarifying questions, no design document.

2. **Phase 4a (Test Writer)**: Skipped entirely. The user's test file replaces the Test Writer's output. No Test Writer agent is spawned. The state file records `testWriter.status: "completed"` with zero attempts.

## Phases That Still Run

1. **Phase 1 (Framework Detection)**: Runs normally. Must detect the test runner (Jest/Vitest) to know how to execute tests.

2. **Phase 2 (Work Decomposition)**: Simplified to a single work unit derived from the test file. The lead generates a `spec-contract-calculator.md` by analyzing the test file's describe blocks, test names, and assertions -- a task normally performed by the Test Writer.

3. **Phase 3 (State Init)**: Runs normally. Creates `.tdd-state.json` with `entryPoint: "user-provided-test"`.

4. **Phase 4b (RED Verification)**: Runs with all 5 checks (tests exist, tests fail, correct failure type, assertion density, behavior-over-implementation). The key difference: failures cannot be fixed by re-prompting a Test Writer. Instead, violations are escalated to the user with instructions to fix their test file.

5. **Phase 4c (Code Writer)**: Runs normally. Spawned with the standard prompt template.

6. **Phase 4d (GREEN Verification)**: Runs with all 4 checks (checksum comparison, skip marker scan, test execution, hardcoded return heuristic).

7. **Phase 4e (Spec Compliance Review)**: Runs, using the lead-generated spec-contract.

8. **Phase 4f (Adversarial Review)**: Runs normally. Reviews both the user's tests and the generated implementation.

9. **Phases 5-7 (Final Review, Report, Cleanup)**: Run normally.

## Information Barrier Without a Test Writer

The information barrier is inherently satisfied in Mode 3. Its purpose is to prevent the Code Writer from seeing the Test Writer's reasoning/prompt. When there is no Test Writer, there is no reasoning to leak. The Code Writer still receives only:
- Test file contents (read from disk)
- Spec-contract file (lead-generated, read from disk)
- Framework info and project conventions

The lead's verification checklist still applies: confirm the prompt contains no references to test authoring rationale.

## Checksum Verification

Checksum verification is **fully active** and **unchanged** from normal mode:

1. After RED verification passes, SHA-256 of `src/__tests__/calculator.test.ts` is recorded.
2. After Code Writer completes, SHA-256 is recomputed and compared.
3. Any mismatch triggers an anti-cheat violation: Code Writer changes are discarded, and it is re-prompted.

The mechanism is agnostic to test authorship. It protects the user's tests with the same rigor as agent-written tests.

## Key Behavioral Differences in Mode 3

| Aspect | Normal Mode | Mode 3 |
|--------|-------------|--------|
| RED verification failures | Re-prompt Test Writer | Escalate to user |
| Spec-contract authorship | Test Writer generates it | Lead generates it from test analysis |
| Adversarial review revision loop | Test Writer + Code Writer re-do | Lead/user fixes tests + Code Writer re-does |
| Agents spawned | 4 (Test Writer, Code Writer, 2 reviewers) | 3 (Code Writer, 2 reviewers) |
| Design gate | Conditional | Always skipped |
