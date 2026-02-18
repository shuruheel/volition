/**
 * Provider factory — resolves an LLM provider by name
 */

import type { LLMProvider, ProviderConfig } from './types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';

export type { LLMProvider, ProviderConfig, LLMCompletionRequest, LLMCompletionResponse } from './types';

/**
 * Default models for each provider
 */
export const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-5.2-2025-12-11',
  anthropic: 'claude-sonnet-4-6',
};

/**
 * Available models per provider
 */
export const AVAILABLE_MODELS: Record<string, Array<{ id: string; name: string }>> = {
  openai: [
    { id: 'gpt-5.2-2025-12-11', name: 'GPT-5.2' },
    { id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini' },
    { id: 'gpt-5-2025-08-07', name: 'GPT-5' },
  ],
  anthropic: [
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
  ],
};

/**
 * Provider metadata for UI display
 */
export const PROVIDER_INFO: Record<string, { name: string; configKey: string }> = {
  openai: { name: 'OpenAI', configKey: 'openai' },
  anthropic: { name: 'Anthropic', configKey: 'anthropic' },
};

/**
 * Create an LLM provider instance
 */
export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config.apiKey);
    case 'anthropic':
      return new AnthropicProvider(config.apiKey);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

/**
 * Resolve provider config for an agent, falling back to defaults
 */
export async function resolveProviderConfig(
  agentProvider?: string | null,
  agentModel?: string | null,
  userId?: string | null
): Promise<ProviderConfig> {
  const provider = agentProvider || 'openai';

  // Try to get API key (and user's preferred model) from tool_configs, then fall back to env vars
  let apiKey: string | undefined;
  let userPreferredModel: string | undefined;

  if (userId) {
    try {
      const { sql } = await import('@/lib/db');
      const { decrypt } = await import('@/lib/crypto');
      const configs = await sql`SELECT data_encrypted FROM tool_configs WHERE user_id = ${userId} AND tool = ${provider}`;
      if (configs.length > 0 && configs[0].data_encrypted) {
        const decrypted = JSON.parse(decrypt(configs[0].data_encrypted));
        apiKey = decrypted.apiKey;
        userPreferredModel = decrypted.model;
      }
    } catch {
      // Fall through to env var
    }
  }

  // Model priority: agent-specific > user's Settings preference > hardcoded default
  const model = agentModel || userPreferredModel || DEFAULT_MODELS[provider] || DEFAULT_MODELS.openai;

  if (!apiKey) {
    if (provider === 'openai') {
      apiKey = process.env.OPENAI_API_KEY;
    } else if (provider === 'anthropic') {
      apiKey = process.env.ANTHROPIC_API_KEY;
    }
  }

  if (!apiKey) {
    throw new Error(`No API key found for provider "${provider}". Configure it in Settings.`);
  }

  return { provider, model, apiKey };
}
