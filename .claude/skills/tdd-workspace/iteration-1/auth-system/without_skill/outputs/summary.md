# Summary: Default Claude Code Behavior on Auth System Prompt

## Verdict

Default Claude Code would produce a **working authentication system** but through a process that lacks rigor, verification, and structured quality assurance. The code would likely function for happy paths but carry hidden risks in edge cases, security assumptions, and test quality.

## Five Key Findings

### 1. No Design Questions Asked -- Jumps Straight to Coding
Default Claude Code does not pause to ask clarifying questions. It infers reasonable defaults (bcrypt, JWT with HS256, in-memory store, Express/TypeScript) and begins scaffolding immediately. Architecture decisions are implicit and undocumented. The user has no opportunity to steer the design before code is written.

### 2. No Formal Decomposition or Dependency Analysis
The system is built linearly (scaffolding, then registration, then login, then reset) without explicit work unit decomposition. There is no dependency graph, no identification of parallelizable units, and no structured tracking of what has been completed. The ordering is intuitive rather than optimized.

### 3. Tests Are Written AFTER Implementation (Code-First)
This is the most significant gap. Tests are written to match existing code, not to express requirements independently. Tests never go through a RED phase (failing before implementation exists). This means tests verify what was built rather than what was specified, creating a risk of tautological tests that pass by construction but miss real bugs.

### 4. No Agent Teams or Parallel Execution
All work happens in a single sequential thread. There is no Test Writer agent with an information barrier from the implementation, no separate Code Writer, no adversarial reviewer, and no spec compliance checker. The same "mind" writes both tests and code, eliminating the independence that catches bugs.

### 5. No Formal Verification or Anti-Cheat Checks
There is no RED/GREEN cycle enforcement, no mutation testing, no check that tests actually fail when implementation is removed, no anti-pattern detection, and no adversarial review pass. The only verification is "do the tests pass?" which is necessary but far from sufficient.

## Risk Assessment

| Risk | Severity | Likelihood |
|------|----------|------------|
| Tests that pass but do not catch real bugs | High | High |
| Missing edge case coverage (token reuse, concurrency, timing attacks) | High | High |
| Architecture mismatch with user's actual needs | Medium | Medium |
| Security defaults that are reasonable but not production-grade | Medium | Medium |
| No resume capability if session is interrupted | Low | Medium |

## What the TDD Skill Adds

The TDD skill addresses every gap identified above through:
- **Phase 0 (Design Gate)**: Forces architecture review before any code is written
- **Formal decomposition**: Creates work units with dependency DAG and parallel execution plan
- **Test-first with information barrier**: Test Writer agent cannot see implementation code
- **RED/GREEN enforcement**: Verifies tests fail before implementation, pass after
- **Agent teams**: Separate Test Writer, Code Writer, Adversarial Reviewer, and Spec Compliance Reviewer
- **Anti-pattern detection**: Five gate functions catch common testing mistakes
- **State management**: Checkpointed progress enabling incremental resume
- **Structured reporting**: Auditable session log and compliance matrix

## Bottom Line

Default Claude Code optimizes for **speed to a working result**. The TDD skill optimizes for **correctness, specification compliance, and test quality**. For a security-sensitive system like authentication, the latter matters significantly more.
