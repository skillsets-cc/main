---
name: pmatch
description: Pattern matching validation. Compares source-of-truth against target to check alignment. Lighter than /ar. Use to validate plans against designs, or implementations against plans.
allowed-tools: Read, Glob, Grep, Task
argument-hint: "<source> <target>"
---

# Opus Pattern Match Protocol

## Your Role
You orchestrate pattern matching agents to validate alignment between a source-of-truth and a target. Lightweight alternative to `/ar` for checking if plans match designs, or implementations match plans.

## Input
```
/pmatch <source> <target>
```

- **source**: The document to validate against (source of truth)
- **target**: Document, directory path, or `codebase` keyword

## Workflow

### Step 1: Parse Inputs

Parse the `/pmatch` arguments to get source and target paths.

| Target Type | Detection | Handling |
|-------------|-----------|----------|
| Document | Ends in `.md` | Pass path to agents |
| Directory | Path exists as dir | Pass path to agents (they search within) |
| `codebase` | Literal keyword | Pass keyword to agents (they search full project) |

### Step 2: Launch Pattern Matching Agents

All agents have their own built-in protocols, full tool access (filesystem search), and establish their own context. You just point them at the documents.

Send a **single message** with two Task tool calls, both with `run_in_background: true`:

| `subagent_type` | Description |
|-----------------|-------------|
| `pm-s` | Sonnet pattern matcher |
| `pm-k` | Kimi pattern matcher |

**Prompt**: Pass the source and target paths from the `/pmatch` arguments. Example:

```
Pattern match source (source of truth): PROCESS_DOCS/execution/feature-name.md
Target: PROCESS_DOCS/design/feature-name.md
```

The agents handle the rest — reading files, extracting claims, validating alignment.

### Error Handling

If an agent fails or is killed, proceed with the remaining agent. One-of-two is sufficient. Note reduced confidence in the report.

### Step 3: Merge Findings

Combine results from both agents:

1. **Deduplicate claims** - Same claim found by both = single entry
2. **Consensus scoring**:
   - Both agree MATCHED → High confidence ✓
   - Both agree GAP → High confidence ✗
   - Disagreement → Flag for review ?
3. **Merge extras** - Union of extras found by each agent

### Step 4: Produce Report

Output structured alignment report:

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

| Scenario | Use |
|----------|-----|
| "Does my execution plan cover my design?" | `/pmatch` |
| "Did we implement everything in the plan?" | `/pmatch` |
| "Is this design architecturally sound?" | `/ar` |
| "What could go wrong with this approach?" | `/ar` |
| "Quick sanity check before implementation" | `/pmatch` |
| "Deep review before committing to architecture" | `/ar` |

**Rule of thumb**: `/pmatch` checks alignment. `/ar` stress-tests validity.

---

## Token Budget

| Component | Tokens | Model |
|-----------|--------|-------|
| Orchestrator | ~5K | Opus |
| pm-s | ~15-30K | Sonnet |
| pm-k | ~15-30K | Kimi |
| **Total** | ~35-65K | Mixed |

~3-5x cheaper than `/ar` due to minimal orchestrator context and no ar-o (Opus subagent).
