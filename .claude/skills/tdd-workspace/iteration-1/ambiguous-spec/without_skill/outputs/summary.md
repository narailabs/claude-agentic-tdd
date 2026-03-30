# Eval 5: ambiguous-spec — Baseline Summary

## Eval
`/tdd I need something that handles payments. like credit cards and stuff. also refunds maybe? idk the details yet`

## Baseline Behavior (Without Skill)

| Assertion Point | Present? | Notes |
|----------------|----------|-------|
| Agent teams | NO | Single-session execution |
| Tests written first | NO | Implementation-first |
| RED verification | NO | No RED phase |
| GREEN verification | NO | No tamper detection |
| Information barriers | NO | Same session writes everything |
| Formal reviews | NO | No adversarial or spec compliance review |
| Design gate | NO | This is THE critical gap — ambiguous spec proceeds without formal design |
| Targeted questions (1 at a time) | NO | Likely a questionnaire dump or assumptions |
| Architectural trade-offs | NO | No explicit options with pros/cons |
| Design summary document | NO | No formal record of decisions |
| Hard gate (approval before code) | NO | Coding starts after informal Q&A or assumptions |
| Out-of-scope definition | NO | Scope boundaries never formalized |
| Task classification | NO | No decomposition of payment vs. refund work units |
| Eager dispatch | NO | Sequential single-session |
| Model/effort by complexity | NO | Uniform handling |
| State management / resume | NO | No .tdd-state.json |

## Key Gaps

1. **Design gate is the critical gap**: The spec explicitly says "idk the details yet." This demands structured design refinement before any code is written. Without Phase 0, Claude will make implicit decisions about payment processor integration, refund policies, currency handling, and error handling — all without user approval.
2. **Scope ambiguity unresolved**: "refunds maybe?" could mean full refunds, partial refunds, time-limited refunds, or no refunds. Without a hard gate, Claude guesses.
3. **No trade-off presentation**: Payment systems have real architectural choices (real processor vs. abstraction layer, synchronous vs. async, idempotency strategy). None presented.
4. **Informal requirements silently resolved**: Claude interprets "credit cards and stuff" and makes decisions the user didn't explicitly approve.

## Expected Output Quality
- Architecture: likely defaults to a common pattern (Stripe-like) without confirming user intent
- Scope: either over-built (full Stripe integration) or under-built (simple recorder)
- Refunds: either included with assumed policy or omitted due to "maybe?"
- Tests: shaped by implementation assumptions, not by confirmed requirements
- Edge cases: likely missing (partial refunds, currency conversion, idempotency, race conditions)
