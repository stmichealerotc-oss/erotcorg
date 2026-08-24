/**
 * Resets all Counter seq values to match the highest fileNo actually in the DB.
 * Run once after data migration or counter drift.
 *
 * node scripts/reset-counters.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const col = db.collection('churchdocuments');

  // Find all distinct type/year combos from actual fileNo values
  const docs = await col.find(
    { fileNo: { $exists: true, $ne: null } },
    { projection: { fileNo: 1 } }
  ).toArray();

  // Parse each fileNo: STM-YYYY-TYPE-SEQ
  const maxSeq = {}; // key: "TYPE-YEAR" → highest seq
  for (const doc of docs) {
    const parts = doc.fileNo?.split('-');
    if (!parts || parts.length < 4) continue;
    const [, year, type, seqStr] = parts;
    const seq = parseInt(seqStr, 10);
    if (isNaN(seq)) continue;
    const key = `${type}-${year}`;
    if (!maxSeq[key] || seq > maxSeq[key].seq) {
      maxSeq[key] = { type, year: parseInt(year, 10), seq };
    }
  }

  console.log('\nHighest seq found per type/year:');
  console.log(maxSeq);

  // Update each counter
  for (const { type, year, seq } of Object.values(maxSeq)) {
    const result = await db.collection('counters').findOneAndUpdate(
      { type, year },
      { $set: { seq } },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`✅ Counter ${type}/${year} → seq set to ${seq}`);
  }

  console.log('\n🎉 All counters synced. Restart your backend server.');
  await mongoose.disconnect();
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
