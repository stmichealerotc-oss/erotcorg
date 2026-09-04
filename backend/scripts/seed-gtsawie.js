/**
 * Seed script for መጽሐፈ ግጻዌ (Gtsawie / Synaxarium)
 * Structure:
 *   sectionId = month name (e.g. "መስከረም")
 *   subtitle   = day number as Ge'ez numeral (e.g. "፩", "፪", ...)
 *   order      = 1..9 within each day (fixed slots)
 *   role       = slot type (see ROLES below)
 *   translations.gez = the Ge'ez text
 *
 * Run:
 *   node backend/scripts/seed-gtsawie.js
 *
 * Prerequisites:
 *   - Backend .env loaded (MONGODB_URI)
 *   - A LiturgicalBook document for ግጻዌ already created via the admin UI
 *     OR this script will create it if BOOK_ID is not set.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose       = require('mongoose');
const LiturgicalBook  = require('../models/LiturgicalBook');
const LiturgicalBlock = require('../models/LiturgicalBlock');

// ── Slot definitions (order 1..9 within each day) ────────────────────────────
const SLOTS = {
  1: { role: 'synaxar',     label: 'ስንክሳር / ተዝካር' },
  2: { role: 'misbak-negah',label: 'ዘነግህ — ምስባክ' },
  3: { role: 'gospel-negah',label: 'ዘነግህ — ወንጌል' },
  4: { role: 'pauline',     label: 'ዘቅዳሴ — ጳውሎስ' },
  5: { role: 'apostles',    label: 'ዘቅዳሴ — ሐዋርያት' },
  6: { role: 'acts',        label: 'ዘቅዳሴ — ግብረ ሐዋርያት' },
  7: { role: 'misbak-qidat',label: 'ዘቅዳሴ — ምስባክ' },
  8: { role: 'gospel-qidat',label: 'ዘቅዳሴ — ወንጌል' },
  9: { role: 'anaphora',    label: 'ቅዳሴ' },
};

// ── Ge'ez day numerals ────────────────────────────────────────────────────────
const GEZ_NUMS = [
  '፩','፪','፫','፬','፭','፮','፯','፰','፱','፲',
  '፲፩','፲፪','፲፫','፲፬','፲፭','፲፮','፲፯','፲፰','፲፱','፳',
  '፳፩','፳፪','፳፫','፳፬','፳፬','፳፭','፳፮','፳፯','፳፰','፳፱','፴',
];

// ── Month list ────────────────────────────────────────────────────────────────
const MONTHS = [
  'መስከረም','ጥቅምት','ኅዳር','ታኅሣሥ','ጥር','የካቲት',
  'መጋቢት','ሚያዝያ','ግንቦት','ሰኔ','ሐምሌ','ነሐሴ','ጰጉሜ'
];

// ── Raw data: each entry is one DAY ──────────────────────────────────────────
// Format: { month, day (1-based), slots: { 1:text, 2:text, ... } }
// Only Ge'ez for now — Tigrinya and English will be added by volunteers.

const RAW_DAYS = [

  // ══════════ መስከረም ═══════════════════════════════════════════════════════

  { month: 'መስከረም', day: 1, slots: {
    1: 'ስንክሣር / ተዝካር፡ ራጉኤል፤ ሚልኪ፤ በርተሎሜዎስ፤ ኢዮብ።',
    2: 'ምስባክ (መዝሙር)፡ ወትሳርክ አክሊለ ዓመተ ምሕረትከ / ወይጸግቡ ጠላተ ገዳም / ወይረውዩ አድባረ በድው።',
    3: 'ወንጌል፡ ሉቃስ ፬፡፲፮ - ፳፫።',
    4: 'ጳውሎስ፡ ቆሮንቶስ ፪ኛ ፭፡፲፪ - ፲፫።',
    5: 'ሐዋርያት፡ ጴጥሮስ ፩ኛ ፬፡፯ - ፍጻሜ ምዕራፍ።',
    6: 'ግብረ ሐዋርያት፡ ፭፡፲፪ - ፲፮።',
    7: 'ምስባክ (መዝሙር)፡ አድኅነኒ እምእለ ሮዱኒ አስመ ይኄይሉኒ / ወአውጽኣ እሞቅሕ ሰነፍስየ / ከመ አግነይ ለስምከ እግዚእ።',
    8: 'ወንጌል፡ ማቴዎስ ፲፩፡፲፩ - ፳።',
    9: 'ቅዳሴ፡ ዘወልደ ነጐድጓድ (ዘሐዋርያት)።',
  }},

  { month: 'መስከረም', day: 2, slots: {
    1: 'ስንክሣር / ተዝካር፡ ምትረተ ርእሱ ለዮሐንስ፤ ወዳስያ፤ ወመሪና ቅድስት፤ ወዲዲሞስ፤ ኤጲስ ቆጶሳት ዘእስክንድርያ፤ መአባ አንበስ፤ ወአባ ሙሴ፤ ወዲዮስቆሮስ።',
    2: 'ምስባክ (መዝሙር)፡ ወእመኒ ነሣእኩ ክንፈ ከመ ንስር / ወሠረርኩ እስከ ማኅለቅተ ባሕር / ህየኒ እዴከ ትመርሀነ ወታነብረኒ።',
    3: 'ወንጌል፡ ማቴዎስ ፲፬፡፩ - ፲፩።',
    4: 'ጳውሎስ፡ ቆሮንቶስ ፩ኛ ፲፡፲፬ - ፳፬።',
    5: 'ሐዋርያት፡ ዮሐንስ ፩ኛ ፪፡፲፭ - ፲፯።',
    6: 'ግብረ ሐዋርያት፡ ፲፱፡፬ - ፲።',
    7: 'ምስባክ (መዝሙር)፡ ወይርአዩ አሕዛብ በቅድመ አዕይንቲነ / በቀለ ደሞ ለአግብርቲክ / ይባዕ ቅድሜከ ገዐሮሙ ለሙቁሓን።',
    8: 'ወንጌል፡ ማርቆስ ፮፡፲፬ - ፳፱።',
    9: 'ቅዳሴ፡ ዘወልደ ነጐድጓድ።',
  }},

  { month: 'መስከረም', day: 3, slots: {
    1: 'ስንክሣር / ተዝካር፡ ማቃርስ ሊቀ ጳጳሳት፤ ወኢያሱ ወልደ ነዌ፤ ወደጀ ዘኮነ ሰመዕተ በአንጾኪያ።',
    2: 'ምስባክ (መዝሙር)፡ ደቂቀ እጓለ እመሕያው እስከ ማእዜኑ ታከብዱ ልበከሙ / አእምሩ ከመተሰብሑ እግዚአብሔር በጻድቁ።',
    3: 'ወንጌል፡ ማቴዎስ ፭፡፩ - ፲፫።',
    4: 'ጳውሎስ፡ ተሰሎንቄ ፩ኛ ፬፡፲፫ - ፍጻሜ ምዕራፍ።',
    5: 'ሐዋርያት፡ ዮሐንስ ፩ኛ ፪፡፲፰ - ፳፪።',
    6: 'ግብረ ሐዋርያት፡ ፳፡፳፰ - ፴፩።',
    7: 'ምስባክ (መዝሙር)፡ እስመ አድጎንካ ለነፍስየ እሞት / ወለአእይንትየኒ እምአንብዕ / ወለአገርየኒ እምዳህፅ።',
    8: 'ወንጌል፡ ማቴዎስ ፲፰፡፲፰ - ፳፪።',
    9: 'ቅዳሴ፡ ዘዲዮስቆሮስ።',
  }},

  { month: 'መስከረም', day: 4, slots: {
    1: 'ስንክሣር / ተዝካር፡ ሶፍያ ወ፫ቲ አዋልዲሃ፤ ወአቡሁ ቴዎድሮስ፤ ወእሙ ታዎፍላ፤ ወማማስ።',
    2: 'ምስባክ (መዝሙር)፡ እጽምኡ ሕዝብየ ሕግየ / ወጽልኡ እዝነክሙ ኀበ ቃለ አፉየ / አከሥት በምሳሌ።',
    3: 'ወንጌል፡ ማቴዎስ ፳፡፩ - ፲፭።',
    4: 'ጳውሎስ፡ ጢሞቴዎስ ፩ኛ ፫፡፩ - ፰።',
    5: 'ሐዋርያት፡ ጴጥሮስ ፩ኛ ፫፡፲፭ - ፍጻሜ ምዕራፍ።',
    6: 'ግብረ ሐዋርያት፡ ፯፡፵፬ - ፶፱።',
    7: 'ምስባክ (መዝሙር)፡ ወወሀብኮሙ ትእምርተ ለእለ ይፈርሁከ / ከመ ያምሥጡ እምገጸ ቀሥት (ቅስጥ) / ወይድኅኑ ፍቁራኒከ።',
    8: 'ወንጌል፡ ዮሐንስ ፲፭፡፲፯ - ፳፭።',
    9: 'ቅዳሴ፡ ዘ፫፻ ግሩም።',
  }},

  { month: 'መስከረም', day: 5, slots: {
    1: 'ስንክሣር / ተዝካር፡ ኢሳይያስ፤ ወሰብልትንያ፤ ወፍልሰተ ዐፅሙ ለአቡነ ሳሙኤል ኀበ ደብር ዓባይ።',
    2: 'ምስባክ (መዝሙር)፡ እግዚእ አምላኪየ መንበረከ / ወአልቦ ዘይመስሎ ለሕሊናከ / አይዳዕኩ ወነገርኩ ወበዝሁ እምኍልቁ።',
    3: 'ወንጌል፡ ማቴዎስ ፲፫፡፵፩ - ፵፬።',
    4: 'ጳውሎስ፡ ጢሞቴዎስ ፩ኛ ፮፡፩ - ፯።',
    5: 'ሐዋርያት፡ ጴጥሮስ ፩ኛ ፫፡፩ - ፯።',
    6: 'ግብረ ሐዋርያት፡ ፲፮፡፲፮ - ፲፰።',
    7: 'ምስባክ (መዝሙር)፡ አዋልደ ንግሥት ለክብርከ / ወትቀውም ንግሥት በየማንከ / በአልባሰ ወርቅ ዑፅፍት ወኍብርት።',
    8: 'ወንጌል፡ ማቴዎስ ፲፫፡፵፬ - ፶፩።',
    9: 'ቅዳሴ፡ ዘእግዝእትነ ማርያም።',
  }},

  { month: 'መስከረም', day: 6, slots: {
    1: 'ስንክሣር / ተዝካር፡ ዲዮስቆሮስ፤ ወሳዊሮስ፤ ወአጋቶን፤ ወጽ፻ ሰማዕታት፤ ወልደተ ሐና እምእግዝእትነ ማርያም።',
    2: 'ምስባክ (መዝሙር)፡ ያድለቀልቅ ለገዳም / ወያድለቆልቅ እግዚአብሔር ለሐቅለ ቃዴሽ / ቃለ እግዚአብሔር ያጸንዖሙ ለኃየላት።',
    3: 'ወንጌል፡ ሉቃስ ፫፡፩ - ፯።',
    4: 'ጳውሎስ፡ ሮሜ ፱፡፲፱ - ፍጻሜ ምዕራፍ።',
    5: 'ሐዋርያት፡ ዮሐንስ ፩ኛ ፭፡፩ - ፍጻሜ ምዕራፍ።',
    6: 'ግብረ ሐዋርያት፡ ፲፱፡፬ - ፱።',
    7: 'ምስባክ (መዝሙር)፡ ነገሥት ይርእዩ ወይትነሥኡ / ወመኳንንትኒ ይሰግዱ ሎቱ / ወኢታሕስሙ ዲበ ነሲያቲክሙ።',
    8: 'ወንጌል፡ ዮሐንስ ፫፡፳፪ - ፍጻሜ ምዕራፍ።',
    9: 'ቅዳሴ፡ ዘወልደ ነጐድጓድ።',
  }},

  { month: 'መስከረም', day: 7, slots: {
    1: 'ስንክሣር / ተዝካር፡ ዘካርያስ፤ ወሙሴ ነቢይ።',
    2: 'ምስባክ (መዝሙር)፡ ወጸልሐዉ በልሳናቲሆሙ / ኵንኖሙ እግዚኦ ወይደቱ በውዴቶሙ / ወበከመ ብዝኀ ሕብሎሙ ስድዶሙ።',
    3: 'ወንጌል፡ ሉቃስ ፭፡፲፪ - ፲፮።',
    4: 'ጳውሎስ፡ ዕብራውያን ፲፫፡፯ - ፲፮።',
    5: 'ሐዋርያት፡ ጴጥሮስ ፩ኛ ፫፡፲፬ - ፲፰።',
    6: 'ግብረ ሐዋርያት፡ ፲፮፡፲፮ - ፲፰።',
    7: 'ምስባክ (መዝሙር)፡ መምህረ ሕግ ይሁብ በረከቶ / ወየሐውር እምኃይል ውስተ ኃይል / ወያስተርኢ አምላከ አማልክት በጽዮን።',
    8: 'ወንጌል፡ ሉቃስ ፬፡፴፩ - ፴፯።',
    9: 'ቅዳሴ፡ ዘእግዝእትነ ማርያም።',
  }},

  { month: 'መስከረም', day: 8, slots: {
    1: 'ስንክሣር / ተዝካር፡ አባ ቢሦራ፤ መጸል፤ ዕደው፤ ወሰብኡ አንስት ስማዕታት፤ ወፋሲለደስ፤ ያዕቆብ ዘሥሩግ።',
    2: 'ምስባክ (መዝሙር)፡ ወእምቃልከ ደንገፀኒ ልብየ / ወበቃልከ ተፈሣሕኩ / ከመ ዘረከበ ምህርካ ብዙኃ።',
    3: 'ወንጌል፡ ሉቃስ ፩፡፭ - ፲፮።',
    4: 'ጳውሎስ፡ ዕብራውያን ፲፩፡፳፫ - ፳፮።',
    5: 'ሐዋርያት፡ ይሁዳ ፩፡፩ - ፲፪።',
    6: 'ግብረ ሐዋርያት፡ ፯፡፴ - ፱።',
    7: 'ምስባክ (መዝሙር)፡ ይለብሱ ጽድቆ / በእንተ ዳዊት ገብርከ። ዓዲ ምስባክ፡ ይትፌሣሕ ጻድቅ ሶበ ይሬኢ በቀለ / ወይትሐፅብ እዴሁ በደመ ኃጥእ / ወይብል ሰብእ አማን ቦቱ ፍሬ ለጻድቅ።',
    8: 'ወንጌል፡ ማቴዎስ ፳፫፡፳፱ - ፍጻሜ ምዕራፍ።',
    9: 'ቅዳሴ፡ ዘኤጲፋንዮስ።',
  }},

  { month: 'መስከረም', day: 9, slots: {
    1: 'ስንክሣር / ተዝካር፡ ሥእላ ወተዝካረ ልደታ ለእግዝእትነ ማርያም፤ ወዮዲት፤ ወመጥሮንያ።',
    2: 'ምስባክ (መዝሙር)፡ እግዚአብሔርኒ ይሁብ ምሕረቶ / ጽድቅ የሐውር ቅድሜሁ / ወበውእቱ መዋዕል ኅለፈ እግዚእ።',
    3: 'ወንጌል፡ ሉቃስ ፩፡፳፮ - ፴፱።',
    4: 'ጳውሎስ፡ ሮሜ ፰፡፴፭ - ፍጻሜ ምዕራፍ።',
    5: 'ሐዋርያት፡ ያዕቆብ ፩፡፪ - ፲፪።',
    6: 'ግብረ ሐዋርያት፡ ፲፰፡፲፰ - ፳፪።',
    7: 'ምስባክ (መዝሙር)፡ ፈለን ዘይውኅዝ ያስተፌሥሓ ለሀገረ እግዚአብሔር / ኵሉኬ ዘይሰምዕ ዘንተ ነገርየ።',
    8: 'ወንጌል፡ ማቴዎስ ፯፡፳፬ - ፍጻሜ ምዕራፍ።',
    9: 'ቅዳሴ፡ ዘእግዝእትነ ማርያም (ለኅዳር)።',
  }},

  { month: 'መስከረም', day: 10, slots: {
    1: 'ስንክሣር / ተዝካር፡ ፋሲለደስ ሰማዕታት፤ ከነፉ፤ ከዛ፤ ወሮ፤ ሀረባውያን፤ ወቆርኔሌዎስ ሊቀ ሐራ፤ ወታዖድራ፤ መባስልዮስ፤ ወቴዎድሮስ፤ ቀውስጦስ።',
    2: 'ምስባክ (መዝሙር)፡ ስምዒ ወለትየ ወርእዩ ወአጽምዒ እዝነኪ / አዋልደ ንግሥት በስብሐትከ / ወትቤ ማርያም።',
    3: 'ወንጌል፡ ሉቃስ ፩፡፵፮ - ፶፮።',
    4: 'ጳውሎስ፡ ሮሜ ፫፡፩ - ፱።',
    5: 'ሐዋርያት፡ ያዕቆብ ፫፡፲፫ - ፍጻሜ ምዕራፍ።',
    6: 'ግብረ ሐዋርያት፡ ፲፭፡፴፭ - ፍጻሜ ምዕራፍ።',
    7: 'ምስባክ (መዝሙር)፡ ወትቀውም ንግሥት በየማንከ / አዋልደ ንግሥት በል ቦ አመ ፭ ለዝ ወርኅ።',
    8: 'ወንጌል፡ ማቴዎስ ፳፭፡፩ - ፲፬።',
    9: 'ቅዳሴ፡ ጐሥዐ።',
  }},

  { month: 'መስከረም', day: 11, slots: {
    1: 'ስንክሣር / ተዝካር፡ ሚካኤል፤ ወገዛኔ ኤጲስ ቆጶሳት፤ ፫፻፲ወ፰ በኤፌሶን ለአውግዞ።',
    2: 'ምስባክ (መዝሙር)፡ ዕሌየ ሰማዕተ ዐመፃ / ወዘኢየአምር ነበቡ ላዕሌየ / እኪት ህየንተ ሠናይት።',
    3: 'ወንጌል፡ ማቴዎስ ፲፡፲፮ - ፳፫።',
    4: 'ጳውሎስ፡ ዕብራውያን ፲፪፡፩ - ፲፩።',
    5: 'ሐዋርያት፡ ጴጥሮስ ፩ኛ ፬፡፩ - ፲፩።',
    6: 'ግብረ ሐዋርያት፡ ፲፡፩ - ፱።',
    7: 'ምስባክ (መዝሙር)፡ ወይርእዩ አሕዛብ በል ቦ አመ ፪ ለዝ ወርኅ።',
    8: 'ወንጌል፡ ሉቃስ ፳፩፡፲፪ - ፲፱።',
    9: 'ቅዳሴ፡ ዘባስልዮስ።',
  }},

  { month: 'መስከረም', day: 12, slots: {
    1: 'ስንክሣር / ተዝካር፡ ተዝካረ ተአምር ዘገብረ ባስልዮስ በብእሲ ዘአፍቀረ ወስተ እግዚኡ።',
    2: 'ምስባክ (መዝሙር)፡ ወነበቡ አንዱ ለካልኡ / ወነበቡ ውስተ አርያም / ወአንበሩ ውስተ ሰማይ አፉሆሙ።',
    3: 'ወንጌል፡ ማቴዎስ ፲፫፡፴፩ - ፵፬።',
    4: 'ጳውሎስ፡ ቆሮንቶስ ፩ኛ ፯፡፳፭ - ፴፭።',
    5: 'ሐዋርያት፡ ይሁዳ ፩፡፳ - ፳፭።',
    6: 'ግብረ ሐዋርያት፡ ፳፡፳፰ - ፴፭።',
    7: 'ምስባክ (መዝሙር)፡ ይትዐየን መልአከ እግዚአብሔር በል ቦ አመ ፲ወ፪ ለኅዳር።',
    8: 'ወንጌል፡ ማቴዎስ ፲፰፡፲፭ - ፲፱።',
    9: 'ቅዳሴ፡ ዘቄርሎስ።',
  }},

  { month: 'መስከረም', day: 13, slots: {
    1: 'ስንክሣር / ተዝካር፡ አጋቶን ዘዐምድ፤ ወዴግና ካህን።',
    2: 'ምስባክ (መዝሙር)፡ ኢትሰደኒ በመንፈቀ ዓመቴ / ለትውልደ ትውልድ ዓመቲከ / አንተ እግዚኦ አቅደምከ ሣርሮታ ለምድር።',
    3: 'ወንጌል፡ ማቴዎስ ፳፬፡፬ - ፲፬።',
    4: 'ጳውሎስ፡ ቆሮንቶስ ፩ኛ ፯፡፲፪ - ፲፯።',
    5: 'ሐዋርያት፡ ያዕቆብ ፭፡፲፫ - ፲፯።',
    6: 'ግብረ ሐዋርያት፡ ፲፯፡፩ - ፲።',
    7: 'ምስባክ (መዝሙር)፡ ብፁዓን እለ ተኃድገ ሎሙ ኃጢአቶሙ / ወእለ ኢሐሰበ ሎሙ ኵሎ ጌጋዮሙ / ብፁዕ ብእሲ ዘኢኍለቄ ሎቱ እግዚአብሔር ኃጢአቶ።',
    8: 'ወንጌል፡ ሉቃስ ፲፬፡፩ - ፲፬።',
    9: 'ቅዳሴ፡ ዘባስልዮስ።',
  }},

  { month: 'መስከረም', day: 14, slots: {
    1: 'ስንክሣር / ተዝካር፡ ፍልሰተ ሥጋሁ ለስጢፋኖስ፤ ወአባ ጴጥሮስ።',
    2: 'ምስባክ (መዝሙር)፡ ወትትከወስ ባሕር በምልዓ / ትትኃሠይ ገዳም ወኵሉ ዘውስቴታ / ውእተ አሚረ ይትፌሥሑ ኵሉ ዕፀወ ገዳም።',
    3: 'ወንጌል፡ ማቴዎስ ፳፬፡፴፪ - ፴፮።',
    4: 'ጳውሎስ፡ ቆሮንቶስ ፩ኛ ፲፬፡፴፬ - ፍጻሜ ምዕራፍ።',
    5: 'ሐዋርያት፡ ዮሐንስ ፩ኛ ፪፡፲፰ - ፳፪።',
    6: 'ግብረ ሐዋርያት፡ ፲፩፡፩ - ፲፯።',
    7: 'ምስባክ (መዝሙር)፡ ወወሀብኮሙ በል ቦ አመ ፬ ለመስከረም።',
    8: 'ወንጌል፡ ማቴዎስ ፲፬፡፳፪ - ፍጻሜ ምዕራፍ።',
    9: 'ቅዳሴ፡ ዘወልደ ነጐድጓድ።',
  }},

  { month: 'መስከረም', day: 15, slots: {
    1: 'ስንክሣር / ተዝካር፡ ቅዳሴ ቤተ ክርስቲያን ዘመቃብረ እግዚእነ፤ ወዕረፍቱ ለጦቢት፤ ወሰደ ገማልያል፤ ወአባ አጋቶን ዘተፍኦመ ሕብነ።',
    2: 'ምስባክ (መዝሙር)፡ ወሶበ የአትዉ መጽኡ እንዘ ይትፌሥሑ / ወፆሩ ከላስስቲሆሙ / አኮኑ አንትሙ እለ ትብሉ።',
    3: 'ወንጌል፡ ዮሐንስ ፬፡፴፭ - ፴፱።',
    4: 'ጳውሎስ፡ ቆሮንቶስ ፪ኛ ፭፡፲፪ - ፲፮።',
    5: 'ሐዋርያት፡ ጴጥሮስ ፪ኛ ፪፡፲፭ - ፍጻሜ ምዕራፍ።',
    6: 'ግብረ ሐዋርያት፡ ፪፡፩ - ፲፫።',
    7: 'ምስባክ (መዝሙር)፡ ብፁዕ ዘኅረይኮ ወዘተወከፍና / ወዘአኅደርኮ ውስተ አዕፃዲከ / ጸገብነ እግዚኦ እምበረከት ቤተከ።',
    8: 'ወንጌል፡ ማቴዎስ ፲፮፡፲፫ - ፲፱።',
    9: 'ቅዳሴ፡ ዘወልደ ነጐድጓድ።',
  }},

  { month: 'መስከረም', day: 16, slots: {
    1: 'ስንክሣር / ተዝካር፡ በል ቦ አመ ፲ወ፬ ለዝ ወርኅ፤ ሙሴ ሰቀሎ ለዓርዌ ምድር።',
    2: 'ምስባክ (መዝሙር)፡ ያበድሮን እግዚአብሔር ለአናቅጸ ጽዮን / እምኵሉ ተዐይኒሁ ለያዕቆብ / ነኪር ነገሩ በእንቲአኪ ሀገረ እግዚአብሔር።',
    3: 'ወንጌል፡ ማቴዎስ ፭፡፲፫ - ፲፯።',
    4: 'ጳውሎስ፡ ሮሜ ፲፪፡፩ - ፱።',
    5: 'ሐዋርያት፡ ያዕቆብ ፩፡፲፱ - ፳፯።',
    6: 'ግብረ ሐዋርያት፡ ፲፭፡፲፫ - ፳፩።',
    7: 'ምስባክ (መዝሙር)፡ አቤ አዐቅብ አፉየ ከመ ኢይስሐት በልሳንየ / ወእንበርኩ ዐቃቤ ለአፉየ / ሶበ ይትቃወሙኒ ኃጥኣን ቅድሜየ። ዓዲ ምስባክ፡ አሠንያ እግዚኦ በሥምረትከ ለጽዮን / ወይትሐነፃ አረፋቲሃ ለአየሩሳሌም / ያዕቆብ ዘሥሩግ።',
    8: 'ወንጌል፡ ዮሐንስ ፱፡፩ - ፲፪። ዓዲ ወንጌል፡ ዮሐንስ ፪፡፲፪ - ፳፪።',
    9: 'ቅዳሴ፡ (ዘዐምደ ሃይማኖት — ዘባስልዮስ ወ/ዘቄርሎስ)።',
  }},

  { month: 'መስከረም', day: 17, slots: {
    1: 'ስንክሣር / ተዝካር፡ ኤዎስጣቴዎስ ከፋሌ ባሐር፤ ወመስቀል፤ አትናቴዎስ፤ ወፊላታዎስ፤ ያዕቆብ ጳጳሳት ዘአርማንያ፤ ወአባ ቂርቶስ ገዳማዊ።',
    2: 'ምስባክ (መዝሙር)፡ ወረከብናሁ ውስተ ዖመ ገዳም / ንበውዕ እንከ ውስተ አብያቲሁ ለእግዚሔር / ወንሰግድ ውስተ መኻን ኀበ ቆመ እግረ እግዚእነ።',
    3: 'ወንጌል፡ ዮሐንስ ፲፱፡፳፭ - ፳፰።',
    4: 'ጳውሎስ፡ ቆሮንቶስ ፩ኛ ፩፡፲፰ - ፳፭።',
    5: 'ሐዋርያት፡ ጴጥሮስ ፩ኛ ፪፡፲፩ - ፲፯።',
    6: 'ግብረ ሐዋርያት፡ ፲፡፴፬ - ፵፫።',
    7: 'ምስባክ (መዝሙር)፡ አንተ ትኳንን ኃይለ ባሕር / ወአንተ ታረምሞ ለድምፀ ማዕበላ / አንተ አሕሠርኮ ለዕቡይ ከመ ቅቲል።',
    8: 'ወንጌል፡ ዮሐንስ ፫፡፲፩ - ፳፩።',
    9: 'ቅዳሴ፡ ዘዮሐንስ አፈወርቅ።',
  }},

  // ══ Add more months here following the same pattern ══
  // { month: 'ጥቅምት', day: 1, slots: { 1: '...', ... } },
  // ...
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  SEED: መጽሐፈ ግጻዌ (Gtsawie / Synaxarium)');
  console.log('═══════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'church_db',
    retryWrites: false,
    tls: true,
    serverSelectionTimeoutMS: 30000,
    family: 4,   // force IPv4 — Cosmos DB has IPv6 issues in some environments
  });
  console.log('Connected to database\n');

  // ── 1. Find or create the book ─────────────────────────────────────────
  let book = await LiturgicalBook.findOne({ category: 'synaxar', tradition: 'eritrean-orthodox' });

  if (!book) {
    console.log('Creating LiturgicalBook for ግጻዌ...');
    book = await LiturgicalBook.create({
      title:       'Gtsawie (Synaxarium)',
      titleGez:    'መጽሐፈ ግጻዌ ከነምልክቱ',
      titleTi:     'መጽሐፈ ግጻዌ',
      description: 'Daily liturgical readings, commemorations, saints and appointed anaphoras for the full Ethiopian/Eritrean Orthodox year (365 days). Tradition: Debre Abbay.',
      category:    'synaxar',
      type:        'liturgy',
      tradition:   'eritrean-orthodox',
      languages:   ['gez'],          // ti and en will be added by volunteers
      status:      'draft',
      featured:    false,
      blockCount:  0,
      createdBy:   'seed-script',
    });
    console.log(`  ✅ Created book: ${book._id}`);
  } else {
    console.log(`  ✅ Found existing book: ${book._id} — "${book.titleGez}"`);
  }

  const BOOK_ID = book._id.toString();

  // ── 2. Build blocks ────────────────────────────────────────────────────
  const blocks = [];

  for (const day of RAW_DAYS) {
    const monthIdx = MONTHS.indexOf(day.month);
    if (monthIdx === -1) {
      console.warn(`  ⚠️  Unknown month: ${day.month}`);
      continue;
    }

    const gezNum = GEZ_NUMS[day.day - 1];
    if (!gezNum) {
      console.warn(`  ⚠️  Day out of range: ${day.day}`);
      continue;
    }

    for (const [slotStr, text] of Object.entries(day.slots)) {
      const slot = parseInt(slotStr);
      const slotDef = SLOTS[slot];
      if (!slotDef) continue;

      // globalOrder: month(1..13) × 10000 + day(1..30) × 100 + slot(1..9)
      // Gives stable ordering across the full year
      const globalOrder = (monthIdx + 1) * 10000 + day.day * 100 + slot;

      const blockId = `gtsawie-${day.month}-${day.day}-${slot}`;

      blocks.push({
        blockId,
        bookId:    BOOK_ID,
        sectionId: day.month,        // month = section
        subtitle:  gezNum,           // day numeral = subtitle
        order:     slot,             // slot within day (1..9)
        type:      slotDef.role === 'synaxar' ? 'reading'
                 : slotDef.role.includes('gospel') ? 'reading'
                 : slotDef.role.includes('misbak') ? 'hymn'
                 : slotDef.role === 'anaphora' ? 'instruction'
                 : 'prayer',
        role:      slotDef.role,
        translations: { gez: text.trim() },
        isRubric:     false,
        isResponsive: false,
        metadata: {
          enteredBy: 'seed-script',
          language:  'gez',
          notes:     slotDef.label,
        },
      });
    }
  }

  console.log(`Built ${blocks.length} blocks from ${RAW_DAYS.length} days\n`);

  // ── 3. Delete existing blocks for this book, then insert fresh ─────────
  const deleted = await LiturgicalBlock.deleteMany({ bookId: BOOK_ID });
  console.log(`Cleared ${deleted.deletedCount} existing blocks`);

  const result = await LiturgicalBlock.insertMany(blocks, { ordered: false });
  console.log(`Inserted ${result.length} blocks`);

  // ── 4. Update blockCount on the book ──────────────────────────────────
  const total = await LiturgicalBlock.countDocuments({ bookId: BOOK_ID });
  await LiturgicalBook.findByIdAndUpdate(BOOK_ID, { blockCount: total });
  console.log(`\nblockCount updated: ${total}`);

  // ── 5. Summary ─────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────────────');
  console.log('SUMMARY');
  console.log('─────────────────────────────────────────────────────');

  const months = [...new Set(RAW_DAYS.map(d => d.month))];
  for (const month of months) {
    const days = RAW_DAYS.filter(d => d.month === month).length;
    console.log(`  ${month}: ${days} day(s) × 9 slots = ${days * 9} blocks`);
  }

  console.log(`\n  Total blocks in DB: ${total}`);
  console.log(`  Book ID: ${BOOK_ID}`);
  console.log(`  Status:  draft (publish via admin UI when ready)`);
  console.log('\n  To add more months, extend the RAW_DAYS array in this script.');
  console.log('  Tigrinya and English translations can be added by volunteers.\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
