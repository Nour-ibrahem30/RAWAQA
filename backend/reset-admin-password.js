const m = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

m.connect(process.env.MONGODB_URI).then(async () => {
  const newPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const hashed = await bcrypt.hash(newPassword, 10);

  const result = await m.connection.collection('users').updateOne(
    { email: 'admin@rawaqa.com' },
    { $set: { password: hashed, isActive: true, isEmailVerified: true } }
  );

  console.log('Updated:', result.modifiedCount, 'user(s)');
  console.log('');
  console.log('✅ Admin password reset successfully');
  console.log('   Email    :', 'admin@rawaqa.com');
  console.log('   Password :', newPassword);
  console.log('   Dashboard: http://localhost:3001/admin');

  await m.disconnect();
  process.exit(0);
});
