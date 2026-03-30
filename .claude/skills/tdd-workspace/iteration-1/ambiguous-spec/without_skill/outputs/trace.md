# Eval 5: ambiguous-spec — Baseline Trace (No TDD Skill)

## Input
`/tdd I need something that handles payments. like credit cards and stuff. also refunds maybe? idk the details yet`

## What Default Claude Code Would Do

### Step 1: Interpret the command
Without the TDD skill, Claude sees a vague, informal request about payments. The spec is deliberately ambiguous:
- "something that handles payments" — what kind? processing? recording? displaying?
- "like credit cards and stuff" — also debit? bank transfers? wallets?
- "also refunds maybe?" — partial refunds? full only? time-limited?
- "idk the details yet" — the user explicitly signals the spec is incomplete

### Step 2: How Claude handles ambiguity
Default Claude Code has two likely behaviors:

**Path A (more likely)**: Ask some clarifying questions, then proceed based on assumptions. The questions would be informal, not structured, and Claude might ask too many at once (a "questionnaire dump") or too few.

**Path B**: Make assumptions and start coding immediately, documenting assumptions in comments or a brief note.

Neither path involves a structured design gate with:
- Targeted 1-at-a-time questions
- Explicit architectural trade-offs with pros/cons
- A formal design summary document
- A hard gate requiring user approval before implementation

### Step 3: Likely implementation approach

```
1. Ask 2-5 clarifying questions (probably all at once)
2. User answers
3. Write implementation code for payment handling
4. Write some tests
5. Run tests
6. Report done
```

### Step 4: The design gate gap
The TDD skill's Phase 0 (Design Gate) would trigger here because:
- The spec mentions multiple features (payments, refunds)
- It involves external integrations (payment processors)
- The spec is explicitly ambiguous ("idk the details yet")

The design gate would:
1. Ask 1-3 targeted questions, one at a time
2. Present 2-3 architectural options with trade-offs
3. Produce a formal design summary
4. Require user approval before ANY code is written

None of this happens in baseline.

## Detailed Behavioral Analysis

### Would Claude use agent teams?
**NO.** Single-session execution.

### Would Claude write tests first?
**NO.** Implementation-first (or possibly code and tests interleaved, but not tests-first with RED verification).

### Would Claude verify RED?
**NO.** No RED verification.

### Would Claude verify GREEN?
**NO.** No GREEN verification / tamper detection.

### Would Claude use information barriers?
**NO.** Same session does everything.

### Would Claude do formal reviews?
**NO.** No adversarial review, no spec compliance review. For an ambiguous spec, spec compliance review is especially valuable — it catches requirements that were implied but not explicitly tested.

### Would Claude run a proper design gate?
**NO.** This is the critical gap for this eval. The spec is deliberately vague and explicitly incomplete ("idk the details yet"). The TDD skill would:

1. **Detect ambiguity** and trigger the design gate automatically
2. **Ask targeted questions one at a time**:
   - "Should this integrate with a real payment processor (Stripe, etc.) or be an abstraction layer?"
   - "Should refunds be partial (any amount up to original) or full-only?"
   - "What currencies need to be supported?"
3. **Present architectural options**:
   - "Option A: Stripe SDK integration (real processing, needs API keys)"
   - "Option B: Payment abstraction layer with pluggable providers"
   - "Option C: In-memory ledger for recording transactions (no real processing)"
4. **Produce a design summary** with components, data flow, key decisions, and scope boundaries
5. **Hard gate**: No code until design is approved

Default Claude would likely:
- Ask several questions in a single dump
- Not present explicit architectural trade-offs
- Start coding once it has "enough" context (no hard gate)
- Make implicit decisions about scope, architecture, and edge cases

### Would Claude handle the informal language properly?
**PARTIALLY.** Claude is good at interpreting informal language, but without the structured design gate, it would make assumptions about what "payments" means (likely defaulting to Stripe integration or a similar common pattern) without explicitly confirming with the user.

### Would Claude scope correctly?
**UNLIKELY.** Without a formal "Out of Scope" section in a design summary, Claude might:
- Build more than needed (full Stripe integration when the user wanted a simple ledger)
- Build less than needed (simple recording when the user wanted actual processing)
- Miss the refund requirement (it was tentative: "maybe?")

### Would Claude decompose the ambiguous spec?
**NO.** Without Phase 2 (Work Decomposition), Claude would not break this into independent work units. A payment system naturally decomposes into:
- Payment processing (create charge)
- Payment recording (store transaction)
- Refund processing
- Refund policy enforcement
- Payment status tracking

These would all be handled in one monolithic pass.

## Anti-Patterns Present in Baseline

1. **No design gate**: Ambiguous spec coded without formal design review
2. **Questionnaire dump**: Likely asks multiple questions at once instead of 1-at-a-time
3. **No architectural trade-offs**: Options not presented with pros/cons
4. **No design summary document**: No formal record of design decisions
5. **No hard gate**: Coding starts without explicit user approval of design
6. **Implicit scoping**: "Out of scope" never defined; scope creep likely
7. **No spec-contracts**: Requirements not formalized into machine-readable artifacts
8. **Implementation-first**: Tests shaped by assumptions, not by confirmed spec
9. **No formal review**: Spec compliance review would catch missing requirements
10. **Informal requirement handling**: "maybe?" treated as either yes or no without confirmation
