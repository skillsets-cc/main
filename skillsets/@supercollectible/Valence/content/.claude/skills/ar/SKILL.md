---
name: ar
description: Opus-orchestrated adversarial review with cost/benefit analysis. Launches ar-o, ar-k, ar-glm5 in parallel, synthesizes findings. Use for validating design docs before /plan.
allowed-tools: Read, Glob, Grep, Task
argument-hint: "[path/to/document]"
agents:
  - name: ar-o
    model: opus
  - name: ar-k
    model: haiku
  - name: ar-glm5
    model: haiku
---

# Opus Adversarial Review Protocol

You orchestrate adversarial review agents and synthesize their findings into actionable recommendations.

---

## Phase Tracking

After creating the team, create ALL tasks in full detail using `TaskCreate`. Pass the **subject**, **activeForm**, and **description** from each task below verbatim. Then progress through tasks sequentially — mark `in_progress` before starting, `completed` after finishing. Do not begin a task until the prior task is completed.

If an agent fails or is killed, proceed with the remaining agents. Two-of-three is sufficient. Note reduced confidence in the report if fewer than three complete.

---

### Task 1: Create team

- **activeForm**: Creating team
- **description**: Read the target design document. Use `TeamCreate` with a descriptive name (e.g., `ar-[feature]`).

### Task 2: Create reviewer tasks

- **activeForm**: Creating reviewer tasks
- **description**: Create one task per reviewer using `TaskCreate`. These are the teammate tasks the reviewers will complete.

### Task 3: Spawn reviewer teammates

- **activeForm**: Spawning reviewers
- **description**: Send a single message with three `Task` tool calls. For each agent, use the `model` from the `agents` field in this skill's headmatter. Pass the document path from the `/ar` argument. Prompt: "Review the design document at [PATH]. When done, mark your task as completed and message the lead with your critique."

  | Agent | `subagent_type` | `model` | `mode` |
  |-------|-----------------|---------|--------|
  | Opus reviewer | `ar-o` | `opus` | (default) |
  | Kimi reviewer | `ar-k` | `haiku` | `bypassPermissions` |
  | GLM reviewer | `ar-glm5` | `haiku` | `bypassPermissions` |

### Task 4: Deduplicate findings

- **activeForm**: Deduplicating findings
- **description**: Collect critique notes from all agents. Group by category (architecture, security, performance, etc.). Overlapping concerns from multiple agents get higher confidence. Note unique concerns and which agent raised them.

### Task 5: Identify cross-agent patterns

- **activeForm**: Identifying patterns
- **description**: Analyze the deduplicated findings for cross-agent signal. Multiple agents flagging the same area → likely real issue. Single-agent concern with strong reasoning → still valid. Conflicting assessments → flag for deeper evaluation in the next step.

### Task 6: Load context and validate claims

- **activeForm**: Validating claims
- **description**: Load codebase context on-demand to validate each finding. Read relevant docs only when needed (finding about module X → read its README/ARC; finding about integration → read architecture docs; finding about patterns → read style guides). For each finding, verify: Is the agent's claim accurate? (Check against actual code/docs.) Is this a real problem or false positive for our context? Did the agent miss relevant constraints that change the assessment? Mark false positives with reasoning.

### Task 7: Run cost/benefit analysis per finding

- **activeForm**: Running cost/benefit analysis
- **description**: For each validated finding (not false positives), assess remediation value using ALL five factors below. Write the assessment per finding explicitly — do not skip any factor.

  | Factor | Question |
  |--------|----------|
  | **Severity** | Minor inconvenience, degraded UX, or system failure? |
  | **Probability** | Edge case, common path, or guaranteed? |
  | **Remediation Cost** | Simple fix, moderate rework, or architectural change? |
  | **Reversibility** | Fixable later, or load-bearing decision now? |
  | **Context Fit** | Does this matter for our users, scale, and constraints? |

  Not all valid findings warrant action. A real issue with low probability and high remediation cost may be correctly classified as "Noted."

### Task 8: Classify findings (Critical/Recommended/Noted)

- **activeForm**: Classifying findings
- **description**: Using the cost/benefit analysis from the previous task, classify each finding into one of three levels:

  | Level | Criteria |
  |-------|----------|
  | **Critical** | Blocks progress — must fix before implementation |
  | **Recommended** | High-value fix — worth addressing, not blocking |
  | **Noted** | Awareness only — minor or speculative |

### Task 9: Shut down teammates and clean up team

- **activeForm**: Shutting down team
- **description**: Send `shutdown_request` to all reviewer teammates. After all have shut down, call `TeamDelete` to clean up the team.

### Task 10: Write adversarial review report

- **activeForm**: Writing report
- **description**: Write the report to `PROCESS_DOCS/reviews/ar_NN_[design_doc].md` using this template. Each Critical and Recommended finding MUST include its cost/benefit assessment.

  ```markdown
  # Adversarial Review: [Document Name]

  ## Summary
  [1-2 sentence verdict]

  ## Critical (Must Address)

  ### [Issue Title]
  **Flagged by**: [agent(s)]  |  **Confidence**: [High/Medium/Low]

  [What's wrong and why it breaks things]

  | Factor | Assessment |
  |--------|------------|
  | Severity | [Minor inconvenience / Degraded UX / System failure] |
  | Probability | [Edge case / Common path / Guaranteed] |
  | Remediation Cost | [Simple fix / Moderate rework / Architectural change] |
  | Reversibility | [Fixable later / Load-bearing decision now] |
  | Context Fit | [Why this matters or doesn't for our users, scale, constraints] |

  **Mitigation**: [What to do]

  ## Recommended (High Value)

  ### [Issue Title]
  **Flagged by**: [agent(s)]  |  **Confidence**: [High/Medium/Low]

  [Severity and impact]

  | Factor | Assessment |
  |--------|------------|
  | Severity | [Minor inconvenience / Degraded UX / System failure] |
  | Probability | [Edge case / Common path / Guaranteed] |
  | Remediation Cost | [Simple fix / Moderate rework / Architectural change] |
  | Reversibility | [Fixable later / Load-bearing decision now] |
  | Context Fit | [Why this matters or doesn't for our users, scale, constraints] |

  **Mitigation**: [What to do]

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
