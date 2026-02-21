# Valence EXT

Provider-agnostic Node.js external Agent Runner that drives external models with MCP tool access, direct API calls and bidirectional tool-call normalization.

## Architecture

```
Claude Code (Opus orchestrator)
  |
  +-- spawns thin Haiku teammate (ar-k, ar-glm5, pm-k)
       |
       +-- runs: node Valence_ext/external-agent.mjs \
                   --agent <profile> --prompt <path> --output <file> -- <paths...>
              |
              +-- loads external-agents.json -> resolves agent profile
              +-- spawns MCP servers per profile config
              +-- lists tools, filters by allowlist
              +-- normalizes tools to provider format
              +-- agent loop: fetch -> normalize -> tool_calls? -> MCP execute -> repeat
              +-- writes final output to --output file
              +-- disconnects MCP servers in finally block
```

## Files

```
Valence_ext/
+-- external-agent.mjs           # Runner entry point (172 lines)
+-- external-agents.json         # Agent profiles + MCP server config
+-- package.json                 # Runner dependencies (private, ES modules)
+-- providers/
|   +-- index.mjs                # Provider registry
|   +-- openai-compat.mjs        # OpenAI-compatible API normalization
+-- prompts/
|   +-- adversarial-review.md    # System prompt for /ar reviewers
|   +-- pattern-match.md         # System prompt for /pmatch matchers
+-- test/
|   +-- normalization.test.mjs   # 17 tests (node:test)
|   +-- fixtures/
|       +-- kimi-tool-call.json
|       +-- kimi-final.json
|       +-- openrouter-tool-call.json
|       +-- openrouter-final.json
|       +-- malformed-args.json
```

Related agent definitions (thin orchestrators in `.claude/agents/`):

```
.claude/agents/
+-- ar-k.md                      # Thin orchestrator -> kimi-review
+-- ar-glm5.md                   # Thin orchestrator -> glm5-review
+-- pm-k.md                      # Thin orchestrator -> kimi-pmatch
```

## How It Works

### Agent Profiles

`external-agents.json` defines agent profiles and MCP server configurations:

```json
{
  "agents": {
    "kimi-review": {
      "provider": "openai-compat",
      "baseURL": "https://api.moonshot.ai/v1",
      "model": "kimi-k2.5",
      "apiKeyEnv": "KIMI_API_KEY",
      "maxTurns": 50,
      "mcpServers": ["filesystem", "context7"],
      "toolOverrides": {
        "filesystem": ["read_file", "read_multiple_files", "search_files", "list_directory", "get_file_info", "list_allowed_directories"]
      }
    }
  },
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "."],
      "toolAllowlist": ["read_file", "read_multiple_files", "search_files", "list_directory", "directory_tree", "get_file_info", "list_allowed_directories"]
    }
  }
}
```

Each profile specifies: provider type, API base URL, model name, env var for the API key, max turns, and which MCP servers the agent gets access to. Optionally, `toolOverrides` narrows the server-level `toolAllowlist` on a per-agent basis — the agent override takes precedence when present.

### Provider Normalization

The `providers/` layer abstracts differences between OpenAI-compatible APIs. Currently one provider (`openai-compat`), extensible via the registry in `index.mjs`.

Five functions handle the translation:

| Function | Purpose |
|----------|---------|
| `normalizeTools(mcpTools)` | MCP tool format -> OpenAI function calling format |
| `buildRequest(model, messages, tools, overrides)` | Constructs the API request body with `stream: false` |
| `normalizeResponse(json)` | Extracts `{content, toolCalls, reasoning}` from provider response |
| `buildAssistantMessage(parsed)` | Reconstructs assistant message for conversation history |
| `buildToolResult(callId, content)` | Wraps tool output as `{role: 'tool', ...}` |

Key behaviors:
- **Malformed arguments**: Returns `{_parseError: rawString}` instead of throwing — the runner feeds the error back to the model so it can retry
- **Missing call IDs**: Generates synthetic IDs (`call_0`, `call_1`, ...) when providers omit them
- **Reasoning content**: Preserves `reasoning_content` (Kimi K2.5 thinking mode) — omitting it from replayed messages causes 400 errors

### Runner Loop

`external-agent.mjs` implements the agent loop:

1. **Parse CLI args**: `--agent`, `--prompt`, `--output`, positional paths after `--`
2. **Pre-flight**: Validate profile exists, API key env var is set
3. **Spawn MCP servers**: Only those in the profile's `mcpServers` array. Environment is allowlisted (`HOME`, `PATH`, `USER`, `NODE_PATH` only) to prevent API key leakage. Servers can opt in to specific env vars via `envPassthrough` (e.g., `CONTEXT7_API_KEY`).
4. **List and filter tools**: Apply `toolAllowlist` per server config
5. **Loop** (up to `maxTurns`):
   - Build request via provider
   - POST to `{baseURL}/chat/completions`
   - Normalize response
   - If tool calls: execute each via MCP, append results to conversation
   - If no tool calls: write `content` to output file, exit 0
6. **Rate limiting**: 429 -> parse `Retry-After` (default 30s), sleep, retry (doesn't count against maxTurns)
7. **Max turns exhausted**: Write partial output with `## INCOMPLETE` header
8. **Cleanup**: Disconnect all MCP clients in `finally` block

### Thin Orchestrator Pattern

Claude Code agents (`ar-k.md`, `ar-glm5.md`, `pm-k.md`) are ~25-line files that:

1. Read the task assignment for document paths
2. Shell out to the runner with the right `--agent` profile and `--prompt`
3. Read the output file
4. Relay content verbatim to the team lead via `SendMessage`

They don't interpret, modify, or supplement the external model's output.

## MCP Servers

| Server | Tools | Used By |
|--------|-------|---------|
| `filesystem` | `read_file`, `read_multiple_files`, `search_files`, `list_directory`, `directory_tree`, `get_file_info`, `list_allowed_directories` | All agents (kimi agents exclude `directory_tree` via `toolOverrides`) |
| `context7` | `resolve-library-id`, `query-docs` | Review agents only (not pmatch) |

The filesystem server is restricted to read-only tools via `toolAllowlist`. Write tools (`write_file`, `create_directory`, `move_file`, `edit_file`) are excluded. Per-agent `toolOverrides` can further narrow the allowlist — e.g. kimi agents omit `directory_tree` to prevent dumping the full filetree into context.

## Adding a New Agent

1. Add a profile to `external-agents.json` under `agents`
2. Create a system prompt in `Valence_ext/prompts/`
3. Create a thin orchestrator in `.claude/agents/`
4. Reference the agent in the relevant skill's `SKILL.md`

To add a new provider type (non-OpenAI-compatible API):

1. Create `providers/<name>.mjs` exporting the 5 normalization functions
2. Register it in `providers/index.mjs`

## Setup

```bash
# Install runner dependencies
cd Valence_ext && npm install

# Copy .env.example and fill in your keys
cp .env.example .env
# Edit .env with your API keys, then:
source .env
```

The runner reads API keys from `process.env` (no dotenv). Either `source .env` before running, use [direnv](https://direnv.net/), or export the vars in your shell profile. The `.env` file is gitignored; `.env.example` documents the required keys.

## Testing

```bash
# Run normalization tests (node:test, zero deps)
node --test Valence_ext/test/normalization.test.mjs

# Manual test (requires API key)
node Valence_ext/external-agent.mjs \
  --agent kimi-review \
  --prompt Valence_ext/prompts/adversarial-review.md \
  --output /tmp/test-review.md \
  -- CLAUDE.md
```

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@modelcontextprotocol/sdk` | ^1.11.0 | MCP client (v1 import paths) |
| `zod` | ^3.23.0 | Peer dependency of MCP SDK |
| `@modelcontextprotocol/server-filesystem` | ^2025.7.1 | Pre-installed for local `npx` resolution |
| `@upstash/context7-mcp` | ^1.0.0 | Pre-installed for local `npx` resolution |

The runner uses native `fetch` (Node.js 18+), `parseArgs` (node:util), and `node:test` — no additional runtime dependencies beyond the MCP SDK.
