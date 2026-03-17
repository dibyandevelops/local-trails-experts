export type ImageResizeOptions = {
  maxDimension?: number;
  quality?: number;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

export async function resizeImageToDataUrl(
  file: File,
  options: ImageResizeOptions = {}
) {
  const maxDimension = options.maxDimension ?? 512;
  const quality = options.quality ?? 0.82;
  const src = await readFileAsDataUrl(file);
  const img = await loadImage(src);
  const scale =
    Math.min(1, maxDimension / Math.max(img.width, img.height)) || 1;
  const targetWidth = Math.max(1, Math.round(img.width * scale));
  const targetHeight = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to process image');
  }
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/jpeg', quality);
}
