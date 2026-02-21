const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Notification Type
  type: { 
    type: String, 
    enum: ['payment', 'event', 'prayer', 'emergency', 'general'], 
    required: true 
  },
  
  // Content
  title: { type: String, required: true },
  body: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed }, // Additional data for deep linking
  
  // Recipients
  recipients: [{
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
    pushToken: String,
    status: { 
      type: String, 
      enum: ['pending', 'sent', 'delivered', 'failed'], 
      default: 'pending' 
    },
    sentAt: Date,
    deliveredAt: Date,
    errorMessage: String
  }],
  
  // Sender
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Scheduling
  scheduledFor: Date,
  sentAt: Date,
  
  // Statistics
  totalRecipients: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  deliveredCount: { type: Number, default: 0 },
  
  // Priority (for emergency notifications)
  priority: { 
    type: String, 
    enum: ['normal', 'high'], 
    default: 'normal' 
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ sentBy: 1, createdAt: -1 });
notificationSchema.index({ 'recipients.memberId': 1 });

module.exports = mongoose.model('Notification', notificationSchema);
