---
name: ar
description: Opus-orchestrated adversarial review with cost/benefit analysis. Launches ar-o, ar-k, ar-glm5 in parallel, synthesizes findings. Use for validating design docs before /breakdown.
allowed-tools: Read, Glob, Grep, Task
argument-hint: "[path/to/document]"
agents:
  - name: ar-o
    model: opus
    mode: bypassPermissions
  - name: ar-k
    model: sonnet
    mode: bypassPermissions
  - name: ar-glm5
    model: sonnet
    mode: bypassPermissions
---

# Opus Adversarial Review Protocol

You orchestrate adversarial review agents and synthesize their findings into actionable recommendations.

---

## Phase Tracking

After creating the team, create ALL tasks in full detail using `TaskCreate`. Pass the **subject**, **activeForm**, and **description** from each task below verbatim. Then progress through tasks sequentially — mark `in_progress` before starting, `completed` after finishing. Do not begin a task until the prior task is completed.

**Completion rule**: A task is NOT complete until its work product is visible in the conversation. Every task must produce explicit output (analysis, table, text) before marking `completed`. Marking a task completed without visible output is a protocol violation.

---

### Task 1: Create team

- **activeForm**: Creating team
- **description**: Read the target design document. Use `TeamCreate` with a descriptive name (e.g., `ar-[feature]`).

### Task 2: Create reviewer tasks

- **activeForm**: Creating reviewer tasks
- **description**: Create one task per reviewer using `TaskCreate`. These are the teammate tasks the reviewers will complete.

### Task 3: Spawn reviewer teammates

- **activeForm**: Spawning reviewers
- **description**: Send a single message with three `Task` tool calls. Use `subagent_type`, `model`, and `mode` from the `agents` field in this skill's frontmatter. Pass the document path from the `/ar` argument. Prompt: "Review the design document at [PATH]. When done, mark your task as completed and message the lead with your critique."

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

  ```yaml
  cost_benefit_factors:
    - factor: Severity
      question: Minor inconvenience, degraded UX, or system failure?
    - factor: Probability
      question: Edge case, common path, or guaranteed?
    - factor: Remediation Cost
      question: Simple fix, moderate rework, or architectural change?
    - factor: Reversibility
      question: Fixable later, or load-bearing decision now?
    - factor: Context Fit
      question: Does this matter for our users, scale, and constraints?
  ```

  Not all valid findings warrant action. A real issue with low probability and high remediation cost may be correctly classified as "Noted."

### Task 8: Classify findings (Critical/Recommended/Noted)

- **activeForm**: Classifying findings
- **description**: Using the cost/benefit analysis from the previous task, classify each finding into one of three levels:

  ```yaml
  classification_levels:
    - level: Critical
      criteria: Blocks progress — must fix before implementation
    - level: Recommended
      criteria: High-value fix — worth addressing, not blocking
    - level: Noted
      criteria: Awareness only — minor or speculative
  ```

### Task 9: Shut down teammates and clean up team

- **activeForm**: Shutting down team
- **description**: Send `shutdown_request` to all reviewer teammates. After all have shut down, call `TeamDelete` to clean up the team.

### Task 10: Write adversarial review report

- **activeForm**: Writing report
- **description**: Write the report to `PROCESS_DOCS/reviews/ar_NN_[design_doc].md` using the template at `.claude/resources/ar_report_template.md`. Each Critical and Recommended finding MUST include its cost/benefit assessment.

---

## Recommendation Logic

**REVISE** when:
- Any **Critical** issues remain

**PROCEED** when:
- No **Critical** issues
- Only **Recommended** or **Noted** items remain
