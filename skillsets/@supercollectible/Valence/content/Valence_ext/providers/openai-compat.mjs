// providers/openai-compat.mjs — Normalization for OpenAI-compatible APIs

export function normalizeTools(mcpTools) {
  return mcpTools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}

export function buildRequest(model, messages, tools, requestBody = {}) {
  return { ...requestBody, model, messages, tools, stream: false };
}

export function normalizeResponse(json) {
  const choice = json.choices?.[0];
  const message = choice?.message;
  if (!message) return { content: null, toolCalls: null, reasoning: null };

  const toolCalls = message.tool_calls?.map((tc, i) => {
    let args;
    try {
      args = typeof tc.function.arguments === 'string'
        ? JSON.parse(tc.function.arguments)
        : tc.function.arguments;
    } catch {
      args = { _parseError: tc.function.arguments };
    }
    return { name: tc.function.name, arguments: args, callId: tc.id || `call_${i}` };
  });

  return {
    content: message.content || null,
    toolCalls: toolCalls?.length ? toolCalls : null,
    reasoning: message.reasoning_content || null,
  };
}

export function buildAssistantMessage(parsed) {
  const msg = { role: 'assistant', content: parsed.content || null };
  if (parsed.reasoning) msg.reasoning_content = parsed.reasoning;
  if (parsed.toolCalls) {
    msg.tool_calls = parsed.toolCalls.map(tc => ({
      id: tc.callId,
      type: 'function',
      function: {
        name: tc.name,
        arguments: JSON.stringify(tc.arguments),
      },
    }));
  }
  return msg;
}

export function buildToolResult(callId, content) {
  return { role: 'tool', tool_call_id: callId, content };
}
