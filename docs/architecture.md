# Agentic TDD — Architecture Diagram

## High-Level Pipeline

```mermaid
flowchart TB
    Input["/tdd &lt;spec | plan | test file&gt;"]

    subgraph Detection["Entry Point Detection"]
        M1["Mode 1: Natural Language Spec"]
        M2["Mode 2: Existing Codebase"]
        M3["Mode 3: User-Provided Test"]
        M4["Mode 4: Plan Execution"]
    end

    Input --> Detection

    subgraph Phase0["Phase 0: Design Gate (optional)"]
        Q["Clarifying Questions\n(one at a time)"]
        T["Trade-off Proposals\n(mandatory if gate fires)"]
        DS["Design Summary"]
        UA["User Approval\n(HARD GATE)"]
        Q --> T --> DS --> UA
    end

    Detection -->|"complex/ambiguous"| Phase0
    Detection -->|"simple/skip-design"| Phase1

    Phase0 --> Phase1

    subgraph Phase1["Phase 1: Framework Detection"]
        FD["Auto-detect from project files\n(package.json, go.mod, Cargo.toml, ...)"]
    end

    Phase1 --> Phase2

    subgraph Phase2["Phase 2: Work Decomposition"]
        Classify["Classify each unit:\ncode vs task"]
        Deps["Dependency Analysis\n(topological sort)"]
        Batches["Compute Parallel Batches"]
        Confirm["User Confirmation\n(confirm/modify/cancel)"]
        Classify --> Deps --> Batches --> Confirm
    end

    Phase2 --> Phase3

    subgraph Phase3["Phase 3: State Init"]
        State[".tdd-state.json\n(resume support)"]
    end

    Phase3 --> Phase4
```

## Phase 4: Agent Team Orchestration

```mermaid
flowchart TB
    subgraph Batch["Per Batch (parallel up to maxParallelPairs)"]

        subgraph TDD["Code Task: TDD Pipeline"]
            TW["Test Writer\n(writes failing tests)"]
            RED["RED Verification\n5 checks"]
            CW["Code Writer\n(information barrier)"]
            GREEN["GREEN Verification\n4 checks"]
            SR1["Spec Compliance\nReview"]
            AR["Adversarial\nReview"]
            CQR1["Code Quality\nReview"]

            TW --> RED --> CW --> GREEN --> SR1 --> AR --> CQR1
        end

        subgraph IMP["Non-Code Task: Implementer Pipeline"]
            IM["Implementer\n(self-review)"]
            SR2["Spec Compliance\nReview"]
            CQR2["Code Quality\nReview"]

            IM --> SR2 --> CQR2
        end
    end

    Batch --> NextBatch["Next Batch\n(wait for all units to complete)"]
    NextBatch -->|"more batches"| Batch
    NextBatch -->|"all done"| Phase5

    subgraph Phase5["Phase 5: Final Review"]
        TS["Run Full Test Suite"]
        HC["Holistic Code Review"]
        IC["Cross-Unit Integration Check"]
        TS --> HC --> IC
    end

    Phase5 --> Phase6["Phase 6: Report\ntdd-report.md + tdd-session.jsonl"]
    Phase6 --> Phase7["Phase 7: Cleanup\n(remove spec-contracts, shut down agents)"]
```

## Anti-Cheat Guardrails

```mermaid
flowchart LR
    subgraph RED["RED Verification (5 checks)"]
        R1["Tests exist on disk"]
        R2["Tests FAIL (exit != 0)"]
        R3["Correct failure type\n(not syntax errors)"]
        R4["Assertion density\n>= minimum per test"]
        R5["Behavior over implementation\n(no private method tests)"]
    end

    subgraph GREEN["GREEN Verification (4 checks)"]
        G1["Test file checksums\nUNCHANGED"]
        G2["No skip markers added\n(.skip, xit, @Ignore)"]
        G3["ALL tests PASS\n(exit == 0)"]
        G4["No hardcoded returns"]
    end

    subgraph BARRIER["Information Barrier"]
        B1["Code Writer receives ONLY:\n- test file (from disk)\n- spec-contract (from disk)"]
        B2["Code Writer NEVER sees:\n- Test Writer reasoning\n- Other units' code\n- Implementation hints"]
    end
```

## Coverage Mode RED (Mode 2 Adaptation)

```mermaid
flowchart LR
    Hide["mv impl.ts\nimpl.ts.tdd-hidden"] --> RunFail["Run tests\n(must FAIL with\nimport errors)"]
    RunFail --> Restore["mv impl.ts.tdd-hidden\nimpl.ts"]
    Restore --> RunPass["Run tests\n(must PASS)"]
    RunPass --> Proceed["Proceed to\nCode Writer\n(may be no-op)"]
```

## Subagent Status Protocol

```mermaid
flowchart TB
    Agent["Any Subagent\n(Test Writer, Code Writer, Implementer)"]

    Agent -->|DONE| Next["Proceed to next phase"]
    Agent -->|DONE_WITH_CONCERNS| Assess{"Correctness\nconcern?"}
    Assess -->|yes| Fix["Address before proceeding"]
    Assess -->|no| Note["Note and proceed"]
    Agent -->|NEEDS_CONTEXT| Provide["Provide context\nand re-dispatch"]
    Agent -->|BLOCKED| Evaluate{"Assess blocker"}
    Evaluate -->|context| Provide
    Evaluate -->|reasoning limit| Upgrade["Re-dispatch with\nmore capable model"]
    Evaluate -->|too large| Split["Break into\nsmaller tasks"]
    Evaluate -->|plan is wrong| Escalate["Escalate to user"]
```

## Parallel Execution Model

```mermaid
flowchart LR
    subgraph B1["Batch 1 (parallel)"]
        U1["db-migration\n[task]"]
        U2["env-config\n[task]"]
    end
    subgraph B2["Batch 2"]
        U3["user-registration\n[code]"]
    end
    subgraph B3["Batch 3"]
        U4["user-login\n[code]"]
    end
    subgraph B4["Batch 4"]
        U5["api-docs\n[task]"]
    end

    B1 -->|"all complete"| B2 -->|"complete"| B3 -->|"complete"| B4
```

## Three-Stage Review Pipeline

```mermaid
flowchart LR
    subgraph Stage1["Stage 1: Spec Compliance"]
        SC["Does it do\nthe right thing?"]
    end
    subgraph Stage2["Stage 2: Adversarial Review"]
        ADV["Can the tests\nbe broken?\n(TDD tasks only)"]
    end
    subgraph Stage3["Stage 3: Code Quality"]
        CQ["Is it\nbuilt well?"]
    end

    Stage1 -->|"COMPLIANT"| Stage2 -->|"PASS"| Stage3
    Stage1 -->|"NON-COMPLIANT"| Revise1["Revise & re-review"]
    Stage2 -->|"FAIL"| Revise2["Revise & re-review"]
    Stage3 -->|"Needs Changes"| Revise3["Fix & re-review"]
    Stage3 -->|"Approved"| Done["Mark Complete"]
```
