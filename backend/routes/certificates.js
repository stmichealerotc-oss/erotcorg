const express     = require('express');
const router      = express.Router();
const Certificate = require('../models/Certificate');
const Member      = require('../models/Member');
const { uploadToBlob, generateSAS } = require('../utils/blob');
const PDFDocument = require('pdfkit');

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
      .sort({ createdAt: -1 })
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
      eventDate, officiant, witnesses, godparents, notes, fee
    } = req.body;

    if (!type || !primaryMember || !eventDate) {
      return res.status(400).json({ success: false, error: 'type, primaryMember, eventDate are required' });
    }

    const member = await Member.findById(primaryMember);
    if (!member) return res.status(404).json({ success: false, error: 'Primary member not found' });

    const cert = new Certificate({
      type, primaryMember, secondaryMember: secondaryMember || undefined,
      eventDate: new Date(eventDate),
      officiant, witnesses, godparents, notes,
      fee: fee || 0,
      createdBy: req.user?._id
    });

    await cert.save();
    await cert.populate('primaryMember', 'firstName lastName memberNumber');
    if (cert.secondaryMember) await cert.populate('secondaryMember', 'firstName lastName memberNumber');

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

// ── GET /api/certificates/:id/pdf ─────────────────────────────────────────
// Generate and stream a PDF certificate
router.get('/:id/pdf', async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id)
      .populate('primaryMember',   'firstName lastName memberNumber dob')
      .populate('secondaryMember', 'firstName lastName memberNumber');

    if (!cert) return res.status(404).json({ success: false, error: 'Certificate not found' });

    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    const filename = `${cert.certificateNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    _renderCertificatePDF(doc, cert);
    doc.end();

    // Mark as issued
    if (cert.status === 'signed' || cert.status === 'draft') {
      cert.status    = 'issued';
      cert.issuedDate = new Date();
      await cert.save();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PDF rendering helper ──────────────────────────────────────────────────
function _renderCertificatePDF(doc, cert) {
  const TYPE_LABELS = {
    baptism:    'Certificate of Baptism',
    marriage:   'Certificate of Marriage',
    membership: 'Certificate of Membership',
    chrismation:'Certificate of Chrismation',
    death:      'Memorial Certificate',
    other:      'Church Certificate'
  };

  const primaryName = cert.primaryMember
    ? `${cert.primaryMember.firstName} ${cert.primaryMember.lastName || ''}`.trim()
    : 'Unknown';

  const secondaryName = cert.secondaryMember
    ? `${cert.secondaryMember.firstName} ${cert.secondaryMember.lastName || ''}`.trim()
    : null;

  const eventDateStr = cert.eventDate
    ? new Date(cert.eventDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  // ── Header ──
  doc.fontSize(10).fillColor('#666').text('ST. MICHAEL ERITREAN ORTHODOX TEWAHDO CHURCH', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(22).fillColor('#1a1a2e').font('Helvetica-Bold')
     .text(TYPE_LABELS[cert.type] || 'Church Certificate', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#888').font('Helvetica')
     .text(`Certificate No: ${cert.certificateNumber}`, { align: 'center' });

  // Divider
  doc.moveDown(1);
  doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#c0a060').lineWidth(1.5).stroke();
  doc.moveDown(1);

  // ── Body ──
  doc.fontSize(12).fillColor('#333').font('Helvetica');

  const intro = cert.type === 'marriage'
    ? `This is to certify that`
    : `This is to certify that`;
  doc.text(intro, { align: 'center' });
  doc.moveDown(0.5);

  doc.fontSize(18).fillColor('#1a1a2e').font('Helvetica-Bold')
     .text(primaryName, { align: 'center' });

  if (secondaryName) {
    doc.fontSize(12).fillColor('#333').font('Helvetica').moveDown(0.3)
       .text('and', { align: 'center' });
    doc.fontSize(18).fillColor('#1a1a2e').font('Helvetica-Bold')
       .text(secondaryName, { align: 'center' });
  }

  doc.moveDown(0.8);
  doc.fontSize(12).fillColor('#333').font('Helvetica');

  const bodyText = {
    baptism:    `was received into the Holy Orthodox Church through the Sacrament of Baptism`,
    marriage:   `were united in Holy Matrimony according to the rites of the Orthodox Church`,
    membership: `is a registered member of this parish in good standing`,
    chrismation:`received the Sacrament of Chrismation (Holy Myrrh)`,
    death:      `was a faithful member of this parish`,
    other:      `has been recognized by this parish`
  };

  doc.text(bodyText[cert.type] || '', { align: 'center' });
  doc.moveDown(0.5);
  doc.text(`on ${eventDateStr}`, { align: 'center' });

  if (cert.officiant) {
    doc.moveDown(0.5);
    doc.text(`Officiated by: ${cert.officiant}`, { align: 'center' });
  }

  if (cert.godparents && cert.godparents.length > 0) {
    doc.moveDown(0.5);
    doc.text(`Godparents: ${cert.godparents.join(', ')}`, { align: 'center' });
  }

  if (cert.witnesses && cert.witnesses.length > 0) {
    doc.moveDown(0.5);
    doc.text(`Witnesses: ${cert.witnesses.join(', ')}`, { align: 'center' });
  }

  // ── Signatures ──
  doc.moveDown(2);
  doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#ddd').lineWidth(0.5).stroke();
  doc.moveDown(1);

  if (cert.signatures && cert.signatures.length > 0) {
    cert.signatures.forEach(sig => {
      doc.fontSize(11).fillColor('#333').font('Helvetica-Bold').text(sig.signerName || '', { continued: true });
      doc.font('Helvetica').fillColor('#666').text(`  —  ${sig.signerTitle || ''}`);
      doc.fontSize(9).fillColor('#aaa')
         .text(new Date(sig.signedAt).toLocaleDateString('en-AU'), { indent: 10 });
      doc.moveDown(0.5);
    });
  } else {
    // Blank signature lines
    doc.fontSize(10).fillColor('#aaa').text('_______________________________', 80);
    doc.fontSize(9).text('Authorized Signatory', 80);
  }

  // ── Footer ──
  doc.fontSize(8).fillColor('#aaa')
     .text(`Issued: ${new Date().toLocaleDateString('en-AU')}  |  ${cert.certificateNumber}`,
           60, doc.page.height - 50, { align: 'center', width: doc.page.width - 120 });
}

module.exports = router;
