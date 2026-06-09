import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { getServerEnv } from '@/lib/env.server';

const inMemoryStore = new Map<string, { count: number; reset: number }>();

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

const ratelimits = new Map<string, Ratelimit>();

function getRatelimitForWindow(limit: number, windowSeconds: number) {
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

export async function rateLimit(
  request: NextRequest,
  keyPrefix: string,
  limit = 10,
  windowSeconds = 60
) {
  const ip = getClientIp(request);
  const key = `${keyPrefix}:${ip}`;

  const ratelimit = getRatelimitForWindow(limit, windowSeconds);
  if (ratelimit) {
    const result = await ratelimit.limit(key);
    if (!result.success) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.', source: 'app' },
        { status: 429 }
      );
      response.headers.set('x-rate-limit-source', 'app');
      return response;
    }
    return null;
  }

  const now = Date.now();
  const existing = inMemoryStore.get(key);
  if (!existing || existing.reset < now) {
    inMemoryStore.set(key, { count: 1, reset: now + windowSeconds * 1000 });
    return null;
  }
  if (existing.count >= limit) {
    const response = NextResponse.json(
      { error: 'Too many requests. Please try again later.', source: 'app' },
      { status: 429 }
    );
    response.headers.set('x-rate-limit-source', 'app');
    return response;
  }
  existing.count += 1;
  inMemoryStore.set(key, existing);
  return null;
}
