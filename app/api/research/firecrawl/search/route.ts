import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchFirecrawl } from '@/lib/integrations/firecrawl';
import { rateLimit } from '@/lib/api/rate-limit';

const InputSchema = z.object({
  query: z.string().min(2).max(400),
  limit: z.number().int().min(1).max(20).optional(),
  sources: z.array(z.enum(['web', 'news', 'images'])).optional(),
  categories: z.array(z.enum(['github', 'research', 'pdf'])).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Basic rate limit per IP
    const rl = rateLimit(request as unknown as Request, 'firecrawl:search', { windowMs: 60_000, max: 30 });
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

    const { query, limit, sources, categories } = result.data;
    if (query.length > 400) {
      return NextResponse.json({ error: 'Query too long' }, { status: 400 });
    }
    const data = await searchFirecrawl({ query, limit, sources, categories });
    return NextResponse.json(data);
  } catch (error: any) {
    const status = (error && typeof error.status === 'number') ? error.status : 500;
    const msg = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ error: msg }, { status });
  }
}


