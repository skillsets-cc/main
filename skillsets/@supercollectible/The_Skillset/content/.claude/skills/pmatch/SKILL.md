---
name: pmatch
description: Pattern matching validation. Compares source-of-truth against target to check alignment. Lighter than /ar. Use to validate plans against designs, or implementations against plans.
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Task, Bash
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

Identify source and target:

| Target Type | Detection | Handling |
|-------------|-----------|----------|
| Document | Ends in `.md` | Read file directly |
| Directory | Path exists as dir | Agents search within path |
| `codebase` | Literal keyword | Agents search full project |

### Step 2: Prepare Context Bundle

Minimal context for agents:
1. Read the source document
2. If target is a document, read it
3. If target is codebase/directory, pass the path

**Do NOT load architecture docs**—this is pattern matching, not adversarial review.

### Step 3: Launch Pattern Matching Agents

Run both agents in parallel:

| Agent | Model | Method |
|-------|-------|--------|
| `pm-s` | Sonnet | Task tool with `subagent_type: pm-s` |
| `pm-k` | Kimi | LiteLLM HTTP call |

**For pm-s**: Use Task tool directly.

**For pm-k**: Call LiteLLM endpoint:
```bash
curl -X POST http://localhost:4000/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kimi-review",
    "messages": [
      {"role": "system", "content": "<pm-k agent protocol>"},
      {"role": "user", "content": "<source doc> + <target doc or path>"}
    ]
  }'
```

Each agent extracts claims from source and validates against target.

### Step 4: Merge Findings

Combine results from both agents:

1. **Deduplicate claims** - Same claim found by both = single entry
2. **Consensus scoring**:
   - Both agree MATCHED → High confidence ✓
   - Both agree GAP → High confidence ✗
   - Disagreement → Flag for review ?
3. **Merge extras** - Union of extras found by each agent

### Step 5: Produce Report

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
