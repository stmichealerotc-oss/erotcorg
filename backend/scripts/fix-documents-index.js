/**
 * One-time fix script for ChurchDocument collection.
 *
 * What it does:
 *  1. Finds all documents with a missing/null fileNo and assigns them proper numbers
 *  2. Drops the old non-sparse unique index on fileNo
 *  3. Recreates it as a sparse unique index so future null values don't collide
 *
 * Run once: node scripts/fix-documents-index.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const CATEGORY_TYPE = {
  'outgoing-letter':  'OUT',
  'incoming-letter':  'IN',
  'minutes':          'MIN',
  'resolution':       'RES',
  'financial-report': 'FIN',
  'circular':         'CIR',
  'report':           'REP',
  'legal':            'LEG',
  'other':            'GEN'
};

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const col = db.collection('churchdocuments');

  // ── Step 1: Drop the old non-sparse unique index if it exists ─────────────
  try {
    await col.dropIndex('fileNo_1');
    console.log('🗑️  Dropped old fileNo_1 index');
  } catch (e) {
    console.log('ℹ️  No existing fileNo_1 index to drop (or already sparse)');
  }

  // ── Step 2: Recreate as sparse unique ─────────────────────────────────────
  await col.createIndex({ fileNo: 1 }, { unique: true, sparse: true });
  console.log('✅ Created sparse unique index on fileNo');

  // ── Step 3: Find docs with missing fileNo and assign proper numbers ────────
  const broken = await col.find({ fileNo: { $in: [null, ''] } }).toArray();
  console.log(`🔍 Found ${broken.length} document(s) with missing fileNo`);

  if (broken.length === 0) {
    console.log('🎉 Nothing to fix. All done.');
    await mongoose.disconnect();
    return;
  }

  // Load current counter state per type/year
  const counters = {};

  async function getNextSeq(type, year) {
    const key = `${type}-${year}`;
    if (!counters[key]) {
      // Find the highest existing seq for this type/year from actual documents
      const pattern = new RegExp(`^STM-${year}-${type}-(\\d+)$`);
      const existing = await col
        .find({ fileNo: { $regex: pattern } })
        .sort({ fileNo: -1 })
        .limit(1)
        .toArray();

      const highest = existing.length > 0
        ? parseInt(existing[0].fileNo.split('-')[3], 10)
        : 0;

      // Also check the Counter collection
      const counterDoc = await db.collection('counters').findOne({ type, year });
      counters[key] = Math.max(highest, counterDoc?.seq || 0);
    }
    counters[key] += 1;

    // Update the Counter collection to stay in sync
    await db.collection('counters').updateOne(
      { type, year },
      { $set: { seq: counters[key] } },
      { upsert: true }
    );

    return counters[key];
  }

  for (const doc of broken) {
    const category = doc.category || 'other';
    const type = CATEGORY_TYPE[category] || 'GEN';
    const year = doc.date ? new Date(doc.date).getFullYear() : new Date().getFullYear();
    const seq = await getNextSeq(type, year);
    const fileNo = `STM-${year}-${type}-${String(seq).padStart(3, '0')}`;

    await col.updateOne({ _id: doc._id }, { $set: { fileNo } });
    console.log(`  ✏️  Assigned ${fileNo} to doc "${doc.title}" (${doc._id})`);
  }

  console.log('🎉 All done. Restart your backend server.');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
