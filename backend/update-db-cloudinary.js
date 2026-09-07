/**
 * After uploading images to Cloudinary, run this script to update
 * all product image URLs in MongoDB to use the Cloudinary URLs.
 * 
 * Run: node update-db-cloudinary.js
 */

const m    = require('mongoose');
const path = require('path');
const fs   = require('fs');
require('dotenv').config();

const MAPPING_FILE = path.join(__dirname, 'cloudinary-mapping.json');

m.connect(process.env.MONGODB_URI).then(async () => {
  console.log('✅ Connected to MongoDB\n');

  if (!fs.existsSync(MAPPING_FILE)) {
    console.error('❌ cloudinary-mapping.json not found. Run upload-to-cloudinary.js first.');
    process.exit(1);
  }

  const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
  console.log(`📄 Loaded mapping: ${Object.keys(mapping).length} entries\n`);

  const col = m.connection.collection('products');
  const products = await col.find({}).toArray();
  console.log(`📦 Found ${products.length} products\n`);

  let updated = 0;

  for (const product of products) {
    const newImages = (product.images || []).map((img) => {
      const localPath = typeof img === 'string' ? img : img.url;
      const entry = mapping[localPath];
      if (entry) {
        return {
          ...(typeof img === 'object' ? img : {}),
          url:       entry.url,
          publicId:  entry.publicId,
          alt:       (typeof img === 'object' ? img.alt : '') || product.nameEn || 'Product',
          isPrimary: typeof img === 'object' ? img.isPrimary : false,
          order:     typeof img === 'object' ? img.order : 0,
        };
      }
      // Keep original if no mapping found
      return img;
    });

    const changed = JSON.stringify(newImages) !== JSON.stringify(product.images);
    if (changed) {
      await col.updateOne({ _id: product._id }, { $set: { images: newImages } });
      console.log(`✅ Updated: ${product.sku || product.nameEn}`);
      updated++;
    }
  }

  console.log(`\n════════════════════════════════════════`);
  console.log(`✅ Updated ${updated} products with Cloudinary URLs`);
  console.log(`════════════════════════════════════════\n`);

  await m.disconnect();
  process.exit(0);
}).catch(err => {
  console.error('❌ MongoDB error:', err.message);
  process.exit(1);
});
