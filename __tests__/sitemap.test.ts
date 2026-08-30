import { describe, it, expect } from 'vitest';
import { normalizeImageUrls } from '@/app/sitemap';

describe('normalizeImageUrls', () => {
  it('converts relative image URLs to absolute URLs', () => {
    const urls = normalizeImageUrls('/images/trail-og-fallback.jpg');
    expect(urls).toEqual(['https://www.locoxperts.com/images/trail-og-fallback.jpg']);
  });

  it('keeps absolute URLs unchanged', () => {
    const urls = normalizeImageUrls('https://example.com/test.jpg');
    expect(urls).toEqual(['https://example.com/test.jpg']);
  });

  it('handles combination of single URL and array of gallery URLs', () => {
    const urls = normalizeImageUrls('/images/cover.jpg', [
      'https://example.com/gallery1.jpg',
      '/images/gallery2.jpg',
    ]);
    expect(urls).toEqual([
      'https://www.locoxperts.com/images/cover.jpg',
      'https://example.com/gallery1.jpg',
      'https://www.locoxperts.com/images/gallery2.jpg',
    ]);
  });

  it('deduplicates URLs and filters out empty or invalid values', () => {
    const urls = normalizeImageUrls(
      '/images/cover.jpg',
      ['/images/cover.jpg', '', null, undefined, '   ']
    );
    expect(urls).toEqual(['https://www.locoxperts.com/images/cover.jpg']);
  });

  it('returns undefined if no valid URLs provided', () => {
    expect(normalizeImageUrls(null, undefined, '')).toBeUndefined();
    expect(normalizeImageUrls([])).toBeUndefined();
  });
});
