const mongoose = require('mongoose');

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

// Virtual for member number (based on creation order)
memberSchema.virtual('memberNumber').get(function() {
  // Extract timestamp from MongoDB _id (first 4 bytes represent timestamp)
  const timestamp = this._id.getTimestamp();
  // Create a simple number based on creation time
  return Math.floor(timestamp.getTime() / 1000) % 100000; // Last 5 digits of timestamp
});

// Static method to find member by any ID format
memberSchema.statics.findByAnyId = async function(id) {
  try {
    // If it's a valid MongoDB ObjectId, search by _id
    if (mongoose.Types.ObjectId.isValid(id)) {
      const member = await this.findById(id);
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
    
    // Try to find by display ID first
    const memberById = await this.findByAnyId(searchTerm);
    if (memberById) {
      return [memberById];
    }
    
    // Search by name, email, or phone
    const searchCriteria = {
      $or: [
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { phone: { $regex: searchTerm.replace(/\D/g, ''), $options: 'i' } } // Remove non-digits for phone search
      ]
    };
    
    return await this.find(searchCriteria).limit(20);
  } catch (error) {
    console.error('Error searching members:', error);
    return [];
  }
};

module.exports = mongoose.model('Member', memberSchema);
