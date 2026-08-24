/**
 * Standalone MongoDB / Azure Cosmos DB connection test
 * Run: node backend/test-db-connection.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const URI = process.env.MONGODB_URI;

console.log('\n====================================================');
console.log('  DATABASE CONNECTION TEST');
console.log('====================================================');
console.log('Host  :', URI ? URI.replace(/:([^:@]+)@/, ':<password>@').split('/')[2] : 'NOT SET');
console.log('DB    : church_db');
console.log('TLS   : true');
console.log('Timeout: 30000 ms');
console.log('====================================================\n');

if (!URI) {
  console.error('MONGODB_URI not set in .env');
  process.exit(1);
}

const start = Date.now();

mongoose.connect(URI, {
  dbName: 'church_db',
  retryWrites: false,
  tls: true,
  tlsAllowInvalidCertificates: false,
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
})
.then(async () => {
  const ms = Date.now() - start;
  console.log(`Connected OK  (${ms} ms)`);

  // Ping
  await mongoose.connection.db.admin().ping();
  console.log('Ping   : OK');

  // List collections
  const cols = await mongoose.connection.db.listCollections().toArray();
  console.log(`Collections (${cols.length}):`);
  cols.forEach(c => console.log('  -', c.name));

  await mongoose.disconnect();
  console.log('\nDisconnected cleanly');
  process.exit(0);
})
.catch(err => {
  const ms = Date.now() - start;
  console.error(`\nConnection FAILED after ${ms} ms`);
  console.error('Error  :', err.message);
  console.error('Code   :', err.code || 'n/a');
  console.error('\nPossible causes:');
  console.error('  1. Azure Cosmos DB is paused - check Azure Portal');
  console.error('  2. Firewall: your IP is not whitelisted in Cosmos DB');
  console.error('  3. Wrong credentials in MONGODB_URI');
  console.error('  4. SSL certificate issue');
  process.exit(1);
});

// Show progress dots while waiting
const dots = setInterval(() => process.stdout.write('.'), 1000);
mongoose.connection.once('connected', () => clearInterval(dots));
mongoose.connection.once('error', () => clearInterval(dots));
