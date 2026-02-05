// backend/models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
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
    enum: ['cash', 'check', 'card', 'online', 'transfer'],
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

module.exports = mongoose.model('Transaction', transactionSchema);