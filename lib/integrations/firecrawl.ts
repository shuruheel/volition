import type { RequestInit } from 'next/dist/server/web/spec-extension/request';

const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v2';

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

function getAuthHeader(): HeadersInit {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY not configured');
  return { Authorization: `Bearer ${apiKey}` };
}

async function doFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${FIRECRAWL_BASE_URL}${path}`, {
    ...init,
    // 30s default timeout via AbortController
    signal: init.signal,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const status = res.status;
    const err = new Error(`Firecrawl ${path} failed (${status}): ${text}`);
    // Surface 429/403 explicitly for caller fallbacks
    // @ts-expect-error add status
    (err as any).status = status;
    throw err;
  }
  const json = (await res.json()) as any;
  return json as T;
}

export async function searchFirecrawl(params: SearchParams): Promise<FirecrawlSearchResult> {
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
  });

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

export async function scrapeFirecrawl(params: ScrapeParams): Promise<FirecrawlScrapeResult> {
  const body = {
    url: params.url,
    formats: params.formats ?? ['markdown', 'links'],
    onlyMainContent: params.onlyMainContent ?? true,
    timeout: params.timeout ?? 120000,
  };

  const json = await doFetch<any>('/scrape', {
    method: 'POST',
    body: JSON.stringify(body),
  });

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
  const body: any = {
    query: params.query,
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

  const json = await doFetch<any>('/search', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  // When scrapeOptions are provided, Firecrawl returns an array in data
  const data = Array.isArray(json?.data) ? json.data : [];
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
  return { items };
}


