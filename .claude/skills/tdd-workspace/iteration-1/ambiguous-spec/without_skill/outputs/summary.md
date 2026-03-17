# Summary: Default Claude Code on Ambiguous Payment Spec

## Prompt

```
/tdd I need something that handles payments. like credit cards and stuff. also refunds maybe? idk the details yet
```

## Verdict

**Default Claude Code would start coding immediately with self-made assumptions.** It would not ask meaningful clarifying questions despite the user explicitly stating "idk the details yet."

## Key Findings

1. **No clarification phase.** The vague spec ("payments... credit cards and stuff... refunds maybe?") would be silently resolved by Claude making its own architectural and functional decisions. The user's uncertainty is treated as permission to decide, not as a signal to ask.

2. **No design proposal.** There would be no architecture document, no options presented, no approval checkpoint. The user would see finished code, not a plan.

3. **Tests are an afterthought (if present at all).** Any tests written would come after implementation and would be shaped to pass against existing code -- the opposite of TDD. No RED phase verification occurs.

4. **Monolithic implementation.** The entire system would be built in a single pass rather than decomposed into small, independently testable work units.

5. **Silent assumptions span every dimension:** language choice, framework, payment gateway, API design, data model, refund policy, error handling, and scope.

## Risk Profile

- **Scope mismatch:** High. User gets whatever Claude decides "payment system" means.
- **Rework likelihood:** High. Assumptions will diverge from actual requirements.
- **Test quality:** Low. Tests validate what was built, not what was wanted.
- **Security posture:** Unexamined. No explicit PCI or validation consideration.

## Baseline Value

This trace establishes the "no-skill" baseline for the ambiguous-spec test scenario. The TDD skill is expected to improve outcomes by: forcing a design gate (Phase 0), decomposing work into testable units, writing tests before code, and surfacing assumptions for user review rather than silently resolving them.
