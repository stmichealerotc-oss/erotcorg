const mongoose = require('mongoose');
const Counter = require('./Counter');

const promiseSchema = new mongoose.Schema({
  // Promise Number (sequential: P0001, P0002, etc.)
  promiseNumber: { type: String, unique: true, sparse: true },
  
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  memberName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  category: {
    type: String,
    required: true,
    validate: {
      validator: function(value) {
        const validCategories = ['tithe', 'offering', 'donation', 'building', 'missions', 'honorarium'];
        return validCategories.includes(value);
      },
      message: '{VALUE} is not a valid category'
    }
  },
  description: {
    type: String,
    default: ''
  },
  promiseDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'fulfilled', 'cancelled'],
    default: 'pending'
  },
  fulfilledDate: {
    type: Date
  },
  actualAmount: {
    type: Number
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'check', 'card', 'online', 'transfer', '']
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for better query performance
promiseSchema.index({ memberId: 1, status: 1 });
promiseSchema.index({ dueDate: 1 });
promiseSchema.index({ status: 1 });
promiseSchema.index({ promiseNumber: 1 });

// Pre-save hook to generate sequential promise number
promiseSchema.pre('save', async function(next) {
  // Only generate promiseNumber if it doesn't exist (for new promises)
  if (this.isNew && !this.promiseNumber) {
    try {
      const seq = await Counter.getNextSequence('promiseNumber');
      // Format: P0001, P0002, etc. (4 digits with leading zeros)
      this.promiseNumber = `P${seq.toString().padStart(4, '0')}`;
      console.log(`✅ Generated promise number: ${this.promiseNumber}`);
    } catch (error) {
      console.error('❌ Error generating promise number:', error);
      return next(error);
    }
  }
  next();
});

// Virtual for overdue status
promiseSchema.virtual('isOverdue').get(function() {
  return this.status === 'pending' && new Date() > this.dueDate;
});

// Method to mark as fulfilled
promiseSchema.methods.markAsFulfilled = function(actualAmount, paymentMethod, notes) {
  this.status = 'fulfilled';
  this.fulfilledDate = new Date();
  this.actualAmount = actualAmount || this.amount;
  this.paymentMethod = paymentMethod || '';
  this.notes = notes || this.notes;
};

module.exports = mongoose.model('Promise', promiseSchema);