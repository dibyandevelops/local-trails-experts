import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  applyRateLimitHeaders,
  getClientIp,
  RateLimitProfiles,
  rateLimit,
  resetRateLimitStore,
} from '../rate-limit';

function createMockRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/test', {
    headers: new Headers(headers),
  });
}

describe('Rate Limiter Engine', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it('correctly extracts client IP through various proxy headers', () => {
    expect(getClientIp(createMockRequest({ 'cf-connecting-ip': '1.2.3.4' }))).toBe('1.2.3.4');
    expect(getClientIp(createMockRequest({ 'true-client-ip': '5.6.7.8' }))).toBe('5.6.7.8');
    expect(getClientIp(createMockRequest({ 'x-forwarded-for': '9.10.11.12, 10.0.0.1' }))).toBe('9.10.11.12');
    expect(getClientIp(createMockRequest({ 'x-real-ip': '13.14.15.16' }))).toBe('13.14.15.16');
    expect(getClientIp(createMockRequest({}))).toBe('unknown');
  });

  it('allows requests within limit and rejects with 429 and standard headers once limit is exceeded', async () => {
    const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });

    // Allow 3 requests
    const res1 = await rateLimit(req, 'test-route', 3, 60);
    expect(res1).toBeNull();

    const res2 = await rateLimit(req, 'test-route', 3, 60);
    expect(res2).toBeNull();

    const res3 = await rateLimit(req, 'test-route', 3, 60);
    expect(res3).toBeNull();

    // 4th request must be rate-limited (429)
    const res4 = await rateLimit(req, 'test-route', 3, 60);
    expect(res4).not.toBeNull();
    expect(res4?.status).toBe(429);

    const body = await res4?.json();
    expect(body.error).toContain('Too many requests');
    expect(body.retryAfter).toBeGreaterThan(0);

    // Standard RFC headers
    expect(res4?.headers.get('Retry-After')).toBeDefined();
    expect(res4?.headers.get('RateLimit-Limit')).toBe('3');
    expect(res4?.headers.get('RateLimit-Remaining')).toBe('0');
    expect(res4?.headers.get('RateLimit-Reset')).toBeDefined();
    expect(res4?.headers.get('x-rate-limit-source')).toBe('memory');
  });

  it('isolates rate limits per user identifier or per IP', async () => {
    const userReq1 = createMockRequest({ 'x-forwarded-for': '10.0.0.1' });
    const userReq2 = createMockRequest({ 'x-forwarded-for': '10.0.0.2' });

    // Exhaust user 1 limit
    await rateLimit(userReq1, 'auth', 2, 60);
    await rateLimit(userReq1, 'auth', 2, 60);
    const blockedUser1 = await rateLimit(userReq1, 'auth', 2, 60);
    expect(blockedUser1?.status).toBe(429);

    // User 2 should still be allowed
    const allowedUser2 = await rateLimit(userReq2, 'auth', 2, 60);
    expect(allowedUser2).toBeNull();
  });

  it('supports custom user identifier option over IP', async () => {
    const req = createMockRequest({ 'x-forwarded-for': 'shared-nat-ip' });

    // Custom user 1
    await rateLimit(req, 'booking', 1, 60, { identifier: 'user_123' });
    const blockedUser1 = await rateLimit(req, 'booking', 1, 60, { identifier: 'user_123' });
    expect(blockedUser1?.status).toBe(429);

    // Custom user 2 behind same NAT IP
    const allowedUser2 = await rateLimit(req, 'booking', 1, 60, { identifier: 'user_456' });
    expect(allowedUser2).toBeNull();
  });

  it('attaches standard RateLimit headers to responses via applyRateLimitHeaders', () => {
    const initialResponse = NextResponse.json({ ok: true });
    const stampedResponse = applyRateLimitHeaders(initialResponse, 20, 15, 1720000000, 'memory');

    expect(stampedResponse.headers.get('RateLimit-Limit')).toBe('20');
    expect(stampedResponse.headers.get('RateLimit-Remaining')).toBe('15');
    expect(stampedResponse.headers.get('RateLimit-Reset')).toBe('1720000000');
    expect(stampedResponse.headers.get('x-rate-limit-source')).toBe('memory');
  });

  it('provides standard enterprise rate limit profiles', () => {
    expect(RateLimitProfiles.AUTH).toEqual({ limit: 5, windowSeconds: 60 });
    expect(RateLimitProfiles.PAYMENT).toEqual({ limit: 10, windowSeconds: 60 });
    expect(RateLimitProfiles.AI_GENERATION).toEqual({ limit: 8, windowSeconds: 60 });
    expect(RateLimitProfiles.MUTATION).toEqual({ limit: 20, windowSeconds: 60 });
  });
});
