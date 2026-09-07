const m = require('mongoose');
require('dotenv').config();
m.connect(process.env.MONGODB_URI).then(async () => {
  const docs = await m.connection.collection('categories').find({}).toArray();
  console.log('All categories:', JSON.stringify(docs.map(d => ({ id: d._id, slug: d.slug, slugEn: d.slugEn, slugAr: d.slugAr, name: d.nameEn })), null, 2));
  await m.disconnect();
  process.exit(0);
});
