const m = require('mongoose');
require('dotenv').config();
m.connect(process.env.MONGODB_URI).then(async () => {
  // Drop old categories that don't have our 'slug' field (from old project)
  const r = await m.connection.collection('categories').deleteMany({ slug: { $exists: false } });
  console.log('Removed old categories:', r.deletedCount);
  await m.disconnect();
  process.exit(0);
});
