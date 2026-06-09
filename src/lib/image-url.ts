const DEFAULT_MAX_IMAGE_URL_LENGTH = 500_000;

export function isAllowedImageUrl(
  value: string,
  maxLength = DEFAULT_MAX_IMAGE_URL_LENGTH
) {
  if (!value || value.length > maxLength) return false;
  if (/^data:image\/(png|jpe?g|webp);base64,/i.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}
