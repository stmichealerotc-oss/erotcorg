const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');
const Member = require('../models/Member');
const { uploadToBlob, generateSAS } = require('../utils/blob');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Ethiopic/Tigrinya font paths - WINDOWS COMPATIBLE
const FONT_ETHIOPIC_REGULAR = path.join(__dirname, '..', 'fonts', 'NotoSansEthiopic-Regular.ttf');
const FONT_ETHIOPIC_BOLD = path.join(__dirname, '..', 'fonts', 'NotoSansEthiopic-Bold.ttf');

// Check if fonts exist
console.log('🔍 Checking fonts...');
console.log('  Regular:', FONT_ETHIOPIC_REGULAR, fs.existsSync(FONT_ETHIOPIC_REGULAR) ? '✅' : '❌');
console.log('  Bold:', FONT_ETHIOPIC_BOLD, fs.existsSync(FONT_ETHIOPIC_BOLD) ? '✅' : '❌');

// ── GET /api/certificates ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { type, status, member, year, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type)   filter.type   = type;
    if (status) filter.status = status;
    if (member) filter.$or = [{ primaryMember: member }, { secondaryMember: member }];
    if (year) {
      filter.eventDate = {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`)
      };
    }

    const total = await Certificate.countDocuments(filter);
    const certs = await Certificate.find(filter)
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('primaryMember',   'firstName lastName memberNumber')
      .populate('secondaryMember', 'firstName lastName memberNumber')
      .populate('createdBy',       'name');

    res.json({ success: true, data: certs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/certificates/:id ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id)
      .populate('primaryMember',   'firstName lastName memberNumber email phone')
      .populate('secondaryMember', 'firstName lastName memberNumber email phone')
      .populate('createdBy', 'name');
    if (!cert) return res.status(404).json({ success: false, error: 'Certificate not found' });
    res.json({ success: true, data: cert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/certificates ────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      type, primaryMember, secondaryMember,
      eventDate, officiant, witnesses, godparents, notes, fee,
      marriageDetails, baptismDetails
    } = req.body;

    if (!type || !primaryMember || !eventDate) {
      return res.status(400).json({ success: false, error: 'type, primaryMember, eventDate are required' });
    }

    const member = await Member.findById(primaryMember);
    if (!member) return res.status(404).json({ success: false, error: 'Primary member not found' });

    if (type === 'marriage') {
      if (!secondaryMember) {
        return res.status(400).json({ success: false, error: 'Secondary member required for marriage certificate' });
      }
      const spouse = await Member.findById(secondaryMember);
      if (!spouse) return res.status(404).json({ success: false, error: 'Secondary member not found' });
    }

    const cert = new Certificate({
      type, primaryMember, 
      secondaryMember: secondaryMember || undefined,
      eventDate: new Date(eventDate),
      officiant, 
      witnesses: witnesses || [],
      godparents: godparents || [],
      notes,
      fee: fee || 0,
      marriageDetails: type === 'marriage' ? marriageDetails : undefined,
      baptismDetails: type === 'baptism' ? baptismDetails : undefined,
      createdBy: req.user?._id
    });

    if ((type === 'marriage' && !marriageDetails) || (type === 'baptism' && !baptismDetails)) {
      await cert.populateFromMembers();
    }

    await cert.save();
    await cert.populate('primaryMember', 'firstName lastName memberNumber');
    if (cert.secondaryMember) {
      await cert.populate('secondaryMember', 'firstName lastName memberNumber');
    }

    res.status(201).json({ success: true, data: cert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/certificates/:id ─────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['eventDate', 'officiant', 'witnesses', 'godparents', 'notes', 'status', 'fee', 'issuedDate'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const cert = await Certificate.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('primaryMember',   'firstName lastName memberNumber')
      .populate('secondaryMember', 'firstName lastName memberNumber');

    if (!cert) return res.status(404).json({ success: false, error: 'Certificate not found' });
    res.json({ success: true, data: cert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/certificates/:id ──────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await Certificate.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/certificates/:id/sign ──────────────────────────────────────
router.post('/:id/sign', async (req, res) => {
  try {
    const { title } = req.body;
    const cert = await Certificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ success: false, error: 'Certificate not found' });

    cert.signatures.push({
      signedBy:    req.user?._id,
      signerName:  req.user?.name || 'Unknown',
      signerTitle: title || 'Authorized Signatory'
    });
    cert.status = 'signed';
    await cert.save();
    res.json({ success: true, data: cert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/certificates/:id/validate ──────────────────────────────────
router.post('/:id/validate', async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ success: false, error: 'Certificate not found' });

    let validation = { valid: true, errors: [] };

    if (cert.type === 'marriage') {
      validation = cert.validateMarriage();
    } else if (cert.type === 'baptism') {
      validation = cert.validateBaptism();
    }

    res.json({ success: true, validation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/certificates/:id/auto-populate ────────────────────────────
router.post('/:id/auto-populate', async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id)
      .populate('primaryMember')
      .populate('secondaryMember');
    
    if (!cert) return res.status(404).json({ success: false, error: 'Certificate not found' });

    await cert.populateFromMembers();
    await cert.save();

    res.json({ success: true, data: cert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/certificates/:id/pdf ─────────────────────────────────────────
router.get('/:id/pdf', async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id)
      .populate('primaryMember',   'firstName lastName memberNumber dob')
      .populate('secondaryMember', 'firstName lastName memberNumber');

    if (!cert) return res.status(404).json({ success: false, error: 'Certificate not found' });

    let doc;
    if (cert.type === 'baptism') {
      doc = new PDFDocument({ 
        size: [842, 595],
        margin: 0
      });
    } else {
      doc = new PDFDocument({ 
        size: 'A4', 
        layout: 'landscape',
        margin: 50 
      });
    }
    
    const filename = `${cert.certificateNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    const eventDateStr = cert.eventDate
      ? new Date(cert.eventDate).toLocaleDateString('en-AU', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })
      : '';

    if (cert.type === 'baptism') {
      _renderBaptismCertificate(doc, cert, eventDateStr);
    } else {
      _renderCertificatePDF(doc, cert);
    }

    doc.end();

    if (cert.status === 'signed' || cert.status === 'draft') {
      cert.status = 'issued';
      cert.issuedDate = new Date();
      await cert.save();
    }
  } catch (err) {
    console.error('Certificate PDF error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BAPTISM CERTIFICATE - BILINGUAL (English + Tigrinya) - SINGLE PAGE

// ── Baptism Certificate (Bilingual Landscape, single page) ─────────────────
function _renderBaptismCertificate(doc, cert, eventDateStr) {
  const bd = cert.baptismDetails || {};

  // Register Ethiopic fonts on this doc instance
  doc.registerFont('EthReg',  FONT_ETHIOPIC_REGULAR);
  doc.registerFont('EthBold', FONT_ETHIOPIC_BOLD);

  const W=842, H=595, M=50, CX=W/2;

  // Golden borders
  doc.rect(M-10, 40, W-2*M+20, H-80) .lineWidth(14).strokeColor('#b8860b').stroke();
  doc.rect(M+8,  58, W-2*M-16, H-116).lineWidth(2) .strokeColor('#b8860b').stroke();

  // Top-right: Date & File No
  doc.fontSize(9).fillColor('#555').font('Helvetica')
     .text('Date: '+eventDateStr,                  W-M-140, 75, {width:130, align:'right', lineBreak:false});
  doc.fontSize(8).fillColor('#666')
     .text('File No: '+cert.certificateNumber,     W-M-140, 87, {width:130, align:'right', lineBreak:false});

  // Header
  doc.fontSize(13).fillColor('#8B0000').font('Helvetica-Bold')
     .text('St. Michael Eritrean Orthodox Tewahdo Church',
           M+30, 75, {width:W-2*M-180, align:'center', lineBreak:false});
  doc.fontSize(11).fillColor('#8B0000').font('EthBold')
     .text('ቤተ ክርስቲያን ቅዱስ ሚካኤል ኦርቶዶክስ ተዋህዶ',
           M+30, 91, {width:W-2*M-180, align:'center', lineBreak:false});
  doc.fontSize(8).fillColor('#777').font('Helvetica')
     .text('60 Osborne Street, Joondanna, WA 6060',
           M+30, 105, {width:W-2*M-180, align:'center', lineBreak:false});

  const HY = 118;
  doc.moveTo(M+40,HY).lineTo(W-M-40,HY).strokeColor('#b8860b').lineWidth(1.5).stroke();

  // Columns
  const LC=M+40, RC=CX+25, CW=CX-M-65;
  let Y = HY+18;

  // ── English column ──────────────────────────────────────────────────────
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

  en('Date',              eventDateStr);
  en('Baptismal Name',    bd.child && (bd.child.baptismName || bd.child.fullName));
  en('Name',              bd.child && bd.child.fullName);
  en("Father's Name",     bd.parents && bd.parents.fatherName);
  en("Mother's Name",     bd.parents && bd.parents.motherName);
  en('Nationality',       bd.child && bd.child.nationality);
  en('Date of Birth',     dob);
  en('Place of Birth',    bd.child && bd.child.birthPlace);
  en('Godfather/Mother',  gp);
  en('Confession Priest', (bd.confessionFather && bd.confessionFather.name) || cert.officiant);

  // ── Tigrinya column ─────────────────────────────────────────────────────
  Y = HY+18;
  doc.fontSize(14).fillColor('#8B0000').font('EthBold')
     .text('ምስክር ጥምቀት ክርስትና', RC, Y, {width:CW, align:'center', lineBreak:false});
  Y += 24;

  function tg(label, value) {
    const LW=110, VX=RC+LW+5, VW=CW-LW-5;
    const v = (value && String(value).trim()) ? String(value) : '_______________';
    // Label: Tigrinya script - use EthBold
    doc.fontSize(10).fillColor('#333').font('EthBold')
       .text(label, RC, Y, {width:LW, align:'left', lineBreak:false});
    // Value: English/Latin data - use Helvetica to avoid square boxes
    doc.fontSize(10).fillColor('#1a1a1a').font('Helvetica')
       .text(v, VX, Y, {width:VW, align:'left', lineBreak:false});
    doc.moveTo(VX, Y+13).lineTo(VX+VW, Y+13).strokeColor('#ccc').lineWidth(0.5).stroke();
    Y += 18;
  }

  tg('ቀን',               eventDateStr);
  tg('ስመ ጥምቀት',          bd.child && (bd.child.baptismName || bd.child.fullName));
  tg('ሙሉ ስም',             bd.child && bd.child.fullName);
  tg('ስም ኣቦ',             bd.parents && bd.parents.fatherName);
  tg('ስም ኣደ',             bd.parents && bd.parents.motherName);
  tg('ዜግነት',              bd.child && bd.child.nationality);
  tg('ዕለተ ልደት',           dob);
  tg('ቦታ ልደት',            bd.child && bd.child.birthPlace);
  tg('ኣቦ/ኣደ ጥምቀት',       gp);
  tg('ኣቦ መናዘዝቲ',          (bd.confessionFather && bd.confessionFather.name) || cert.officiant);

  // ── Signatures ──────────────────────────────────────────────────────────
  const SY=460, SSY=SY+10, SP=(W-2*M-60)/4;
  const S1=M+30, S2=S1+SP, S3=S2+SP, S4=S3+SP;

  doc.moveTo(M+30,SY).lineTo(W-M-30,SY).strokeColor('#b8860b').lineWidth(1.2).stroke();

  function sigLine(x) {
    doc.moveTo(x+10,SSY+20).lineTo(x+SP-30,SSY+20).strokeColor('#333').lineWidth(0.7).stroke();
  }

  // Sig 1 – Confession Priest
  sigLine(S1);
  if (bd.confessionFather && bd.confessionFather.signature)
    doc.fontSize(9).fillColor('#666').font('Helvetica-Oblique')
       .text('Signed', S1, SSY+22, {width:SP-20, align:'center', lineBreak:false});
  doc.fontSize(8).fillColor('#555').font('Helvetica')
     .text('Confession Priest', S1, SSY+35, {width:SP-20, align:'center', lineBreak:false});
  doc.fontSize(8).fillColor('#555').font('EthReg')
     .text('ፊርማ ኣቦ መናዘዝቲ', S1, SSY+47, {width:SP-20, align:'center', lineBreak:false});

  // Sig 2 – Father
  sigLine(S2);
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
  sigLine(S4);
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

function _renderGenericCertificate(doc, cert, eventDateStr) {
  const primaryName = cert.primaryMember
    ? `${cert.primaryMember.firstName} ${cert.primaryMember.lastName || ''}`.trim()
    : 'Unknown';

  const secondaryName = cert.secondaryMember
    ? `${cert.secondaryMember.firstName} ${cert.secondaryMember.lastName || ''}`.trim()
    : null;

  doc.fontSize(11).fillColor('#333').font('Helvetica').text('This is to certify that', { align: 'center' });
  doc.moveDown(0.5);

  doc.fontSize(16).fillColor('#1a1a2e').font('Helvetica-Bold')
     .text(primaryName, { align: 'center' });

  if (secondaryName) {
    doc.fontSize(11).fillColor('#333').font('Helvetica').moveDown(0.3)
       .text('and', { align: 'center' });
    doc.fontSize(16).fillColor('#1a1a2e').font('Helvetica-Bold')
       .text(secondaryName, { align: 'center' });
  }

  doc.moveDown(0.8);
  doc.fontSize(11).fillColor('#333').font('Helvetica');

  const bodyText = {
    membership: 'is a registered member of this parish in good standing',
    chrismation:'received the Sacrament of Chrismation (Holy Myrrh)',
    death:      'was a faithful member of this parish',
    other:      'has been recognized by this parish'
  };

  doc.text(bodyText[cert.type] || '', { align: 'center' });
  doc.moveDown(0.5);
  doc.text(`on ${eventDateStr}`, { align: 'center' });

  if (cert.officiant) {
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Officiated by: ${cert.officiant}`, { align: 'center' });
  }

  if (cert.witnesses && cert.witnesses.length > 0) {
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Witnesses: ${cert.witnesses.join(', ')}`, { align: 'center' });
  }
}

module.exports = router;
