---
name: pmatch
description: Pattern matching validation. Compares source-of-truth against target to check alignment. Lighter than /ar. Use to validate plans against designs, or implementations against plans.
allowed-tools: Read, Glob, Grep, Task
argument-hint: "[source] [target]"
agents:
  - name: pm-s
    model: sonnet
    mode: bypassPermissions
  - name: pm-k
    model: haiku
    mode: bypassPermissions
---

# Opus Pattern Match Protocol

## Your Role
You orchestrate pattern matching agents to validate alignment between a source-of-truth and a target. Lightweight alternative to `/ar` for checking if plans match designs, or implementations match plans.

Kimi (pm-k) is a Haiku proxy agent — it reads the documents, curls the LiteLLM endpoint, and relays results. It needs `bypassPermissions` mode so the curl call isn't blocked.

---

## Phase Tracking

Before any work, create ALL tasks in full detail using `TaskCreate`. Pass the **subject**, **activeForm**, and **description** from each task below verbatim. Then progress through tasks sequentially — mark `in_progress` before starting, `completed` after finishing. Do not begin a task until the prior task is completed.

---

## Input
```
/pmatch <source> <target>
```

- **source**: The document to validate against (source of truth)
- **target**: Document, directory path, or `codebase` keyword

---

### Task 1: Parse inputs (source and target)

- **activeForm**: Parsing inputs
- **description**: Parse the `/pmatch` arguments to get source and target paths.

  ```yaml
  target_types:
    - type: Document
      detection: Ends in .md
      handling: Pass path to agents
    - type: Directory
      detection: Path exists as dir
      handling: Pass path to agents (they search within)
    - type: codebase
      detection: Literal keyword
      handling: Pass keyword to agents (they search full project)
  ```

### Task 2: Create team and spawn matchers

- **activeForm**: Spawning matchers
- **description**: All agents have their own built-in protocols and establish their own context. You just point them at the documents.

  Use `TeamCreate` with a descriptive name (e.g., `pmatch-[feature]`). Create one task per matcher using `TaskCreate`. Send a **single message** with two `Task` tool calls. Use `subagent_type`, `model`, and `mode` from the `agents` field in this skill's frontmatter.

  **Spawn prompt template:**
  ```
  Pattern match source (source of truth): [SOURCE_PATH]
  Target: [TARGET_PATH]

  When done, mark your task as completed and message the lead with your findings.
  ```

  **Error handling**: If an agent fails or is killed, proceed with the remaining agent. One-of-two is sufficient. Note reduced confidence in the report.

### Task 3: Merge findings and score consensus

- **activeForm**: Merging findings
- **description**: Combine results from both agents:

  1. **Deduplicate claims** — Same claim found by both = single entry
  2. **Consensus scoring**:
     - Both agree MATCHED → High confidence
     - Both agree GAP → High confidence
     - Disagreement → Flag for review
  3. **Merge extras** — Union of extras found by each agent

### Task 4: Produce alignment report

- **activeForm**: Producing report
- **description**: Shut down teammates and clean up the team, then output the report.

```markdown
# Pattern Match: [source] → [target]

## Summary
**[X/Y] claims validated** | **[N] gaps** | **[M] extras**

Consensus: [High/Mixed] (agents agreed on X/Y items)

## Matched ✓
| # | Claim | Location | Confidence |
|---|-------|----------|------------|
| 1 | [claim] | [file:line] | High (both) |
| 2 | [claim] | [file:line] | Medium (pm-s only) |

## Gaps ✗
| # | Claim | Notes |
|---|-------|-------|
| 3 | [claim] | NOT FOUND |
| 4 | [claim] | NOT FOUND |

## Partial ~
| # | Claim | What's Missing |
|---|-------|----------------|
| 5 | [claim] | [explanation] |

## Ambiguous ?
| # | Claim | Why Unclear |
|---|-------|-------------|
| 6 | [claim] | [pm-s: matched, pm-k: gap] |

## Extras in Target +
| Item | Location |
|------|----------|
| [extra] | [file:line] |

## Verdict
[ ] ALIGNED — Target fully covers source of truth
[ ] GAPS — [N] items missing, review required
[ ] PARTIAL — Significant gaps, likely needs revision
```

---

## When to Use /pmatch vs /ar

```yaml
usage:
  pmatch:  # checks alignment
    - Does my breakdown cover my solution design?
    - Did we implement everything in the breakdown?
    - Quick sanity check before implementation
  ar:  # stress-tests validity
    - Is this design architecturally sound?
    - What could go wrong with this approach?
    - Deep review before committing to architecture
```

**Rule of thumb**: `/pmatch` checks alignment. `/ar` stress-tests validity.

---

## Token Budget

```yaml
token_budget:
  - component: Orchestrator
    tokens: ~5K
    model: Opus
  - component: pm-s
    tokens: ~15-30K
    model: Sonnet
  - component: pm-k
    tokens: ~15-30K
    model: Kimi (via Haiku proxy)
  - component: Total
    tokens: ~35-65K
    model: Mixed
```

~3-5x cheaper than `/ar` due to minimal orchestrator context and no ar-o (Opus subagent).
