import fs from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';

const outDir = path.join(process.cwd(), 'public', 'donate');
await fs.mkdir(outDir, { recursive: true });

const payload = [
  'eSewa',
  'Receiver: Dibyan Maharjan',
  'Phone: 9841338488',
  'Purpose: Support LocoMTBGroup trail building',
].join('\n');

const svg = await QRCode.toString(payload, {
  type: 'svg',
  errorCorrectionLevel: 'M',
  margin: 2,
  color: {
    dark: '#0f172a',
    light: '#ffffff',
  },
});

await fs.writeFile(path.join(outDir, 'esewa-qr.svg'), svg, 'utf8');
console.log('Wrote public/donate/esewa-qr.svg');
