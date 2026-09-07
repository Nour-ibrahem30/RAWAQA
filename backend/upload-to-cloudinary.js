/**
 * Upload all product images to Cloudinary
 * Run: node upload-to-cloudinary.js
 * 
 * After upload, prints a mapping of local path -> Cloudinary URL
 * so you can update the DB with the new URLs.
 */

const { v2: cloudinary } = require('cloudinary');
const path = require('path');
const fs   = require('fs');

// ── Config ────────────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: 'dr5welrvq',
  api_key:    '614332822878698',
  api_secret: 'KimKaACifpwk-793BC1ZIg7x5uo',
  secure:     true,
});

const PUBLIC_DIR = path.resolve(__dirname, '../frontend/public/products');
const CLOUDINARY_FOLDER = 'rawaqa/products';

// ── Collect all image files ───────────────────────────────────────────────────
function getAllImages(dir, base = dir) {
  const results = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(...getAllImages(full, base));
    } else if (/\.(jpg|jpeg|png|webp)$/i.test(item)) {
      results.push(full);
    }
  }
  return results;
}

// ── Upload one file ───────────────────────────────────────────────────────────
async function uploadFile(filePath, base) {
  // Build Cloudinary public_id from relative path
  // e.g. /products/8ball-new/img-1.jpg → rawaqa/products/8ball-new/img-1
  const rel      = path.relative(base, filePath).replace(/\\/g, '/');
  const noExt    = rel.replace(/\.[^.]+$/, '');
  const publicId = `${CLOUDINARY_FOLDER}/${noExt}`;

  const result = await cloudinary.uploader.upload(filePath, {
    public_id:      publicId,
    overwrite:      true,
    resource_type:  'image',
    transformation: [
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
      { width: 1200, height: 1200, crop: 'limit' },
    ],
  });

  return {
    local: `/products/${rel.replace(/\\/g, '/')}`,
    url:   result.secure_url,
    publicId: result.public_id,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Starting Cloudinary upload...\n');

  const images = getAllImages(PUBLIC_DIR);
  console.log(`📸 Found ${images.length} images\n`);

  const mapping = {};
  let success = 0;
  let failed  = 0;

  for (let i = 0; i < images.length; i++) {
    const file = images[i];
    const rel  = path.relative(PUBLIC_DIR, file).replace(/\\/g, '/');
    process.stdout.write(`[${i+1}/${images.length}] Uploading: ${rel} ... `);

    try {
      const result = await uploadFile(file, PUBLIC_DIR);
      mapping[result.local] = { url: result.url, publicId: result.publicId };
      console.log(`✅`);
      success++;
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }
  }

  console.log(`\n════════════════════════════════════════`);
  console.log(`✅ Uploaded: ${success} | ❌ Failed: ${failed}`);
  console.log(`════════════════════════════════════════\n`);

  // Save mapping to file for DB update
  const outPath = path.join(__dirname, 'cloudinary-mapping.json');
  fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2));
  console.log(`📄 Mapping saved to: cloudinary-mapping.json`);
  console.log('\n🔄 Run "node update-db-cloudinary.js" to update the database.\n');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
