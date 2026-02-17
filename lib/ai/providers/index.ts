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
  anthropic: 'claude-sonnet-4-5-20250929',
};

/**
 * Available models per provider
 */
export const AVAILABLE_MODELS: Record<string, Array<{ id: string; name: string }>> = {
  openai: [
    { id: 'gpt-5.2-2025-12-11', name: 'GPT-5.2' },
    { id: 'o3', name: 'o3' },
    { id: 'o4-mini', name: 'o4-mini' },
    { id: 'gpt-4.1', name: 'GPT-4.1' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
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
  const model = agentModel || DEFAULT_MODELS[provider] || DEFAULT_MODELS.openai;

  // Try to get API key from tool_configs (encrypted per-user), then fall back to env vars
  let apiKey: string | undefined;

  if (userId) {
    try {
      const { sql } = await import('@/lib/db');
      const { decryptValue } = await import('@/lib/crypto');
      const configs = await sql`SELECT config FROM tool_configs WHERE user_id = ${userId} AND tool = ${provider}`;
      if (configs.length > 0 && configs[0].config) {
        const decrypted = JSON.parse(await decryptValue(configs[0].config));
        apiKey = decrypted.apiKey;
      }
    } catch {
      // Fall through to env var
    }
  }

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
