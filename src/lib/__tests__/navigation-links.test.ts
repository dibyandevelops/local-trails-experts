import { describe, expect, it } from 'vitest';
import { getNavigatorDeepLink } from '@/lib/navigation-links';

describe('getNavigatorDeepLink', () => {
  it('creates a navigator link using the trail slug', () => {
    expect(getNavigatorDeepLink('shivapuri-loop')).toBe(
      'locoxperts://navigate/shivapuri-loop'
    );
  });

  it('encodes unsafe path characters and rejects empty identifiers', () => {
    expect(getNavigatorDeepLink('trail/one')).toBe(
      'locoxperts://navigate/trail%2Fone'
    );
    expect(getNavigatorDeepLink('  ')).toBe('');
  });
});
