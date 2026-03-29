# Trace: Default Claude Code Behavior on Ambiguous Payment Spec

## User Prompt

```
/tdd I need something that handles payments. like credit cards and stuff. also refunds maybe? idk the details yet
```

## Assumed Context

Without the TDD skill loaded, `/tdd` is not a recognized command. Claude Code treats the entire input as a natural language request to build a payment system.

---

## Predicted Behavior Trace

### Step 1: Minimal Clarification, Then Assumptions

Default Claude Code would likely ask zero or very few clarifying questions. The typical behavior pattern is to acknowledge the vagueness briefly and then immediately start making assumptions and building. At most, it might say something like:

> "I'll build a payment handling system for you with credit card processing and refund support. Let me set up the project structure."

It would NOT ask questions like:
- What payment gateway (Stripe, Braintree, custom)?
- What language/framework?
- REST API or library?
- What credit card operations specifically (charge, authorize, capture)?
- What refund policies (full, partial, time-limited)?
- PCI compliance requirements?
- Database needs?
- Authentication/authorization model?

### Step 2: Project Scanning

Claude Code would scan the working directory to detect:
- Existing `package.json`, `tsconfig.json`, or similar project files
- Language and framework in use
- Existing directory structure

If no project exists, it would pick TypeScript/Node.js as a default (most common choice).

### Step 3: Start Coding Immediately

Claude Code would begin producing code directly. A typical sequence:

1. **Create project scaffolding** (if none exists):
   - `package.json` with dependencies (likely `stripe` or a mock)
   - `tsconfig.json`
   - Directory structure: `src/`, maybe `src/services/`, `src/types/`

2. **Define types/interfaces** based on its own assumptions:
   ```
   src/types/payment.ts
   - PaymentMethod interface (card number, expiry, cvv)
   - PaymentResult interface
   - RefundRequest interface
   ```

3. **Implement a PaymentService class**:
   ```
   src/services/paymentService.ts
   - processPayment(amount, card)
   - refundPayment(transactionId)
   - getPaymentStatus(transactionId)
   ```

4. **Maybe add a simple Express API**:
   ```
   src/routes/payments.ts
   - POST /payments
   - POST /payments/:id/refund
   - GET /payments/:id
   ```

5. **Possibly add tests as an afterthought**:
   - Tests would be written AFTER the implementation
   - Tests would be shaped to match the code already written
   - Tests would likely pass on first run (no RED phase)

### Step 4: Present the Result

Claude Code would present the completed code with a summary like:

> "I've created a payment processing system with the following features:
> - Credit card payment processing
> - Refund handling
> - Payment status tracking
> Here's the project structure..."

---

## Key Behavioral Observations

### 1. No Design Phase
Default Claude Code does not pause to propose a design document, architecture options, or request approval before building. It jumps from understanding to implementation.

### 2. Assumption-Heavy
The agent would silently decide:
- Language/framework (likely TypeScript + Node.js)
- Architecture (likely a service class pattern)
- Payment gateway (likely Stripe or an in-memory mock)
- API style (likely REST)
- Data model (its own invention)
- Scope (whatever feels "complete enough")

The user said "idk the details yet" but Claude Code would fill in ALL details itself without confirming them.

### 3. No Test-First Development
If tests are written at all, they come after the implementation. This means:
- Tests are shaped to validate existing code, not to define desired behavior
- No RED-GREEN-REFACTOR cycle
- No verification that tests can actually fail (anti-cheat concern)
- Test coverage is incidental, not intentional

### 4. No Iterative Decomposition
The entire payment system would be built in one pass rather than decomposed into independent, testable work units (e.g., "card validation," "charge processing," "refund logic" as separate units).

### 5. No Escalation or Pause Points
If something is ambiguous mid-implementation (e.g., "should partial refunds be supported?"), Claude Code would pick an answer and keep going rather than asking the user.

### 6. Potential Security Concerns
Without explicit guidance, the implementation might:
- Store card numbers in plain text in mock/test code
- Skip input validation
- Not consider PCI-DSS implications
- Use naive error handling

---

## Comparison Points for TDD Skill Evaluation

| Dimension | Default Claude Code | Expected with TDD Skill |
|---|---|---|
| Clarification | None or minimal | Phase 0 design gate would force spec refinement |
| Design review | None | Architecture proposal before any code |
| Test timing | After code (if at all) | Before code (RED first) |
| Decomposition | Monolithic pass | Work units with independent test/implement cycles |
| Assumptions | Silent, unchecked | Surfaced and confirmed or flagged |
| Anti-cheat | None | RED phase verification, mutation awareness |
| Scope control | Agent decides scope | Spec-driven, user-approved scope |
| Resume capability | None | State file enables incremental resume |
