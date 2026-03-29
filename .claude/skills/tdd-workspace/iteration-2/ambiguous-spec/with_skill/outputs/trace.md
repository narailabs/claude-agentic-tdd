# Execution Trace: Ambiguous Spec with Design Gate

## Task Prompt

```
/tdd I need something that handles payments. like credit cards and stuff. also refunds maybe? idk the details yet
```

## Skill Loading

The `/tdd` command triggers the TDD skill (`SKILL.md`). The skill begins execution.

---

## Step 1: Argument Parsing

The skill parses `$ARGUMENTS`:

- **Specification text**: "I need something that handles payments. like credit cards and stuff. also refunds maybe? idk the details yet"
- **Flags**: none (`--skip-failed`, `--config`, `--design`, `--skip-design` are all absent)

No explicit `--skip-design` flag is present, so the design gate remains eligible.

---

## Step 2: Prerequisites Check

1. **Agent teams**: Check that `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set to `1`. (Assumed set for this trace.)
2. **Git repository**: Check if the project is a git repo. (Assumed yes for this trace.)

---

## Step 3: Configuration Loading

1. Check for `.tdd.config.json` at project root -- not found.
2. Check project `CLAUDE.md` for `## TDD Configuration` section -- not found.
3. Apply defaults:
   ```
   antiCheat.minAssertionsPerTest: 1
   antiCheat.maxRetries: 3
   antiCheat.maxMockDepth: 2
   antiCheat.flagPrivateMethodTests: true
   execution.maxParallelPairs: 3
   execution.skipFailedAfterRetries: false
   execution.modelStrategy: "auto"
   reporting.generateReport: true
   reporting.generateSessionLog: true
   ```

---

## Step 4: Entry Point Detection

The input is a natural language description. This is **Mode 1: Natural language spec**.

---

## Step 5: Phase 0 -- Design Gate Evaluation

### Trigger Condition Analysis

The skill evaluates whether the design gate should trigger. The spec is checked against these conditions (any one triggers the gate):

| Condition | Evaluation | Result |
|-----------|-----------|--------|
| Spec mentions 3+ distinct features or components | "payments", "credit cards", "refunds" -- 3 distinct features | **YES** |
| Spec involves external integrations (APIs, databases, auth providers) | Payment processing inherently involves external payment processors, card networks, possibly databases | **YES** |
| Spec is ambiguous about data flow, ownership, or error handling | "like credit cards and stuff", "also refunds maybe?", "idk the details yet" -- extremely ambiguous | **YES** |
| User passes `--design` flag | Not passed | NO |

**Result: ALL THREE positive conditions are met. The design gate TRIGGERS.**

### Design Refinement Process

The skill does NOT jump to decomposition. It does NOT assume any specific technologies (Stripe, PayPal, etc.). It does NOT dump a list of questions. It asks clarifying questions **one at a time**.

---

#### Clarifying Question 1

> **Skill output to user:**
>
> Before I can break this down into testable work units, I need to clarify some design decisions. Let me ask one at a time.
>
> What types of payments do you need to support? For example: one-time credit card charges only, or also recurring subscriptions, saved payment methods, or other payment types like bank transfers?

**User responds** (simulated): "Just one-time credit card charges for now. No subscriptions."

#### Clarifying Question 2

> **Skill output to user:**
>
> Got it -- one-time credit card charges only, no subscriptions or saved methods.
>
> For refunds: should the system support full refunds only, or also partial refunds (refunding part of a charge)? And should there be any time limit on when a refund can be issued?

**User responds** (simulated): "Full and partial refunds. No time limit for now."

#### Clarifying Question 3

> **Skill output to user:**
>
> Full and partial refunds with no time limit.
>
> How should this system interact with an actual payment processor? Should it define an abstract interface that any processor could implement, or do you have a specific provider in mind? This affects how we structure the code.

**Note: The skill does NOT say "Should we use Stripe?" or "I'll integrate with Stripe." It asks the user to specify, or proposes an abstraction.**

**User responds** (simulated): "An abstract interface. I want to be able to swap providers later."

---

### Design Summary

After gathering enough information, the skill produces a design summary. Note that no code, no tests, and no decomposition have happened yet.

> **Skill output to user:**
>
> ## Design Summary
>
> ### Components
> - **PaymentProcessor (interface)**: Abstract interface for payment provider operations (charge, refund). Allows swapping providers without changing business logic.
> - **PaymentService**: Core business logic for creating charges and processing refunds. Validates inputs, delegates to the processor interface, tracks payment state.
> - **Payment (data model)**: Represents a payment with status, amount, currency, and metadata. Tracks state transitions (pending -> completed -> refunded/partially-refunded).
> - **Refund (data model)**: Represents a refund against a payment, with amount and reason.
>
> ### Data Flow
> 1. Client calls PaymentService.charge() with amount, currency, and card details
> 2. PaymentService validates inputs (amount > 0, valid currency, card details present)
> 3. PaymentService delegates to PaymentProcessor.charge()
> 4. Processor returns success/failure with transaction ID
> 5. PaymentService creates a Payment record with status and returns it
> 6. For refunds: client calls PaymentService.refund() with payment ID and amount
> 7. PaymentService validates (payment exists, is completed, refund amount <= remaining)
> 8. PaymentService delegates to PaymentProcessor.refund()
> 9. Processor returns success/failure
> 10. PaymentService updates Payment status and creates Refund record
>
> ### Key Decisions
> - **Abstract processor interface**: Decouples business logic from any specific payment provider. Tests will use an in-memory fake processor.
> - **Payment state machine**: Payments transition through defined states (pending, completed, failed, refunded, partially_refunded). Invalid transitions are rejected.
> - **Validation in service layer**: Input validation (amount, currency, card presence) happens in PaymentService, not the processor. Processor assumes valid input.
> - **Refund tracks against payment**: Partial refunds accumulate. Total refunded amount cannot exceed original charge.
>
> ### Out of Scope
> - Recurring subscriptions or saved payment methods
> - Specific payment provider implementations (Stripe, PayPal, etc.)
> - Webhook handling or async payment confirmation
> - PCI compliance or card data encryption (card details are opaque tokens in this design)
> - Database persistence (in-memory for now)
> - Currency conversion
> - Authentication/authorization
>
> Proceed with this design? [confirm/modify/cancel]

---

### HARD GATE

**At this point, the skill STOPS and waits for user approval.**

- No Phase 1 (framework detection) has run yet beyond what was needed for the design discussion.
- No Phase 2 (decomposition) has run.
- No work units have been created.
- No Test Writers have been spawned.
- No Code Writers have been spawned.
- **ZERO lines of code or tests have been written.**
- **ZERO files have been created in the project directory.**

The state is: waiting at the design gate.

If the user says "modify" -- the skill iterates on the design.
If the user says "cancel" -- the skill stops entirely.
If the user says "confirm" -- the skill proceeds.

---

### User Approval

**User responds** (simulated): "confirm"

The approved design summary is stored in the state file under `designSummary`.

---

## Step 6: Phase 1 -- Framework Detection (post-approval)

Now that the design is approved, the skill proceeds to framework detection.

Per `reference/framework-detection.md`, the skill checks in priority order:
1. `.tdd.config.json` -- not found
2. Project `CLAUDE.md` `## TDD Configuration` section -- not found
3. Auto-detect from project files:
   - Check for `package.json` -- detected (hypothetical TypeScript project with vitest)

Result stored:
```
framework:
  language: "typescript"
  testRunner: "vitest"
  testCommand: "npx vitest run"
  testFilePattern: "**/*.test.ts"
  sourceDir: "src/"
  testDir: "src/__tests__/"
```

---

## Step 7: Phase 2 -- Work Decomposition (post-approval)

The skill decomposes the approved design into independent work units. It uses the design summary -- not the original ambiguous spec -- as the source of truth.

> **Skill output to user:**
>
> ## TDD Work Plan
>
> Framework: vitest (auto-detected)
> Mode: natural-language-spec
> Work units: 4
>
> ### Unit 1: payment-processor-interface
> Spec: Define PaymentProcessor interface with charge() and refund() methods. Create an InMemoryProcessor fake for testing that tracks calls and configurable success/failure responses.
> Files: src/__tests__/payment-processor.test.ts -> src/payment-processor.ts
> Dependencies: none
>
> ### Unit 2: payment-model
> Spec: Payment data model with status state machine (pending, completed, failed, refunded, partially_refunded). Validate state transitions -- reject invalid ones. Track amount, currency, transaction ID, and refunded total.
> Files: src/__tests__/payment.test.ts -> src/payment.ts
> Dependencies: none
>
> ### Unit 3: charge-flow
> Spec: PaymentService.charge() -- validate inputs (amount > 0, valid currency, card details present), delegate to processor, return Payment with correct status on success/failure. Reject invalid inputs with descriptive errors.
> Files: src/__tests__/charge-flow.test.ts -> src/payment-service.ts
> Dependencies: [payment-processor-interface, payment-model]
>
> ### Unit 4: refund-flow
> Spec: PaymentService.refund() -- validate payment exists and is completed, validate refund amount <= remaining, delegate to processor, update payment status (refunded or partially_refunded), create Refund record. Handle edge cases: refund on failed payment, refund exceeding original amount, multiple partial refunds.
> Files: src/__tests__/refund-flow.test.ts -> src/payment-service.ts
> Dependencies: [payment-processor-interface, payment-model, charge-flow]
>
> Execution plan: Units 1 and 2 in parallel (no dependencies), then Unit 3, then Unit 4.
>
> Proceed? [confirm/modify/cancel]

**User responds** (simulated): "confirm"

---

## Step 8: Phase 3 -- State Initialization

1. Check for existing `.tdd-state.json` -- not found, create new.
2. Add `.tdd-state.json`, `tdd-session.jsonl`, and `spec-contract-*.md` to `.gitignore`.
3. Initialize `tdd-session.jsonl` with `session.start` event.
4. Store approved design summary in state file under `designSummary`.
5. Store all work units with status `pending`.

---

## Step 9: Phase 4 -- Agent Team Orchestration

### Complexity Assessment (model strategy: "auto")

| Unit | Complexity | Signals | Test Writer | Code Writer | Reviewer |
|------|-----------|---------|-------------|-------------|----------|
| payment-processor-interface | simple | 1 file, clear spec, no external deps | haiku | haiku | sonnet |
| payment-model | simple | 1 file, clear state machine spec | haiku | haiku | sonnet |
| charge-flow | standard | multi-file, integration with processor | sonnet | sonnet | sonnet |
| refund-flow | standard | multi-file, edge cases, depends on charge | sonnet | sonnet | sonnet |

### Round 1: Units 1 and 2 in parallel

#### Unit 1: payment-processor-interface

**Step 4a**: Spawn Test Writer with spec-contract for the processor interface only. The design summary is passed alongside.

**Step 4b**: RED verification.
- Run `npx vitest run src/__tests__/payment-processor.test.ts`
- Tests FAIL (implementation does not exist) -- correct RED state
- Check failure type: "Cannot find module '../payment-processor'" -- acceptable
- Check assertion density: meets minimum threshold
- Check behavior-over-implementation: no anti-patterns detected
- Record test file checksums

**Step 4c**: Spawn Code Writer with test file contents (read from disk) and spec-contract (read from disk). Information barrier enforced -- no Test Writer prompt or reasoning included.

**Step 4d**: GREEN verification.
- Compare test file checksums -- unchanged
- Check for skip/focus markers -- none added
- Run tests -- all pass
- Check for hardcoded returns -- none detected

**Step 4e**: Spec Compliance Review -- COMPLIANT.

**Step 4f**: Adversarial Review -- PASS.

Unit 1 marked `completed`.

#### Unit 2: payment-model (runs in parallel with Unit 1)

Same sequence: Test Writer -> RED -> Code Writer -> GREEN -> Spec Compliance -> Adversarial Review.

Unit 2 marked `completed`.

### Round 2: Unit 3 (depends on Units 1 and 2)

#### Unit 3: charge-flow

Test Writer receives the spec-contract for charge-flow plus the design summary. It can import from the now-existing payment-processor and payment modules.

Same pipeline: Test Writer -> RED -> Code Writer -> GREEN -> Spec Compliance -> Adversarial Review.

Unit 3 marked `completed`.

### Round 3: Unit 4 (depends on Units 1, 2, and 3)

#### Unit 4: refund-flow

Same pipeline. Edge cases for refunds are specifically tested (refund on failed payment, over-refund, multiple partial refunds accumulating to exact original amount).

Unit 4 marked `completed`.

---

## Step 10: Phase 5 -- Final Review

1. **Run full test suite**: `npx vitest run` -- all tests across all 4 test files pass.
2. **Verify pristine output**: No warnings, no skipped tests, no pending tests.
3. **Holistic code review**: Check for naming conflicts, inconsistencies between units, missing connections.
4. **Cross-unit integration check**: charge-flow and refund-flow correctly use the processor interface and payment model.
5. No integration issues found.

---

## Step 11: Phase 6 -- Report Generation

Generate `tdd-report.md` and `tdd-session.jsonl` with full session details.

---

## Step 12: Phase 7 -- Cleanup

1. Shut down remaining teammates.
2. Delete intermediate `spec-contract-*.md` files.
3. Final state file update.
4. Present report to user.
5. Suggest next steps: run full test suite, commit changes.

---

## Key Observations for This Trace

### 1. Design Gate Triggered Correctly
All three positive trigger conditions were met:
- 3+ features (payments, credit cards, refunds)
- External integrations (payment processors)
- High ambiguity ("like credit cards and stuff", "idk the details yet")

### 2. Questions Asked One at a Time
The skill asked exactly 3 questions sequentially, waiting for a response each time:
1. What types of payments?
2. Full or partial refunds? Time limits?
3. Abstract interface or specific provider?

It did NOT dump all questions as a numbered list.

### 3. No Technology Assumptions
The skill never assumed Stripe, PayPal, or any specific provider. It asked the user about the integration strategy and the user chose abstraction. The design reflects this choice, not a pre-baked assumption.

### 4. Hard Gate Enforced
Between the design summary and the user's "confirm", absolutely nothing happened:
- No framework detection beyond prerequisites
- No decomposition
- No file creation
- No code generation
- No test writing
- The skill was fully blocked at the gate

### 5. Design Informed Decomposition
The work units were derived from the approved design (PaymentProcessor interface, Payment model, charge flow, refund flow) -- not from the original ambiguous spec ("credit cards and stuff"). The design summary was stored in state and passed to Test Writers alongside spec-contracts.

### 6. Correct Dependency Ordering
- Units 1 and 2 (no dependencies) ran in parallel
- Unit 3 (depends on 1 and 2) waited for both to complete
- Unit 4 (depends on 1, 2, and 3) waited for all prior units
