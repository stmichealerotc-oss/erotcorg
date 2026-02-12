const mongoose = require('mongoose');
const Counter = require('./Counter');

const memberSchema = new mongoose.Schema({
  // Personal Information
  firstName: { type: String, required: true },
  lastName: String,
  email: { type: String, unique: true, sparse: true }, // sparse allows multiple null values
  phone: String,
  address: String,
  dob: Date,
  joinDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'pending' },
  
  // Emergency Contact
  emergencyContactName: String,
  emergencyContactPhone: String,
  
  // Additional Information
  notes: String,
  
  // Member Number (sequential format: M0001, M0002, etc.)
  memberNumber: { type: String, unique: true, sparse: true },
  
  // Verification and Approval Process
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'contacted', 'verified', 'approved', 'rejected'], 
    default: 'pending' 
  },
  verificationNotes: String,
  verifiedBy: String, // Admin who verified
  verifiedAt: Date,
  contactedAt: Date,
  approvedAt: Date,
  
  // Update token for individual member updates
  updateToken: { type: String, unique: true, sparse: true },
  updateTokenExpiry: Date,
  updateTokenUsed: { type: Boolean, default: false },
  updateTokenUsedAt: Date,
  lastUpdated: Date
  
  // Note: Removed legacy id field - using MongoDB _id and virtual displayId instead
}, {
  timestamps: true
});

// Index for efficient searching
memberSchema.index({ firstName: 1, lastName: 1 });
memberSchema.index({ email: 1 });
memberSchema.index({ phone: 1 });
memberSchema.index({ memberNumber: 1 });

// Pre-save hook to generate sequential member number
memberSchema.pre('save', async function(next) {
  // Only generate memberNumber if it doesn't exist (for new members)
  if (this.isNew && !this.memberNumber) {
    try {
      const seq = await Counter.getNextSequence('memberNumber');
      // Format: M0001, M0002, etc. (4 digits with leading zeros)
      this.memberNumber = `M${seq.toString().padStart(4, '0')}`;
      console.log(`✅ Generated member number: ${this.memberNumber}`);
    } catch (error) {
      console.error('❌ Error generating member number:', error);
      return next(error);
    }
  }
  next();
});

// Virtual for full name
memberSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName || ''}`.trim();
});

// Virtual for display ID (user-friendly version of MongoDB _id)
memberSchema.virtual('displayId').get(function() {
  // Convert MongoDB _id to a shorter, more user-friendly format
  // Take last 6 characters of _id and prefix with 'M'
  return `M${this._id.toString().slice(-6).toUpperCase()}`;
});

// Static method to find member by any ID format
memberSchema.statics.findByAnyId = async function(id) {
  try {
    // If it's a valid MongoDB ObjectId, search by _id
    if (mongoose.Types.ObjectId.isValid(id)) {
      const member = await this.findById(id);
      if (member) return member;
    }
    
    // If it looks like a sequential member number (M0001, M0002, etc.)
    if (typeof id === 'string' && id.match(/^M\d{4,}$/i)) {
      const member = await this.findOne({ memberNumber: id.toUpperCase() });
      if (member) return member;
    }
    
    // If it looks like old format member number (M + 7 chars), search by memberNumber field
    if (typeof id === 'string' && id.match(/^M[A-F0-9]{7}$/i)) {
      const member = await this.findOne({ memberNumber: id.toUpperCase() });
      if (member) return member;
    }
    
    // If it looks like a display ID (M + 6 chars), extract the _id part
    if (typeof id === 'string' && id.match(/^M[A-F0-9]{6}$/i)) {
      const idSuffix = id.slice(1).toLowerCase();
      // Find member whose _id ends with this suffix
      const members = await this.find({});
      for (const member of members) {
        if (member._id.toString().slice(-6).toLowerCase() === idSuffix) {
          return member;
        }
      }
    }
    
    // If it's a legacy numeric ID
    if (!isNaN(id)) {
      const member = await this.findOne({ id: parseInt(id) });
      if (member) return member;
    }
    
    return null;
  } catch (error) {
    console.error('Error finding member by ID:', error);
    return null;
  }
};

// Static method for search functionality
memberSchema.statics.searchMembers = async function(query) {
  try {
    if (!query || query.trim().length === 0) {
      return [];
    }
    
    const searchTerm = query.trim();
    
    // Try to find by member number or display ID first
    const memberById = await this.findByAnyId(searchTerm);
    if (memberById) {
      return [memberById];
    }
    
    // Search by name, email, phone, or memberNumber
    const searchCriteria = {
      $or: [
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { phone: { $regex: searchTerm.replace(/\D/g, ''), $options: 'i' } }, // Remove non-digits for phone search
        { memberNumber: { $regex: searchTerm, $options: 'i' } } // Search by member number
      ]
    };
    
    return await this.find(searchCriteria).limit(20);
  } catch (error) {
    console.error('Error searching members:', error);
    return [];
  }
};

module.exports = mongoose.model('Member', memberSchema);
