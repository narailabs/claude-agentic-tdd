# Baseline Summary: Ambiguous Payment Spec (Without TDD Skill)

## Verdict: 0/6 assertions would pass

## Predicted Behavior

Without the TDD skill, Claude Code would treat the `/tdd` prefix as unrecognized and
interpret the rest as a general coding request. In the dominant case (70-80% probability),
Claude would **skip clarification entirely** and jump straight to implementation, silently
assuming Stripe as the payment provider, picking a language/framework, and generating both
a PaymentService module and tests in a single pass.

In the less likely case (20-30%), Claude would ask clarifying questions but deliver them
as a **batch of 8-10 questions at once** (the "question dump" anti-pattern), rather than
the progressive one-at-a-time flow the skill enforces.

## Key Gaps vs. TDD Skill

| Capability | TDD Skill | Vanilla Claude |
|-----------|-----------|----------------|
| Ambiguity detection triggers design gate | Yes (Phase 0 hard gate) | No -- vagueness filled with defaults |
| Progressive one-at-a-time questioning | Yes | No -- batch dump or nothing |
| Technology-agnostic clarification | Yes | No -- assumes Stripe, TS, REST |
| Design summary with trade-offs | Yes | No -- single approach, no alternatives |
| Hard gate on user approval | Yes | No -- proceeds without approval |
| Test-first decomposition | Yes | No -- code-first or simultaneous |

## Bottom Line

The ambiguous-spec scenario is where the TDD skill's design gate provides the most value.
Vanilla Claude's instinct is to resolve ambiguity by making assumptions and writing code.
The skill forces a structured pause: detect ambiguity, clarify progressively, present
trade-offs, get approval, then proceed. Without the skill, the user receives a
fully-formed implementation they never asked for, built on assumptions they never approved.
