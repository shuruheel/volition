import { tool, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const firecrawlSearchTool = tool({
  description:
    'Search the web using Firecrawl and return top results. Prefer this before browsing to discover sources.',
  inputSchema: z.object({
    query: z.string().min(2).max(400),
    limit: z.number().int().min(1).max(10).default(5),
    sources: z.array(z.enum(['web', 'news', 'images'])).optional(),
    categories: z.array(z.enum(['github', 'research', 'pdf'])).optional(),
  }),
  execute: async ({ query, limit, sources, categories }, { experimental_context }) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/research/firecrawl/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit, sources, categories }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`firecrawlSearch failed: ${err}`);
      }
      const data = (await res.json()) as { items: Array<{ url: string; title?: string; description?: string }> };

      const items = data.items.slice(0, limit);

      // Summarize results as research bullets and log activity
      const ctx = experimental_context as { agentId?: string } | undefined;
      const agentId = ctx?.agentId;
      if (agentId && items.length > 0) {
        const plain = items
          .map((it, i) => `${i + 1}. ${it.title ?? it.url} — ${it.description ?? ''} (${it.url})`)
          .join('\n');
        let bullets = '';
        try {
          const { text } = await generateText({
            model: openai('gpt-4o-mini'),
            temperature: 0.3,
            prompt: `Turn the following search results into 6–10 crisp bullets with URLs inline in parentheses. Focus on concrete, actionable findings.\n\n${plain}`,
          });
          bullets = text;
        } catch {
          bullets = plain;
        }

        try {
          await fetch(`${baseUrl}/api/activities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agent_id: agentId,
              type: 'research',
              status: 'completed',
              payload: {
                title: 'Research leads found',
                description: bullets,
                task: `Search: ${query}`,
                links: items.map((x) => x.url).slice(0, 20),
                source: 'firecrawl',
              },
            }),
          });
        } catch (e) {
          console.error('Failed to log firecrawl search activity:', e);
        }
      }

      return { success: true as const, items };
    } catch (error) {
      console.error('firecrawlSearch error:', error);
      return {
        success: false as const,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});


