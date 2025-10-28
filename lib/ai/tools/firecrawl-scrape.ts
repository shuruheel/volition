import { tool, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const firecrawlScrapeTool = tool({
  description: 'Scrape a URL content via Firecrawl (markdown + links). Prefer this after search for content extraction.',
  inputSchema: z.object({
    url: z.string().url(),
  }),
  execute: async ({ url }, { experimental_context }) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/research/firecrawl/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`firecrawlScrape failed: ${err}`);
      }
      const data = (await res.json()) as {
        url: string;
        markdown?: string;
        html?: string;
        links?: string[];
        metadata?: Record<string, any>;
      };

      const ctx = experimental_context as { agentId?: string } | undefined;
      const agentId = ctx?.agentId;

      // Summarize markdown into bullets
      if (agentId && (data.markdown || data.html)) {
        const content = (data.markdown || data.html || '').slice(0, 8000);
        let bullets = '';
        try {
          const { text } = await generateText({
            model: openai('gpt-4o-mini'),
            temperature: 0.3,
            prompt: `Summarize the page into 8–12 bullets with URLs inline if referenced. Focus on concrete facts and key figures.\n\n${content}`,
          });
          bullets = text;
        } catch {
          bullets = content.slice(0, 600);
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
                title: 'Research result',
                description: bullets,
                task: `Scrape: ${url}`,
                links: (data.links ?? []).slice(0, 20),
                liveUrl: data.url,
                source: 'firecrawl',
              },
            }),
          });
        } catch (e) {
          console.error('Failed to log firecrawl scrape activity:', e);
        }
      }

      return { success: true as const, ...data };
    } catch (error) {
      console.error('firecrawlScrape error:', error);
      return {
        success: false as const,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});


