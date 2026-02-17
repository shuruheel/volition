/**
 * Common interfaces for LLM providers
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface LLMTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface LLMCompletionRequest {
  model: string;
  messages: LLMMessage[];
  tools?: LLMTool[];
  tool_choice?: 'auto' | 'none' | 'required';
}

export interface LLMCompletionResponse {
  message: {
    role: 'assistant';
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
  finishReason: string;
}

export interface LLMProvider {
  id: string;
  name: string;
  createCompletion(request: LLMCompletionRequest): Promise<LLMCompletionResponse>;
}

export interface ProviderConfig {
  provider: string;
  model: string;
  apiKey: string;
}
