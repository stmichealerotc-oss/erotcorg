/**
 * Diagnostic test for Baptism Certificate PDF
 * Run: node backend/test-baptism-certificate.js
 */

require('dotenv').config();
const PDFDocument = require('pdfkit');
const fs   = require('fs');
const path = require('path');

// ── Font paths ───────────────────────────────────────────────────────────────
const FONT_REGULAR = path.join(__dirname, 'fonts', 'NotoSansEthiopic-Regular.ttf');
const FONT_BOLD    = path.join(__dirname, 'fonts', 'NotoSansEthiopic-Bold.ttf');

// ── Mock certificate data ────────────────────────────────────────────────────
const mockCert = {
  certificateNumber: 'BAPT-2026-001',
  type: 'baptism',
  language: 'bilingual',
  eventDate: new Date('2026-05-18'),
  officiant: 'Fr. Abune Tesfalem',
  baptismDetails: {
    child: {
      fullName:    'HANNAH ROBY GOFREY',
      baptismName: 'W.E.L.T.E. SARAH',
      dob:         new Date('2020-05-10'),
      birthPlace:  'PERTH WESTERN AUSTRALIA',
      nationality: 'AUSTRALIAN'
    },
    parents: {
      fatherName:      'DAVIS ROBERT GOFREY',
      fatherSignature: 'Signed',
      motherName:      'ATHANIA TESFAGABE ABRAHAM'
    },
    godparents: {
      godfather: { name: 'NARDOS TSEGAY', signature: 'Signed' },
      godmother: { name: '' }
    },
    confessionFather: { name: 'Tsegay Y. Tedla', signature: 'Signed' }
  },
  signatures: [{ signerName: 'Church Administrator', signedAt: new Date() }],
  churchSeal: { applied: true }
};

// ── Renderer ─────────────────────────────────────────────────────────────────
function renderBaptism(doc, cert, dateStr) {
  const bd = cert.baptismDetails || {};

  // Register Ethiopic fonts on this doc instance
  doc.registerFont('EthReg',  FONT_REGULAR);
  doc.registerFont('EthBold', FONT_BOLD);

  const W=842, H=595, M=50, CX=W/2;

  // Golden borders
  doc.rect(M-10, 40, W-2*M+20, H-80) .lineWidth(14).strokeColor('#b8860b').stroke();
  doc.rect(M+8,  58, W-2*M-16, H-116).lineWidth(2) .strokeColor('#b8860b').stroke();

  // Top-right: Date & File No
  doc.fontSize(9).fillColor('#555').font('Helvetica')
     .text('Date: '+dateStr,                 W-M-140, 75, {width:130, align:'right', lineBreak:false});
  doc.fontSize(8).fillColor('#666')
     .text('File No: '+cert.certificateNumber, W-M-140, 87, {width:130, align:'right', lineBreak:false});

  // Header - English church name
  doc.fontSize(13).fillColor('#8B0000').font('Helvetica-Bold')
     .text('St. Michael Eritrean Orthodox Tewahdo Church',
           M+30, 75, {width:W-2*M-180, align:'center', lineBreak:false});

  // Header - Tigrinya church name (Ethiopic font)
  doc.fontSize(11).fillColor('#8B0000').font('EthBold')
     .text('ቤተ ክርስቲያን ቅዱስ ሚካኤል ኦርቶዶክስ ተዋህዶ',
           M+30, 91, {width:W-2*M-180, align:'center', lineBreak:false});

  doc.fontSize(8).fillColor('#777').font('Helvetica')
     .text('60 Osborne Street, Joondanna, WA 6060',
           M+30, 105, {width:W-2*M-180, align:'center', lineBreak:false});

  // Header divider
  const HY = 118;
  doc.moveTo(M+40,HY).lineTo(W-M-40,HY).strokeColor('#b8860b').lineWidth(1.5).stroke();

  // Column setup
  const LC=M+40, RC=CX+25, CW=CX-M-65;
  let Y = HY+18;

  // ── ENGLISH COLUMN ────────────────────────────────────────────────────────
  doc.fontSize(14).fillColor('#8B0000').font('Helvetica-Bold')
     .text('BAPTISM CERTIFICATE', LC, Y, {width:CW, align:'center', lineBreak:false});
  Y += 24;

  const dob = bd.child && bd.child.dob
    ? new Date(bd.child.dob).toLocaleDateString('en-AU',{day:'2-digit',month:'2-digit',year:'numeric'})
    : '';
  const gp = (bd.godparents && bd.godparents.godfather && bd.godparents.godfather.name) ||
             (bd.godparents && bd.godparents.godmother && bd.godparents.godmother.name) || '';

  function en(label, value) {
    const LW=110, VX=LC+LW+5, VW=CW-LW-5;
    const v = (value && String(value).trim()) ? String(value) : '_______________';
    doc.fontSize(9).fillColor('#333').font('Helvetica-Bold')
       .text(label, LC, Y, {width:LW, align:'left', lineBreak:false});
    doc.fontSize(10).fillColor('#1a1a1a').font('Helvetica')
       .text(v, VX, Y, {width:VW, align:'left', lineBreak:false});
    doc.moveTo(VX, Y+13).lineTo(VX+VW, Y+13).strokeColor('#ccc').lineWidth(0.5).stroke();
    Y += 18;
  }

  en('Date',              dateStr);
  en('Baptismal Name',    bd.child && (bd.child.baptismName || bd.child.fullName));
  en('Name',              bd.child && bd.child.fullName);
  en("Father's Name",     bd.parents && bd.parents.fatherName);
  en("Mother's Name",     bd.parents && bd.parents.motherName);
  en('Nationality',       bd.child && bd.child.nationality);
  en('Date of Birth',     dob);
  en('Place of Birth',    bd.child && bd.child.birthPlace);
  en('Godfather/Mother',  gp);
  en('Confession Priest', (bd.confessionFather && bd.confessionFather.name) || cert.officiant);

  // ── TIGRINYA COLUMN ───────────────────────────────────────────────────────
  Y = HY+18;
  doc.fontSize(14).fillColor('#8B0000').font('EthBold')
     .text('ምስክር ጥምቀት ክርስትና', RC, Y, {width:CW, align:'center', lineBreak:false});
  Y += 24;

  function tg(label, value) {
    const LW=110, VX=RC+LW+5, VW=CW-LW-5;
    const v = (value && String(value).trim()) ? String(value) : '_______________';
    // Label: Tigrinya script → EthBold
    doc.fontSize(10).fillColor('#333').font('EthBold')
       .text(label, RC, Y, {width:LW, align:'left', lineBreak:false});
    // Value: English/Latin data → Helvetica (avoids square boxes)
    doc.fontSize(10).fillColor('#1a1a1a').font('Helvetica')
       .text(v, VX, Y, {width:VW, align:'left', lineBreak:false});
    doc.moveTo(VX, Y+13).lineTo(VX+VW, Y+13).strokeColor('#ccc').lineWidth(0.5).stroke();
    Y += 18;
  }

  tg('ቀን',               dateStr);
  tg('ስመ ጥምቀት',          bd.child && (bd.child.baptismName || bd.child.fullName));
  tg('ሙሉ ስም',             bd.child && bd.child.fullName);
  tg('ስም ኣቦ',             bd.parents && bd.parents.fatherName);
  tg('ስም ኣደ',             bd.parents && bd.parents.motherName);
  tg('ዜግነት',              bd.child && bd.child.nationality);
  tg('ዕለተ ልደት',           dob);
  tg('ቦታ ልደት',            bd.child && bd.child.birthPlace);
  tg('ኣቦ/ኣደ ጥምቀት',       gp);
  tg('ኣቦ መናዘዝቲ',          (bd.confessionFather && bd.confessionFather.name) || cert.officiant);

  // ── SIGNATURES ────────────────────────────────────────────────────────────
  const SY=460, SSY=SY+10, SP=(W-2*M-60)/4;
  const S1=M+30, S2=S1+SP, S3=S2+SP, S4=S3+SP;

  doc.moveTo(M+30,SY).lineTo(W-M-30,SY).strokeColor('#b8860b').lineWidth(1.2).stroke();

  function sigL(x) {
    doc.moveTo(x+10,SSY+20).lineTo(x+SP-30,SSY+20).strokeColor('#333').lineWidth(0.7).stroke();
  }

  // Sig 1 – Confession Priest
  sigL(S1);
  if (bd.confessionFather && bd.confessionFather.signature)
    doc.fontSize(9).fillColor('#666').font('Helvetica-Oblique')
       .text('Signed', S1, SSY+22, {width:SP-20, align:'center', lineBreak:false});
  doc.fontSize(8).fillColor('#555').font('Helvetica')
     .text('Confession Priest', S1, SSY+35, {width:SP-20, align:'center', lineBreak:false});
  doc.fontSize(8).fillColor('#555').font('EthReg')
     .text('ፊርማ ኣቦ መናዘዝቲ', S1, SSY+47, {width:SP-20, align:'center', lineBreak:false});

  // Sig 2 – Father
  sigL(S2);
  if (bd.parents && bd.parents.fatherSignature)
    doc.fontSize(9).fillColor('#666').font('Helvetica-Oblique')
       .text('Signed', S2, SSY+22, {width:SP-20, align:'center', lineBreak:false});
  doc.fontSize(8).fillColor('#555').font('Helvetica')
     .text("Father's Signature", S2, SSY+35, {width:SP-20, align:'center', lineBreak:false});
  doc.fontSize(8).fillColor('#555').font('EthReg')
     .text('ፊርማ ኣቦ', S2, SSY+47, {width:SP-20, align:'center', lineBreak:false});

  // Seal
  doc.fontSize(18).fillColor('#8B0000').font('Helvetica-Bold')
     .text('+', S3, SSY, {width:SP-20, align:'center', lineBreak:false});
  doc.fontSize(9).fillColor('#8B0000').font('Helvetica-Bold')
     .text('CHURCH SEAL', S3, SSY+20, {width:SP-20, align:'center', lineBreak:false});
  doc.fontSize(8).fillColor('#8B0000').font('EthReg')
     .text('ማሕተም ቤተ ክርስቲያን', S3, SSY+32, {width:SP-20, align:'center', lineBreak:false});
  if (cert.churchSeal && cert.churchSeal.applied)
    doc.fontSize(7).fillColor('#666').font('Helvetica')
       .text('[SEAL APPLIED]', S3, SSY+44, {width:SP-20, align:'center', lineBreak:false});
  doc.fontSize(7).fillColor('#777').font('Helvetica')
     .text('St. Michael Orthodox Church WA', S3, SSY+56, {width:SP-20, align:'center', lineBreak:false});

  // Sig 4 – Church Official
  sigL(S4);
  if (cert.signatures && cert.signatures.length > 0) {
    const s = cert.signatures[cert.signatures.length-1];
    doc.fontSize(9).fillColor('#666').font('Helvetica-Oblique')
       .text('Signed', S4, SSY+22, {width:SP-20, align:'center', lineBreak:false});
    doc.fontSize(8).fillColor('#333').font('Helvetica-Bold')
       .text(s.signerName||'', S4, SSY+32, {width:SP-20, align:'center', lineBreak:false});
  }
  doc.fontSize(8).fillColor('#555').font('Helvetica')
     .text('Church Official', S4, SSY+47, {width:SP-20, align:'center', lineBreak:false});
  doc.fontSize(8).fillColor('#555').font('EthReg')
     .text('ኣመሓዳሪ ቤተ ክርስቲያን', S4, SSY+59, {width:SP-20, align:'center', lineBreak:false});

  // Footer
  doc.fontSize(7).fillColor('#aaa').font('Helvetica')
     .text('Issued: '+new Date().toLocaleDateString('en-AU'),
           M+30, H-48, {width:W-2*M-60, align:'center', lineBreak:false});
}

// ── Main diagnostics ──────────────────────────────────────────────────────────
async function run() {
  console.log('\n====================================================');
  console.log('  BAPTISM CERTIFICATE  -  DIAGNOSTIC TEST');
  console.log('====================================================\n');

  // 1. Check font files
  console.log('-- 1. FONT FILES --');
  console.log('   Regular :', FONT_REGULAR);
  console.log('   Bold    :', FONT_BOLD);
  const regOk  = fs.existsSync(FONT_REGULAR);
  const boldOk = fs.existsSync(FONT_BOLD);
  console.log('   Regular :', regOk  ? 'OK  ' + (fs.statSync(FONT_REGULAR).size/1024).toFixed(1)+' KB' : 'NOT FOUND');
  console.log('   Bold    :', boldOk ? 'OK  ' + (fs.statSync(FONT_BOLD).size/1024).toFixed(1)+' KB'    : 'NOT FOUND');

  if (!regOk || !boldOk) {
    console.error('\nFONT FILES MISSING - cannot generate PDF');
    process.exit(1);
  }

  // 2. Test font registration
  console.log('\n-- 2. PDFKIT FONT REGISTRATION TEST --');
  const probe = new PDFDocument({size:[300,100], margin:0});
  probe.on('error', e => console.error('   probe error:', e.message));

  let fail = false;
  try {
    probe.registerFont('EthReg',  FONT_REGULAR);
    console.log('   registerFont EthReg  : OK');
  } catch(e) { console.error('   registerFont EthReg  FAILED:', e.message); fail=true; }

  try {
    probe.registerFont('EthBold', FONT_BOLD);
    console.log('   registerFont EthBold : OK');
  } catch(e) { console.error('   registerFont EthBold FAILED:', e.message); fail=true; }

  try {
    probe.font('EthBold').fontSize(12).text('ቤተ ክርስቲያን', 10, 10, {lineBreak:false});
    console.log('   Tigrinya render      : OK');
  } catch(e) { console.error('   Tigrinya render FAILED:', e.message); fail=true; }

  probe.end();

  if (fail) {
    console.error('\nFont registration failed - check TTF files are valid');
    process.exit(1);
  }

  // 3. Generate certificate
  console.log('\n-- 3. GENERATING PDF --');
  const dateStr = mockCert.eventDate.toLocaleDateString('en-AU',
    {day:'numeric', month:'long', year:'numeric'});
  console.log('   dateStr :', dateStr);
  console.log('   size    : [842, 595] fixed, margin 0');

  const outPath = path.join(__dirname, 'test-baptism-certificate.pdf');
  const doc = new PDFDocument({size:[842,595], margin:0});
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  // Register fonts on the real doc
  doc.registerFont('EthReg',  FONT_REGULAR);
  doc.registerFont('EthBold', FONT_BOLD);
  console.log('   Fonts registered : OK');

  renderBaptism(doc, mockCert, dateStr);
  doc.end();

  await new Promise((res, rej) => { stream.on('finish', res); stream.on('error', rej); });

  const kb = (fs.statSync(outPath).size/1024).toFixed(1);
  console.log('\n-- 4. RESULT --');
  console.log('   File :', outPath);
  console.log('   Size :', kb, 'KB');
  console.log('\n   Tigrinya text that should appear in PDF:');
  console.log('   title  : ምስክር ጥምቀት ክርስትና');
  console.log('   fields : ቀን / ስመ ጥምቀት / ሙሉ ስም / ስም ኣቦ / ስም ኣደ');
  console.log('            ዜግነት / ዕለተ ልደት / ቦታ ልደት');
  console.log('            ኣቦ/ኣደ ጥምቀት / ኣቦ መናዘዝቲ');
  console.log('   sigs   : ፊርማ ኣቦ መናዘዝቲ / ፊርማ ኣቦ');
  console.log('            ማሕተም ቤተ ክርስቲያን / ኣመሓዳሪ ቤተ ክርስቲያን');
  console.log('\n====================================================\n');
}

run().catch(err => {
  console.error('Unexpected error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
