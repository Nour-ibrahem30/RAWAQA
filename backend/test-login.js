// Test login directly against the DB
const m = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

m.connect(process.env.MONGODB_URI).then(async () => {
  const user = await m.connection.collection('users').findOne(
    { email: 'admin@rawaqa.com' },
    { projection: { password: 1, email: 1, isActive: 1 } }
  );

  if (!user) { console.log('❌ User not found'); process.exit(1); }

  console.log('User found:', user.email, '| isActive:', user.isActive);
  console.log('Password hash:', user.password?.substring(0, 20) + '...');

  const testPassword = 'Admin@123456';
  const match = await bcrypt.compare(testPassword, user.password);
  console.log(`\nPassword "${testPassword}" matches:`, match ? '✅ YES' : '❌ NO');

  await m.disconnect();
  process.exit(0);
});
