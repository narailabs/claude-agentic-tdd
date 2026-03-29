# Baseline Trace: Ambiguous Payment Spec (Without TDD Skill)

## Eval Metadata
- **Eval ID**: 5
- **Eval Name**: ambiguous-spec
- **Prompt**: `/tdd I need something that handles payments. like credit cards and stuff. also refunds maybe? idk the details yet`

## What Claude Code Would Do Without the TDD Skill

### Step 0: Slash Command Handling

The `/tdd` prefix would be unrecognized without the skill installed. Claude Code would
either treat it as a failed slash command (showing an error like "Unknown command: /tdd")
or strip the prefix and interpret the rest as a natural language request:

> "I need something that handles payments. like credit cards and stuff. also refunds maybe? idk the details yet"

For this trace, we assume the latter -- Claude treats it as a general coding request.

### Step 1: Claude's Likely First Response

Claude Code would almost certainly **start coding immediately** or at best ask a
small batch of clarifying questions before diving in. The typical behavior pattern is:

**Most likely path (70-80% probability): Jump straight to implementation.**

Claude would interpret the vague request, make assumptions, and produce something like:

1. Pick a language/framework (likely TypeScript/Node.js or Python based on project context,
   or its own preference if no project context exists).
2. Pick a payment provider (almost certainly Stripe, as it dominates training data).
3. Generate a full payment service module with:
   - A `PaymentService` class or set of functions
   - `processPayment(amount, cardToken)` method
   - `refundPayment(paymentId)` method
   - Maybe a `PaymentIntent` or `Charge` abstraction
4. Possibly generate some tests alongside the code (but not test-first).

**Less likely path (20-30% probability): Ask some questions first.**

If Claude does pause to ask questions, it would typically dump them all at once:

> "Before I start, let me ask a few questions:
> 1. What language/framework are you using?
> 2. Do you want to integrate with Stripe, PayPal, or another provider?
> 3. What types of payments -- one-time, subscriptions, or both?
> 4. Do you need PCI compliance handling?
> 5. What database are you using?
> 6. Do you want a REST API or just a service layer?
> 7. What about error handling for declined cards?
> 8. Do you need webhooks for async payment events?
> 9. Should refunds be full or partial?
> 10. What currency support do you need?"

This is the "question dump" anti-pattern -- 10 questions at once rather than a structured,
progressive clarification flow.

### Step 2: Assumed Implementation (Most Likely Path)

Claude would produce files roughly like these:

```
src/
  payment/
    PaymentService.ts      (or .py)
    types.ts
    errors.ts
  __tests__/
    PaymentService.test.ts
```

The code would:
- **Assume Stripe** as the payment provider without asking
- **Assume a specific architecture** (service class pattern) without discussing alternatives
- **Assume USD** as the currency
- **Include refunds** since the user mentioned them, but with Claude's own interpretation of scope
- **Generate tests after or alongside code**, not test-first
- **Not verify test RED state** -- tests would be written to pass the already-written code

### Step 3: What Would NOT Happen

The following behaviors, which the TDD skill enforces, would be absent:

1. **No design gate**: Claude would not produce a formal design summary and wait for
   user approval before proceeding. There is no hard gate.

2. **No progressive clarification**: Questions (if asked at all) would come as a single
   batch, not one-at-a-time in a structured interview flow.

3. **No trade-off analysis**: Claude would not present options like "Stripe vs. custom
   processor" or "sync vs. async payment processing" with trade-offs for each.

4. **No test-first ordering**: Code and tests would be written together or code-first,
   not in a strict RED-GREEN-REFACTOR cycle.

5. **No work unit decomposition**: The entire payment system would be implemented in one
   pass, not broken into small, independently testable units.

6. **No anti-cheat verification**: Tests would not be verified to fail before implementation
   (RED phase), so there is no guarantee they actually test the right behavior.

7. **No information barrier**: The same Claude context writes both tests and implementation,
   so tests tend to mirror the implementation rather than specify behavior independently.

8. **No spec approval checkpoint**: Claude would not wait for the user to say
   "yes, this design looks right" before writing code.

### Step 4: End State

Claude would deliver a working (or partially working) payment module and say something like:

> "I've created a payment service that handles credit card payments via Stripe and supports
> full refunds. Here's what I built: [file listing]. Let me know if you want me to adjust
> anything!"

The user would then need to manually review whether the assumptions were correct, whether
the architecture fits their needs, and whether the tests actually provide meaningful coverage.

## Comparison Against Eval Assertions

| Assertion | Without Skill |
|-----------|--------------|
| Triggers design gate (Phase 0) due to ambiguity | FAIL -- No design gate exists |
| Asks clarifying questions without assuming technologies | FAIL -- Either skips questions or dumps 10 at once; almost always assumes Stripe |
| Asks questions one at a time | FAIL -- Either no questions or batch dump |
| Does NOT start coding before clarifying spec | FAIL -- Jumps to code in most cases |
| Proposes design approaches with trade-offs | FAIL -- Picks one approach silently |
| Waits for user approval before decomposing into work units | FAIL -- No approval checkpoint, no work unit decomposition |

**Assertions passed: 0/6**

## Key Behavioral Gaps

1. **No ambiguity detection**: Vanilla Claude does not recognize "idk the details yet" as a
   signal to slow down and clarify. It treats vagueness as an invitation to fill in defaults.

2. **No structured design phase**: There is no concept of a design document that must be
   approved before implementation begins. The transition from "understand requirements" to
   "write code" is implicit and immediate.

3. **No progressive questioning**: The one-at-a-time questioning pattern that prevents
   overwhelming the user is absent. Claude either asks nothing or asks everything at once.

4. **Assumption-heavy**: Without enforcement, Claude defaults to popular choices from its
   training data (Stripe, TypeScript, REST API) without surfacing these as decisions the
   user should make.

5. **No hard gates**: Even if Claude does ask a question, there is nothing preventing it
   from continuing to code if the user gives a partial or ambiguous answer. The TDD skill's
   Phase 0 is a blocking gate -- vanilla Claude has no equivalent.
