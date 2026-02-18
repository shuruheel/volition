import type { RequestInit } from 'next/dist/server/web/spec-extension/request';
import { sql } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v2';

/**
 * Resolve the Firecrawl API key: per-user tool_configs first, env var fallback.
 */
export async function resolveFirecrawlKey(userId?: string | null): Promise<string | undefined> {
  if (userId) {
    try {
      const configs = await sql`
        SELECT data_encrypted FROM tool_configs
        WHERE user_id = ${userId} AND tool = 'firecrawl'
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
  return process.env.FIRECRAWL_API_KEY;
}

interface SearchParams {
  query: string;
  limit?: number;
  sources?: Array<'web' | 'news' | 'images'>;
  categories?: Array<'github' | 'research' | 'pdf'>;
  timeout?: number;
}

export interface FirecrawlSearchItem {
  url: string;
  title?: string;
  description?: string;
  position?: number;
  category?: string;
}

export interface FirecrawlSearchResult {
  items: FirecrawlSearchItem[];
}

interface ScrapeParams {
  url: string;
  formats?: Array<'markdown' | 'html' | 'links'>;
  onlyMainContent?: boolean;
  timeout?: number;
}

export interface FirecrawlScrapeResult {
  url: string;
  markdown?: string;
  html?: string;
  links?: string[];
  metadata?: Record<string, any>;
}

function getAuthHeader(apiKey?: string): HeadersInit {
  const key = apiKey || process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error('FIRECRAWL_API_KEY not configured');
  return { Authorization: `Bearer ${key}` };
}

async function doFetch<T>(path: string, init: RequestInit, apiKey?: string): Promise<T> {
  const res = await fetch(`${FIRECRAWL_BASE_URL}${path}`, {
    ...init,
    // 30s default timeout via AbortController
    signal: init.signal,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(apiKey),
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const status = res.status;
    console.error(`[Firecrawl] API error: ${path} returned ${status}`, text.substring(0, 500));
    const err = new Error(`Firecrawl ${path} failed (${status}): ${text.substring(0, 200)}`);
    // Surface 429/403 explicitly for caller fallbacks
    // @ts-expect-error add status
    (err as any).status = status;
    throw err;
  }
  const json = (await res.json()) as any;
  return json as T;
}

export async function searchFirecrawl(params: SearchParams & { apiKey?: string }): Promise<FirecrawlSearchResult> {
  const body = {
    query: params.query,
    limit: Math.min(Math.max(params.limit ?? 5, 1), 20),
    sources: params.sources,
    categories: params.categories,
    timeout: params.timeout,
  };

  const json = await doFetch<any>('/search', {
    method: 'POST',
    body: JSON.stringify(body),
  }, params.apiKey);

  // Responses can be { success, data: { web, images, news } } or array when scrapeOptions
  const items: FirecrawlSearchItem[] = [];
  const data = json?.data ?? {};
  const groups = [data.web ?? [], data.news ?? [], data.images ?? [], Array.isArray(data) ? data : []];
  for (const group of groups) {
    if (Array.isArray(group)) {
      for (const it of group) {
        if (it && typeof it.url === 'string') {
          items.push({
            url: it.url,
            title: it.title,
            description: it.description ?? it.snippet,
            position: it.position,
            category: it.category,
          });
        }
      }
    }
  }
  return { items };
}

export async function scrapeFirecrawl(params: ScrapeParams & { apiKey?: string }): Promise<FirecrawlScrapeResult> {
  const body = {
    url: params.url,
    formats: params.formats ?? ['markdown', 'links'],
    onlyMainContent: params.onlyMainContent ?? true,
    timeout: params.timeout ?? 120000,
  };

  const json = await doFetch<any>('/scrape', {
    method: 'POST',
    body: JSON.stringify(body),
  }, params.apiKey);

  const data = json?.data ?? {};
  return {
    url: data?.metadata?.sourceURL || params.url,
    markdown: data?.markdown,
    html: data?.html,
    links: Array.isArray(data?.links) ? data.links : undefined,
    metadata: data?.metadata,
  };
}

// Unified search+scrape in one request using Firecrawl /search with scrapeOptions
export interface SearchAndScrapeParams extends Omit<SearchParams, 'limit'> {
  limit?: number;
  apiKey?: string;
  scrapeOptions?: {
    formats?: Array<'markdown' | 'links' | 'html'>;
    onlyMainContent?: boolean;
    timeout?: number;
  };
}

export interface SearchAndScrapeItem {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
  links?: string[];
  metadata?: Record<string, any>;
}

export interface SearchAndScrapeResult {
  items: SearchAndScrapeItem[];
}

export async function searchAndScrape(params: SearchAndScrapeParams): Promise<SearchAndScrapeResult> {
  // Simplify query: remove quotes, limit length, focus on key terms
  let simplifiedQuery = params.query
    .replace(/"/g, '') // Remove quotes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 200); // Limit to 200 chars
  
  // If query is still too complex, extract first 10 words
  const words = simplifiedQuery.split(' ');
  if (words.length > 15) {
    simplifiedQuery = words.slice(0, 15).join(' ');
  }

  const body: any = {
    query: simplifiedQuery,
    limit: Math.min(Math.max(params.limit ?? 3, 1), 10),
    sources: params.sources,
    categories: params.categories,
  };

  const scrapeOptions = params.scrapeOptions ?? { formats: ['markdown', 'links'], onlyMainContent: true };
  if (scrapeOptions) {
    body.scrapeOptions = {
      formats: scrapeOptions.formats ?? ['markdown', 'links'],
      onlyMainContent: scrapeOptions.onlyMainContent ?? true,
      timeout: scrapeOptions.timeout ?? 120000,
    };
  }

  console.log(`[Firecrawl] Searching: "${simplifiedQuery}"`);

  const json = await doFetch<any>('/search', {
    method: 'POST',
    body: JSON.stringify(body),
  }, params.apiKey);

  // When scrapeOptions are provided, Firecrawl may return:
  // - { data: [...] } (array format) OR
  // - { data: { web: [...] } } (object format with web array)
  // Handle both cases
  let data: any[] = [];
  
  if (Array.isArray(json?.data)) {
    // Format 1: Direct array
    data = json.data;
  } else if (json?.data && typeof json.data === 'object') {
    // Format 2: Object with web/news/images arrays
    // When scrapeOptions are provided, check web array first
    if (Array.isArray(json.data.web)) {
      data = json.data.web;
    } else if (Array.isArray(json.data.news)) {
      data = json.data.news;
    } else if (Array.isArray(json.data.images)) {
      data = json.data.images;
    }
  }

  const items: SearchAndScrapeItem[] = [];
  for (const it of data) {
    if (!it || typeof it.url !== 'string') continue;
    
    items.push({
      url: it.url,
      title: it.title,
      description: it.description ?? it.snippet,
      markdown: it.markdown,
      links: Array.isArray(it.links) ? it.links : undefined,
      metadata: it.metadata,
    });
  }
  
  console.log(`[Firecrawl] Found ${items.length} items`);
  
  return { items };
}


