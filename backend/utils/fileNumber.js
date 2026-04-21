const Counter = require('../models/Counter');

// Map category to short type code
const CATEGORY_TYPE = {
  'outgoing-letter': 'OUT',
  'incoming-letter': 'IN',
  'minutes':         'MIN',
  'circular':        'CIR',
  'report':          'REP',
  'legal':           'LEG',
  'other':           'OUT' // fallback
};

/**
 * Generate next sequential file number, collision-safe via MongoDB atomic update
 * @param {string} category - document category
 * @returns {string} e.g. "STM-2026-OUT-001"
 */
async function getNextFileNumber(category) {
  const type = CATEGORY_TYPE[category] || 'OUT';
  const year = new Date().getFullYear();

  const counter = await Counter.findOneAndUpdate(
    { type, year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seq = String(counter.seq).padStart(3, '0');
  return `STM-${year}-${type}-${seq}`;
}

/**
 * Build blob storage path from file number and file type
 * e.g. "2026/OUT/001/final.pdf"
 */
function buildBlobPath(fileNo, fileType, originalName) {
  // fileNo = STM-2026-OUT-001
  const parts = fileNo.split('-'); // ['STM', '2026', 'OUT', '001']
  const year = parts[1];
  const type = parts[2];
  const seq  = parts[3];
  const ext  = originalName.split('.').pop().toLowerCase();
  return `${year}/${type}/${seq}/${fileType}.${ext}`;
}

module.exports = { getNextFileNumber, buildBlobPath, CATEGORY_TYPE };
