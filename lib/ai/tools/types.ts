/**
 * Tool system types for modular agent tools.
 * Tools use raw OpenAI function call format (JSON Schema with `parameters` key).
 */

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface ToolContext {
  agentId: string;
  userId: string | null;
  enabledTools: string[];
  modelProvider?: string | null;
  modelId?: string | null;
  systemPrompt?: string;
  // Mutable state that tools can set
  state: {
    awaitingHumanInput: boolean;
    currentSessionId: string | null;
    researchStarted: boolean;
    researchSessionCompleted: boolean;
    usedSendMessage: boolean;
  };
}

export type ToolHandler = (args: any, context: ToolContext) => Promise<any>;

export interface ToolModule {
  definition: ToolDefinition;
  handler: ToolHandler;
  /** Tool group requirements (e.g., ['firecrawl']). Empty = always available. */
  requires?: string[];
  /** Requires authenticated userId */
  requiresAuth?: boolean;
}
