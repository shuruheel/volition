type Key = string;

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<Key, Bucket>();

export interface RateLimitOptions {
  windowMs?: number; // default 60s
  max?: number; // default 30
}

function getClientIp(req: Request): string {
  // Next.js Request
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() || 'unknown';
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

/**
 * Simple fixed-window rate limiter (in-memory).
 * Not for production multi-instance deployments.
 */
export function rateLimit(req: Request, key: string, options?: RateLimitOptions): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const windowMs = options?.windowMs ?? 60_000;
  const max = options?.max ?? 30;
  const ip = getClientIp(req);
  const k = `${key}:${ip}`;
  const now = Date.now();

  const bucket = store.get(k);
  if (!bucket || bucket.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + windowMs };
    store.set(k, fresh);
    return { allowed: true, remaining: max - 1, resetAt: fresh.resetAt };
  }

  if (bucket.count >= max) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { allowed: true, remaining: max - bucket.count, resetAt: bucket.resetAt };
}


