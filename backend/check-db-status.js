const dns = require('dns');
try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch(e){}
const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rawaqa';

async function check() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB Atlas successfully!\n');
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections in database:');
  for (const col of collections) {
    const count = await mongoose.connection.db.collection(col.name).countDocuments();
    console.log(`  - ${col.name.padEnd(20)}: ${count} documents`);
  }
  
  const categories = await mongoose.connection.db.collection('categories').find({}).toArray();
  console.log('\n📂 Categories:');
  categories.forEach(c => console.log(`  * ${c.slug} | ${c.nameAr} / ${c.nameEn}`));

  const products = await mongoose.connection.db.collection('products').find({}).toArray();
  console.log('\n🛋️ Products:');
  products.forEach(p => console.log(`  * SKU: ${p.sku.padEnd(12)} | ${p.nameAr.padEnd(25)} | ${p.price} EGP | Images: ${p.images ? p.images.length : 0}`));
  
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  console.log('\n👤 Users:');
  users.forEach(u => console.log(`  * ${u.email} | Role: ${u.role} | Active: ${u.isActive}`));

  const ads = await mongoose.connection.db.collection('ads').find({}).toArray();
  console.log('\n📢 Ads:');
  ads.forEach(a => console.log(`  * ${a.titleAr || a.titleEn} | Placement: ${a.placement} | Active: ${a.isActive}`));

  process.exit(0);
}

check().catch(err => {
  console.error('❌ Connection error:', err);
  process.exit(1);
});
