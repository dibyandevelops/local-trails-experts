import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { getServerEnv } from '@/lib/env.server';

export type RateLimitResult = {
  isLimited: boolean;
  limit: number;
  remaining: number;
  reset: number; // UTC timestamp in milliseconds
  retryAfterSec: number;
  source: 'redis' | 'memory';
};

export type RateLimitOptions = {
  identifier?: string;
};

export const RateLimitProfiles = {
  AUTH: { limit: 5, windowSeconds: 60 },
  PAYMENT: { limit: 10, windowSeconds: 60 },
  AI_GENERATION: { limit: 8, windowSeconds: 60 },
  MUTATION: { limit: 20, windowSeconds: 60 },
  PUBLIC_READ: { limit: 60, windowSeconds: 60 },
  WEBHOOK: { limit: 100, windowSeconds: 60 },
} as const;

// In-memory sliding window log: key -> array of request timestamps in ms
const inMemoryStore = new Map<string, number[]>();
const MAX_IN_MEMORY_KEYS = 5000;

export function getClientIp(request: NextRequest): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const trueClientIp = request.headers.get('true-client-ip');
  if (trueClientIp) return trueClientIp.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  return request.headers.get('x-real-ip') || 'unknown';
}

const ratelimits = new Map<string, Ratelimit>();

function getRatelimitForWindow(limit: number, windowSeconds: number): Ratelimit | null {
  const env = getServerEnv();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  const key = `${limit}:${windowSeconds}`;
  const existing = ratelimits.get(key);
  if (existing) return existing;

  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: true,
  });
  ratelimits.set(key, ratelimit);
  return ratelimit;
}

/**
 * Checks rate limit for a given request or key identifier.
 * Returns a 429 NextResponse if rate limit is exceeded, or null if allowed.
 */
export async function rateLimit(
  request: NextRequest,
  keyPrefix: string,
  limit = 10,
  windowSeconds = 60,
  options?: RateLimitOptions
): Promise<NextResponse | null> {
  const clientIdentifier = options?.identifier || getClientIp(request);
  const key = `${keyPrefix}:${clientIdentifier}`;

  const ratelimit = getRatelimitForWindow(limit, windowSeconds);

  if (ratelimit) {
    const result = await ratelimit.limit(key);
    const resetSec = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));

    if (!result.success) {
      const response = NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          source: 'app',
          retryAfter: resetSec,
        },
        { status: 429 }
      );
      response.headers.set('Retry-After', String(resetSec));
      response.headers.set('RateLimit-Limit', String(limit));
      response.headers.set('RateLimit-Remaining', '0');
      response.headers.set('RateLimit-Reset', String(Math.ceil(result.reset / 1000)));
      response.headers.set('x-rate-limit-source', 'redis');
      return response;
    }
    return null;
  }

  // Fallback: In-memory sliding window log
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;

  // Periodic pruning if in-memory store grows large
  if (inMemoryStore.size > MAX_IN_MEMORY_KEYS) {
    inMemoryStore.forEach((timestamps, k) => {
      const valid = timestamps.filter((t) => t > windowStart);
      if (valid.length === 0) {
        inMemoryStore.delete(k);
      } else {
        inMemoryStore.set(k, valid);
      }
    });
  }

  const existingTimestamps = inMemoryStore.get(key) || [];
  const activeTimestamps = existingTimestamps.filter((t) => t > windowStart);

  if (activeTimestamps.length >= limit) {
    const oldestTimestamp = activeTimestamps[0];
    const resetTimeMs = oldestTimestamp + windowMs;
    const retryAfterSec = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));

    const response = NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        source: 'app',
        retryAfter: retryAfterSec,
      },
      { status: 429 }
    );
    response.headers.set('Retry-After', String(retryAfterSec));
    response.headers.set('RateLimit-Limit', String(limit));
    response.headers.set('RateLimit-Remaining', '0');
    response.headers.set('RateLimit-Reset', String(Math.ceil(resetTimeMs / 1000)));
    response.headers.set('x-rate-limit-source', 'memory');
    return response;
  }

  activeTimestamps.push(now);
  inMemoryStore.set(key, activeTimestamps);
  return null;
}

/**
 * Attaches standard IETF / RFC 6585 RateLimit headers to any response.
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetSec: number,
  source: 'redis' | 'memory' = 'memory'
): NextResponse {
  response.headers.set('RateLimit-Limit', String(limit));
  response.headers.set('RateLimit-Remaining', String(Math.max(0, remaining)));
  response.headers.set('RateLimit-Reset', String(resetSec));
  response.headers.set('x-rate-limit-source', source);
  return response;
}

/**
 * Clears in-memory rate limit store. Useful for testing and administrative resets.
 */
export function resetRateLimitStore(): void {
  inMemoryStore.clear();
}
