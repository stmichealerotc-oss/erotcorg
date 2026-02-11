const mongoose = require('mongoose');

// Counter schema for generating sequential IDs
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g., 'memberNumber', 'transactionNumber'
  seq: { type: Number, default: 0 }
});

// Static method to get next sequence number
counterSchema.statics.getNextSequence = async function(sequenceName) {
  try {
    const counter = await this.findByIdAndUpdate(
      sequenceName,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return counter.seq;
  } catch (error) {
    console.error('Error getting next sequence:', error);
    throw error;
  }
};

module.exports = mongoose.model('Counter', counterSchema);
