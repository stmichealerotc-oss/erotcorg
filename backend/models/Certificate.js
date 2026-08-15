const mongoose = require('mongoose');
const Counter  = require('./Counter');

const SignatureSchema = new mongoose.Schema({
  signedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  signerName: String,
  signerTitle: String,
  signedAt:   { type: Date, default: Date.now }
}, { _id: false });

const CertificateSchema = new mongoose.Schema({
  // Auto-generated number e.g. BAP-2026-0042
  certificateNumber: { type: String, unique: true, sparse: true },

  type: {
    type: String,
    required: true,
    enum: ['baptism', 'marriage', 'membership', 'chrismation', 'death', 'other']
  },

  // Primary member (always required)
  primaryMember: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },

  // Secondary member — spouse for marriage certificates
  secondaryMember: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },

  // Date the sacrament / event took place
  eventDate: { type: Date, required: true },

  // Date the certificate was printed / issued
  issuedDate: { type: Date },

  officiant:  { type: String, trim: true },   // priest / officiant name
  witnesses:  [{ type: String, trim: true }],
  godparents: [{ type: String, trim: true }], // baptism
  notes:      { type: String, trim: true },

  status: {
    type: String,
    enum: ['draft', 'signed', 'issued'],
    default: 'draft'
  },

  // Generated PDF stored in Azure Blob
  pdfUrl:     String,
  blobPath:   String,

  signatures: [SignatureSchema],

  // Optional fee tracking
  fee:               { type: Number, default: 0 },
  feeTransactionId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Auto-generate certificate number on save
CertificateSchema.pre('save', async function (next) {
  if (this.isNew && !this.certificateNumber) {
    try {
      const PREFIX = {
        baptism:    'BAP',
        marriage:   'MAR',
        membership: 'MEM',
        chrismation:'CHR',
        death:      'DTH',
        other:      'CRT'
      };
      const prefix = PREFIX[this.type] || 'CRT';
      const year   = new Date().getFullYear();
      const seq    = await Counter.getNextSequence(`certificate_${prefix}_${year}`);
      this.certificateNumber = `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
    } catch (err) {
      console.error('Certificate number generation failed:', err);
    }
  }
  next();
});

CertificateSchema.index({ primaryMember: 1 });
CertificateSchema.index({ secondaryMember: 1 });
CertificateSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Certificate', CertificateSchema);
