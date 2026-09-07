/**
 * Fix product image paths in DB to match actual files in /public/products/
 * Run: node fix-product-images.js
 */
const m = require('mongoose');
require('dotenv').config();

m.connect(process.env.MONGODB_URI).then(async () => {
  const col = m.connection.collection('products');

  // Map: sku => correct images array
  const fixes = {
    'RWQ-LC-001': [
      { url: '/products/lounge-chair/c06c5049-6ff5-46e5-91fc-fe4c697ba088.jpg', alt: 'Lounge Chair', isPrimary: true,  order: 0 },
      { url: '/products/lounge-chair/ChatGPT Image Sep 5, 2026, 12_32_34 AM.jpg', alt: 'Lounge Chair 2', isPrimary: false, order: 1 },
    ],
    'RWQ-LC-002': [
      { url: '/products/lounge-chair/c06c5049-6ff5-46e5-91fc-fe4c697ba088.jpg', alt: 'Lounge Chair Classic', isPrimary: true,  order: 0 },
      { url: '/products/lounge-chair/ChatGPT Image Sep 5, 2026, 12_32_34 AM.jpg', alt: 'Lounge Chair Classic 2', isPrimary: false, order: 1 },
    ],
    'RWQ-CHL-001': [
      { url: '/products/chair-lounge/img-1.jpg', alt: 'Chair Lounge Ottoman', isPrimary: true,  order: 0 },
      { url: '/products/chair-lounge/img-2.jpg', alt: 'Chair Lounge Ottoman 2', isPrimary: false, order: 1 },
    ],
    'RWQ-8B-001': [
      { url: '/products/8ball-bean-bag/img-1.jpg', alt: '8-Ball 1', isPrimary: true,  order: 0 },
      { url: '/products/8ball-bean-bag/img-2.jpg', alt: '8-Ball 2', isPrimary: false, order: 1 },
      { url: '/products/8ball-bean-bag/img-3.jpg', alt: '8-Ball 3', isPrimary: false, order: 2 },
      { url: '/products/8ball-bean-bag/img-4.jpg', alt: '8-Ball 4', isPrimary: false, order: 3 },
    ],
    'RWQ-FB-L': [
      { url: '/products/football-bean-bag/img-1.jpg',  alt: 'Football L 1',  isPrimary: true,  order: 0 },
      { url: '/products/football-bean-bag/img-2.jpg',  alt: 'Football L 2',  isPrimary: false, order: 1 },
      { url: '/products/football-bean-bag/img-3.jpg',  alt: 'Football L 3',  isPrimary: false, order: 2 },
      { url: '/products/football-bean-bag/img-4.jpg',  alt: 'Football L 4',  isPrimary: false, order: 3 },
      { url: '/products/football-bean-bag/img-5.jpg',  alt: 'Football L 5',  isPrimary: false, order: 4 },
      { url: '/products/football-bean-bag/img-6.jpg',  alt: 'Football L 6',  isPrimary: false, order: 5 },
    ],
    'RWQ-FB-XL': [
      { url: '/products/football-bean-bag/img-7.jpg',  alt: 'Football XL 1', isPrimary: true,  order: 0 },
      { url: '/products/football-bean-bag/img-8.jpg',  alt: 'Football XL 2', isPrimary: false, order: 1 },
      { url: '/products/football-bean-bag/img-9.jpg',  alt: 'Football XL 3', isPrimary: false, order: 2 },
    ],
    'RWQ-FB-2XL': [
      { url: '/products/football-bean-bag/img-10.jpg', alt: 'Football 2XL 1', isPrimary: true,  order: 0 },
      { url: '/products/football-bean-bag/img-11.jpg', alt: 'Football 2XL 2', isPrimary: false, order: 1 },
      { url: '/products/football-bean-bag/img-12.jpg', alt: 'Football 2XL 3', isPrimary: false, order: 2 },
    ],
    'RWQ-FB-3XL': [
      { url: '/products/football-bean-bag/img-13.jpg', alt: 'Football 3XL 1', isPrimary: true,  order: 0 },
      { url: '/products/football-bean-bag/img-14.jpg', alt: 'Football 3XL 2', isPrimary: false, order: 1 },
      { url: '/products/football-bean-bag/img-15.jpg', alt: 'Football 3XL 3', isPrimary: false, order: 2 },
      { url: '/products/football-bean-bag/img-16.jpg', alt: 'Football 3XL 4', isPrimary: false, order: 3 },
      { url: '/products/football-bean-bag/img-17.jpg', alt: 'Football 3XL 5', isPrimary: false, order: 4 },
    ],
  };

  for (const [sku, images] of Object.entries(fixes)) {
    const r = await col.updateOne({ sku }, { $set: { images } });
    console.log(r.modifiedCount ? `✅ Fixed: ${sku}` : `⚠  Not found: ${sku}`);
  }

  console.log('\n✅ All product images fixed!');
  await m.disconnect();
  process.exit(0);
}).catch(e => { console.error('❌', e.message); process.exit(1); });
