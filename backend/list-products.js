const m = require('mongoose');
require('dotenv').config();
m.connect(process.env.MONGODB_URI).then(async () => {
  const products = await m.connection.collection('products').find({}, {
    projection: { sku: 1, nameEn: 1, 'images': 1 }
  }).toArray();
  products.forEach(p => {
    console.log(`SKU: ${p.sku} | ${p.nameEn} | images: ${p.images?.length || 0} | first: ${p.images?.[0]?.url || 'NONE'}`);
  });
  console.log('\nTotal:', products.length);
  await m.disconnect(); process.exit(0);
});
