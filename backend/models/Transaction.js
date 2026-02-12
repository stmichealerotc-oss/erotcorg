// backend/models/Transaction.js
const mongoose = require('mongoose');
const Counter = require('./Counter');

const transactionSchema = new mongoose.Schema({
  // Transaction Number (sequential: T0001, T0002, etc.)
  transactionNumber: { type: String, unique: true, sparse: true },
  
  type: { 
    type: String, 
    enum: ['income', 'expense'], 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    required: true,
    validate: {
      validator: function(value) {
        // TEMPORARY: Very permissive validation during transition
        // Allow any non-empty string to prevent validation errors
        return value && typeof value === 'string' && value.trim().length > 0;
      },
      message: 'Category is required and must be a valid string'
    }
  },
  amount: { 
    type: Number, 
    required: true 
  },
  
  // PAYEE TRACKING - NEW FIELDS
  payee: {
    type: {
      type: String,
      enum: ['member', 'external'],
      required: true,
      default: 'external'
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member'
    },
    name: String,
    email: String,
    phone: String
  },
  
  paymentMethod: {
    type: String,
    enum: ['cash', 'check', 'card', 'online', 'transfer', 'in-kind'],
    default: 'cash'
  },
  reference: String,
  notes: String,
  
  // RECEIPT SIGNATURE SYSTEM
  receiptSignature: {
    // Digital approval tracking
    approvedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      name: String,
      role: String,
      timestamp: Date
    },
    
    // Signature image option
    signatureImage: {
      filename: String,
      originalName: String,
      mimetype: String,
      size: Number,
      uploadedAt: Date,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    
    // Signature method used
    method: {
      type: String,
      enum: ['digital_approval', 'signature_image', 'both'],
      default: 'digital_approval'
    },
    
    // Additional signature details
    signatureTitle: String, // e.g., "Treasurer", "Financial Secretary", "Pastor"
    signatureDate: Date,
    isRequired: {
      type: Boolean,
      default: false
    }
  },
  
  date: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Index for efficient searching
transactionSchema.index({ transactionNumber: 1 });
transactionSchema.index({ date: -1 });
transactionSchema.index({ 'payee.memberId': 1 });

// Pre-save hook to generate sequential transaction number
transactionSchema.pre('save', async function(next) {
  // Only generate transactionNumber if it doesn't exist (for new transactions)
  if (this.isNew && !this.transactionNumber) {
    try {
      const seq = await Counter.getNextSequence('transactionNumber');
      // Format: T0001, T0002, etc. (4 digits with leading zeros)
      this.transactionNumber = `T${seq.toString().padStart(4, '0')}`;
      console.log(`✅ Generated transaction number: ${this.transactionNumber}`);
    } catch (error) {
      console.error('❌ Error generating transaction number:', error);
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);