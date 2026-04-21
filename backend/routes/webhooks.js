const express = require('express');
const router = express.Router();
const ChurchDocument = require('../models/ChurchDocument');
const { uploadToBlob } = require('../utils/blob');

/**
 * POST /api/webhooks/docuseal
 * Called by DocuSeal when a submission is completed.
 * No auth — DocuSeal calls this directly.
 * Register this URL in DocuSeal: Settings → Webhooks → Add
 */
router.post('/docuseal', async (req, res) => {
  // Acknowledge immediately — DocuSeal expects fast response
  res.sendStatus(200);

  try {
    const event = req.body;
    console.log('📬 DocuSeal webhook:', event.event_type, event.data?.id);

    if (event.event_type !== 'submission.completed') return;

    const submissionId = String(event.data?.id);
    const signedPdfUrl = event.data?.documents?.[0]?.url;

    if (!signedPdfUrl) {
      console.error('DocuSeal webhook: no signed PDF URL');
      return;
    }

    // Find document by DocuSeal submission ID
    const doc = await ChurchDocument.findOne({ docusealSubmissionId: submissionId });
    if (!doc) {
      console.error(`DocuSeal webhook: no document found for submissionId ${submissionId}`);
      return;
    }

    // Download signed PDF from DocuSeal
    const fetchRes = await fetch(signedPdfUrl, {
      headers: { 'X-Auth-Token': process.env.DOCUSEAL_API_TOKEN }
    });
    if (!fetchRes.ok) throw new Error(`Failed to fetch signed PDF: ${fetchRes.status}`);
    const pdfBuffer = Buffer.from(await fetchRes.arrayBuffer());

    // Build blob path and upload
    const parts = doc.fileNo.split('-'); // ['STM','2026','OUT','001']
    const version = doc.files.filter(f => f.type === 'signed').length + 1;
    const blobPath = `${parts[1]}/${parts[2]}/${parts[3]}/signed_v${version}.pdf`;
    const url = await uploadToBlob(pdfBuffer, blobPath, 'application/pdf');

    // Save signed file + update status
    doc.files.push({
      type: 'signed',
      url,
      blobPath,
      originalName: `${doc.fileNo}_signed.pdf`,
      mimeType: 'application/pdf',
      version,
      uploadedAt: new Date()
    });
    doc.status = 'signed';
    doc.docusealStatus = 'completed';
    await doc.save();

    console.log(`✅ Signed PDF saved for ${doc.fileNo} → ${blobPath}`);
  } catch (err) {
    console.error('DocuSeal webhook error:', err.message);
  }
});

module.exports = router;
