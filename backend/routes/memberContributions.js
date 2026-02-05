// backend/routes/memberContributions.js
const express = require('express');
const router = express.Router();
const MemberContribution = require('../models/MemberContribution');
const Member = require('../models/Member');
const Transaction = require('../models/Transaction');
const InventoryItem = require('../models/InventoryItem');
const { authenticateToken, committeeOnly } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);
router.use(committeeOnly);

// Category definitions for frontend
const CATEGORIES = {
  income: [
    { value: 'tithe', label: 'Tithe' },
    { value: 'offering', label: 'Offering' },
    { value: 'donation', label: 'Donation' },
    { value: 'pledge', label: 'Pledge' },
    { value: 'building', label: 'Building Fund' },
    { value: 'missions', label: 'Missions' },
    { value: 'youth_activity', label: 'Youth Activity Fees' },
    { value: 'cultural_events', label: 'Cultural / Community Events' },
    { value: 'fundraising', label: 'Fundraising Event' },
    { value: 'special_donations', label: 'Special Donations' },
    { value: 'membership', label: 'Membership Fees' },
    { value: 'other', label: 'Other (Specify)' }
  ],
  expense: [
    { value: 'honorarium', label: 'Honorarium (Clergy/Volunteers)' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'salaries', label: 'Salaries' },
    { value: 'supplies', label: 'Supplies' },
    { value: 'benevolence', label: 'Benevolence / Aid' },
    { value: 'building', label: 'Building / Maintenance' },
    { value: 'youth_programs', label: 'Youth Program Expenses' },
    { value: 'cultural_events', label: 'Cultural / Community Expenses' },
    { value: 'maintenance', label: 'Maintenance & Repairs' },
    { value: 'office_expenses', label: 'Office / Admin Expenses' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'technology', label: 'Technology / IT' },
    { value: 'training', label: 'Training / Workshops' },
    { value: 'volunteer_support', label: 'Volunteer Support' },
    { value: 'events', label: 'Events' },
    { value: 'other', label: 'Other (Specify)' }
  ]
};

// GET /api/member-contributions/categories - Get category definitions
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    categories: CATEGORIES
  });
});

// GET /api/member-contributions - Get all contributions with filters
router.get('/', async (req, res) => {
  try {
    const {
      memberId,
      category,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      verified
    } = req.query;

    // Build query
    const query = {};
    if (memberId) query.memberId = memberId;
    if (category) query.category = category;
    if (type) query.type = type;
    if (verified !== undefined) query['verified.isVerified'] = verified === 'true';
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        // End of the day for endDate (23:59:59.999)
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.date.$lte = endOfDay;
      }
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const contributions = await MemberContribution.find(query)
      .populate('memberId', 'firstName lastName email phone')
      .populate('transactionId', 'amount paymentMethod reference')
      .populate('verified.verifiedBy', 'name role')
      .sort({ _id: -1 }) // Use _id instead of date for Cosmos DB
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MemberContribution.countDocuments(query);

    res.json({
      success: true,
      contributions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching contributions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contributions',
      details: error.message
    });
  }
});

// POST /api/member-contributions - Create new contribution
router.post('/', async (req, res) => {
  try {
    const {
      memberId,
      type,
      category,
      description,
      quantity = 1,
      value,
      date,
      notes,
      createTransaction = false
    } = req.body;

    // Validate required fields
    if (!memberId || !type || !category || !description || !value) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: memberId, type, category, description, value'
      });
    }

    // Verify member exists
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    // Create contribution
    const contribution = new MemberContribution({
      memberId,
      type,
      category,
      description,
      quantity,
      value,
      date: date ? new Date(date) : new Date(),
      notes
    });

    // Generate receipt number if needed
    if (req.body.issueReceipt) {
      contribution.receiptNumber = contribution.generateReceiptNumber();
      contribution.receiptIssued = true;
    }

    await contribution.save();

    // Automatically create inventory item for "Physical Item" type
    if (type === 'item') {
      try {
        console.log('🎁 Creating inventory item for physical item contribution...');
        console.log('Member:', member.firstName, member.lastName, 'ID:', memberId);
        console.log('Description:', description, 'Quantity:', quantity, 'Value:', value);
        
        const inventoryItem = new InventoryItem({
          name: description,
          category: category,
          quantity: quantity || 1,
          price: value / (quantity || 1), // Unit price
          donorId: memberId,
          donorName: `${member.firstName} ${member.lastName}`,
          note: notes || `Donated on ${new Date(contribution.date).toLocaleDateString()}`,
          dateAdded: contribution.date,
          // Add donation record
          donations: [{
            donorId: memberId,
            donorName: `${member.firstName} ${member.lastName}`,
            quantity: quantity || 1,
            estimatedValue: value,
            date: contribution.date,
            contributionId: contribution._id,
            notes: notes
          }]
        });

        await inventoryItem.save();
        
        // Link inventory item to contribution
        contribution.inventoryItemId = inventoryItem._id;
        await contribution.save();
        
        console.log(`✅ Auto-created inventory item ${inventoryItem._id} for physical item contribution ${contribution._id}`);
      } catch (invError) {
        console.error('❌ Error creating inventory item:', invError);
        console.error('Error details:', invError.message);
        console.error('Stack:', invError.stack);
        // Don't fail the whole request if inventory creation fails
      }
    }

    // Create corresponding transaction if requested and type is cash
    if (createTransaction && type === 'cash') {
      const transaction = new Transaction({
        type: 'income',
        description: `${description} - ${member.firstName} ${member.lastName}`,
        category,
        amount: value,
        payee: {
          type: 'member',
          memberId: memberId,
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          phone: member.phone
        },
        date: contribution.date,
        notes: `Linked to contribution: ${contribution._id}`
      });

      await transaction.save();
      
      // Link transaction to contribution
      contribution.transactionId = transaction._id;
      await contribution.save();
    }

    // Populate response
    await contribution.populate('memberId', 'firstName lastName email phone');
    if (contribution.transactionId) {
      await contribution.populate('transactionId', 'amount paymentMethod reference');
    }

    res.status(201).json({
      success: true,
      contribution,
      message: 'Contribution recorded successfully'
    });

  } catch (error) {
    console.error('Error creating contribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create contribution',
      details: error.message
    });
  }
});

// GET /api/member-contributions/:id - Get specific contribution
router.get('/:id', async (req, res) => {
  try {
    const contribution = await MemberContribution.findById(req.params.id)
      .populate('memberId', 'firstName lastName email phone')
      .populate('transactionId', 'amount paymentMethod reference date')
      .populate('verified.verifiedBy', 'name role');

    if (!contribution) {
      return res.status(404).json({
        success: false,
        error: 'Contribution not found'
      });
    }

    res.json({
      success: true,
      contribution
    });

  } catch (error) {
    console.error('Error fetching contribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contribution',
      details: error.message
    });
  }
});

// PUT /api/member-contributions/:id - Update contribution
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    delete updates._id; // Prevent ID modification

    const contribution = await MemberContribution.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('memberId', 'firstName lastName email phone');

    if (!contribution) {
      return res.status(404).json({
        success: false,
        error: 'Contribution not found'
      });
    }

    res.json({
      success: true,
      contribution,
      message: 'Contribution updated successfully'
    });

  } catch (error) {
    console.error('Error updating contribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update contribution',
      details: error.message
    });
  }
});

// POST /api/member-contributions/:id/verify - Verify contribution
router.post('/:id/verify', async (req, res) => {
  try {
    const { verificationNotes } = req.body;

    const contribution = await MemberContribution.findByIdAndUpdate(
      req.params.id,
      {
        'verified.isVerified': true,
        'verified.verifiedBy': req.user.id,
        'verified.verifiedAt': new Date(),
        'verified.verificationNotes': verificationNotes
      },
      { new: true }
    ).populate('memberId', 'firstName lastName email phone')
     .populate('verified.verifiedBy', 'name role');

    if (!contribution) {
      return res.status(404).json({
        success: false,
        error: 'Contribution not found'
      });
    }

    res.json({
      success: true,
      contribution,
      message: 'Contribution verified successfully'
    });

  } catch (error) {
    console.error('Error verifying contribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify contribution',
      details: error.message
    });
  }
});

// GET /api/member-contributions/member/:memberId - Get contributions by member
router.get('/member/:memberId', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const contributions = await MemberContribution.getByMember(
      req.params.memberId,
      startDate,
      endDate
    ).populate('transactionId', 'amount paymentMethod reference');

    res.json({
      success: true,
      contributions
    });

  } catch (error) {
    console.error('Error fetching member contributions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch member contributions',
      details: error.message
    });
  }
});

// GET /api/member-contributions/summary - Get contribution summary
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const summary = await MemberContribution.getSummary(startDate, endDate);

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary',
      details: error.message
    });
  }
});

// DELETE /api/member-contributions/:id - Delete contribution
router.delete('/:id', async (req, res) => {
  try {
    const contribution = await MemberContribution.findById(req.params.id);
    
    if (!contribution) {
      return res.status(404).json({
        success: false,
        error: 'Contribution not found'
      });
    }

    // If linked to a transaction, optionally delete it too
    if (contribution.transactionId && req.query.deleteTransaction === 'true') {
      await Transaction.findByIdAndDelete(contribution.transactionId);
    }

    await MemberContribution.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Contribution deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting contribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete contribution',
      details: error.message
    });
  }
});

module.exports = router;