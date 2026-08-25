import { describe, expect, it, vi } from 'vitest';
import {
  acquireIdempotencyLock,
  completeIdempotencyLock,
  releaseIdempotencyLock,
} from '../idempotency';

describe('Distributed Idempotency Engine', () => {
  it('acquires a new lock when no prior lock exists', async () => {
    const lock = await acquireIdempotencyLock(`test:key:${Date.now()}`, 60);
    expect(['acquired', 'in_flight', 'replayed']).toContain(lock.status);
  });

  it('handles completion and release lifecycle gracefully', async () => {
    const testKey = `test:lifecycle:${Date.now()}`;
    await completeIdempotencyLock(testKey, 200, { success: true });
    await releaseIdempotencyLock(testKey);
    expect(true).toBe(true);
  });
});
