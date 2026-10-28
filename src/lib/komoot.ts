function extractKomootUrlCandidate(input?: string | null): string {
  const raw = String(input || '').trim();
  if (!raw) return '';

  const iframeMatch = raw.match(/src=["']([^"']+)["']/i);
  return (iframeMatch?.[1] || raw).trim();
}

export function extractKomootEmbedUrl(input?: string | null): string {
  const candidate = extractKomootUrlCandidate(input);
  if (!candidate) return '';

  try {
    const url = new URL(candidate);
    if (
      url.protocol !== 'https:' ||
      !['komoot.com', 'www.komoot.com'].includes(url.hostname.toLowerCase()) ||
      !/\/embed\b/i.test(url.pathname)
    ) {
      return '';
    }
  } catch {
    return '';
  }

  return candidate;
}

export function getKomootNavigateUrl(input?: string | null): string {
  const candidate = extractKomootUrlCandidate(input);
  if (!candidate) return '';
  const embedUrl = extractKomootEmbedUrl(candidate);
  return embedUrl ? embedUrl.replace('/embed', '') : '';
}
