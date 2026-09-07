const m = require('mongoose');
require('dotenv').config();
m.connect(process.env.MONGODB_URI).then(async () => {
  const col = m.connection.collection('categories');
  // Delete docs that are missing slugEn (broken from old seed)
  const r1 = await col.deleteMany({ slugEn: { $exists: false } });
  console.log('Deleted incomplete categories:', r1.deletedCount);
  // Also drop the entire categories collection to start fresh (safe — we re-seed)
  // Uncomment if still getting dups:
  // await col.drop(); console.log('Dropped categories collection');
  await m.disconnect();
  process.exit(0);
});
