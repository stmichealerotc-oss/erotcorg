const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['OUT', 'IN', 'MIN', 'CIR', 'REP', 'LEG']
  },
  year: {
    type: Number,
    required: true
  },
  seq: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Compound unique index to prevent duplicates
CounterSchema.index({ type: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Counter', CounterSchema);
