/**
 * Seed Orthodox Library with Initial Data
 * Run: node scripts/seed-library.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const LiturgicalBook = require('../models/LiturgicalBook');
const LiturgicalBlock = require('../models/LiturgicalBlock');

async function seedLibrary() {
  try {
    console.log('🔗 Connecting to database...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'church_db',
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: false,
    });

    console.log('✅ Connected to database');

    // Check if data already exists
    const existingBooks = await LiturgicalBook.countDocuments();
    if (existingBooks > 0) {
      console.log(`⚠️  Found ${existingBooks} existing books. Do you want to continue? (This will add more data)`);
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log('\n📚 Creating liturgical books...\n');

    // ============ Divine Liturgy of St. John Chrysostom ============
    const kidaseJohn = await LiturgicalBook.create({
      title: 'Divine Liturgy of Saint John Chrysostom',
      titleGez: 'ቅዳሴ ዘቅዱስ ዮሐንስ አፈወርቅ',
      titleTi: 'ቅዳሴ ቅዱስ ዮሃንስ አፈወርቅ',
      description: 'The most commonly used liturgy in the Eritrean Orthodox Tewahedo Church. This divine liturgy is celebrated throughout the year except during fasting periods.',
      type: 'liturgy',
      tradition: 'eritrean-orthodox',
      languages: ['gez', 'ti', 'en'],
      status: 'published',
      featured: true,
      tags: ['liturgy', 'kidase', 'john-chrysostom', 'divine-liturgy'],
      searchKeywords: ['kidase', 'liturgy', 'john', 'chrysostom', 'ቅዳሴ', 'ዮሐንስ'],
      createdBy: 'system',
    });

    console.log('✅ Created:', kidaseJohn.title);

    // Sample blocks for Kidase John
    const kidaseJohnBlocks = [
      {
        bookId: kidaseJohn._id,
        section: 'opening',
        verseNumber: 1,
        globalOrder: 1,
        role: 'priest',
        translations: {
          gez: 'በስመ አብ ወወልድ ወመንፈስ ቅዱስ አሐዱ አምላክ አሜን።',
          ti: 'ብስም አብ ወወልድ ወመንፈስ ቅዱስ ሓደ አምላኽ አሜን።',
          en: 'In the name of the Father, and the Son, and the Holy Spirit, One God. Amen.'
        },
        isRubric: false,
        isResponsive: false,
        reference: 'Matthew 28:19',
      },
      {
        bookId: kidaseJohn._id,
        section: 'opening',
        verseNumber: 2,
        globalOrder: 2,
        role: 'people',
        translations: {
          gez: 'አሜን።',
          ti: 'አሜን።',
          en: 'Amen.'
        },
        isRubric: false,
        isResponsive: true,
      },
      {
        bookId: kidaseJohn._id,
        section: 'opening',
        verseNumber: 3,
        globalOrder: 3,
        role: 'priest',
        translations: {
          gez: 'ስብሐት ለአብ ወወልድ ወመንፈስ ቅዱስ',
          ti: 'ስብሓት ለአብ ወወልድ ወመንፈስ ቅዱስ',
          en: 'Glory to the Father, and to the Son, and to the Holy Spirit'
        },
        isRubric: false,
        isResponsive: false,
      },
      {
        bookId: kidaseJohn._id,
        section: 'opening',
        verseNumber: 4,
        globalOrder: 4,
        role: 'people',
        translations: {
          gez: 'ይእዜኒ ወዘልፈኒ ወለዓለመ ዓለም አሜን።',
          ti: 'ይእዜኒ ወዘልፈኒ ወለዓለመ ዓለም አሜን።',
          en: 'Now and forever and unto the ages of ages. Amen.'
        },
        isRubric: false,
        isResponsive: true,
      },
      {
        bookId: kidaseJohn._id,
        section: 'preparation',
        verseNumber: 5,
        globalOrder: 5,
        role: 'rubric',
        translations: {
          gez: '[ካህን ይቀርብ ወይብል]',
          ti: '[ካህን ይቀርብ ወይብል]',
          en: '[The priest approaches and says]'
        },
        isRubric: true,
        isResponsive: false,
      },
    ];

    await LiturgicalBlock.insertMany(kidaseJohnBlocks);
    console.log(`   Added ${kidaseJohnBlocks.length} blocks`);

    kidaseJohn.blockCount = kidaseJohnBlocks.length;
    await kidaseJohn.save();

    // ============ Divine Liturgy of St. Basil ============
    const kidaseBasil = await LiturgicalBook.create({
      title: 'Divine Liturgy of Saint Basil the Great',
      titleGez: 'ቅዳሴ ዘቅዱስ ባስልዮስ',
      titleTi: 'ቅዳሴ ቅዱስ ባስልዮስ',
      description: 'Used during fasting periods and special occasions in the Eritrean Orthodox Tewahedo Church.',
      type: 'liturgy',
      tradition: 'eritrean-orthodox',
      languages: ['gez', 'ti', 'en'],
      status: 'published',
      featured: true,
      tags: ['liturgy', 'kidase', 'basil', 'fasting', 'divine-liturgy'],
      searchKeywords: ['kidase', 'liturgy', 'basil', 'fasting', 'ቅዳሴ', 'ባስልዮስ'],
      createdBy: 'system',
    });

    console.log('✅ Created:', kidaseBasil.title);

    const kidaseBasilBlocks = [
      {
        bookId: kidaseBasil._id,
        section: 'opening',
        verseNumber: 1,
        globalOrder: 1,
        role: 'priest',
        translations: {
          gez: 'በስመ አብ ወወልድ ወመንፈስ ቅዱስ አሐዱ አምላክ አሜን።',
          ti: 'ብስም አብ ወወልድ ወመንፈስ ቅዱስ ሓደ አምላኽ አሜን።',
          en: 'In the name of the Father, and the Son, and the Holy Spirit, One God. Amen.'
        },
        isRubric: false,
        isResponsive: false,
      },
    ];

    await LiturgicalBlock.insertMany(kidaseBasilBlocks);
    console.log(`   Added ${kidaseBasilBlocks.length} blocks`);

    kidaseBasil.blockCount = kidaseBasilBlocks.length;
    await kidaseBasil.save();

    // ============ Prayer Book ============
    const prayerBook = await LiturgicalBook.create({
      title: 'Orthodox Prayer Book',
      titleGez: 'መጽሐፈ ጸሎት',
      titleTi: 'መጽሓፍ ጸሎት',
      description: 'Daily prayers and devotions for Orthodox Christians.',
      type: 'prayer',
      tradition: 'eritrean-orthodox',
      languages: ['gez', 'ti', 'en'],
      status: 'published',
      featured: false,
      tags: ['prayer', 'devotional', 'daily-prayers'],
      searchKeywords: ['prayer', 'devotional', 'ጸሎት'],
      createdBy: 'system',
    });

    console.log('✅ Created:', prayerBook.title);

    // ============ Summary ============
    const totalBooks = await LiturgicalBook.countDocuments();
    const totalBlocks = await LiturgicalBlock.countDocuments();

    console.log('\n' + '='.repeat(50));
    console.log('✅ Library seeded successfully!');
    console.log('='.repeat(50));
    console.log(`📚 Total Books: ${totalBooks}`);
    console.log(`📄 Total Blocks: ${totalBlocks}`);
    console.log('='.repeat(50));
    console.log('\n📋 Created Books:');
    console.log(`   1. ${kidaseJohn.title} (${kidaseJohn.blockCount} blocks)`);
    console.log(`   2. ${kidaseBasil.title} (${kidaseBasil.blockCount} blocks)`);
    console.log(`   3. ${prayerBook.title} (${prayerBook.blockCount} blocks)`);
    console.log('\n🌐 Next Steps:');
    console.log('   1. Start your backend: npm start');
    console.log('   2. Start Orthodox Library: cd ../orthodox-library-app && npm run dev');
    console.log('   3. Visit: http://localhost:3000/books');
    console.log('\n');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error seeding library:', error);
    console.error('\nDetails:', error.message);
    
    if (error.code === 11000) {
      console.error('\n⚠️  Duplicate key error. Books may already exist.');
      console.error('   Try deleting existing data first or use different IDs.');
    }
    
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the seed function
console.log('🌱 Starting Orthodox Library Seed Script...\n');
seedLibrary();
