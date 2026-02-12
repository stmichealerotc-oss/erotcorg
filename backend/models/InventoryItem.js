const mongoose = require('mongoose');
const Counter = require('./Counter');

const inventoryItemSchema = new mongoose.Schema({
  // Inventory Number (sequential: INV0001, INV0002, etc.)
  inventoryNumber: { type: String, unique: true, sparse: true },
  
  name: { type: String, required: true },
  category: String,
  quantity: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  price: { type: Number, default: 0 },
  note: String,
  location: String, // Storage location (optional)
  dateAdded: { type: Date, default: Date.now },
  
  // Initial donor information (when item is first added)
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member'
  },
  donorName: String,
  
  // Enhanced tracking for donations and consumption
  donations: [{
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member'
    },
    donorName: String,
    quantity: { type: Number, required: true },
    estimatedValue: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    contributionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MemberContribution'
    },
    notes: String
  }],
  
  consumption: [{
    quantity: { type: Number, required: true },
    value: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    purpose: String, // e.g., "Church event", "Sunday service"
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    consumedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
  
  // Calculated fields
  totalDonatedValue: { type: Number, default: 0 },
  totalConsumedValue: { type: Number, default: 0 },
  currentValue: { type: Number, default: 0 }
});

// Calculate current value based on remaining quantity
inventoryItemSchema.methods.calculateCurrentValue = function() {
  if (this.quantity <= 0) {
    this.currentValue = 0;
  } else {
    // Calculate average value per unit from donations
    const totalDonatedQuantity = this.donations.reduce((sum, donation) => sum + donation.quantity, 0);
    if (totalDonatedQuantity > 0) {
      const avgValuePerUnit = this.totalDonatedValue / totalDonatedQuantity;
      this.currentValue = this.quantity * avgValuePerUnit;
    } else {
      this.currentValue = this.quantity * this.price;
    }
  }
  return this.currentValue;
};

// Update totals when donations or consumption changes
inventoryItemSchema.pre('save', async function(next) {
  // Calculate totals
  this.totalDonatedValue = this.donations.reduce((sum, donation) => sum + donation.estimatedValue, 0);
  this.totalConsumedValue = this.consumption.reduce((sum, consumption) => sum + consumption.value, 0);
  this.calculateCurrentValue();
  
  // Generate inventory number for new items
  if (this.isNew && !this.inventoryNumber) {
    try {
      const seq = await Counter.getNextSequence('inventoryNumber');
      this.inventoryNumber = `INV${seq.toString().padStart(4, '0')}`;
      console.log(`✅ Generated inventory number: ${this.inventoryNumber}`);
    } catch (error) {
      console.error('❌ Error generating inventory number:', error);
      return next(error);
    }
  }
  
  next();
});

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
