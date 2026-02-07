---
name: ar
description: Opus-orchestrated adversarial review with cost/benefit analysis. Launches ar-o, ar-k, ar-d in parallel, synthesizes findings. Use for validating design docs before /plan.
allowed-tools: Read, Glob, Grep, Task
argument-hint: "[path/to/document]"
---

# Opus Adversarial Review Protocol

You orchestrate adversarial review agents and synthesize their findings into actionable recommendations.

---

## Step 1: Launch Reviewers

Read the target design document, then launch all three reviewers in parallel.

All agents have their own built-in protocols, full tool access (filesystem, Context7, web search), and establish their own codebase context. You just point them at the document.

### 1.1 Launch in Parallel

Send a **single message** with three Task tool calls, all with `run_in_background: true`:

| `subagent_type` | Description |
|-----------------|-------------|
| `ar-o` | Opus reviewer |
| `ar-k` | Kimi reviewer |
| `ar-d` | Deepseek reviewer |

**Prompt**: Pass the document path from the `/ar` argument. Example:

```
Review the design document at PROCESS_DOCS/design/feature-name.md
```

The agents handle the rest — codebase exploration, library lookups, structured critique.

### 1.2 Error Handling

If an agent fails or is killed, proceed with the remaining agents. Two-of-three is sufficient. Note reduced confidence in the report if fewer than three complete.

---

## Step 2: Aggregate Findings

Collect critique notes from all agents:

### 2.1 Deduplicate
- Group by category (architecture, security, performance, etc.)
- Overlapping concerns from multiple agents → higher confidence
- Note unique concerns and which agent raised them

### 2.2 Identify Patterns
- Are multiple agents flagging the same area? → likely real issue
- Single-agent concern with strong reasoning? → still valid
- Conflicting assessments? → flag for deeper evaluation

---

## Step 3: Evaluate Findings (Lazy Context)

Now load context on-demand to validate each finding.

### 3.1 For Each Finding
Read relevant docs only when needed:
- Finding about module X → read `README_X.md` or `ARC_X.md`
- Finding about integration → read `ARCHITECTURE_*.md`
- Finding about patterns → read style guides

### 3.2 Validate Claims
For each finding, verify in context:
- Is the agent's claim accurate? (Check against actual code/docs)
- Is this a real problem or false positive for our context?
- Did the agent miss relevant constraints that change the assessment?

### 3.3 Cost/Benefit Analysis
For validated findings, assess remediation value:

| Factor | Question |
|--------|----------|
| **Severity** | Minor inconvenience, degraded UX, or system failure? |
| **Probability** | Edge case, common path, or guaranteed? |
| **Remediation Cost** | Simple fix, moderate rework, or architectural change? |
| **Reversibility** | Fixable later, or load-bearing decision now? |
| **Context Fit** | Does this matter for our users, scale, and constraints? |

Not all valid findings warrant action. A real issue with low probability and high remediation cost may be correctly classified as "Noted."

### 3.3 Classify

| Level | Criteria |
|-------|----------|
| **Critical** | Blocks progress—must fix before implementation |
| **Recommended** | High-value fix—worth addressing, not blocking |
| **Noted** | Awareness only—minor or speculative |

---

## Step 4: Produce Report

```markdown
# Adversarial Review: [Document Name]

## Summary
[1-2 sentence verdict]

## Critical (Must Address)
- **[Issue]**: [Why it breaks things] → [Mitigation]

## Recommended (High Value)
- **[Issue]**: [Severity + impact] → [Mitigation]

## Noted (Awareness)
- **[Issue]**: [Minor concern]

## Recommendation
[ ] REVISE — Critical issues require design changes before /plan
[ ] PROCEED — Ready for /plan with optional improvements noted
```

---

## Recommendation Logic

**REVISE** when:
- Any **Critical** issues remain

**PROCEED** when:
- No **Critical** issues
- Only **Recommended** or **Noted** items remain
