const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const LiturgicalBook = require('../models/LiturgicalBook');

const books = [
  // ── ANAPHORA (14) ──────────────────────────────────────────────────────
  { category: 'anaphora', title: 'Anaphora of the Apostles',         titleGez: 'ኣናፎራ ሃዋርያት',                  titleTi: 'ኣናፎራ ሃዋርያት',                  type: 'liturgy', status: 'published', featured: true, languages: ['gez','ti','en','am'], tags: ['anaphora','qdasie'] },
  { category: 'anaphora', title: 'Anaphora of the Lord',             titleGez: 'ኣናፎራ እግዚእነ',                  titleTi: 'ኣናፎራ እግዚእነ',                  type: 'liturgy', status: 'published', featured: true, languages: ['gez','ti','en','am'], tags: ['anaphora','qdasie'] },
  { category: 'anaphora', title: 'Anaphora of John, Son of Thunder', titleGez: 'ኣናፎራ ዮሃንስ ወዲ ራዕዲ',           titleTi: 'ኣናፎራ ዮሃንስ ወዲ ራዕዲ',           type: 'liturgy', status: 'published', featured: true, languages: ['gez','ti','en','am'], tags: ['anaphora','qdasie'] },
  { category: 'anaphora', title: 'Anaphora of St. Mary',             titleGez: 'ኣናፎራ ቅድስት ማርያም',             titleTi: 'ኣናፎራ ቅድስት ማርያም',             type: 'liturgy', status: 'published', featured: true, languages: ['gez','ti','en','am'], tags: ['anaphora','qdasie'] },
  { category: 'anaphora', title: 'Anaphora of St. Athanasius',       titleGez: 'ኣናፎራ ቅዱስ ኣታናስዮስ',            titleTi: 'ኣናፎራ ቅዱስ ኣታናስዮስ',            type: 'liturgy', status: 'published', featured: true, languages: ['gez','ti','en','am'], tags: ['anaphora','qdasie'] },
  { category: 'anaphora', title: 'Anaphora of St. Basil',            titleGez: 'ኣናፎራ ቅዱስ ባሲልዮስ',             titleTi: 'ኣናፎራ ቅዱስ ባሲልዮስ',             type: 'liturgy', status: 'published', featured: true, languages: ['gez','ti','en','am'], tags: ['anaphora','qdasie'] },
  { category: 'anaphora', title: 'Anaphora of St. Gregory I',        titleGez: 'ኣናፎራ ቅዱስ ግሪጎርዮስ ቀዳማይ',       titleTi: 'ኣናፎራ ቅዱስ ግሪጎርዮስ ቀዳማይ',       type: 'liturgy', status: 'published', featured: true, languages: ['gez','ti','en','am'], tags: ['anaphora','qdasie'] },
  { category: 'anaphora', title: 'Anaphora of the Three Hundred',    titleGez: 'ኣናፎራ ሰላሳ ሚእቲ',               titleTi: 'ኣናፎራ ሰላሳ ሚእቲ',               type: 'liturgy', status: 'published', featured: true, languages: ['gez','ti','en','am'], tags: ['anaphora','qdasie'] },
  { category: 'anaphora', title: 'Anaphora of St. Epiphanius',       titleGez: 'ኣናፎራ ቅዱስ ኤፒፋንዮስ',            titleTi: 'ኣናፎራ ቅዱስ ኤፒፋንዮስ',            type: 'liturgy', status: 'published', featured: true, languages: ['gez','ti','en','am'], tags: ['anaphora','qdasie'] },
  { category: 'anaphora', title: 'Anaphora of St. John Chrysostom',  titleGez: 'ኣናፎራ ቅዱስ ዮሃንስ ክርስሶስቶም',      titleTi: 'ኣናፎራ ቅዱስ ዮሃንስ ክርስሶስቶም',      type: 'liturgy', status: 'published', featured: true, languages: ['gez','ti','en','am'], tags: ['anaphora','qdasie'] },
  { category: 'anaphora', title: 'Anaphora of St. Cyril',            titleGez: 'ኣናፎራ ቅዱስ ኪሮስ',               titleTi: 'ኣናፎራ ቅዱስ ኪሮስ',               type: 'liturgy', status: 'published', featured: true, languages: ['gez','ti','en','am'], tags: ['anaphora','qdasie'] },
  { category: 'anaphora', title: 'Anaphora of St. Jacob of Serough', titleGez: 'ኣናፎራ ቅዱስ ያዕቆብ ሰሩግ',          titleTi: 'ኣናፎራ ቅዱስ ያዕቆብ ሰሩግ',          type: 'liturgy', status: 'published', featured: true, languages: ['gez','ti','en','am'], tags: ['anaphora','qdasie'] },
  { category: 'anaphora', title: 'Anaphora of St. Dioscorus',        titleGez: 'ኣናፎራ ቅዱስ ዲዮስቆሮስ',            titleTi: 'ኣናፎራ ቅዱስ ዲዮስቆሮስ',            type: 'liturgy', status: 'published', featured: true, languages: ['gez','ti','en','am'], tags: ['anaphora','qdasie'] },
  { category: 'anaphora', title: 'Anaphora of St. Gregory II',       titleGez: 'ኣናፎራ ቅዱስ ግሪጎርዮስ ካልኣይ',       titleTi: 'ኣናፎራ ቅዱስ ግሪጎርዮስ ካልኣይ',       type: 'liturgy', status: 'published', featured: true, languages: ['gez','ti','en','am'], tags: ['anaphora','qdasie'] },

  // ── SYNAXAR (ስንክሳር) ───────────────────────────────────────────────────
  { category: 'synaxar', title: 'Synaxar - Month of Meskerem',  titleGez: 'ስንክሳር - ወርሒ መስከረም', titleTi: 'ስንክሳር - ወርሒ መስከረም', type: 'devotional', status: 'draft', languages: ['gez','ti','en'], tags: ['synaxar','meskerem'] },
  { category: 'synaxar', title: 'Synaxar - Month of Tikimt',    titleGez: 'ስንክሳር - ወርሒ ጥቅምቲ',  titleTi: 'ስንክሳር - ወርሒ ጥቅምቲ',  type: 'devotional', status: 'draft', languages: ['gez','ti','en'], tags: ['synaxar','tikimt'] },
  { category: 'synaxar', title: 'Synaxar - Month of Hidar',     titleGez: 'ስንክሳር - ወርሒ ሕዳር',   titleTi: 'ስንክሳር - ወርሒ ሕዳር',   type: 'devotional', status: 'draft', languages: ['gez','ti','en'], tags: ['synaxar','hidar'] },
  { category: 'synaxar', title: 'Synaxar - Month of Tahsas',    titleGez: 'ስንክሳር - ወርሒ ታሕሳስ',  titleTi: 'ስንክሳር - ወርሒ ታሕሳስ',  type: 'devotional', status: 'draft', languages: ['gez','ti','en'], tags: ['synaxar','tahsas'] },
  { category: 'synaxar', title: 'Synaxar - Month of Tir',       titleGez: 'ስንክሳር - ወርሒ ጥሪ',    titleTi: 'ስንክሳር - ወርሒ ጥሪ',    type: 'devotional', status: 'draft', languages: ['gez','ti','en'], tags: ['synaxar','tir'] },
  { category: 'synaxar', title: 'Synaxar - Month of Yekatit',   titleGez: 'ስንክሳር - ወርሒ የካቲት',  titleTi: 'ስንክሳር - ወርሒ የካቲት',  type: 'devotional', status: 'draft', languages: ['gez','ti','en'], tags: ['synaxar','yekatit'] },
  { category: 'synaxar', title: 'Synaxar - Month of Megabit',   titleGez: 'ስንክሳር - ወርሒ መጋቢት',  titleTi: 'ስንክሳር - ወርሒ መጋቢት',  type: 'devotional', status: 'draft', languages: ['gez','ti','en'], tags: ['synaxar','megabit'] },
  { category: 'synaxar', title: 'Synaxar - Month of Miyazya',   titleGez: 'ስንክሳር - ወርሒ ሚያዝያ',  titleTi: 'ስንክሳር - ወርሒ ሚያዝያ',  type: 'devotional', status: 'draft', languages: ['gez','ti','en'], tags: ['synaxar','miyazya'] },
  { category: 'synaxar', title: 'Synaxar - Month of Ginbot',    titleGez: 'ስንክሳር - ወርሒ ግንቦት',  titleTi: 'ስንክሳር - ወርሒ ግንቦት',  type: 'devotional', status: 'draft', languages: ['gez','ti','en'], tags: ['synaxar','ginbot'] },
  { category: 'synaxar', title: 'Synaxar - Month of Sene',      titleGez: 'ስንክሳር - ወርሒ ሰነ',    titleTi: 'ስንክሳር - ወርሒ ሰነ',    type: 'devotional', status: 'draft', languages: ['gez','ti','en'], tags: ['synaxar','sene'] },
  { category: 'synaxar', title: 'Synaxar - Month of Hamle',     titleGez: 'ስንክሳር - ወርሒ ሓምለ',   titleTi: 'ስንክሳር - ወርሒ ሓምለ',   type: 'devotional', status: 'draft', languages: ['gez','ti','en'], tags: ['synaxar','hamle'] },
  { category: 'synaxar', title: 'Synaxar - Month of Nehase',    titleGez: 'ስንክሳር - ወርሒ ነሓሰ',   titleTi: 'ስንክሳር - ወርሒ ነሓሰ',   type: 'devotional', status: 'draft', languages: ['gez','ti','en'], tags: ['synaxar','nehase'] },
  { category: 'synaxar', title: 'Synaxar - Month of Pagume',    titleGez: 'ስንክሳር - ወርሒ ጳጉሜ',   titleTi: 'ስንክሳር - ወርሒ ጳጉሜ',   type: 'devotional', status: 'draft', languages: ['gez','ti','en'], tags: ['synaxar','pagume'] },

  // ── SEATAT (ሰዓታት) ─────────────────────────────────────────────────────
  { category: 'seatat', title: 'Seatat - First Hour (Prime)',    titleGez: 'ሰዓት ቀዳሚት',  titleTi: 'ሰዓት ቀዳሚት',  type: 'prayer', status: 'draft', languages: ['gez','ti','en'], tags: ['seatat','hours'] },
  { category: 'seatat', title: 'Seatat - Third Hour (Terce)',    titleGez: 'ሰዓት ሳልሰይቲ', titleTi: 'ሰዓት ሳልሰይቲ', type: 'prayer', status: 'draft', languages: ['gez','ti','en'], tags: ['seatat','hours'] },
  { category: 'seatat', title: 'Seatat - Sixth Hour (Sext)',     titleGez: 'ሰዓት ሻድሸይቲ', titleTi: 'ሰዓት ሻድሸይቲ', type: 'prayer', status: 'draft', languages: ['gez','ti','en'], tags: ['seatat','hours'] },
  { category: 'seatat', title: 'Seatat - Ninth Hour (None)',     titleGez: 'ሰዓት ትሸዓይቲ', titleTi: 'ሰዓት ትሸዓይቲ', type: 'prayer', status: 'draft', languages: ['gez','ti','en'], tags: ['seatat','hours'] },
  { category: 'seatat', title: 'Seatat - Eleventh Hour (Vespers)', titleGez: 'ሰዓት ዓሰርተ ሓደ', titleTi: 'ሰዓት ዓሰርተ ሓደ', type: 'prayer', status: 'draft', languages: ['gez','ti','en'], tags: ['seatat','vespers'] },
  { category: 'seatat', title: 'Seatat - Compline (Night Prayer)', titleGez: 'ጸሎት ሌሊት',    titleTi: 'ጸሎት ሌሊት',    type: 'prayer', status: 'draft', languages: ['gez','ti','en'], tags: ['seatat','compline'] },

  // ── BIBLE (መጽሐፍ ቅዱስ) ──────────────────────────────────────────────────
  { category: 'bible', title: 'Gospel of Matthew',  titleGez: 'ወንጌል ማቴዎስ',  titleTi: 'ወንጌል ማቴዎስ',  type: 'scripture', status: 'draft', languages: ['gez','ti','en','am'], tags: ['bible','gospel','new-testament'] },
  { category: 'bible', title: 'Gospel of Mark',     titleGez: 'ወንጌል ማርቆስ',  titleTi: 'ወንጌል ማርቆስ',  type: 'scripture', status: 'draft', languages: ['gez','ti','en','am'], tags: ['bible','gospel','new-testament'] },
  { category: 'bible', title: 'Gospel of Luke',     titleGez: 'ወንጌል ሉቃስ',   titleTi: 'ወንጌል ሉቃስ',   type: 'scripture', status: 'draft', languages: ['gez','ti','en','am'], tags: ['bible','gospel','new-testament'] },
  { category: 'bible', title: 'Gospel of John',     titleGez: 'ወንጌል ዮሃንስ',  titleTi: 'ወንጌል ዮሃንስ',  type: 'scripture', status: 'draft', languages: ['gez','ti','en','am'], tags: ['bible','gospel','new-testament'] },
  { category: 'bible', title: 'Acts of the Apostles', titleGez: 'ግብሪ ሃዋርያት', titleTi: 'ግብሪ ሃዋርያት', type: 'scripture', status: 'draft', languages: ['gez','ti','en','am'], tags: ['bible','new-testament'] },
  { category: 'bible', title: 'Psalms (Dawit)',      titleGez: 'መዝሙር ዳዊት',   titleTi: 'መዝሙር ዳዊት',   type: 'scripture', status: 'draft', languages: ['gez','ti','en','am'], tags: ['bible','psalms','old-testament'] },
];

async function seed() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'church_db',
      retryWrites: false
    });
    console.log('✅ Connected');

    await LiturgicalBook.deleteMany({ tradition: 'eritrean-orthodox' });
    console.log('🗑️  Cleared existing books');

    const inserted = await LiturgicalBook.insertMany(
      books.map(b => ({ ...b, tradition: 'eritrean-orthodox', blockCount: 0 }))
    );
    console.log(`✅ Inserted ${inserted.length} books`);

    const byCategory = {};
    inserted.forEach(b => {
      byCategory[b.category] = (byCategory[b.category] || 0) + 1;
    });
    console.log('\n📊 By category:');
    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`);
    });

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

seed();
