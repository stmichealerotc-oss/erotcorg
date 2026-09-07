/**
 * Cleanup: delete the wrongly seeded ስንክሳር books and their blocks.
 * Keeps the ግጻዌ book (6a9e555a1bb1f932d6b8f3f9) intact.
 * Run: node backend/scripts/cleanup-synaxar.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const LiturgicalBook  = require('../models/LiturgicalBook');
const LiturgicalBlock = require('../models/LiturgicalBlock');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'church_db', retryWrites: false, tls: true, family: 4,
    serverSelectionTimeoutMS: 30000,
  });
  console.log('Connected\n');

  // Find all the wrong synaxar books (title contains ስንክሳር)
  const wrong = await LiturgicalBook.find(
    { category: 'synaxar', titleGez: /ስንክሳር/ },
    { _id: 1, titleGez: 1, blockCount: 1 }
  );

  if (wrong.length === 0) {
    console.log('No wrong books found — nothing to delete.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${wrong.length} books to delete:`);
  wrong.forEach(b => console.log(`  ${b._id}  ${b.titleGez}  (${b.blockCount} blocks)`));

  const ids = wrong.map(b => b._id.toString());

  // Delete blocks first (with retry for Cosmos DB rate limiting)
  let rbDeleted = 0;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const rb = await mongoose.connection.collection('liturgical_blocks')
        .deleteMany({ bookId: { $in: ids } });
      rbDeleted = rb.deletedCount;
      break;
    } catch (e) {
      if ((e.message || '').includes('16500') && attempt < 3) {
        console.log(`  Rate limited on block delete — waiting 4s (attempt ${attempt}/3)...`);
        await new Promise(r => setTimeout(r, 4000));
      } else throw e;
    }
  }
  console.log(`\nDeleted ${rbDeleted} blocks`);

  // Delete books
  const bk = await LiturgicalBook.deleteMany({ _id: { $in: ids } });
  console.log(`Deleted ${bk.deletedCount} books`);

  // Verify ግጻዌ is still there
  const gtsawie = await LiturgicalBook.findOne({ titleGez: 'ግጻዌ' });
  console.log(`\nGtsawie book intact: ${gtsawie ? '✅ ' + gtsawie._id : '❌ NOT FOUND'}`);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
