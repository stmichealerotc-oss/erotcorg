const mongoose = require('mongoose');

const liturgicalBlockSchema = new mongoose.Schema({
  blockId:   { type: String, required: true, unique: true, index: true },
  bookId:    { type: String, required: true, index: true },

  // Structure: sectionId (the "chapter" or named section) > subtitle > order
  // For Bible: sectionId = "Chapter 1", subtitle = "The Genealogy of Jesus"
  // For Anaphora: sectionId = "opening", subtitle = "" (no subtitle needed)
  // For Synaxar: sectionId = "Meskerem 1", subtitle = "Saint Name"
  sectionId: { type: String, required: true, index: true }, // main section / chapter title
  subtitle:  { type: String, default: '' },                 // optional sub-section within section
  order:     { type: Number, required: true, default: 0 },  // verse number

  type: {
    type: String,
    enum: ['dialogue', 'hymn', 'prayer', 'reading', 'rubric', 'instruction', 'response', 'verse'],
    default: 'verse'
  },
  role: { type: String, default: '' },

  // Translations: open object - any language key allowed
  translations: { type: Map, of: String, default: {} },

  isRubric:     { type: Boolean, default: false },
  isResponsive: { type: Boolean, default: false },

  metadata: {
    enteredBy:  String,
    language:   String,
    enteredAt:  Date,
    notes:      String,
    verifiedBy: String,
    verifiedAt: Date,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
}, {
  collection: 'liturgical_blocks'
});

liturgicalBlockSchema.index({ bookId: 1, sectionId: 1, subtitle: 1, order: 1 });
liturgicalBlockSchema.index({ bookId: 1, sectionId: 1, order: 1 });

liturgicalBlockSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('LiturgicalBlock', liturgicalBlockSchema);
