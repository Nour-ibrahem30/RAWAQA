const m = require('mongoose');
require('dotenv').config();
m.connect(process.env.MONGODB_URI).then(async () => {
  const users = await m.connection.collection('users').find(
    { role: { $in: ['admin', 'super_admin'] } },
    { projection: { email: 1, role: 1, isActive: 1, firstName: 1, lastName: 1 } }
  ).toArray();
  console.log('Admin users in DB:', JSON.stringify(users, null, 2));
  await m.disconnect();
  process.exit(0);
});
