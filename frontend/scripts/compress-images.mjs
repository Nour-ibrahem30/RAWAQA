/**
 * Compress product images to JPEG 85% quality
 * Converts PNG → JPEG and resizes max 1400px
 * Run: node scripts/compress-images.mjs
 */
import sharp from 'sharp';
import { readdir, stat, rename, unlink } from 'fs/promises';
import { join, extname, basename } from 'path';

const DIRS = [
  'public/products/football-bean-bag',
  'public/products/8ball-bean-bag',
  'public/products/chair-lounge',
  'public/products/lounge-chair',
];

const MAX_PX  = 1400;
const QUALITY = 82;

let totalBefore = 0;
let totalAfter  = 0;

for (const dir of DIRS) {
  const files = await readdir(dir);
  for (const file of files) {
    const ext  = extname(file).toLowerCase();
    if (!['.png','.jpg','.jpeg'].includes(ext)) continue;

    const src  = join(dir, file);
    const info = await stat(src);
    totalBefore += info.size;

    // Target: always JPEG
    const base = basename(file, ext);
    const dest = join(dir, base + '.jpg');

    try {
      await sharp(src)
        .resize({ width: MAX_PX, height: MAX_PX, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toFile(dest + '.tmp');

      // Replace original
      if (dest !== src) {
        await unlink(src).catch(() => {});
      }
      await rename(dest + '.tmp', dest);

      const afterInfo = await stat(dest);
      totalAfter += afterInfo.size;

      const saved = Math.round((1 - afterInfo.size / info.size) * 100);
      console.log(`✓ ${file} → ${base}.jpg  ${Math.round(info.size/1024)}KB → ${Math.round(afterInfo.size/1024)}KB  (${saved}% saved)`);
    } catch (err) {
      console.error(`✗ ${file}: ${err.message}`);
    }
  }
}

console.log(`\nTotal: ${Math.round(totalBefore/1024/1024*10)/10}MB → ${Math.round(totalAfter/1024/1024*10)/10}MB`);
