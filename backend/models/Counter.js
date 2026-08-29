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
  // Explicitly use the raw MongoDB collection to bypass any Mongoose session
  // context inherited through the pre-save hook chain.
  // Cosmos DB (Substatus 1104) rejects cross-collection operations in a session.
  // Using the raw collection with a direct command avoids the issue entirely.
  const collection = this.collection;
  const result = await collection.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { 
      returnDocument: 'after',
      upsert: true,
      session: undefined  // explicitly no session
    }
  );
  // findOneAndUpdate returns the document directly in MongoDB driver 6+
  return result ? result.seq : 1;
};

const Counter = mongoose.model('Counter', CounterSchema);
const Sequence = mongoose.model('Sequence', SequenceSchema);

// Attach getNextSequence directly on Counter so existing callers work unchanged
Counter.getNextSequence = Sequence.getNextSequence.bind(Sequence);

module.exports = Counter;
