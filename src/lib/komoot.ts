function extractKomootUrlCandidate(input?: string | null): string {
  const raw = String(input || '').trim();
  if (!raw) return '';

  const iframeMatch = raw.match(/src=["']([^"']+)["']/i);
  return (iframeMatch?.[1] || raw).trim();
}

export function extractKomootEmbedUrl(input?: string | null): string {
  const candidate = extractKomootUrlCandidate(input);
  if (!candidate) return '';

  if (!/komoot\.com/i.test(candidate)) return '';
  if (!/\/embed\b/i.test(candidate)) return '';

  return candidate;
}

export function getKomootNavigateUrl(input?: string | null): string {
  const candidate = extractKomootUrlCandidate(input);
  if (!candidate) return '';
  if (!/komoot\.com/i.test(candidate)) return '';
  return candidate.replace('/embed', '');
}
