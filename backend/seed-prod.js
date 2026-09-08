// Production seed — run: node seed-prod.js
process.env.MONGODB_URI = 'mongodb+srv://Rawaqa:T9!xQ7%40L%23p3%24V8%5EaZ2!mW5%26kR4*Hq1%40N6sD@rawaqa.uvte5na.mongodb.net/rawaqa?retryWrites=true&w=majority&appName=Rawaqa';
process.env.ADMIN_EMAIL    = 'admin@rawaqa.com';
process.env.ADMIN_PASSWORD = 'Rw#2026@Admin!9xQ$Secure';
require('./seed-real-products.js');
