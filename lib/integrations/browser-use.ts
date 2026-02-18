/**
 * Browser-Use integration helpers.
 */

import { sql } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

/**
 * Resolve the Browser-Use API key: per-user tool_configs first, env var fallback.
 */
export async function resolveBrowserUseKey(userId?: string | null): Promise<string | undefined> {
  if (userId) {
    try {
      const configs = await sql`
        SELECT data_encrypted FROM tool_configs
        WHERE user_id = ${userId} AND tool = 'browser_use'
      `;
      if (configs.length > 0 && configs[0].data_encrypted) {
        const data = JSON.parse(decrypt(configs[0].data_encrypted));
        if (data.apiKey) {
          return data.apiKey;
        }
      }
    } catch {
      // Fall through to env var
    }
  }
  return process.env.BROWSER_USE_API_KEY;
}
