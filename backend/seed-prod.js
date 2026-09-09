// Production seed — run: node seed-prod.js
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch (e) {}

require('dotenv').config();
require('./seed-real-products.js');
