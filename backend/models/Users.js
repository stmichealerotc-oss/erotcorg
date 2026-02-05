const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true,
    enum: ['super-admin', 'admin', 'chairperson', 'secretary', 'accountant', 'holder-of-goods', 'community-coordinator', 'member', 'visitor']
  },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  permissions: [String],
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  lastActivity: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Password reset and first-time login
  isFirstLogin: { type: Boolean, default: true },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  oneTimePassword: { type: String },
  oneTimePasswordExpiry: { type: Date },
  passwordChangedAt: { type: Date },
  
  // Email verification
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpiry: { type: Date },
  
  // Account status
  accountStatus: { 
    type: String, 
    enum: ['active', 'inactive', 'suspended', 'pending'], 
    default: 'pending' 
  },
  
  // Session management
  sessionTimeout: { type: Number, default: 3600000 }, // 1 hour in milliseconds
  lastActivityTime: { type: Date, default: Date.now },
  requiresEmailVerification: { type: Boolean, default: true }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ resetToken: 1 });

module.exports = mongoose.model('User', userSchema);
