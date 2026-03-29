# Summary: Ambiguous Payment Spec Trace

## Spec

> I need something that handles payments. like credit cards and stuff. also refunds maybe? idk the details yet

## Design Gate Trigger Analysis

Three of four trigger conditions fired:

| Condition | Fired | Evidence |
|-----------|-------|----------|
| 3+ features/components | YES | payments, credit cards, refunds = 3 |
| External integrations | YES | credit card processing requires a payment gateway |
| Ambiguous data flow/ownership/error handling | YES | "like ... and stuff", "maybe?", "idk the details yet" |
| `--design` flag | NO | not passed |

No skip conditions applied (Mode 1, no `--skip-design`). Design gate was mandatory.

## Design Gate Execution (Phase 0)

The design gate followed the three-step Design Refinement Process exactly:

### Step 1: Clarifying Questions (asked one at a time)

1. Payment provider -- user chose Stripe
2. Refund scope -- user chose full + partial, API-driven, no approval
3. Data tracking depth -- user chose full details (amount, currency, customer, timestamps)

### Step 2: Trade-Off Proposal (MANDATORY -- separate formal step)

Presented three options for the key architectural decision of payment data persistence:

- **Option A: Stripe as source of truth (thin wrapper)** -- simplest, but every query hits Stripe, no offline resilience
- **Option B: Local record store with Stripe sync** -- fast local queries and reporting, but dual-write complexity
- **Option C: Event-sourced payment log** -- full audit trail, but overkill for v1

Each option had structured pros/cons. Recommendation provided (Option B). User selected Option B.

This was a distinct, formal step -- not options embedded in a question, not skipped. The skill states: "Every spec complex enough to trigger the design gate has at least one meaningful trade-off. [...] do not skip it entirely."

### Step 3: Design Summary

Presented structured design document with:
- Components: PaymentService, PaymentRecord, RefundService, StripeAdapter
- Data flow: charge and refund lifecycle described step by step
- Key decisions: Stripe, local records (Option B), full+partial refunds
- Out of scope: webhooks, multi-currency, PCI, subscriptions

### Step 4: User Approval (HARD GATE)

User confirmed. Design stored in state file. No decomposition until this gate passes.

## Downstream Impact

The design gate produced:
- **4 work units** with precise spec-contracts (stripe-adapter, payment-record, payment-service, refund-service)
- **Clear dependency graph**: Batch 1 (stripe-adapter, payment-record in parallel) then Batch 2 (payment-service, refund-service in parallel)
- **Model assignments**: opus for test writers and reviewers, sonnet for code writers (architecture/judgment complexity)

Without the design gate, the skill would have had to guess at every detail the user left ambiguous, producing vague spec-contracts and unreliable tests.

## Three User Checkpoints Before Any Code

1. **Clarifying questions** (3 rounds) -- resolve ambiguity
2. **Trade-off proposal** (formal options with pros/cons) -- user picks architecture
3. **Work plan confirmation** (decomposition) -- user approves units and execution plan

The HARD GATE prevented any code generation until all three were approved.

## Full Pipeline Per Unit

Each of the 4 work units goes through:
1. Test Writer (opus) -- writes failing tests + spec-contract artifact
2. RED Verification -- tests must fail, correct failure type, assertion density, behavior-over-implementation checks, checksums recorded
3. Code Writer (sonnet) -- receives test file + spec-contract from disk only (information barrier)
4. GREEN Verification -- checksum comparison, skip marker check, all tests pass
5. Spec Compliance Review -- requirement matrix against spec-contract
6. Adversarial Review -- edge cases, cheating detection, 5 anti-patterns check
7. Code Quality Review -- structure, naming, discipline, YAGNI

Then Phase 5 (full integration test suite), Phase 6 (report), Phase 7 (cleanup).
