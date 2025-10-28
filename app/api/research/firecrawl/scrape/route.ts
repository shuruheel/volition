import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scrapeFirecrawl } from '@/lib/integrations/firecrawl';
import { rateLimit } from '@/lib/api/rate-limit';

const InputSchema = z.object({
  url: z.string().url(),
  depth: z.enum(['self', 'crawl']).default('self').optional(),
  maxPages: z.number().int().min(1).max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Basic rate limit per IP
    const rl = rateLimit(request as unknown as Request, 'firecrawl:scrape', { windowMs: 60_000, max: 30 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: { 'X-RateLimit-Reset': rl.resetAt.toString() } }
      );
    }

    const body = await request.json();
    const result = InputSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      );
    }

    if (!process.env.FIRECRAWL_API_KEY) {
      return NextResponse.json(
        { error: 'FIRECRAWL_API_KEY not configured' },
        { status: 503 }
      );
    }

    const { url } = result.data;
    // Protocol allowlist
    try {
      const u = new URL(url);
      if (!(u.protocol === 'http:' || u.protocol === 'https:')) {
        return NextResponse.json({ error: 'Unsupported URL protocol' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
    const data = await scrapeFirecrawl({ url });
    return NextResponse.json(data);
  } catch (error: any) {
    const status = (error && typeof error.status === 'number') ? error.status : 500;
    const msg = error instanceof Error ? error.message : 'Scrape failed';
    return NextResponse.json({ error: msg }, { status });
  }
}


