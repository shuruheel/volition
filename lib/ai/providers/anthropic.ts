/**
 * Anthropic Claude provider implementation
 * Transforms OpenAI-format tool calls to/from Anthropic's format
 */

import type { LLMProvider, LLMCompletionRequest, LLMCompletionResponse } from './types';

export class AnthropicProvider implements LLMProvider {
  id = 'anthropic';
  name = 'Anthropic';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createCompletion(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: this.apiKey });

    // Extract system message from messages array
    const systemMessages = request.messages.filter(m => m.role === 'system');
    const systemPrompt = systemMessages.map(m => m.content).join('\n\n');
    const nonSystemMessages = request.messages.filter(m => m.role !== 'system');

    // Convert OpenAI messages to Anthropic format
    const anthropicMessages = convertMessagesToAnthropic(nonSystemMessages);

    // Convert OpenAI tools to Anthropic format
    const anthropicTools = request.tools?.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters,
    }));

    const response = await client.messages.create({
      model: request.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthropicMessages,
      tools: anthropicTools,
    });

    // Convert Anthropic response back to OpenAI format
    return convertResponseToOpenAI(response);
  }
}

function convertMessagesToAnthropic(messages: any[]): any[] {
  const result: any[] = [];

  for (const msg of messages) {
    if (msg.role === 'assistant') {
      const content: any[] = [];
      if (msg.content) {
        content.push({ type: 'text', text: msg.content });
      }
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments),
          });
        }
      }
      result.push({ role: 'assistant', content });
    } else if (msg.role === 'tool') {
      result.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: msg.tool_call_id,
          content: msg.content,
        }],
      });
    } else if (msg.role === 'user') {
      result.push({ role: 'user', content: msg.content || '' });
    }
  }

  // Anthropic requires messages to start with a user message
  if (result.length > 0 && result[0].role !== 'user') {
    result.unshift({ role: 'user', content: 'Begin.' });
  }

  // Anthropic requires alternating user/assistant messages — merge consecutive same-role messages
  const merged: any[] = [];
  for (const msg of result) {
    if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
      const prev = merged[merged.length - 1];
      // Merge content
      if (typeof prev.content === 'string' && typeof msg.content === 'string') {
        prev.content = prev.content + '\n\n' + msg.content;
      } else {
        const prevArr = Array.isArray(prev.content) ? prev.content : [{ type: 'text', text: prev.content }];
        const msgArr = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }];
        prev.content = [...prevArr, ...msgArr];
      }
    } else {
      merged.push({ ...msg });
    }
  }

  return merged;
}

function convertResponseToOpenAI(response: any): LLMCompletionResponse {
  let textContent = '';
  const toolCalls: any[] = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      textContent += block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        type: 'function',
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input),
        },
      });
    }
  }

  // Map Anthropic stop reasons to OpenAI finish reasons
  let finishReason = 'stop';
  if (response.stop_reason === 'tool_use') finishReason = 'tool_calls';
  else if (response.stop_reason === 'max_tokens') finishReason = 'length';

  return {
    message: {
      role: 'assistant',
      content: textContent || null,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    },
    finishReason,
  };
}
