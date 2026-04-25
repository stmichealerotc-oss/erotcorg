/**
 * Seed Documents for Church Document Registry
 * Run with: node backend/scripts/seedDocuments.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const ChurchDocument = require('../models/ChurchDocument');
const Counter = require('../models/Counter');

const documents = [
  // Outgoing Letters
  {
    fileNo: 'STM-2026-OUT-001',
    title: 'Letter to ACNC - Form 3B Submission',
    category: 'outgoing-letter',
    direction: 'outgoing',
    fromTo: 'St Michael Church to ACNC',
    subject: 'Urgent submission re loss of portal access and governance deadlock',
    date: '2025-12-29',
    status: 'signed',
    refNo: '001/26',
    notes: 'Submitted with full evidence pack. ACNC restored access on 16 Jan 2026.',
    files: [
      { type: 'final', version: 1, originalName: 'toACNC291225.pdf', mimeType: 'application/pdf', sizeBytes: 245000 },
      { type: 'signed', version: 1, originalName: 'toACNC291225_signed.pdf', mimeType: 'application/pdf', sizeBytes: 248000 }
    ]
  },
  {
    fileNo: 'STM-2026-OUT-002',
    title: 'Final Notice to Beyene - Handover Request',
    category: 'outgoing-letter',
    direction: 'outgoing',
    fromTo: 'St Michael Church to Beyene Gebreyohannes',
    subject: 'Confirmation of lawfully elected Treasurer and handover request',
    date: '2025-12-29',
    status: 'signed',
    refNo: '002/26',
    notes: '48-hour notice for handover of church property',
    files: [
      { type: 'final', version: 1, originalName: 'To_Beyene_29Dec2025.pdf', mimeType: 'application/pdf', sizeBytes: 156000 }
    ]
  },
  {
    fileNo: 'STM-2026-OUT-003',
    title: 'Final Notice - Administrative Transition',
    category: 'outgoing-letter',
    direction: 'outgoing',
    fromTo: 'St Michael Church to Beyene Gebreyohannes',
    subject: 'Conclusion of administrative transition and compliance review',
    date: '2026-02-08',
    status: 'signed',
    refNo: '003/26',
    notes: 'Response to 24 Jan 2026 email. Stamp decommissioned.',
    files: [
      { type: 'final', version: 1, originalName: 'To_Beyene_08Feb2026.pdf', mimeType: 'application/pdf', sizeBytes: 142000 }
    ]
  },
  {
    fileNo: 'STM-2026-OUT-004',
    title: 'Letter to Sub-Diocese - Deacon Michael Appointment',
    category: 'outgoing-letter',
    direction: 'outgoing',
    fromTo: 'St Michael Church to Sub-Diocese',
    subject: 'Confirmation of representative and request for role clarification',
    date: '2026-04-07',
    status: 'draft',
    refNo: '004/26',
    notes: 'Awaiting response from Sub-Diocese',
    files: []
  },

  // Incoming Letters
  {
    fileNo: 'STM-2026-IN-001',
    title: 'Beyene Response - Conditional Refusal',
    category: 'incoming-letter',
    direction: 'incoming',
    fromTo: 'Beyene Gebreyohannes to St Michael Church',
    subject: 'Conditional refusal to handover church property',
    date: '2025-12-24',
    status: 'archived',
    refNo: null,
    notes: 'Responded with 29 Dec letter',
    files: [
      { type: 'attachment', version: 1, originalName: 'Beyene_Response_24Dec2025.pdf', mimeType: 'application/pdf', sizeBytes: 89000 }
    ]
  },
  {
    fileNo: 'STM-2026-IN-002',
    title: 'Sub-Diocese Letter - Committee Authority',
    category: 'incoming-letter',
    direction: 'incoming',
    fromTo: 'Sub-Diocese to St Michael Church',
    subject: 'Confirmation of lawful committee election',
    date: '2026-01-06',
    status: 'signed',
    refNo: '002/26',
    notes: 'Confirms 24 Aug 2025 election',
    files: [
      { type: 'signed', version: 1, originalName: 'SubDiocese_002_26.pdf', mimeType: 'application/pdf', sizeBytes: 123000 }
    ]
  },
  {
    fileNo: 'STM-2026-IN-003',
    title: 'Sub-Diocese Letter - Unauthorised Meeting',
    category: 'incoming-letter',
    direction: 'incoming',
    fromTo: 'Sub-Diocese to Beyene',
    subject: '25 Jan 2026 meeting not recognised',
    date: '2026-01-21',
    status: 'signed',
    refNo: '004/26',
    notes: 'Meeting proposed by third party is illegal and unacceptable',
    files: [
      { type: 'signed', version: 1, originalName: 'SubDiocese_004_26.pdf', mimeType: 'application/pdf', sizeBytes: 118000 }
    ]
  },

  // Minutes
  {
    fileNo: 'STM-2026-MIN-001',
    title: 'General Meeting Minutes - Committee Election',
    category: 'minutes',
    direction: 'internal',
    fromTo: 'Church Congregation',
    subject: 'Election of new Committee',
    date: '2025-08-24',
    status: 'signed',
    refNo: null,
    notes: 'In presence of Bishop Shenoda and Sub-Diocese',
    files: [
      { type: 'final', version: 1, originalName: 'Minutes_24Aug2025.pdf', mimeType: 'application/pdf', sizeBytes: 187000 },
      { type: 'signed', version: 1, originalName: 'Minutes_24Aug2025_signed.pdf', mimeType: 'application/pdf', sizeBytes: 190000 }
    ]
  },
  {
    fileNo: 'STM-2026-MIN-002',
    title: 'Committee Minutes - Treasurer Appointment',
    category: 'minutes',
    direction: 'internal',
    fromTo: 'Church Committee',
    subject: 'Appointment of Mekaele Abraham as Treasurer',
    date: '2025-12-04',
    status: 'signed',
    refNo: null,
    notes: 'Also ratified bank authority',
    files: [
      { type: 'final', version: 1, originalName: 'Minutes_4Dec2025.pdf', mimeType: 'application/pdf', sizeBytes: 134000 }
    ]
  },
  {
    fileNo: 'STM-2026-MIN-003',
    title: 'Committee Minutes - Escalation Resolution',
    category: 'minutes',
    direction: 'internal',
    fromTo: 'Church Committee',
    subject: 'Resolution to escalate to ACNC and bank',
    date: '2025-12-17',
    status: 'signed',
    refNo: null,
    notes: 'Also centralised email domain policy',
    files: [
      { type: 'final', version: 1, originalName: 'Minutes_17Dec2025.pdf', mimeType: 'application/pdf', sizeBytes: 156000 }
    ]
  },
  {
    fileNo: 'STM-2026-MIN-004',
    title: 'Committee Minutes - ACNC Submission',
    category: 'minutes',
    direction: 'internal',
    fromTo: 'Church Committee',
    subject: 'Resolution to submit Form 3B to ACNC',
    date: '2025-12-29',
    status: 'signed',
    refNo: null,
    notes: 'Full evidence pack prepared',
    files: [
      { type: 'final', version: 1, originalName: 'Minutes_29Dec2025.pdf', mimeType: 'application/pdf', sizeBytes: 167000 }
    ]
  },
  {
    fileNo: 'STM-2026-MIN-005',
    title: 'Congregational Meeting Minutes',
    category: 'minutes',
    direction: 'internal',
    fromTo: 'Church Congregation',
    subject: 'Governance and financial update',
    date: '2026-01-18',
    status: 'signed',
    refNo: null,
    notes: 'Deacon Michael confirmed as committee member',
    files: [
      { type: 'final', version: 1, originalName: 'Minutes_18Jan2026.pdf', mimeType: 'application/pdf', sizeBytes: 223000 },
      { type: 'signed', version: 1, originalName: 'Minutes_18Jan2026_signed.pdf', mimeType: 'application/pdf', sizeBytes: 226000 }
    ]
  },
  {
    fileNo: 'STM-2026-MIN-006',
    title: 'Committee Meeting - Planning for 18 Jan',
    category: 'minutes',
    direction: 'internal',
    fromTo: 'Church Committee',
    subject: 'Preparation for congregational meeting',
    date: '2026-01-15',
    status: 'final',
    refNo: null,
    notes: 'Internal planning minutes',
    files: []
  },
  {
    fileNo: 'STM-2026-MIN-007',
    title: 'Committee Meeting - Unauthorised Meeting Response',
    category: 'minutes',
    direction: 'internal',
    fromTo: 'Church Committee',
    subject: 'Response to third-party meeting proposal',
    date: '2026-01-21',
    status: 'final',
    refNo: null,
    notes: 'Will not recognise unauthorised meetings',
    files: []
  },
  {
    fileNo: 'STM-2026-MIN-008',
    title: 'Committee Meeting - Sub-Diocese Response',
    category: 'minutes',
    direction: 'internal',
    fromTo: 'Church Committee',
    subject: 'Review of Sub-Diocese letter 004/26',
    date: '2026-01-23',
    status: 'final',
    refNo: null,
    notes: 'Aligns with Sub-Diocese position',
    files: []
  },
  {
    fileNo: 'STM-2026-MIN-009',
    title: 'Committee Meeting - Beyene 24 Jan Response',
    category: 'minutes',
    direction: 'internal',
    fromTo: 'Church Committee',
    subject: 'Review of Beyene email and draft response',
    date: '2026-02-08',
    status: 'final',
    refNo: null,
    notes: 'Issued final notice same day',
    files: []
  },
  {
    fileNo: 'STM-2026-MIN-010',
    title: 'Committee Meeting - Banking Resolution',
    category: 'minutes',
    direction: 'internal',
    fromTo: 'Church Committee',
    subject: 'Banking authority and signatory confirmation',
    date: '2026-04-03',
    status: 'signed',
    refNo: null,
    notes: 'Authorised signatories: Debesay, Henok, Mekaele',
    files: [
      { type: 'final', version: 1, originalName: 'Minutes_3Apr2026.pdf', mimeType: 'application/pdf', sizeBytes: 189000 }
    ]
  },

  // Resolutions
  {
    fileNo: 'STM-2026-RES-001',
    title: 'Committee Resolution - Bank Signatories',
    category: 'resolution',
    direction: 'internal',
    fromTo: 'Church Committee to Commonwealth Bank',
    subject: 'Confirmation of authorised bank signatories',
    date: '2026-04-07',
    status: 'signed',
    refNo: 'RES/001/26',
    notes: 'Debesay Birhane, Henok Tesfagaber, Mekaele Abraham',
    files: [
      { type: 'final', version: 1, originalName: 'Resolution_7Apr2026.pdf', mimeType: 'application/pdf', sizeBytes: 145000 },
      { type: 'signed', version: 1, originalName: 'Resolution_7Apr2026_signed.pdf', mimeType: 'application/pdf', sizeBytes: 148000 }
    ]
  },

  // Additional missing documents
{
  fileNo: 'STM-2025-CIR-001',
  title: 'Notice to Members - General Meeting 30 November 2025',
  category: 'circular',
  direction: 'internal',
  fromTo: 'Church Committee to Members',
  subject: 'Invitation to General Meeting',
  date: '2025-11-30',
  status: 'final',
  refNo: null,
  notes: 'Meeting to address administrative and financial matters',
  files: []
},
{
  fileNo: 'STM-2025-OUT-002',
  title: 'Formal Handover Demand to Beyene',
  category: 'outgoing-letter',
  direction: 'outgoing',
  fromTo: 'St Michael Church to Beyene',
  subject: 'Handover of church property and financial documents',
  date: '2025-12-17',
  status: 'signed',
  refNo: null,
  notes: '7-day notice for handover',
  files: []
},
{
  fileNo: 'STM-2026-IN-004',
  title: 'Beyene Email Response - 24 January 2026',
  category: 'incoming-letter',
  direction: 'incoming',
  fromTo: 'Beyene to Church Committee',
  subject: 'Disengagement statement and position clarification',
  date: '2026-01-24',
  status: 'archived',
  refNo: null,
  notes: 'Stated not an officer, no control of church property',
  files: []
},
{
  fileNo: 'STM-2026-CIR-002',
  title: 'Quarterly Meeting Notice - 3 May 2026',
  category: 'circular',
  direction: 'internal',
  fromTo: 'Church Committee to Members',
  subject: 'Quarterly General Meeting and BBQ',
  date: '2026-04-03',
  status: 'draft',
  refNo: null,
  notes: 'Financial report and Church update to be presented',
  files: []
},
// Sub-Diocese Documents (3)
{
  fileNo: 'STM-2026-OUT-006',
  title: 'Letter to Sub-Diocese - Meeting Request',
  category: 'outgoing-letter',
  direction: 'outgoing',
  fromTo: 'St Michael Church to Sub-Diocese of Australia and New Zealand',
  subject: 'Request for formal meeting to discuss governance matters',
  date: '2026-04-15',
  status: 'draft',
  refNo: '005/26',
  notes: 'Awaiting response from Sub-Diocese',
  files: []
},
{
  fileNo: 'STM-2026-OUT-007',
  title: 'Letter to Sub-Diocese - Financial Report',
  category: 'outgoing-letter',
  direction: 'outgoing',
  fromTo: 'St Michael Church to Sub-Diocese of Australia and New Zealand',
  subject: 'Submission of interim financial report for review',
  date: '2026-04-20',
  status: 'draft',
  refNo: '006/26',
  notes: 'Quarterly financial update for Sub-Diocese records',
  files: []
},
{
  fileNo: 'STM-2026-OUT-008',
  title: 'Letter to Sub-Diocese - Committee Update',
  category: 'outgoing-letter',
  direction: 'outgoing',
  fromTo: 'St Michael Church to Sub-Diocese of Australia and New Zealand',
  subject: 'Update on committee activities and governance progress',
  date: '2026-04-25',
  status: 'draft',
  refNo: '007/26',
  notes: 'Monthly update on church administration',
  files: []
},

// Bank Documents (2)
{
  fileNo: 'STM-2026-OUT-009',
  title: 'Letter to Commonwealth Bank - Signatory Update',
  category: 'outgoing-letter',
  direction: 'outgoing',
  fromTo: 'St Michael Church to Commonwealth Bank (Mount Lawley)',
  subject: 'Request to update authorised signatories',
  date: '2026-04-22',
  status: 'draft',
  refNo: '008/26',
  notes: 'Attach committee resolution and minutes',
  files: []
},
{
  fileNo: 'STM-2026-OUT-010',
  title: 'Letter to Commonwealth Bank - Account Restriction',
  category: 'outgoing-letter',
  direction: 'outgoing',
  fromTo: 'St Michael Church to Commonwealth Bank (Mount Lawley)',
  subject: 'Request to remove account restrictions',
  date: '2026-04-24',
  status: 'draft',
  refNo: '009/26',
  notes: 'Follow-up on governance notice freeze',
  files: []
}
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erotc');
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional)
    await ChurchDocument.deleteMany({});
    await Counter.deleteMany({});
    console.log('✅ Cleared existing documents and counters');

    // Insert documents
    for (const doc of documents) {
      const newDoc = new ChurchDocument(doc);
      await newDoc.save();
      console.log(`  ✓ ${doc.fileNo} - ${doc.title.substring(0, 50)}...`);
    }

    console.log(`\n✅ Seeded ${documents.length} documents`);

    // Show counters created
    const counters = await Counter.find({});
    console.log('\n📊 Counters created:');
    counters.forEach(c => console.log(`  ${c.type}/${c.year}: ${c.seq}`));

    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seed();