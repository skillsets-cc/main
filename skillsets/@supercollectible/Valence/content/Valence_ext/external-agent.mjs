#!/usr/bin/env node
// external-agent.mjs — Generic external model agent runner
// Dependencies: @modelcontextprotocol/sdk (MCP client only), zod (peer dep)

import { parseArgs } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { getProvider } from './providers/index.mjs';

// Load .env from script directory (no dotenv dependency)
const scriptDir = new URL('.', import.meta.url).pathname;
try {
  const envFile = await readFile(`${scriptDir}.env`, 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
} catch {}

const { values: flags, positionals: paths } = parseArgs({
  options: {
    agent:  { type: 'string' },
    prompt: { type: 'string' },
    output: { type: 'string' },
  },
  allowPositionals: true,
});

const config = JSON.parse(await readFile('Valence_ext/external-agents.json', 'utf8'));
const profile = config.agents[flags.agent];
if (!profile) {
  process.stderr.write(`[agent] unknown agent: ${flags.agent}\n`);
  process.exit(1);
}
if (!process.env[profile.apiKeyEnv]) {
  process.stderr.write(`[agent] missing env var: ${profile.apiKeyEnv}\n`);
  process.exit(1);
}
const systemPrompt = await readFile(flags.prompt, 'utf8');
const provider = getProvider(profile.provider);
const log = (msg) => process.stderr.write(msg + '\n');

// Connect MCP servers (only those listed in agent profile)
const mcpClients = [];
const mcpTools = [];

try {
  for (const serverName of profile.mcpServers) {
    const serverConfig = config.mcpServers[serverName];
    // Allowlist env vars for MCP servers — don't leak API keys
    const baseEnv = { HOME: process.env.HOME, PATH: process.env.PATH, USER: process.env.USER, NODE_PATH: process.env.NODE_PATH };
    const passthrough = {};
    for (const key of serverConfig.envPassthrough || []) {
      if (process.env[key]) passthrough[key] = process.env[key];
    }
    const transport = new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args,
      env: { ...baseEnv, ...passthrough, ...(serverConfig.env || {}) },
    });
    const mcp = new Client({ name: serverName, version: '1.0.0' });
    await mcp.connect(transport);
    mcpClients.push({ name: serverName, mcp, transport });

    const { tools } = await mcp.listTools();
    const allowlist = profile.toolOverrides?.[serverName] || serverConfig.toolAllowlist;
    const allowed = allowlist ? tools.filter(t => allowlist.includes(t.name)) : tools;
    log(`[agent] ${serverName}: ${allowed.length} tools available${allowlist ? ` (${tools.length - allowed.length} filtered)` : ''}`);
    for (const tool of allowed) {
      mcpTools.push({ ...tool, _mcpClient: mcp });
    }
  }

  // Normalize tools for provider
  const providerTools = provider.normalizeTools(mcpTools);

  // Build initial messages
  const userMessage = paths.join('\n');
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  log(`[agent] starting ${profile.model} via ${profile.baseURL}`);

  // Agent loop
  let outputWritten = false;
  for (let turn = 1; turn <= (profile.maxTurns || 50); turn++) {
    const body = provider.buildRequest(profile.model, messages, providerTools, profile.requestBody);
    const endpoint = provider.getEndpoint?.(profile.baseURL) || `${profile.baseURL}/chat/completions`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env[profile.apiKeyEnv]}`,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('retry-after') || '30', 10);
      log(`[turn ${turn}] rate limited, retrying after ${retryAfter}s`);
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      turn--; // Retry this turn
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${text}`);
    }

    const json = await res.json();
    const parsed = provider.normalizeResponse(json);

    if (!parsed.toolCalls || parsed.toolCalls.length === 0) {
      // No tool calls — final content
      if (!parsed.content) {
        throw new Error('No final content produced');
      }
      await writeFile(flags.output, parsed.content);
      log(`[agent] done. ${turn} turns, wrote ${flags.output}`);
      outputWritten = true;
      break;
    }

    // Execute tool calls
    log(`[turn ${turn}] ${parsed.toolCalls.length} tool call(s)`);
    messages.push(provider.buildAssistantMessage(parsed));

    for (const tc of parsed.toolCalls) {
      // Handle argument parse errors — feed back to model so it can retry
      if (tc.arguments?._parseError) {
        log(`[turn ${turn}] ${tc.name}: malformed arguments, feeding error to model`);
        messages.push(provider.buildToolResult(tc.callId, `Error: could not parse arguments: ${tc.arguments._parseError}`));
        continue;
      }
      log(`[turn ${turn}] calling ${tc.name}(${JSON.stringify(tc.arguments).slice(0, 100)})`);
      const mcpTool = mcpTools.find(t => t.name === tc.name);
      if (!mcpTool) {
        log(`[turn ${turn}] ${tc.name}: not in allowed tools, rejecting`);
        messages.push(provider.buildToolResult(tc.callId, `Error: tool "${tc.name}" is not available`));
        continue;
      }
      let resultText;
      try {
        const result = await mcpTool._mcpClient.callTool({ name: tc.name, arguments: tc.arguments });
        resultText = result.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
      } catch (e) {
        resultText = `Error: ${e.message}`;
      }
      log(`[turn ${turn}] tool result: ${resultText.length} chars`);
      messages.push(provider.buildToolResult(tc.callId, resultText));
    }

    // Warn when approaching max turns
    if (turn === (profile.maxTurns || 50) - 10) {
      log(`[agent] approaching max turns, 10 remaining`);
    }
  }

  // Max turns exhausted — write partial output
  if (outputWritten) {
    // Normal completion — skip
  } else {
    // Collect last assistant content from messages
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && m.content);
    if (lastAssistant) {
      const partial = `## INCOMPLETE (max turns exhausted)\n\n${lastAssistant.content}`;
      await writeFile(flags.output, partial);
      log(`[agent] max turns exhausted, wrote partial output to ${flags.output}`);
    } else {
      log(`[agent] max turns exhausted, no content to write`);
      process.exitCode = 1;
    }
  }
} catch (e) {
  log(`[agent] ${e.message}`);
  process.exitCode = 1;
} finally {
  for (const { mcp, transport } of mcpClients) {
    try { await mcp.close(); await transport.close(); } catch {}
  }
}
