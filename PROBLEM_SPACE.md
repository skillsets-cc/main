# The Claude Code skills ecosystem has a trust crisis

**No marketplace in the Claude Code ecosystem currently enforces structural verification, integrity checks, and human review together.** Across 20+ registries and directories analyzed, the dominant pattern is automated GitHub scraping with minimal-to-zero quality gates — a pattern that has already produced 1,467 documented malicious payloads and a CVSS 10/10 zero-click RCE affecting 10,000+ users. The three-tier verification model proposed by skillsets.cc (structural audit → qualitative Opus review → human approval) would be the first system to combine automated and human vetting with cryptographic integrity verification. This matters because the ecosystem is growing explosively — over 54,000 indexed skills, 9,000+ plugins, dozens of competing directories — while Anthropic itself disclaims responsibility for verifying third-party contributions and declined to patch a critical extension vulnerability, calling its MCP integration "a local development tool."

---

## Anthropic's own marketplace is a black box with strong disclaimers

The **official Anthropic marketplace** (github.com/anthropics/claude-plugins-official, claude.com/plugins) maintains **~29 plugins** — 12 internal, 17 external — with **7,500 GitHub stars** and a carefully controlled submission process. External contributors cannot submit pull requests; a GitHub Actions workflow automatically closes any external PR and redirects to a submission form at clau.de/plugin-directory-submission. What happens after submission is opaque.

The phrase "basic automated review" appears on claude.com/plugins but is never defined. No public documentation describes what automated checks run, what criteria are evaluated, or what tools are used. The **"Anthropic Verified" badge** appears exclusively on Anthropic-authored plugins (Frontend Design at 120,556 installs, Code Review at 57,705, Feature Dev at 55,041) and select internal tools. No third-party plugin — not Context7 (83,089 installs), not GitHub MCP (57,038 installs), not Playwright, Supabase, or Figma — carries this badge. The verified badge effectively means "we built this," not "we audited this."

Anthropic's disclaimers are stark: "Anthropic does not control what MCP servers, files, or other software are included in plugins and **cannot verify that they will work as intended or that they won't change**." Community plugins may "install unverified, third party software that could be malicious." The official Agent Skills documentation recommends using skills "only from trusted sources: those you created yourself or obtained from Anthropic." There are no publicly documented cases of plugin rejection or removal — the form-based process ensures all decisions happen behind closed doors.

The plugin specification itself permits five extension mechanisms: commands, skills, agents, hooks, and MCP servers. Plugins install to `~/.claude/plugins/cache/` and are effectively read-only after installation. Marketplace entries support an optional `sha` field for git commit pinning, but this is not enforced. **No mandatory integrity verification exists for plugin installs.** Hooks can execute arbitrary shell commands transparently during normal usage, and plugins inherit the user's full system permissions with no plugin-specific sandboxing.

---

## Scraped aggregators dominate the landscape — with predictable consequences

The majority of the ecosystem consists of automated aggregators that scrape GitHub for SKILL.md files and list them with minimal filtering. This architecture has created a discoverability crisis and a security surface that attackers are actively exploiting.

**SkillsMP** (skillsmp.com) claims **200,000+ skills** aggregated via automated GitHub scraping. Its only quality gate is a **2-star minimum** on source repositories. The site acknowledges it is "in the collection phase" and states "quality curation is our next priority" — meaning quality curation does not yet exist. No human review occurs. Users are told to "review the code before installing" and "treat community skills like any open-source code."

**SkillHub** (skillhub.club) takes a more sophisticated approach with **21,300+ skills** evaluated by an AI scoring system across five dimensions: Practicality, Clarity, Automation, Quality, and Impact. Skills receive a composite score (1-10 scale) and tier ranking: **S-rank** (9.0+, "exceptional"), **A-rank** (8.0+, "excellent"), down to B-rank and below. Additional dimensions including Security, Maintainability, and Innovation appear on individual skill pages. SkillHub also offers a desktop Tauri app, CLI tool (`npx @skill-hub/cli install`), and a browser-based Playground. Despite this infrastructure, **no human review exists** — evaluation is entirely AI-driven, raising the question of AI evaluating AI-generated content for AI consumption.

**claudemarketplaces.com** automatically discovers GitHub repositories containing valid `.claude-plugin/marketplace.json` files on a daily cycle, with a **5-star minimum** threshold. Security researcher PromptArmor specifically flagged this site as a supply-chain attack vector: "claudemarketplaces.com appears to be a leading registry for Marketplaces. It automatically scrapes GitHub to find new ones every hour. This means that they will list a malicious Marketplace in their registry for people to discover **within an hour of an attacker making it public**."

**claude-plugins.dev** auto-indexes all public GitHub SKILL.md files, reaching **54,140+ skills** — the largest single index. No quality filtering is apparent.

| Platform | Size | Quality gate | Human review | Install verification |
|----------|------|-------------|--------------|---------------------|
| Anthropic Official | ~29 plugins | Undisclosed "basic automated review" | Opaque (form-based) | Optional SHA pinning |
| SkillsMP | 200,000+ skills | 2 GitHub stars minimum | No | None |
| SkillHub | 21,300+ skills | AI 5-dimension scoring (S/A/B tiers) | No | None |
| claudemarketplaces.com | Dynamic (daily scrape) | 5 GitHub stars minimum | No | None |
| claude-plugins.dev | 54,140+ skills | None visible | No | None |
| claudecodemarketplace.com | Dynamic | None visible | No | None |
| cc-marketplace | Community-driven | None documented | Unclear | None |
| mcpservers.org | Curated selection | Editorial curation | Likely yes | None |
| buildwithclaude.com | 51 plugins, 29 skills | PR review | Likely yes | None |

---

## Curated lists enforce quality through editorial gatekeeping

Against the aggregator landscape, several curated repositories maintain meaningful quality bars through human editorial judgment — but none implement systematic verification.

**awesome-claude-code** (hesreallyhim) is the ecosystem's dominant community hub at **~23,500 stars**. The sole maintainer writes opinionated editorial commentary for every entry, enforces licensing requirements (flagging and removing entries without proper license information), and actively curates what gets included. This is strong human review, but it's one person's judgment without a structured verification framework.

**awesome-claude-skills** (travisvn, **~6,900 stars**) enforces the most explicit quality bar among curated lists. Its CONTRIBUTING.md states: "The skill should be a value-add. Trivial functionalities that were whipped up with a session or two with Claude Code are not likely to be worthwhile skills." The maintainer requires **social proof** — a PR for a Kibana Plugin Helper was rejected with the message "Closing for now. Feel free to resubmit once you've met the criteria for social proof."

**awesome-agent-skills** (VoltAgent, **300+ skills**) anchors its collection around **official dev team skills** from Trail of Bits, Cloudflare, Google Labs, Vercel, Stripe, Sentry, Expo, and Hugging Face. Its quality policy is explicit: "Please don't submit skills you created 3 hours ago. We're now focusing on community-adopted skills, especially those published by development teams and proven in real-world usage." However, the repo includes a disclaimer: "We select community-adopted, proven skills and **do not audit, endorse, or guarantee the security or correctness** of listed projects."

**obra/superpowers** (Jesse Vincent) maintains **20+ battle-tested skills** across a tiered repository ecosystem: core skills in the main repo, community contributions in `superpowers-skills`, and experimental work in `superpowers-lab`. The TDD-first methodology (red-green-refactor cycles) and the meta-skill "writing-skills" that teaches contributors the standard represent the highest individual quality bar in the ecosystem — but it's fundamentally a single-author library, not a marketplace.

**ClaudeKit** (mrgoonie, **~1,500 stars**) bridges open source and commercial, with free skills on GitHub and a premium ClaudeKit.cc offering ("ClaudeKit Engineer" with 50+ slash commands, multi-agent orchestration). The author claims "6+ months digging into every aspect of Claude Code." ClaudeKit also operates **Skillmark**, an agent skill benchmarking platform with public leaderboards — a unique quality signal in the ecosystem.

---

## Security vulnerabilities have moved from theoretical to actively exploited

The pain points research revealed a security landscape far worse than mere theoretical concerns. **Active exploitation is documented, and the ecosystem's trust model is fundamentally broken.**

Snyk's **ToxicSkills** research found **1,467 malicious payloads** across agent skills repositories, with 8 malicious skills remaining publicly available on ClawHub.ai at time of publication. A single user ("zaycv") uploaded 40+ malicious skills following identical programmatic patterns. Attack techniques included external malware links, data exfiltration, and memory poisoning. The key insight: "The published skill appears benign during review. But attackers can **modify behavior at any time** by updating the fetched content."

LayerX Security discovered a **CVSS 10/10 zero-click RCE** in Claude Desktop Extensions in February 2026, exploitable via a malicious Google Calendar event. The attack affected 10,000+ users and 50+ extensions. **Anthropic declined to fix it**, stating it "falls outside our current threat model." Koi Security separately found **CVSS 8.9 command injection** vulnerabilities in three of Anthropic's own extensions (Chrome, iMessage, Apple Notes).

PromptArmor documented a complete **malicious marketplace plugin injection** attack chain, demonstrating how hooks bypass human-in-the-loop permission approvals and how automated registry scrapers (specifically claudemarketplaces.com) would list a malicious marketplace within an hour of creation. The supply chain vulnerability CVE-2025-6514 in `mcp-remote` (a widely-used OAuth proxy with **437,000+ downloads**) showed how server-provided OAuth endpoints could execute arbitrary shell commands.

Community frustration compounds these security issues. Developer Scott Spence documented that Claude Code skills activate reliably only about **50% of the time** — "basically a coin flip." After 200+ tests, the best approaches reached only 80-84% success rates. On Hacker News, developers expressed frustration with the plugin system's inability to hot-reload (requiring full app restarts), SSH/HTTPS confusion during marketplace installation, and MCP configuration files being silently ignored when placed in the wrong location.

---

## Plugins and skillsets serve fundamentally different purposes

The Claude Code plugin specification and the skillsets.cc model target different layers of the development workflow, and this distinction is critical to understanding skillsets.cc's competitive positioning.

**Plugins** are atomic capability bundles that install to a managed cache (`~/.claude/plugins/cache/`), are effectively read-only after installation, and extend Claude's toolkit with individual tools, commands, or integrations. They cannot deliver CLAUDE.md — the orchestration layer that defines how a project operates — as a first-class component. Plugin installs have no mandatory integrity verification. No production proof is required to create or distribute plugins. The plugin system is designed for modularity: install a GitHub plugin, a Playwright plugin, a Sentry plugin, and they coexist as independent capabilities.

**Skillsets** (as described by skillsets.cc and partially implemented by noriskillsets.dev) are integrated workflow configurations that install to the project root (CLAUDE.md, `.claude/`, support stack) and are designed to be owned, edited, and versioned by the team. They define the operating environment — not just what tools are available, but how the agent should approach work, what standards to enforce, and what workflows to follow. The key differentiators are SHA-256 verified installs, production proof requirements, and the three-tier verification pipeline.

The **agentskills.io** standard (published by Anthropic in December 2025, adopted by 26+ platforms including OpenAI Codex and Gemini CLI) defines the underlying SKILL.md format that both plugins and skillsets build upon. It specifies a progressive disclosure model: metadata (~100 tokens at startup) → instructions (full SKILL.md when activated) → resources (scripts/references loaded on demand). The spec intentionally stays minimal — as Simon Willison noted, "It is a deliciously tiny specification... also quite heavily under-specified." Quality requirements are limited to format guidance: descriptions should explain both WHAT and WHEN, SKILL.md should stay under 500 lines, scripts should be self-contained.

The only platform besides skillsets.cc that explicitly bundles CLAUDE.md alongside skills as a first-class packaging concept is **noriskillsets.dev** (Nori/Tilework Tech), which launched around February 16, 2026. Nori's "Skillsets" include Skills + CLAUDE.md + Subagents + Slash Commands, with a CLI that manages profiles in `~/.nori/profiles/` and copies configurations into `.claude/` on activation. Nori's positioning directly mirrors skillsets.cc's thesis, framing itself as "the ease and simplicity of NPM with the quality guarantees of the Apple App Store" and explicitly targeting the "slop" problem.

---

## The submission and install experience gap is enormous

Across every competitor analyzed, the submission and installation experience ranges from minimal to nonexistent. No platform approaches the guided submission and verified installation workflow described by skillsets.cc.

**Submission experiences** fall into three categories. First, **"open a PR"** — the dominant model for curated lists (awesome-claude-code, awesome-claude-skills, awesome-agent-skills, superpowers). Contributors fork, add entries, and submit PRs with varying levels of guidance. awesome-claude-skills provides a CONTRIBUTING.md with explicit criteria; awesome-claude-code has no formal contributing guide beyond the README. Second, **"fill out a form"** — Anthropic's official marketplace and cc-marketplace use web forms, but provide no feedback loop during the review process. Third, **"push to GitHub and we'll scrape it"** — SkillsMP, SkillHub, claudemarketplaces.com, and claude-plugins.dev require nothing from contributors beyond having a public repository with a SKILL.md file.

None of these platforms offer a guided preparation flow, structural pre-audit, or qualitative review before submission. The /contribute 5-phase agent (init → content prep → structural audit → qualitative review → submit) described by skillsets.cc would be unique in the ecosystem.

**Installation experiences** are equally bare. The standard pattern is either a CLI command (`/plugin marketplace add owner/repo` → `/plugin install name`) or manual file copying (`git clone` → copy to `~/.claude/skills/`). SkillHub's CLI (`npx @skill-hub/cli install`) and desktop app provide the most polished install flow, but without checksum verification or onboarding. No platform offers interactive project-specific configuration, dependency consent prompts, or post-install walkthroughs. The `/install skill` command with SHA-256 verification and interactive QUICKSTART walkthrough described by skillsets.cc would be a first.

---

## Competitive comparison across key dimensions

| Platform | Submission method | Quality gates | Human review | Install QOL | Production proof | Integrity verification | Workflow vs atomic |
|----------|------------------|---------------|-------------|-------------|-----------------|----------------------|-------------------|
| **Anthropic Official** | Web form (clau.de/plugin-directory-submission) | Undisclosed automated review | Opaque | CLI command, no onboarding | No | Optional SHA pinning | Atomic plugins |
| **SkillsMP** | Auto-scraped from GitHub | 2-star minimum | No | Manual copy or MCP server | No | None | Atomic skills |
| **SkillHub** | Auto-indexed from GitHub | AI 5-dimension scoring, S/A/B tiers | No | CLI + desktop app | No | None | Atomic skills + "Skill Stacks" bundles |
| **awesome-claude-code** | GitHub PR | Editorial review, licensing required | Yes (single curator) | N/A (list only) | No | None | Mixed (list) |
| **awesome-claude-skills** | GitHub PR + CONTRIBUTING.md | Social proof required, value-add criteria | Yes (active rejection) | N/A (list only) | No | None | Atomic skills |
| **awesome-agent-skills** | GitHub PR | Community-adopted, official team priority | Yes (quality > quantity) | N/A (list only) | Implied (adoption) | None | Atomic skills |
| **awesome-claude-plugins** | GitHub PR | Minimal (breadth-focused) | Minimal | CAM CLI tool | No | None | Mixed |
| **Superpowers** | GitHub PR + tiered repos | Battle-tested, TDD methodology | Yes (Jesse Vincent) | Auto-activate on context | No | None | Workflow-oriented |
| **ClaudeKit** | Maintainer-authored + commercial | Commercial quality incentive | Yes (single author) | CLI (`ck` commands) | No | None | Both (free + premium) |
| **claudemarketplaces.com** | Auto-scraped daily | 5-star minimum, schema validation | No | Links to CLI commands | No | None | Directory only |
| **cc-marketplace** | Web form | None documented | Unclear | Standard plugin install | No | None | Commands + agents |
| **mcpservers.org** | Submission form | Editorial curation | Likely yes | Manual copy | No | None | Atomic skills |
| **buildwithclaude.com** | GitHub PR + CONTRIBUTING.md | PR review | Likely yes | Standard plugin install | No | None | Plugins |
| **paddo/claude-tools** | Single author | Author-maintained | Yes (single author) | Plugin marketplace add | No | None | Focused plugins |
| **mhattingpete** | Single author | Integrated workflow design | Yes (single author) | Plugin marketplace add | No | None | Workflow bundles |
| **Nori/noriskillsets.dev** | Curated registry | "Battle-tested," anti-slop curation | Claimed | CLI (init, download, switch) | Implied | Not documented | **Integrated skillsets** |
| **Skill_Seekers** | N/A (generation tool) | 700+ tests, AI enhancement | Open contributions | CLI pipeline | N/A | None | Skill generation |
| **agentskills.io** | N/A (specification) | Format validation only | N/A | N/A | No | Validation tool | Standard definition |
| **skillsets.cc** | /contribute 5-phase agent | Structural audit + Opus review + human | **Yes (three-tier)** | SHA-256 verified + QUICKSTART | **Yes** | **SHA-256** | **Integrated workflows** |

---

## Conclusion: where skillsets.cc fits in this landscape

Three structural gaps define the current ecosystem, and skillsets.cc's design addresses all three simultaneously.

**The verification gap is the most critical.** With 1,467 documented malicious payloads, CVSS 10/10 vulnerabilities, and Anthropic explicitly declining responsibility for third-party plugin safety, the ecosystem has no trusted verification layer between raw GitHub repositories and developer workstations. SkillHub's AI scoring evaluates quality but not security. Anthropic's review is opaque and limited to its own marketplace. The curated awesome lists rely on individual editorial judgment without systematic verification. Skillsets.cc's three-tier pipeline (structural audit → qualitative Opus review → human approval) would be the first to combine automated analysis with human judgment and explicit production proof requirements.

**The workflow gap separates skillsets.cc from the plugin ecosystem.** Only Nori/noriskillsets.dev shares the insight that developers need complete operating environment configurations — not just atomic capabilities. Every other marketplace distributes individual skills, commands, or plugins that extend Claude's toolkit. Delivering CLAUDE.md alongside skills, hooks, and support stack as an integrated, versioned package addresses a fundamentally different need: defining how a project operates rather than what tools are available.

**The integrity gap is unaddressed by every competitor.** No platform enforces cryptographic verification of installed content. Anthropic's plugin system supports optional SHA commit pinning in marketplace.json but doesn't enforce it. Skillsets.cc's SHA-256 verified installs would be the only checksummed distribution mechanism in the ecosystem. Given the documented supply-chain attacks — from ToxicSkills to the mcp-remote OAuth vulnerability to the Nx malicious package weaponizing AI coding agents — this gap represents the ecosystem's most urgent unmet need.