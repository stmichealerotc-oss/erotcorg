require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('\n── Counters ──');
  const counters = await db.collection('counters').find({}).toArray();
  console.log(JSON.stringify(counters, null, 2));

  console.log('\n── ChurchDocuments (fileNo only) ──');
  const docs = await db.collection('churchdocuments')
    .find({}, { projection: { fileNo: 1, category: 1, title: 1 } })
    .sort({ fileNo: 1 })
    .toArray();
  console.log(JSON.stringify(docs, null, 2));

  await mongoose.disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
