const mongoose = require('mongoose');

const volunteerProfileSchema = new mongoose.Schema({
  // Identity
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  phone: { type: String },
  location: { type: String }, // city/country - useful for diaspora

  // Skills & Languages
  languages: [{
    type: String,
    enum: ['gez', 'ti', 'en', 'am', 'ar', 'other']
  }],
  languageProficiency: {
    gez: { type: String, enum: ['native', 'fluent', 'intermediate', 'basic', ''], default: '' },
    ti:  { type: String, enum: ['native', 'fluent', 'intermediate', 'basic', ''], default: '' },
    en:  { type: String, enum: ['native', 'fluent', 'intermediate', 'basic', ''], default: '' },
    am:  { type: String, enum: ['native', 'fluent', 'intermediate', 'basic', ''], default: '' },
  },

  // Role / Expertise
  expertise: [{
    type: String,
    enum: [
      'text-entry',       // typing/transcription
      'translation',      // translating between languages
      'review',           // reviewing/proofreading entered content
      'scholar',          // liturgical scholar / expert
      'it',               // technical help (web, app, data)
      'audio',            // recording audio
      'design',           // UI/graphics
      'coordination',     // organizing volunteers
    ]
  }],

  // Availability
  hoursPerWeek: {
    type: Number,
    min: 1,
    max: 40,
    default: 2
  },
  // Helps admin size tasks: small=1-2h, medium=3-5h, large=6h+
  taskSizePreference: {
    type: String,
    enum: ['small', 'medium', 'large', 'any'],
    default: 'any'
  },
  availability: {
    type: String,
    enum: ['weekdays', 'weekends', 'evenings', 'flexible'],
    default: 'flexible'
  },

  // Notes from volunteer
  notes: { type: String, maxlength: 500 },

  // Status (admin manages this)
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive'],
    default: 'pending'
  },

  // Stats (updated automatically)
  stats: {
    tasksCompleted: { type: Number, default: 0 },
    blocksEntered: { type: Number, default: 0 },
    totalHoursLogged: { type: Number, default: 0 },
  },

  registeredAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  collection: 'volunteer_profiles'
});

volunteerProfileSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('VolunteerProfile', volunteerProfileSchema);
