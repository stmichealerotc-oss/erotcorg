const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['OUT', 'IN', 'MIN', 'CIR', 'REP', 'LEG', 'GEN', 'RES', 'FIN']
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

// Generic sequence counter used by Transaction, Promise, Member, etc.
// Stores a simple incrementing counter per name (e.g. 'transactionNumber')
const SequenceSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

SequenceSchema.statics.getNextSequence = async function(name) {
  const result = await this.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
};

const Counter = mongoose.model('Counter', CounterSchema);
const Sequence = mongoose.model('Sequence', SequenceSchema);

// Attach getNextSequence directly on Counter so existing callers work unchanged
Counter.getNextSequence = Sequence.getNextSequence.bind(Sequence);

module.exports = Counter;
