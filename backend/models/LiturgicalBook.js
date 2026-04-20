const mongoose = require('mongoose');

const liturgicalBookSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  titleGez:    String,
  titleTi:     String,
  description: String,

  category: {
    type: String,
    enum: ['anaphora', 'synaxar', 'seatat', 'bible', 'other'],
    default: 'other',
    index: true
  },

  type: {
    type: String,
    enum: ['liturgy', 'hymn', 'prayer', 'scripture', 'devotional'],
    required: true
  },
  tradition: {
    type: String,
    enum: ['eritrean-orthodox', 'ethiopian-orthodox', 'other'],
    default: 'eritrean-orthodox'
  },

  // Languages - open array of strings, no enum restriction
  // Admin can add any language code: 'gez', 'ti', 'en', 'am', 'ar', 'fr', etc.
  languages: [{ type: String }],

  // Structure metadata
  chapterCount: { type: Number, default: 0 }, // total chapters in this book

  // Content management
  status:     { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  featured:   { type: Boolean, default: false },
  blockCount: { type: Number, default: 0 },

  author:    String,
  publisher: String,
  year:      Number,
  tags:      [String],

  createdBy: { type: String, default: 'system' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'liturgical_books' });

liturgicalBookSchema.index({ category: 1, status: 1 });
liturgicalBookSchema.index({ title: 'text' });

module.exports = mongoose.model('LiturgicalBook', liturgicalBookSchema);
