# Execution Trace: Ambiguous Payment Spec

**User Input**: `/tdd I need something that handles payments. like credit cards and stuff. also refunds maybe? idk the details yet`

**Flags parsed**: None (`--skip-failed`, `--config`, `--design`, `--skip-design` all absent)

---

## Step 0: Prerequisites Check

1. **Agent teams**: Check `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set to `1`. If not, halt and inform:
   > Agent teams are required for agentic-tdd. Enable them by adding `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"` to the `env` section of your `.claude/settings.json`, then restart Claude Code.

2. **Git repository**: Check if the project is a git repo. If not, warn but continue.

**Outcome**: Assume prerequisites pass. Proceed.

---

## Step 1: Argument Parsing

- **Specification text**: `"I need something that handles payments. like credit cards and stuff. also refunds maybe? idk the details yet"`
- **Flags**: None detected.
- **Entry point mode**: Mode 1 (Natural language spec). No "add tests to...", no user-provided test, no plan file.

---

## Step 2: Configuration Loading

1. Check for `.tdd.config.json` at project root -- not found.
2. Check project `CLAUDE.md` for `## TDD Configuration` section -- not found.
3. Apply defaults:
   ```
   antiCheat.minAssertionsPerTest: 1
   antiCheat.maxRetries: 3
   antiCheat.maxMockDepth: 2
   antiCheat.flagPrivateMethodTests: true
   execution.maxParallelPairs: 3
   execution.parallelMode: "auto"
   execution.skipFailedAfterRetries: false
   execution.modelStrategy: "auto"
   reporting.generateReport: true
   reporting.generateSessionLog: true
   ```

---

## Step 3: Design Gate Trigger Evaluation (Phase 0)

The skill evaluates trigger conditions against the spec:

> **Trigger Conditions -- Run the design gate when ANY of:**
> - The spec mentions 3+ distinct features or components
> - The spec involves external integrations (APIs, databases, auth providers)
> - The spec is ambiguous about data flow, ownership, or error handling
> - The user explicitly requests design review (`--design` flag)

### Analysis of this spec against each trigger:

| Condition | Fires? | Evidence |
|-----------|--------|----------|
| 3+ distinct features/components | **YES** | "payments" (charge processing), "credit cards" (payment method handling), "refunds" (reversal flow) = 3 components |
| External integrations | **YES** | Credit card processing inherently requires a payment gateway/processor (Stripe, Braintree, etc.) |
| Ambiguous about data flow/ownership/error handling | **YES** | "like credit cards and stuff" -- no defined payment methods. "also refunds maybe?" -- uncertain scope. "idk the details yet" -- explicit admission of ambiguity. No error handling spec. No data flow described. |
| `--design` flag | No | Not passed |

**Result: THREE trigger conditions fire. Design gate is MANDATORY.**

Skip conditions check:
- Single-unit spec with clear inputs/outputs? **No** -- multi-feature, no defined I/O
- Existing codebase coverage mode? **No** -- Mode 1
- User-provided failing test? **No** -- Mode 1
- `--skip-design` flag? **No**

**No skip conditions apply. Proceeding to Phase 0: Design Gate.**

---

## Phase 0: Design Gate -- Design Refinement Process

### Step 1 of 3: Clarifying Questions (one at a time)

The skill says: "Ask the user 1-3 targeted questions about ambiguities. Ask one at a time -- do not dump a questionnaire."

The spec has massive ambiguity. The skill identifies questions to resolve the biggest unknowns first.

**Question 1** (presented to user):

> What payment provider should this integrate with -- Stripe, a different provider, or should it be provider-agnostic with an adapter layer? This determines the entire integration architecture.

**[BLOCKED -- waiting for user response]**

*Suppose the user responds*: "stripe is fine"

**Question 2** (presented to user):

> When you say "refunds," should the system support full refunds only, or also partial refunds (refunding part of a charge)? And should refunds be automatic (API-driven) or require manual approval?

**[BLOCKED -- waiting for user response]**

*Suppose the user responds*: "both full and partial, and they can just be API calls, no approval needed"

**Question 3** (presented to user):

> What information do you need to track per payment -- just the charge ID and status, or full details like amount, currency, customer info, timestamps, and metadata? This determines the data model.

**[BLOCKED -- waiting for user response]**

*Suppose the user responds*: "full details, yeah. amount, currency, customer, timestamps, all of it"

---

### Step 2 of 3: Trade-Off Proposal (MANDATORY)

The skill states (Phase 0, Step 2):

> **Propose approaches**: Present 2-3 options with pros/cons for at least one key architectural decision. Every spec complex enough to trigger the design gate has at least one meaningful trade-off. [...] If the trade-offs are straightforward, keep this brief -- but do not skip it entirely.

This is a formal trade-off presentation. The skill requires it for every spec that triggers the design gate. It is NOT embedded inside a question -- it is a separate step with structured pros/cons.

**Trade-Off Proposal presented to user:**

---

**Key Architectural Decision: Payment Data Persistence Strategy**

There are multiple valid approaches to how the system stores and relates to payment data. Here are the options with trade-offs:

**Option A: Stripe as source of truth (thin wrapper)**
- The system calls the Stripe API for charges and refunds, and stores only Stripe charge IDs locally as references.
- Pros:
  - Simplest implementation -- minimal local state
  - No data sync issues -- Stripe is always authoritative
  - Less data to secure (no sensitive payment data stored locally)
- Cons:
  - Every status check requires a Stripe API call (latency, rate limits)
  - Cannot query/filter/report on payments without calling Stripe
  - Offline or Stripe-outage scenarios mean no payment data at all

**Option B: Local record store with Stripe sync (dual-write)**
- The system stores a full local record of each payment (amount, currency, customer, status, timestamps) and keeps it synchronized with Stripe.
- Pros:
  - Fast local queries for reporting, filtering, customer history
  - Works for read operations even if Stripe is temporarily unavailable
  - Foundation for future analytics, dashboards, audit trails
- Cons:
  - Must handle sync failures and consistency between local DB and Stripe
  - More code to maintain -- dual-write logic, conflict resolution
  - More surface area for bugs (stale data, missing updates)

**Option C: Event-sourced payment log**
- Every payment action (created, charged, refunded) is stored as an immutable event. Current state is derived by replaying events.
- Pros:
  - Full audit trail by design
  - Can reconstruct state at any point in time
  - Natural fit for payment domain (regulatory compliance)
- Cons:
  - Most complex to implement
  - Overkill for a first version without compliance requirements
  - Steeper learning curve for future maintainers

**Recommendation**: Option B provides the best balance of capability and complexity for a payment system that needs to track "full details" as the user specified.

---

**[BLOCKED -- waiting for user response]**

*Suppose the user responds*: "option B sounds right, let's do that"

---

### Step 3 of 3: Design Summary

The skill requires presenting a brief design document with specific sections.

**Design Summary presented to user:**

---

```
## Design Summary

### Components
- PaymentService: orchestrates charge creation and refund processing through Stripe
- PaymentRecord: data model for local payment records (amount, currency, customer, status, timestamps, Stripe charge ID)
- RefundService: handles full and partial refund logic, updates local records
- StripeAdapter: thin wrapper around Stripe SDK for charge and refund API calls

### Data Flow
1. Caller invokes PaymentService.charge() with amount, currency, customer info
2. PaymentService calls StripeAdapter to create a Stripe charge
3. On success, PaymentService creates a local PaymentRecord with Stripe charge ID and status
4. For refunds, caller invokes RefundService.refund() with charge ID and optional amount
5. RefundService calls StripeAdapter to create a Stripe refund
6. RefundService updates the local PaymentRecord status and adds refund metadata

### Key Decisions
- Stripe as payment processor (user-specified)
- Local record store with Stripe sync (Option B from trade-off analysis)
- Both full and partial refunds supported, API-driven without approval workflow
- StripeAdapter layer for testability (can mock Stripe calls in tests)

### Out of Scope
- Payment approval workflows
- Webhook handling for async Stripe events
- Multi-currency conversion
- PCI compliance / card tokenization (Stripe handles this)
- Customer management (assumes customer info is passed in)
- Subscription/recurring payments
```

---

### Step 4: User Approval (HARD GATE)

> "Proceed with this design? [confirm/modify/cancel]"

**[BLOCKED -- waiting for user response]**

**HARD GATE**: No decomposition (Phase 2) until the design is approved. If the user modifies, iterate. If cancelled, stop.

*Suppose the user responds*: "looks good, proceed"

**Design approved.** Store the design summary in state file under `designSummary`. Proceed to Phase 1.

---

## Phase 1: Framework Detection

Read `reference/framework-detection.md` and execute detection.

1. Check `.tdd.config.json` for explicit config -- not found
2. Check project CLAUDE.md for test conventions -- none specified
3. Auto-detect from project files:
   - Run `cat package.json 2>/dev/null` -- check for JS/TS frameworks
   - Check for `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.

*Suppose this is a TypeScript project with vitest detected from `package.json`*:

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

## Phase 2: Work Decomposition

Analyze the approved design and decompose into independent work units.

### Model Strategy Assessment

With `execution.modelStrategy: "auto"`, assess each unit's complexity:

- The spec involves external integrations (Stripe), multi-file coordination, and design-sensitive decisions.
- This qualifies as "Architecture and judgment tasks" for the Test Writer and reviewers, and "Integration tasks" for Code Writers.
- Assignment: `opus` for Test Writer and reviewers, `sonnet` for Code Writer.

### Decomposition

```
## TDD Work Plan

Framework: vitest (auto-detected)
Mode: natural-language-spec
Parallel: auto (max 3 concurrent)
Work units: 4

### Unit 1: stripe-adapter [code]
Spec: Thin wrapper around Stripe SDK. Exposes createCharge(amount, currency, customerId)
and createRefund(chargeId, amount?) methods. Handles Stripe API errors and translates
them to domain errors. Returns typed responses.
Files: src/__tests__/stripe-adapter.test.ts -> src/stripe-adapter.ts
Dependencies: none
Model: testWriter=opus, codeWriter=sonnet, reviewer=opus

### Unit 2: payment-record [code]
Spec: Data model and storage for payment records. Fields: id, stripeChargeId, amount,
currency, customerId, status (pending/succeeded/failed/refunded/partially_refunded),
createdAt, updatedAt, refunds (array of {amount, stripeRefundId, createdAt}).
CRUD operations: create, findById, findByCustomer, updateStatus, addRefund.
Files: src/__tests__/payment-record.test.ts -> src/payment-record.ts
Dependencies: none
Model: testWriter=opus, codeWriter=sonnet, reviewer=opus

### Unit 3: payment-service [code]
Spec: Orchestrates charge creation. Takes amount, currency, customer info. Calls
StripeAdapter.createCharge(), creates a local PaymentRecord on success, returns
the payment record. Handles Stripe failures by recording failed status. Validates
inputs (positive amount, supported currency, required customer fields).
Files: src/__tests__/payment-service.test.ts -> src/payment-service.ts
Dependencies: [stripe-adapter, payment-record]
Model: testWriter=opus, codeWriter=sonnet, reviewer=opus

### Unit 4: refund-service [code]
Spec: Handles full and partial refunds. Takes chargeId and optional amount.
Looks up PaymentRecord, validates refund is possible (charge exists, status is
succeeded or partially_refunded, refund amount does not exceed remaining).
Calls StripeAdapter.createRefund(), updates PaymentRecord with refund details
and new status. Returns updated payment record.
Files: src/__tests__/refund-service.test.ts -> src/refund-service.ts
Dependencies: [stripe-adapter, payment-record]
Model: testWriter=opus, codeWriter=sonnet, reviewer=opus

Execution plan:
  Batch 1 (parallel): stripe-adapter, payment-record
  Batch 2 (parallel): payment-service, refund-service

Proceed? [confirm/modify/cancel]
```

**[BLOCKED -- waiting for user confirmation]**

*Suppose the user responds*: "confirm"

---

## Phase 3: State Initialization

1. Check for existing `.tdd-state.json` -- not found, create new
2. Add to `.gitignore` (if not present):
   ```
   # agentic-tdd state and intermediate files
   .tdd-state.json
   tdd-session.jsonl
   spec-contract-*.md
   ```
3. Initialize `.tdd-state.json` with session ID, spec, design summary, framework, config, all 4 work units in `pending` status
4. Initialize `tdd-session.jsonl` with `session.start` event

---

## Phase 4: Agent Team Orchestration

### Batch 1 (parallel): stripe-adapter, payment-record

Both units have no dependencies, so they run concurrently (up to maxParallelPairs=3).

#### Unit 1: stripe-adapter

**Step 4a: Spawn Test Writer**
- Read `reference/test-writer-prompt.md` template
- Fill placeholders with stripe-adapter spec-contract, vitest framework info, target path `src/__tests__/stripe-adapter.test.ts`
- Include the approved design summary alongside the spec-contract
- Spawn teammate with `opus` model (architecture/judgment task)
- Wait for completion
- Verify test file exists at `src/__tests__/stripe-adapter.test.ts`
- Verify `spec-contract-stripe-adapter.md` exists in `src/__tests__/`

**Step 4b: RED Verification** (Mode 1 -- Standard)
1. Run `npx vitest run src/__tests__/stripe-adapter.test.ts` -- capture output
2. Verify RED: exit code != 0 (tests must fail). Expected failures: "Cannot find module '../stripe-adapter'" or similar import errors
3. Verify correct failure type: should be module-not-found errors, not syntax errors
4. Check assertion density: count `expect(` patterns per test function, must be >= 1 per test
5. Check behavior-over-implementation: scan for excessive mocking, private method access
6. Record checksums: `shasum -a 256 src/__tests__/stripe-adapter.test.ts`
7. Store checksums in state file

**Step 4c: Spawn Code Writer**
- Read `reference/code-writer-prompt.md` template
- Read test file from disk (NOT from Test Writer output -- information barrier)
- Read `spec-contract-stripe-adapter.md` from disk
- Fill template with test contents, spec-contract, vitest framework info, target `src/stripe-adapter.ts`
- Verify prompt contains NO Test Writer prompt text, NO implementation hints
- Spawn teammate with `sonnet` model
- Wait for completion

**Step 4d: GREEN Verification**
1. Compare test file checksum against stored value -- must be identical
2. Grep for skip markers (`xit`, `.skip`, `.only`, etc.) -- none should be new
3. Run `npx vitest run src/__tests__/stripe-adapter.test.ts` -- all tests must pass (exit code 0)
4. Heuristic check for hardcoded returns in `src/stripe-adapter.ts`

**Step 4e: Spec Compliance Review**
- Read `reference/spec-compliance-reviewer-prompt.md`
- Spawn reviewer with spec-contract (from disk), design summary, test file (from disk), impl file (from disk)
- Reviewer checks requirement coverage, missing requirements, scope creep, API contract, integration readiness
- Must return COMPLIANT before proceeding

**Step 4f: Adversarial Review**
- Read `reference/adversarial-reviewer-prompt.md`
- Spawn reviewer with spec-contract, test file, impl file, scoring rubric
- Reviewer checks edge cases, test-implementation coupling, coverage gaps, cheating detection, test quality
- Also checks for the 5 anti-patterns from `reference/testing-anti-patterns.md`
- Must return PASS before proceeding

**Step 4g: Code Quality Review**
- Read `reference/code-quality-reviewer-prompt.md`
- Spawn reviewer with impl file, test file, git diff for this unit
- Reviewer checks structure, naming, discipline, testing quality, size
- Must return Approved before marking unit complete

**Unit marked COMPLETED in state file.**

#### Unit 2: payment-record

*(Runs in parallel with stripe-adapter -- identical pipeline: 4a through 4g)*

**[Batch 1 complete when both units finish all reviews]**

---

### Batch 2 (parallel): payment-service, refund-service

Both depend on stripe-adapter and payment-record (Batch 1), so they start only after Batch 1 completes. They are independent of each other, so they run concurrently.

#### Unit 3: payment-service

**Step 4a through 4g**: Same pipeline as above, but:
- Test Writer receives payment-service spec-contract plus the approved design summary
- Test Writer can reference the interfaces exported by stripe-adapter and payment-record (since those are now implemented)
- Code Writer receives test file and spec-contract from disk only

**Unit marked COMPLETED in state file.**

#### Unit 4: refund-service

**Step 4a through 4g**: Same pipeline as above, with refund-service spec-contract.

**Unit marked COMPLETED in state file.**

---

## Phase 5: Final Review -- Verification Before Completion

**IRON LAW**: No completion claim without fresh verification evidence.

1. **Run FULL test suite**: `npx vitest run` -- all 4 test files together
2. **Verify pristine output**: All tests pass, no warnings, no skipped tests, no pending tests
3. **Review all generated code holistically**: Check for naming conflicts, inconsistent error handling, missing imports between units
4. **Cross-unit integration check**: Do payment-service and refund-service correctly use stripe-adapter and payment-record interfaces?
5. If any integration issues found: report with evidence (actual test output), fix before proceeding

### Verification Anti-Rationalization

Apply the table from the skill -- reject any agent output claiming:
- "Tests should pass now" -- run them, read output
- "I'm confident this works" -- confidence is not evidence
- etc.

---

## Phase 6: Report Generation

Generate `tdd-report.md` following `reference/report-format.md` template:

```markdown
# TDD Session Report

**Date**: 2026-03-28T...
**Specification**: I need something that handles payments. like credit cards and stuff. also refunds maybe? idk the details yet
**Framework**: typescript / vitest
**Entry Point**: natural-language-spec

## Summary

| Metric | Value |
|--------|-------|
| Work units | 4/4 |
| Tests written | [count] |
| Assertions | [count] |
| Anti-cheat violations | [count] |
| Adversarial reviews | 4/4 passed |
| Retries | [count] |

## Work Units

### stripe-adapter -- completed
...
### payment-record -- completed
...
### payment-service -- completed
...
### refund-service -- completed
...

## Anti-Cheat Log
[any violations]

## Final Integration Check
- All tests passing: yes
- Integration issues found: [list if any]
```

Generate `tdd-session.jsonl` with all events logged throughout the session.

---

## Phase 7: Cleanup

1. Shut down any remaining teammates
2. Delete all `spec-contract-*.md` files (intermediate artifacts)
3. Final state file update (all units completed)
4. Present report to user
5. Suggest next steps:
   > All 4 work units completed. Run `npx vitest run` to verify, then commit your changes. Consider adding webhook handling for async Stripe events as a follow-up.

---

## Key Observations About This Trace

### The Design Gate Was Critical

The user's spec was profoundly ambiguous: "like credit cards and stuff", "refunds maybe?", "idk the details yet." Without the design gate, the skill would have decomposed based on guesses, producing work units with vague spec-contracts that the Test Writer could not write meaningful tests for. The design gate transformed an unusable spec into a precise, agreed-upon design.

### Trade-Off Proposal Was a Distinct Step

The skill's Phase 0, Step 2 requires presenting "2-3 options with pros/cons for at least one key architectural decision." This was executed as a separate, formal proposal with three labeled options (A, B, C), each with structured pros and cons, and a recommendation. It was NOT:
- A question with options embedded ("would you prefer X or Y?")
- A passing mention of alternatives
- Skipped because the user "probably wants the obvious choice"

The trade-off proposal gave the user agency over a meaningful architectural decision (data persistence strategy) before any code was written. The user's choice of Option B directly shaped the data model, the PaymentRecord spec-contract, and the sync behavior in every subsequent work unit.

### Three Separate User Checkpoints Before Any Code

1. Clarifying questions (3 rounds of Q&A)
2. Trade-off proposal (formal options with pros/cons, user selects)
3. Work plan confirmation (decomposition review)

No code was written until the user approved all three. This is the HARD GATE in action.

### Model Strategy

With `auto` model strategy, the complexity assessment classified this as architecture/judgment work due to external integrations and design sensitivity. Test Writers and reviewers got `opus`; Code Writers got `sonnet`. This balances capability (the hard reasoning happens in test design and review) with cost (implementation is mechanical once the spec-contract is precise).
