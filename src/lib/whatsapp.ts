
function normalizeWhatsappNumber(raw: string) {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `977${digits.slice(1)}`;
  if (digits.length === 10) return `977${digits}`;
  return digits;
}

export function getCommunityWhatsappNumber() {
  const configured = process.env.COMMUNITY_WHATSAPP_NUMBER || '';
  return normalizeWhatsappNumber(configured);
}

export function getCommunityWhatsappLink(message?: string) {
  const number = getCommunityWhatsappNumber();
  if (!number) return null;
  if (!message?.trim()) return `https://wa.me/${number}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message.trim())}`;
}

export function getCommunityWhatsappGroupLink() {
  const raw = process.env.COMMUNITY_WHATSAPP_GROUP_LINK || '';
  const link = raw.trim();
  if (!link) return null;
  if (!/^https?:\/\//i.test(link)) return null;
  return link;
}
