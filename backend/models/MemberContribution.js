// backend/models/MemberContribution.js
const mongoose = require('mongoose');

const memberContributionSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  
  type: {
    type: String,
    enum: ['cash', 'in-kind', 'item'],
    required: true
  },
  
  category: {
    type: String,
    required: true,
    validate: {
      validator: function(value) {
        // Same categories as income for consistency
        const validCategories = [
          'tithe', 'offering', 'donation', 'pledge', 'building', 'missions', 
          'youth_activity', 'cultural_events', 'fundraising', 'special_donations', 
          'membership', 'other'
        ];
        return validCategories.includes(value);
      },
      message: '{VALUE} is not a valid category'
    }
  },
  
  description: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  quantity: {
    type: Number,
    default: 1,
    min: 0
  },
  
  value: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Monetary value for reporting purposes, even for in-kind items'
  },
  
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  receiptIssued: {
    type: Boolean,
    default: false
  },
  
  receiptNumber: {
    type: String,
    sparse: true // Allows multiple null values but unique non-null values
  },
  
  notes: {
    type: String,
    maxlength: 500
  },
  
  // Link to accounting transaction if this was a cash contribution
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    sparse: true
  },
  
  // Link to inventory item if this was added to inventory
  inventoryItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    sparse: true
  },
  
  // Photos or documentation
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Approval/verification
  verified: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    verificationNotes: String
  },
  
  // For tracking pledges/promises fulfillment
  promiseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Promise',
    sparse: true
  }
  
}, {
  timestamps: true
});

// Indexes for better performance
memberContributionSchema.index({ memberId: 1, date: -1 });
memberContributionSchema.index({ category: 1, date: -1 });
memberContributionSchema.index({ type: 1, date: -1 });
memberContributionSchema.index({ receiptNumber: 1 }, { sparse: true });

// Virtual for member details
memberContributionSchema.virtual('member', {
  ref: 'Member',
  localField: 'memberId',
  foreignField: '_id',
  justOne: true
});

// Method to generate receipt number
memberContributionSchema.methods.generateReceiptNumber = function() {
  const year = this.date.getFullYear();
  const month = String(this.date.getMonth() + 1).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `RC-${year}${month}-${timestamp}`;
};

// Static method to get contributions by member
memberContributionSchema.statics.getByMember = function(memberId, startDate, endDate) {
  const query = { memberId };
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  return this.find(query).sort({ _id: -1 }) // Use _id instead of date;
};

// Static method to get contributions by category
memberContributionSchema.statics.getByCategory = function(category, startDate, endDate) {
  const query = { category };
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  return this.find(query).populate('memberId', 'firstName lastName email').sort({ _id: -1 }) // Use _id instead of date;
};

// Static method to get summary statistics
memberContributionSchema.statics.getSummary = function(startDate, endDate) {
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) matchStage.date.$gte = new Date(startDate);
    if (endDate) matchStage.date.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          type: '$type',
          category: '$category'
        },
        totalValue: { $sum: '$value' },
        count: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' }
      }
    },
    {
      $group: {
        _id: '$_id.type',
        categories: {
          $push: {
            category: '$_id.category',
            totalValue: '$totalValue',
            count: '$count',
            totalQuantity: '$totalQuantity'
          }
        },
        typeTotal: { $sum: '$totalValue' },
        typeCount: { $sum: '$count' }
      }
    }
  ]);
};

module.exports = mongoose.model('MemberContribution', memberContributionSchema);