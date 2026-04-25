const express = require('express');
const multer = require('multer');
const router = express.Router();

const ChurchDocument = require('../models/ChurchDocument');
const { getNextFileNumber, buildBlobPath } = require('../utils/fileNumber');
const { uploadToBlob, generateSAS } = require('../utils/blob');

// Multer — memory storage (buffer goes straight to Azure)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, Word, JPG, PNG files are allowed'));
  }
});

// ── GET /api/documents — list with filters ─────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category, direction, status, year, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (category)  filter.category  = category;
    if (direction) filter.direction = direction;
    if (status)    filter.status    = status;
    if (year)      filter.date = {
      $gte: new Date(`${year}-01-01`),
      $lte: new Date(`${year}-12-31`)
    };
    if (search) filter.$text = { $search: search };

    const total = await ChurchDocument.countDocuments(filter);
    const docs = await ChurchDocument.find(filter)
      .select('-files.url') // don't expose raw blob URLs
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('createdBy', 'name email');

    res.json({ success: true, data: docs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/documents/:id — single document ───────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const doc = await ChurchDocument.findById(req.params.id)
      .select('-files.url')
      .populate('createdBy', 'name email');
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/documents — create document metadata ────────────────────────
router.post('/', async (req, res) => {
  try {
    const { title, subject, category, direction, fromTo, date, refNo, notes, accessRoles } = req.body;

    if (!title || !category || !direction || !date) {
      return res.status(400).json({ success: false, error: 'title, category, direction, date are required' });
    }

    const fileNo = await getNextFileNumber(category);

    const doc = new ChurchDocument({
      fileNo,
      refNo,
      title,
      subject,
      category,
      direction,
      fromTo,
      date: new Date(date),
      notes,
      accessRoles: accessRoles || ['admin', 'super-admin'],
      createdBy: req.user?._id
    });

    await doc.save();
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/documents/:id/upload — attach a file ────────────────────────
router.post('/:id/upload', upload.single('file'), async (req, res) => {
  try {
    const doc = await ChurchDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });

    const { fileType = 'draft' } = req.body; // draft | final | signed | attachment
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    // Calculate version number for this file type
    const existing = doc.files.filter(f => f.type === fileType);
    const version = existing.length + 1;

    const blobPath = buildBlobPath(doc.fileNo, `${fileType}_v${version}`, file.originalname);
    const url = await uploadToBlob(file.buffer, blobPath, file.mimetype);

    doc.files.push({
      type: fileType,
      url,
      blobPath,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      version,
      uploadedBy: req.user?._id
    });

    // Auto-update status based on file type
    if (fileType === 'signed') doc.status = 'signed';
    else if (fileType === 'final' && doc.status === 'draft') doc.status = 'final';

    await doc.save();
    res.json({ success: true, message: 'File uploaded', fileNo: doc.fileNo, blobPath });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/documents/:id/download — generate SAS link ───────────────────
router.get('/:id/download', async (req, res) => {
  try {
    const { type = 'final', version } = req.query;
    const doc = await ChurchDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });

    // Find the requested file version
    let fileEntry;
    if (version) {
      fileEntry = doc.files.find(f => f.type === type && f.version === Number(version));
    } else {
      // Get latest version of requested type
      const matches = doc.files.filter(f => f.type === type);
      fileEntry = matches[matches.length - 1];
    }

    if (!fileEntry) return res.status(404).json({ success: false, error: `No ${type} file found` });

    const sasUrl = generateSAS(fileEntry.blobPath, 60); // 60 min expiry
    res.json({ success: true, url: sasUrl, expiresIn: '60 minutes', fileName: fileEntry.originalName });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/documents/:id — update metadata ──────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['title', 'subject', 'fromTo', 'date', 'status', 'refNo', 'notes', 'tags', 'accessRoles'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const doc = await ChurchDocument.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/documents/:id/send-to-sign — send final file to DocuSeal ───
router.post('/:id/send-to-sign', async (req, res) => {
  try {
    const { signers, order = 'sequential', fileVersion, templateId } = req.body;
    const doc = await ChurchDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });

    if (doc.status !== 'final') {
      return res.status(400).json({ success: false, error: 'Only final documents can be sent for signing. Update status to final first.' });
    }

    const finals = doc.files.filter(f => f.type === 'final');
    const fileEntry = fileVersion
      ? finals.find(f => f.version === Number(fileVersion))
      : finals[finals.length - 1];

    if (!fileEntry) return res.status(400).json({ success: false, error: 'No final file found. Upload a final version first.' });
    if (!signers || signers.length === 0) return res.status(400).json({ success: false, error: 'At least one signer is required.' });

    const docusealUrl = process.env.DOCUSEAL_URL || 'https://sign.erotc.org';
    const docusealToken = process.env.DOCUSEAL_API_TOKEN;
    if (!docusealToken) return res.status(500).json({ success: false, error: 'DOCUSEAL_API_TOKEN not configured in environment.' });

    const { generateSAS } = require('../utils/blob');
    const sasUrl = generateSAS(fileEntry.blobPath, 60 * 24); // 24h

    const submitters = signers.map((s, i) => ({
      name: s.name,
      email: s.email,
      role: s.role || 'Signer',
      ...(order === 'sequential' && { order: i + 1 })
    }));

    // If templateId provided → use DocuSeal template (supports multiple fields per signer)
    // Otherwise → send raw PDF (DocuSeal places one signature at end)
    const payload = templateId ? {
      template_id: Number(templateId),
      send_email: true,
      order: order === 'sequential' ? 'preserved' : 'random',
      submitters
    } : {
      send_email: true,
      order: order === 'sequential' ? 'preserved' : 'random',
      submitters,
      documents: [{
        name: fileEntry.originalName || `${doc.fileNo}.pdf`,
        url: sasUrl
      }]
    };

    const dsRes = await fetch(`${docusealUrl}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': docusealToken },
      body: JSON.stringify(payload)
    });

    const dsData = await dsRes.json();
    if (!dsRes.ok) return res.status(dsRes.status).json({ success: false, error: dsData.error || 'DocuSeal error', details: dsData });

    const submission = Array.isArray(dsData) ? dsData[0] : dsData;
    doc.docusealSubmissionId = String(submission.submission_id || submission.id || '');
    doc.docusealStatus = 'pending';
    await doc.save();

    res.json({
      success: true,
      message: `Sent to ${signers.length} signer${signers.length > 1 ? 's' : ''} for signing`,
      submissionId: doc.docusealSubmissionId,
      signingUrl: submission.embed_src || submission.url || null
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/documents/:id — archive (soft delete) ─────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const doc = await ChurchDocument.findByIdAndUpdate(
      req.params.id,
      { status: 'archived' },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    res.json({ success: true, message: 'Document archived', fileNo: doc.fileNo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
