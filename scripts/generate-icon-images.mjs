import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = process.cwd();
const iconsDir = path.join(projectRoot, 'public', 'icons');

const sources = [
  {
    input: path.join(iconsDir, 'icon.svg'),
    prefix: 'icon',
    outDir: iconsDir,
    isMaskable: false,
  },
  {
    input: path.join(iconsDir, 'maskable-icon.svg'),
    prefix: 'maskable-icon',
    outDir: iconsDir,
    isMaskable: true,
  },
];

const sizes = [16, 32, 48, 64, 96, 128, 192, 256, 384, 512];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  for (const source of sources) {
    if (!(await exists(source.input))) {
      // eslint-disable-next-line no-console
      console.warn(`Missing source icon: ${source.input}`);
      continue;
    }

    const svg = await fs.readFile(source.input);

    for (const size of sizes) {
      const out = path.join(source.outDir, `${source.prefix}-${size}x${size}.png`);
      await sharp(svg, { density: 384 })
        .resize(size, size, { fit: 'contain' })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toFile(out);
    }
  }

  // Apple touch icon (commonly 180x180). Use the non-maskable icon.
  const appleOut = path.join(projectRoot, 'public', 'apple-touch-icon.png');
  const appleSvg = await fs.readFile(path.join(iconsDir, 'icon.svg'));
  await sharp(appleSvg, { density: 384 })
    .resize(180, 180, { fit: 'contain' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(appleOut);

  // eslint-disable-next-line no-console
  console.log('Generated icon PNGs in public/icons and apple-touch-icon.png');
}

await main();

