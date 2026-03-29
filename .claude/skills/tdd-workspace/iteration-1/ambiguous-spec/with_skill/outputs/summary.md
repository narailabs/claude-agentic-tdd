# Summary: TDD Skill Handling of Ambiguous Payment Spec

## Prompt

```
/tdd I need something that handles payments. like credit cards and stuff. also refunds maybe? idk the details yet
```

## Key Findings

### Phase 0 (Design Gate) Triggers: YES

The design gate fires on **all three** automatic trigger conditions:

1. **3+ distinct features**: payments, credit cards, refunds
2. **External integrations**: payment processing inherently requires a gateway (Stripe, Braintree, etc.)
3. **Ambiguous spec**: "idk the details yet", "maybe?", "like... and stuff" -- the spec is maximally vague about data flow, error handling, and scope

No override flags (`--skip-design`) were passed.

### Clarifying Questions: One at a Time

The skill asks 1-3 targeted questions sequentially, waiting for the user's answer before asking the next. It does NOT dump all questions at once. Each answer informs the next question. Example sequence:

1. What types of payment operations? (charge, subscribe, pre-auth?)
2. Which payment gateway? (Stripe, mock, abstraction layer?)
3. How should failures be handled? (retry, structured error, etc.)

### Design Approaches with Trade-offs: YES

After gathering answers, the skill presents 2-3 concrete architectural options with pros/cons (e.g., thin Stripe wrapper vs. gateway abstraction vs. repository pattern) and waits for the user to choose.

### Waits for Approval Before Decomposing: YES (HARD GATE)

The skill presents a design summary (components, data flow, key decisions, out of scope) and asks: "Proceed with this design? [confirm/modify/cancel]". This is a **hard gate** -- no decomposition (Phase 2) happens until the user explicitly confirms. If the user modifies, the skill iterates. If cancelled, everything stops.

### Anti-Rationalization Resistance: Strong

The skill resists "just start coding" through multiple reinforcing mechanisms:

- **Mechanical trigger conditions**: Phase 0 evaluation is rule-based, not judgment-based. An agent cannot rationalize skipping it.
- **Anti-rationalization table**: Explicit rebuttals for 10 common shortcuts ("I already know how to implement this", "this is too simple for tests", "I'll write tests after", "just this once").
- **Red flag rules**: If implementation code appears before tests, it is deleted unconditionally ("no exceptions").
- **Information barrier**: Even after design approval, the Code Writer cannot see the Test Writer's reasoning -- preventing implementation-first thinking from leaking through.
- **Verification anti-rationalization**: In Phase 5, claims like "should work" or "I'm confident" are rejected -- only actual test output counts as evidence.

## Conclusion

The TDD skill handles this ambiguous spec exactly as designed: it refuses to proceed with implementation until the requirements are clarified, a design is proposed and approved, and work is decomposed into testable units. The user's "idk the details yet" is treated as a signal to engage in design refinement, not as permission to guess.
