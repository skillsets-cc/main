import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeTools, buildRequest, normalizeResponse, buildAssistantMessage, buildToolResult } from '../providers/openai-compat.mjs';
import { getProvider } from '../providers/index.mjs';

async function loadFixture(name) {
  const raw = await readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
  return JSON.parse(raw);
}

describe('openai-compat provider', () => {
  describe('normalizeTools', () => {
    it('wraps MCP tools in OpenAI function format', () => {
      const mcpTools = [{
        name: 'read_file',
        description: 'Read a file',
        inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
      }];
      const result = normalizeTools(mcpTools);
      assert.equal(result[0].type, 'function');
      assert.equal(result[0].function.name, 'read_file');
      assert.equal(result[0].function.description, 'Read a file');
      assert.deepEqual(result[0].function.parameters, mcpTools[0].inputSchema);
    });
  });

  describe('buildRequest', () => {
    it('produces correct body with stream false', () => {
      const model = 'kimi-k2.5';
      const messages = [{ role: 'user', content: 'test' }];
      const tools = [{ type: 'function', function: { name: 'read_file' } }];
      const result = buildRequest(model, messages, tools);
      assert.equal(result.model, model);
      assert.deepEqual(result.messages, messages);
      assert.deepEqual(result.tools, tools);
      assert.equal(result.stream, false);
    });

    it('merges requestBody overrides', () => {
      const model = 'kimi-k2.5';
      const messages = [{ role: 'user', content: 'test' }];
      const tools = [];
      const requestBody = { temperature: 0.7 };
      const result = buildRequest(model, messages, tools, requestBody);
      assert.equal(result.temperature, 0.7);
      assert.equal(result.model, model);
      assert.equal(result.stream, false);
    });
  });

  describe('normalizeResponse', () => {
    it('extracts tool calls from Kimi fixture', async () => {
      const fixture = await loadFixture('kimi-tool-call.json');
      const parsed = normalizeResponse(fixture);
      assert.equal(parsed.toolCalls.length, 1);
      assert.equal(parsed.toolCalls[0].name, 'read_file');
      assert.equal(parsed.toolCalls[0].callId, 'call_abc123');
      assert.equal(typeof parsed.toolCalls[0].arguments, 'object');
      assert.equal(parsed.toolCalls[0].arguments.path, 'PROCESS_DOCS/design/feature.md');
    });

    it('extracts reasoning_content from Kimi fixture', async () => {
      const fixture = await loadFixture('kimi-tool-call.json');
      const parsed = normalizeResponse(fixture);
      assert.equal(parsed.reasoning, 'Let me read the design document first to understand the architecture.');
    });

    it('extracts content from final response', async () => {
      const fixture = await loadFixture('kimi-final.json');
      const parsed = normalizeResponse(fixture);
      assert.ok(parsed.content);
      assert.ok(parsed.content.includes('design follows solid principles'));
      assert.equal(parsed.toolCalls, null);
    });

    it('handles OpenRouter response without reasoning', async () => {
      const fixture = await loadFixture('openrouter-tool-call.json');
      const parsed = normalizeResponse(fixture);
      assert.equal(parsed.reasoning, null);
      assert.ok(parsed.toolCalls);
      assert.equal(parsed.toolCalls[0].name, 'search_files');
    });

    it('handles malformed arguments without throwing', async () => {
      const fixture = await loadFixture('malformed-args.json');
      const parsed = normalizeResponse(fixture);
      assert.ok(parsed.toolCalls[0].arguments._parseError);
      assert.ok(parsed.toolCalls[0].arguments._parseError.includes('{path:'));
    });

    it('generates synthetic callId when missing', () => {
      const fixture = {
        choices: [{
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              { type: 'function', function: { name: 'tool1', arguments: '{}' } },
              { type: 'function', function: { name: 'tool2', arguments: '{}' } },
            ],
          },
        }],
      };
      const parsed = normalizeResponse(fixture);
      assert.equal(parsed.toolCalls[0].callId, 'call_0');
      assert.equal(parsed.toolCalls[1].callId, 'call_1');
    });

    it('returns nulls for empty response', () => {
      const fixture = { choices: [] };
      const parsed = normalizeResponse(fixture);
      assert.equal(parsed.content, null);
      assert.equal(parsed.toolCalls, null);
      assert.equal(parsed.reasoning, null);
    });
  });

  describe('buildAssistantMessage', () => {
    it('preserves reasoning_content when present', async () => {
      const fixture = await loadFixture('kimi-tool-call.json');
      const parsed = normalizeResponse(fixture);
      const message = buildAssistantMessage(parsed);
      assert.equal(message.role, 'assistant');
      assert.ok(message.reasoning_content);
      assert.equal(message.reasoning_content, parsed.reasoning);
    });

    it('omits reasoning_content when absent', async () => {
      const fixture = await loadFixture('openrouter-tool-call.json');
      const parsed = normalizeResponse(fixture);
      const message = buildAssistantMessage(parsed);
      assert.equal(message.role, 'assistant');
      assert.ok(!message.reasoning_content);
    });

    it('serializes arguments back to JSON string', async () => {
      const fixture = await loadFixture('kimi-tool-call.json');
      const parsed = normalizeResponse(fixture);
      const message = buildAssistantMessage(parsed);
      assert.ok(message.tool_calls);
      assert.equal(typeof message.tool_calls[0].function.arguments, 'string');
      const args = JSON.parse(message.tool_calls[0].function.arguments);
      assert.equal(args.path, 'PROCESS_DOCS/design/feature.md');
    });
  });

  describe('buildToolResult', () => {
    it('returns correct shape', () => {
      const result = buildToolResult('call_1', 'file content here');
      assert.equal(result.role, 'tool');
      assert.equal(result.tool_call_id, 'call_1');
      assert.equal(result.content, 'file content here');
    });
  });

  describe('round-trip', () => {
    it('normalizeResponse then buildAssistantMessage produces valid message', async () => {
      const fixture = await loadFixture('kimi-tool-call.json');
      const parsed = normalizeResponse(fixture);
      const message = buildAssistantMessage(parsed);
      assert.equal(message.role, 'assistant');
      assert.ok(message.tool_calls);
      assert.equal(message.tool_calls[0].type, 'function');
      assert.equal(message.tool_calls[0].id, 'call_abc123');
      assert.equal(message.tool_calls[0].function.name, 'read_file');
      assert.equal(typeof message.tool_calls[0].function.arguments, 'string');
    });
  });
});

describe('provider registry', () => {
  it('getProvider returns module for openai-compat', () => {
    const provider = getProvider('openai-compat');
    assert.ok(provider.normalizeTools);
    assert.ok(provider.buildRequest);
    assert.ok(provider.normalizeResponse);
    assert.ok(provider.buildAssistantMessage);
    assert.ok(provider.buildToolResult);
  });

  it('getProvider throws for unknown provider', () => {
    assert.throws(() => {
      getProvider('fake-provider');
    }, /Unknown provider type: fake-provider/);
  });
});
