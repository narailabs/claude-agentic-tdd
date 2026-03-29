# Detailed Step-by-Step Trace: Ambiguous Payment Spec with TDD Skill

## User Prompt

```
/tdd I need something that handles payments. like credit cards and stuff. also refunds maybe? idk the details yet
```

---

## Step 0: Skill Activation and Argument Parsing

The `/tdd` command triggers the TDD skill. The skill parses `$ARGUMENTS`:

- **Specification text**: "I need something that handles payments. like credit cards and stuff. also refunds maybe? idk the details yet"
- **Flags detected**: none (`--skip-failed`, `--config`, `--design`, `--skip-design` all absent)
- **Entry point mode**: Natural language spec (mode 1) -- not an existing codebase scan, not a user-provided test file.

---

## Step 1: Prerequisites Check

The skill checks two prerequisites:

1. **Agent teams**: Verifies `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set. If not, the skill stops here with an error message telling the user how to enable it.
2. **Git repository**: Checks if the project is a git repo (needed for diff checks during GREEN verification). Warns if not, but continues.

---

## Step 2: Configuration Loading

The skill loads config in priority order:

1. Checks for `.tdd.config.json` at project root -- likely not found for this scenario.
2. Checks project `CLAUDE.md` for a `## TDD Configuration` section.
3. Falls back to defaults:
   - `antiCheat.minAssertionsPerTest: 1`
   - `antiCheat.maxRetries: 3`
   - `antiCheat.maxMockDepth: 2`
   - `execution.maxParallelPairs: 3`
   - `execution.skipFailedAfterRetries: false`
   - `execution.modelStrategy: "auto"`
   - `reporting.generateReport: true`
   - `reporting.generateSessionLog: true`

---

## Step 3: Phase 0 -- Design Gate Evaluation

### Does Phase 0 Trigger?

The skill evaluates the trigger conditions from SKILL.md lines 110-116. The design gate runs when **ANY** of these are true:

| Condition | Evaluation | Result |
|-----------|-----------|--------|
| Spec mentions 3+ distinct features/components | "payments", "credit cards", "refunds" = at least 3 concepts | **YES** |
| Spec involves external integrations (APIs, databases, auth providers) | Payment processing inherently involves payment gateways, card networks, possibly a database | **YES** |
| Spec is ambiguous about data flow, ownership, or error handling | "idk the details yet", "maybe?", "like credit cards and stuff" -- extreme ambiguity | **YES** |
| User explicitly requests (`--design` flag) | Not passed | No |

**Result: Phase 0 triggers on ALL THREE automatic conditions.** Even one would be sufficient.

The `--skip-design` flag was not passed, so there is no override. Phase 0 proceeds.

### Why This Cannot Be Skipped

The skip conditions do not apply:

- This is NOT a single-unit spec with clear inputs/outputs (it is multi-feature and vague).
- This is NOT a user-provided failing test (entry point mode is natural-language-spec).
- The user did NOT pass `--skip-design`.

---

## Step 4: Phase 0 -- Design Refinement Process

### Step 4a: Clarifying Questions (One at a Time)

The skill follows the rule: "Ask the user 1-3 targeted questions about ambiguities. Ask one at a time -- do not dump a questionnaire."

**Question 1** (addressing the most fundamental ambiguity -- what "handles payments" means):

> What types of payment operations do you need? For example: one-time charges, recurring subscriptions, pre-authorizations/holds, or just basic charge-and-refund?

The skill STOPS and WAITS for the user's answer. It does not ask all questions at once. It does not proceed to decomposition.

**After user responds** (hypothetical answer: "just basic charges and refunds for now"):

**Question 2** (addressing the integration question -- this determines architecture):

> Should this integrate with a real payment gateway like Stripe or Braintree, or do you want an in-memory/mock payment processor that could be swapped out later?

The skill STOPS and WAITS again.

**After user responds** (hypothetical answer: "let's do Stripe"):

**Question 3** (addressing error handling, which the spec says nothing about):

> What should happen when a charge fails -- for example, if the card is declined, has insufficient funds, or the card number is invalid? Should the system retry, return a structured error, or something else?

The skill STOPS and WAITS again.

Note: The skill asks at most 3 questions. It may ask fewer if the answers to early questions resolve later ambiguities. The key constraint is "one at a time" -- this prevents overwhelming the user and ensures each answer informs the next question.

### Step 4b: Propose Approaches (When Trade-offs Exist)

After gathering answers, the skill identifies genuine architectural trade-offs and presents 2-3 options:

> **Option A: Thin wrapper around Stripe SDK**
> - Pros: Simple, leverages Stripe's built-in validation, fast to implement
> - Cons: Tightly coupled to Stripe, hard to swap providers later, testing requires Stripe test keys or heavy mocking
>
> **Option B: Payment gateway abstraction layer**
> - Pros: Provider-agnostic interface, easy to swap or add providers, testable with in-memory fakes
> - Cons: More upfront work, abstraction may leak provider-specific features
>
> **Option C: Repository/service pattern with Stripe adapter**
> - Pros: Clean separation of business logic and gateway, unit-testable core, integration-testable adapter
> - Cons: More files and indirection, may be overengineered for "just charges and refunds"

The skill STOPS and WAITS for the user to choose.

### Step 4c: Design Summary

Once the user picks an approach (say Option B), the skill presents a structured design document:

```
## Design Summary

### Components
- PaymentGateway (interface): Defines charge() and refund() contracts
- StripeGateway (adapter): Implements PaymentGateway using Stripe SDK
- PaymentService (service): Business logic -- validates inputs, delegates to gateway, handles errors
- Payment (model): Data structure for payment records (amount, currency, status, metadata)

### Data Flow
1. Caller invokes PaymentService.charge(amount, currency, cardToken)
2. PaymentService validates inputs (amount > 0, supported currency, token format)
3. PaymentService calls PaymentGateway.charge()
4. Gateway returns success/failure result
5. PaymentService returns structured PaymentResult to caller

Refund flow mirrors this: PaymentService.refund(paymentId, amount?)

### Key Decisions
- Gateway abstraction: allows swapping Stripe for another provider without changing business logic
- Amount in smallest currency unit (cents): avoids floating-point issues
- Partial refunds supported: refund amount defaults to full but can be partial

### Out of Scope
- Recurring/subscription billing
- Webhooks and async payment confirmation
- PCI compliance / card number handling (delegated to Stripe via tokens)
- Database persistence of payment records
- Multi-currency conversion
```

### Step 4d: User Approval (HARD GATE)

The skill presents:

> Proceed with this design? [confirm/modify/cancel]

**HARD GATE**: The skill CANNOT proceed to Phase 2 (decomposition) until the user explicitly confirms. This is stated in SKILL.md: "No decomposition (Phase 2) until the design is approved."

- If user says **confirm**: Design summary is stored in state file under `designSummary`. Proceed to Phase 1.
- If user says **modify**: The skill iterates -- asks what to change, updates the design, re-presents for approval.
- If user says **cancel**: The skill stops entirely. No code is written.

---

## Step 5: Phase 1 -- Framework Detection

Only after design approval does the skill move forward. It auto-detects the test framework by checking project files (package.json, pyproject.toml, go.mod, etc.) following the algorithm in `reference/framework-detection.md`.

For example, if the project has a `package.json` with `vitest`:
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

## Step 6: Phase 2 -- Work Decomposition

The skill decomposes based on the approved design (not the original vague spec). This is a critical distinction -- decomposition uses the refined, user-approved design summary rather than "payments... credit cards... maybe refunds?"

Example decomposition:

```
## TDD Work Plan

Framework: vitest (auto-detected)
Mode: natural-language-spec
Work units: 4

### Unit 1: payment-model
Spec: Payment data model with amount (cents), currency, status, cardToken, metadata.
      Validation: amount > 0, supported currencies (USD, EUR, GBP), non-empty token.
Files: src/__tests__/payment-model.test.ts -> src/payment-model.ts
Dependencies: none

### Unit 2: payment-gateway-interface
Spec: PaymentGateway interface with charge(amount, currency, token) and refund(paymentId, amount?).
      StripeGateway adapter implementing the interface. Error mapping from Stripe errors to domain errors.
Files: src/__tests__/stripe-gateway.test.ts -> src/payment-gateway.ts, src/stripe-gateway.ts
Dependencies: [payment-model]

### Unit 3: payment-service-charge
Spec: PaymentService.charge() -- validates inputs, delegates to gateway, returns PaymentResult.
      Error cases: invalid amount, unsupported currency, gateway decline, gateway timeout.
Files: src/__tests__/payment-service-charge.test.ts -> src/payment-service.ts
Dependencies: [payment-model, payment-gateway-interface]

### Unit 4: payment-service-refund
Spec: PaymentService.refund(paymentId, amount?) -- validates refund amount <= original,
      delegates to gateway, returns RefundResult. Partial and full refunds.
Files: src/__tests__/payment-service-refund.test.ts -> src/payment-service.ts
Dependencies: [payment-model, payment-gateway-interface, payment-service-charge]

Execution plan: Unit 1 first, then Unit 2, then Units 3 and 4 in parallel.

Proceed? [confirm/modify/cancel]
```

The skill WAITS for user confirmation again before proceeding.

---

## Step 7: Phases 3-7 (Subsequent Execution)

After decomposition approval, the skill proceeds through:

- **Phase 3**: State initialization (`.tdd-state.json`, session log, gitignore entries)
- **Phase 4**: Agent team orchestration (Test Writer -> RED -> Code Writer -> GREEN -> Spec Compliance -> Adversarial Review for each unit)
- **Phase 5**: Final integration review (run full test suite)
- **Phase 6**: Report generation
- **Phase 7**: Cleanup

These phases execute normally. The design summary from Phase 0 is passed to the Spec Compliance Reviewer alongside each unit's spec-contract, ensuring the reviewer can verify that the implementation matches not just the local spec-contract but the overall approved design.

---

## Anti-Rationalization Table Analysis

The anti-rationalization table (from `reference/anti-cheat.md`) is directly relevant to this ambiguous spec in several ways:

### Rationalizations the Skill Would Resist

| Potential Temptation | Anti-Rationalization Response | Applies Here? |
|---------------------|------------------------------|---------------|
| "I already know how to implement payments, let me just start coding" | "Good. Then the test will be easy to write. The test documents the behavior for the next person. Write it." | **YES** -- The skill would absolutely resist the urge to jump into coding a Stripe integration without first clarifying requirements and writing tests. |
| "This is too simple to need a design phase" | "Simple code becomes complex code. The test takes 30 seconds. Write it." | **YES** -- Even if an agent thought "payments are straightforward," the 3+ features and external integration triggers force Phase 0. |
| "I'll write the tests after I build the payment module" | "That's not TDD. That's hoping your code works and writing tests to confirm your bias." | **YES** -- The entire skill architecture prevents this. The Code Writer literally cannot see the Test Writer's reasoning. |
| "Just this once, let me skip the design for this obvious feature" | "There is no 'just this once.' Every exception becomes the rule." | **YES** -- The trigger conditions are evaluated mechanically, not subjectively. |
| "I can just keep my initial code as reference for the payment service" | "No. 'Reference' code becomes 'copied' code. The test must drive the implementation. Start clean." | **YES** -- If any agent produced implementation before tests, the Red Flag rules (line 220-227 of anti-cheat.md) would trigger: "Implementation exists before test -- delete all implementation code, no exceptions." |

### Red Flags the Skill Watches For

The skill's "Red Flags That Mean STOP" section is particularly relevant here:

1. **Implementation exists before test**: If any agent tries to write payment code before the Test Writer runs, all implementation code is deleted.
2. **Test passes immediately**: If a Test Writer writes a tautological payment test, it is caught by RED verification.
3. **Agent rationalizes skipping a test**: Any excuse from the anti-rationalization table is rejected.

### The Verification Anti-Rationalization Table (Phase 5)

The Phase 5 table from SKILL.md also applies:

| Excuse | Response |
|--------|----------|
| "The payment tests should pass now" | Run them. "Should" is not "did." |
| "I'm confident the Stripe integration works" | Confidence without evidence is delusion. Run the tests. |
| "Only changed one line in the refund logic" | One-line changes break everything. Run the tests. |

These rules ensure that even after the design is approved and implementation proceeds, no agent can claim something works without running the tests and reading the output.

---

## Key Behavioral Summary

For this ambiguous spec, the TDD skill:

1. **DOES trigger Phase 0** -- on three separate conditions (3+ features, external integrations, ambiguous spec).
2. **DOES ask clarifying questions one at a time** -- not as a questionnaire dump. Each answer informs the next question.
3. **DOES propose design approaches with trade-offs** -- presenting 2-3 concrete options with pros/cons.
4. **DOES wait for explicit user approval** before decomposing -- this is a HARD GATE.
5. **DOES resist the urge to just start coding** -- the anti-rationalization table provides explicit rebuttals for every common shortcut, and the Phase 0 trigger conditions are evaluated mechanically rather than left to judgment.
6. **DOES pass the approved design downstream** -- the design summary is stored in state and provided to the Spec Compliance Reviewer, ensuring the entire pipeline stays aligned with user-approved decisions.
