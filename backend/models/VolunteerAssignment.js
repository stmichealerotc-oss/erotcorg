const mongoose = require('mongoose');

const volunteerAssignmentSchema = new mongoose.Schema({
  assignmentId: { type: String, required: true, unique: true, index: true },

  // Book reference
  bookId:    { type: String, required: true, index: true },
  bookTitle: { type: String, required: true },
  category:  { type: String, enum: ['anaphora','synaxar','seatat','bible','other'], default: 'other' },

  // Task definition (created by admin, volunteer optional at creation)
  sectionId:  { type: String, required: true }, // main section (e.g. "opening", "Chapter 1")
  subtitle:   { type: String, default: '' },    // optional sub-section within section
  startOrder: { type: Number, required: true },
  endOrder:   { type: Number, required: true },
  language:   { type: String, default: 'all' }, // open string - any language code
  // Task sizing (auto-computed from verse range)
  taskSize: { type: String, enum: ['small','medium','large'], default: 'small' },

  // Volunteer (optional — task can exist unassigned)
  volunteerEmail: { type: String, default: null, index: true },
  volunteerName:  { type: String, default: null },

  // Workflow status
  status: {
    type: String,
    enum: ['unassigned', 'assigned', 'in-progress', 'completed', 'verified'],
    default: 'unassigned',
    index: true
  },

  progress: {
    completedBlocks: { type: Number, default: 0 },
    totalBlocks:     { type: Number, required: true }
  },

  // Admin notes
  notes: String,

  // Timestamps
  createdAt:   { type: Date, default: Date.now },
  assignedAt:  Date,
  startedAt:   Date,
  completedAt: Date,
  updatedAt:   { type: Date, default: Date.now }
}, {
  collection: 'volunteer_assignments'
});

volunteerAssignmentSchema.index({ bookId: 1, sectionId: 1, language: 1 });
volunteerAssignmentSchema.index({ category: 1, status: 1 });

volunteerAssignmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  // Auto-compute task size from verse count
  const count = this.endOrder - this.startOrder + 1;
  this.taskSize = count <= 10 ? 'small' : count <= 30 ? 'medium' : 'large';
  next();
});

module.exports = mongoose.model('VolunteerAssignment', volunteerAssignmentSchema);
