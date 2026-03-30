# Eval 5: Ambiguous Spec — Trace

**Command**: `/tdd I need something that handles payments. like credit cards and stuff. also refunds maybe? idk the details yet`

---

## Step 1: Skill Activation and Prerequisite Checks

1. Skill triggers on `/tdd` command.
2. Check `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` — confirmed.
3. Check git repo — confirmed.

## Step 2: Argument Parsing

- Spec text: "I need something that handles payments. like credit cards and stuff. also refunds maybe? idk the details yet"
- No flags detected.

## Step 3: Configuration Loading

- Apply defaults. maxParallelPairs=4, parallelMode="eager", modelStrategy="auto", effortLevel="high".

## Step 4: Session Model/Effort Detection

- Detect session model/effort. Assume opus/high (complex spec warrants capable model).
- Ceiling: opus/high.

## Step 5: Entry Point Detection

- Mode 1: Natural language spec.

## Step 6: Phase 0 — Design Gate

### Trigger Evaluation

- Spec mentions 2+ distinct features: payments, refunds. Close to 3 with credit card handling as a sub-feature.
- Spec involves external integrations: payment processors, credit card APIs. **YES**.
- Spec is **highly ambiguous**: "like credit cards and stuff", "refunds maybe?", "idk the details yet". **YES — multiple ambiguities**.
- No `--skip-design` flag.

**Decision**: RUN the design gate. Multiple trigger conditions met. This is exactly the kind of spec the design gate exists for.

### Step 0a: Clarifying Questions (one at a time)

**Q1**: "What payment methods need to be supported — just credit cards, or also debit cards, bank transfers, or digital wallets?"
- User answers: "Just credit cards for now. Visa and Mastercard."

**Q2**: "Should this integrate with a real payment gateway (Stripe, Square, etc.) or should it be a self-contained module that processes payment data locally?"
- User answers: "Use Stripe. We already have an account."

**Q3**: "For refunds — should the system support full refunds only, or also partial refunds? Is there a time limit for refund requests?"
- User answers: "Both full and partial. No time limit for now."

### Step 0b: Propose Approaches (MANDATORY trade-off proposals)

The skill states: "Every spec complex enough to trigger the design gate has at least one meaningful trade-off." This spec has at least two:

**Trade-off 1: Payment Processing Architecture**
- Option A: Direct Stripe API integration — call Stripe from the payment module directly. Simple, fewer moving parts, but tightly couples business logic to Stripe.
- Option B: Payment gateway abstraction — define a PaymentGateway interface, implement StripeGateway. More code now, but can swap providers later.
- Option C: Queue-based processing — enqueue payment intents, process asynchronously. Most resilient, but overkill for most use cases and adds complexity.

**Trade-off 2: Refund Handling**
- Option A: Synchronous refunds — call Stripe refund API immediately when requested. Simpler, but blocks on API response.
- Option B: Refund request queue — create a refund request, process asynchronously. Better for audit trails and retry logic, but more complex.

User selects: Option A for payment processing (direct Stripe), Option A for refunds (synchronous).

### Step 0c: Design Summary

```
## Design Summary

### Components
- PaymentService: charge credit cards via Stripe API, handle payment intents
- RefundService: process full and partial refunds via Stripe refund API
- PaymentRecord: data model for storing payment history (amount, status, stripe ID, timestamps)

### Data Flow
Charge request -> validate card details -> create Stripe PaymentIntent -> confirm -> store record -> return result
Refund request -> validate payment exists -> create Stripe Refund (full or partial) -> update record -> return result

### Key Decisions
- Direct Stripe API integration (no abstraction layer)
- Synchronous refund processing
- Support Visa and Mastercard only (validation at input)
- Full and partial refunds supported, no time limit
- Payment records stored locally for history/audit

### Out of Scope
- Non-credit-card payment methods
- Subscription/recurring billing
- Webhooks for async Stripe events
- PCI compliance (Stripe handles tokenization)
- Currency conversion
```

### Step 0d: User Approval

"Proceed with this design? [confirm/modify/cancel]"

User confirms. Design summary stored in state under `designSummary`.

**HARD GATE passed.**

## Step 7: Phase 1 — Framework Detection

- Auto-detect: vitest, TypeScript.

## Step 8: Phase 2 — Work Decomposition

### Work Units

**Unit 1: payment-service [code]**
- spec-contract: Charge credit cards via Stripe. Accept card token, amount, currency. Create PaymentIntent, confirm, return payment record with stripe ID, amount, status, timestamps. Validate card brand (Visa/Mastercard only). Handle Stripe errors (declined, insufficient funds, network).
- dependsOn: `[]`
- testFiles: `src/__tests__/payment-service.test.ts`
- implFiles: `src/payment-service.ts`

**Unit 2: refund-service [code]**
- spec-contract: Process full and partial refunds via Stripe. Accept payment ID and optional amount (partial). Look up payment record, call Stripe Refund API, update payment record status. Handle: already refunded, refund exceeds original, payment not found.
- dependsOn: `[payment-service]` (needs payment records/lookup)
- testFiles: `src/__tests__/refund-service.test.ts`
- implFiles: `src/refund-service.ts`

### Complexity Assessment

| Unit | Complexity | Signals |
|------|-----------|---------|
| payment-service | Architecture | External API integration (Stripe), error handling complexity, security concerns |
| refund-service | Architecture | External API, depends on payment-service, partial refund math |

### Model Assignment (ceiling opus/high)

| Role | payment-service | refund-service |
|------|----------------|----------------|
| Test Writer | opus/high | opus/high |
| Code Writer | sonnet/high | sonnet/high |
| Spec Compliance | opus/high | opus/high |
| Adversarial | opus/high | opus/high |
| Code Quality | sonnet/high | sonnet/high |

### User Confirmation

```
## TDD Work Plan

Framework: vitest (auto-detected)
Mode: natural-language-spec
Work units: 2

### Unit 1: payment-service [code]
Spec: Charge credit cards via Stripe API, validate card brand, handle errors
Files: src/__tests__/payment-service.test.ts -> src/payment-service.ts
Dependencies: none
Complexity: Architecture (opus/high for Test Writer, reviewers)

### Unit 2: refund-service [code]
Spec: Full and partial refunds via Stripe, validate refund amounts, update records
Files: src/__tests__/refund-service.test.ts -> src/refund-service.ts
Dependencies: [payment-service]
Complexity: Architecture (opus/high for Test Writer, reviewers)

Execution plan (eager dispatch, max 4 concurrent):
  Ready immediately: payment-service
  After payment-service: refund-service

Proceed? [confirm/modify/cancel]
```

User confirms.

## Step 9: Phase 3 — State Initialization

- Create state file with design summary.
- Add to gitignore. Initialize session log.

## Step 10: Phase 4 — Agent Team Orchestration

### Ready Queue: `[payment-service]`

---

### UNIT: payment-service (Slot 1)

#### Step 4a: Spawn Test Writer

- Model: opus/high (Architecture).
- Includes design summary (direct Stripe, Visa/MC only, payment records).
- Test Writer writes tests:
  - Successfully charges a valid Visa card via Stripe
  - Successfully charges a valid Mastercard
  - Rejects non-Visa/non-Mastercard brands
  - Returns payment record with correct fields (id, amount, status, stripeId, timestamps)
  - Handles Stripe "card declined" error
  - Handles Stripe "insufficient funds" error
  - Handles Stripe network/API errors
  - Validates amount is positive
  - Validates currency is supported
  - Edge: zero amount, negative amount, very large amount
- **Mocking concern**: Tests will need to mock the Stripe API. The Test Writer should mock at the Stripe SDK boundary only (not internal functions). Mock depth should be reasonable.
- Creates `spec-contract-payment-service.md`.
- Reports **DONE**.

#### Step 4b: RED Verification

1. Tests exist — PASS.
2. Tests fail — "Cannot find module" for payment-service. PASS.
3. Correct failure type — import errors. PASS.
4. Assertion density — multiple assertions per test. PASS.
5. Behavior-over-implementation — check mock depth. Stripe mock is acceptable (external dependency), but count total mocks vs test functions. If mock count <= 2x tests, PASS. (Stripe mock is likely 1 mock used across tests.)
6. Record checksums.

#### Step 4c: Spawn Code Writer

- Model: sonnet/high.
- Information barrier: receives only test file and spec-contract from disk.
- Implements payment-service with Stripe SDK calls, card brand validation, error mapping.
- Reports **DONE**.

#### Step 4d: GREEN Verification

- Checksums match, no skip markers, all tests pass. PASS.

#### Step 4e: Spec Compliance Review

- Model: opus/high.
- Reviewer checks against design summary: direct Stripe integration (not abstracted), Visa/MC validation, all error cases, payment record fields.
- **Verdict: COMPLIANT**.

#### Step 4f: Adversarial Review

- Model: opus/high.
- Deep review: Stripe mock fidelity (does mock replicate Stripe error shapes?), anti-pattern #3 (mocking without understanding side effects), are Stripe API keys handled securely, does implementation handle partial Stripe responses.
- **Verdict: PASS** (possibly with recommendations about error detail handling).

#### Step 4g: Code Quality Review

- Model: sonnet/high.
- **Assessment: Approved**.

**payment-service COMPLETED.**

### Eager Dispatch: After payment-service

- refund-service depends on [payment-service] — now satisfied.
- Ready queue: `[refund-service]`. Dispatch.

---

### UNIT: refund-service (Slot 1)

#### Step 4a: Spawn Test Writer

- Model: opus/high.
- Includes design summary.
- Tests: full refund, partial refund, refund exceeds original (error), already refunded (error), payment not found (error), updates payment record status, edge cases (refund exactly original amount as "full", refund $0.01).
- Creates `spec-contract-refund-service.md`.
- Reports **DONE**.

#### Steps 4b-4g: Standard pipeline

- RED: tests fail (import errors). PASS.
- Code Writer (sonnet/high): implements refund logic with Stripe Refund API calls.
- GREEN: all pass. PASS.
- Spec compliance (opus/high): all requirements met. COMPLIANT.
- Adversarial (opus/high): checks partial refund math, edge cases, mock fidelity. PASS.
- Code quality (sonnet/high): Approved.

**refund-service COMPLETED.**

---

## Step 11: Phase 5 — Final Review

1. Run full test suite. All pass.
2. Cross-unit check: refund-service correctly uses payment-service's payment record lookup.
3. Integration: verify that a charge followed by a refund works end-to-end (may need integration test).

## Step 12: Phase 6 — Report Generation

Generate report: 2/2 completed, design gate ran, all Architecture complexity, opus/high for test writers and reviewers.

## Step 13: Phase 7 — Cleanup

Standard cleanup. Suggest: "Consider adding integration tests with Stripe test mode. Run full suite, then commit."
