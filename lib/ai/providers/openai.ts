/**
 * OpenAI provider implementation
 */

import type { LLMProvider, LLMCompletionRequest, LLMCompletionResponse } from './types';

export class OpenAIProvider implements LLMProvider {
  id = 'openai';
  name = 'OpenAI';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createCompletion(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: this.apiKey });

    const completion = await openai.chat.completions.create({
      model: request.model,
      messages: request.messages,
      tools: request.tools,
      tool_choice: request.tool_choice,
    });

    const message = completion.choices[0]?.message;

    return {
      message: {
        role: 'assistant',
        content: message?.content || null,
        tool_calls: message?.tool_calls?.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      },
      finishReason: completion.choices[0]?.finish_reason || 'stop',
    };
  }
}
