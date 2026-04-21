const mongoose = require('mongoose');

const FileVersionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['draft', 'final', 'signed', 'attachment'],
    required: true
  },
  url: { type: String, required: true },
  blobPath: { type: String, required: true }, // e.g. 2026/OUT/001/final.pdf
  originalName: String,
  mimeType: String,
  sizeBytes: Number,
  version: { type: Number, default: 1 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const ChurchDocumentSchema = new mongoose.Schema({
  fileNo: {
    type: String,
    unique: true,
    // e.g. STM-2026-OUT-001
  },
  refNo: {
    type: String,
    // e.g. 003/26 — used on official letters
    trim: true
  },
  title: { type: String, required: true, trim: true },
  subject: { type: String, trim: true },
  category: {
    type: String,
    required: true,
    enum: ['minutes', 'incoming-letter', 'outgoing-letter', 'circular', 'report', 'legal', 'other']
  },
  direction: {
    type: String,
    enum: ['incoming', 'outgoing', 'internal'],
    required: true
  },
  fromTo: { type: String, trim: true }, // sender (incoming) or recipient (outgoing)
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ['draft', 'final', 'signed', 'archived'],
    default: 'draft'
  },
  files: [FileVersionSchema],
  tags: [String],
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  // Access control — who can see this document
  accessRoles: {
    type: [String],
    default: ['admin', 'super-admin']
  }
}, { timestamps: true });

// Text search index
ChurchDocumentSchema.index({
  fileNo: 'text',
  refNo: 'text',
  title: 'text',
  subject: 'text',
  fromTo: 'text',
  notes: 'text'
});

module.exports = mongoose.model('ChurchDocument', ChurchDocumentSchema);
