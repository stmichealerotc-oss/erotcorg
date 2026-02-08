const mongoose = require('mongoose');

const mezmurSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  lyrics: {
    type: String,
    required: true,
  },
  audio: String,
  order: {
    type: Number,
    default: 0,
  },
  difficulty: String,
  meaning: String,
  aiEnhancements: {
    teachingPoints: [String],
    movementSuggestions: [String],
    memoryAids: [String]
  }
});

const prayerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  instructions: String,
  order: {
    type: Number,
    default: 0,
  },
  language: String,
  meaning: String,
  aiEnhancements: {
    reflectionQuestions: [String],
    relatedVerses: [String]
  }
});

const bibleStudySchema = new mongoose.Schema({
  passage: {
    type: String,
    required: true,
  },
  topic: {
    type: String,
    required: true,
  },
  keyVerse: {
    type: String,
    required: true,
  },
  studyNotes: {
    type: String,
    required: true,
  },
  questions: [String],
  activity: String,
  order: {
    type: Number,
    default: 0,
  },
  reflectionQuestions: String,
  faqDiscussion: String,
  aiEnhancements: {
    discussionPrompts: {
      ages_3_5: [String],
      ages_6_8: [String],
      ages_9_12: [String]
    },
    activities: [String],
    learningObjectives: [String]
  }
});

const divineLiturgySchema = new mongoose.Schema({
  part: {
    type: String,
    required: true,
  },
  when: {
    type: String,
    required: true,
  },
  response: {
    type: String,
    required: true,
  },
  meaning: String,
  audio: String,
  order: {
    type: Number,
    default: 0,
  },
});

const weekSchema = new mongoose.Schema({
  week: {
    type: Number,
    required: true,
    min: 1,
    max: 4,
  },
  theme: {
    type: String,
    required: true,
  },
  memoryVerse: {
    type: String,
    required: true,
  },
  mezmur: [mezmurSchema],
  prayer: [prayerSchema],
  bibleStudy: [bibleStudySchema],
  divineLiturgy: [divineLiturgySchema],
  isActive: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
});

const kidsProgramSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  monthName: {
    type: String,
    required: true,
  },
  weeks: [weekSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Compound index to ensure unique months per year
kidsProgramSchema.index({ year: 1, month: 1 }, { unique: true });

// Virtual for formatted date
kidsProgramSchema.virtual('formattedDate').get(function() {
  return `${this.monthName} ${this.year}`;
});

// Static method to get month name
kidsProgramSchema.statics.getMonthName = function(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
};

module.exports = mongoose.model('KidsProgram', kidsProgramSchema);
