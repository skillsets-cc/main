# Architecture Spec: [Project Name]

## 1. Executive Summary

[What is the system and why does it exist?]

## 2. Global Constraints

| Constraint | Value | Type | Notes |
|------------|-------|------|-------|
| Max concurrent users | N | Hard | Based on [reason] |
| Throughput | N req/s | Hard | [reason] |
| Storage | N GB | Soft | [reason] |
| Latency (p95) | N ms | Hard | [reason] |
| Availability | N nines | Soft | [reason] |
| ... | ... | ... | ... |

## 3. Rationale

| Decision | Rationale | Alternative | Why Rejected |
|----------|-----------|-------------|--------------|
| ... | ... | ... | ... |

## 4. Technology Stack

[Platform, key frameworks, infrastructure — global choices only]

## 5. Subsystem Map

| # | Subsystem | Purpose |
|---|-----------|---------|
| 0 | Scaffold  | [What to prove] |
| 1 | [Name]    | [One-line purpose] |
| 2 | [Name]    | [One-line purpose] |

> Build state is tracked in `[project-name].manifest.yaml`, not in this table.

## 6. Subsystem Contracts

### [Subsystem Name]
**Purpose**: [What it does]
**Inputs**: [What it receives and from whom]
**Outputs**: [What it produces and for whom]
**Invariants**: [What must always be true]
**Depends on**: [Other subsystems]
**Depended on by**: [Other subsystems]

## 7. Build Order

### Phase 0: Scaffold
**Purpose**: Project foundation and feasibility validation
**Scaffold**:
- [Project structure, build system, configs needed for later phases]
- [Shared infrastructure: CI, linting, test harness, dev tooling]
- [Dependencies and environment setup]
**Prove**:
- [Assumption 1 to validate]
- [Assumption 2 to validate]
**If feasibility passes**: Update `[project-name].manifest.yaml` — set Phase 0 to `done`. Add entry to Revision Log. Proceed to Phase 1.
**If feasibility fails**: Update `[project-name].manifest.yaml` — set Phase 0 to `failed` with notes. Append detailed findings to this spec under `## Feasibility Failures`. Do NOT proceed — loop back to `/arch`.

### Phase 1: [Subsystem Name]
**Purpose**: [What this phase delivers]
**Depends on**: Phase 0 complete, spec updated

### Phase 2: [Subsystem Name]
**Purpose**: [What this phase delivers]
**Depends on**: [Prior phase(s)]

## 8. Cross-Cutting Concerns

[Auth model, error strategy, logging, observability — boundary-level only]

## 9. Revision Log

| Version | Date | Summary |
|---------|------|---------|
| v1 | [date] | Initial spec |
