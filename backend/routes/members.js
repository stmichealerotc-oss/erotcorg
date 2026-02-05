const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const Transaction = require('../models/Transaction');
const QRCodeGenerator = require('../utils/qrCodeGenerator');
const { authenticateToken, authorizeRoles, committeeOnly, readOnlyAccess, writeAccess } = require('../middleware/auth');

// Public registration endpoint (no authentication required)
router.post('/register', async (req, res) => {
  try {
    console.log('📝 Public member registration request:', req.body);
    
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      dob,
      emergencyContactName,
      emergencyContactPhone,
      notes,
      declaration
    } = req.body;
    
    // Force pending status for all public registrations (ignore any status sent from frontend)
    const status = 'pending';

    // Validate required fields
    if (!firstName) {
      return res.status(400).json({ 
        success: false, 
        error: 'First name is required' 
      });
    }

    if (!lastName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Last name is required' 
      });
    }

    if (!declaration) {
      return res.status(400).json({ 
        success: false, 
        error: 'You must agree to the declaration to complete registration' 
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingMember = await Member.findOne({ email });
      if (existingMember) {
        return res.status(400).json({ 
          success: false, 
          error: 'A member with this email already exists' 
        });
      }
    }

    // Generate update token
    const crypto = require('crypto');
    const updateToken = crypto.randomBytes(32).toString('hex');
    const updateTokenExpiry = new Date();
    updateTokenExpiry.setFullYear(updateTokenExpiry.getFullYear() + 1); // Token valid for 1 year

    // Create new member with pending status for verification
    const newMember = new Member({
      firstName,
      lastName,
      email,
      phone,
      address,
      dob: dob ? new Date(dob) : undefined,
      status: 'pending', // All public registrations start as pending
      verificationStatus: 'pending', // Needs verification by church staff
      emergencyContactName,
      emergencyContactPhone,
      notes,
      joinDate: new Date(),
      updateToken,
      updateTokenExpiry
    });

    const savedMember = await newMember.save();
    console.log('✅ New member registration (pending verification):', savedMember.displayId);
    
    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully! Your application is now in our verification queue.',
      member: {
        id: savedMember._id,
        displayId: savedMember.displayId,
        firstName: savedMember.firstName,
        lastName: savedMember.lastName,
        email: savedMember.email,
        status: 'pending',
        verificationStatus: 'pending'
      },
      nextSteps: {
        message: 'Thank you for your interest in joining Saint Michael Eritrean Orthodox Tewahedo Church!',
        process: [
          'Your application has been received and is being reviewed',
          'A church representative will contact you within 3-5 business days',
          'We will verify your information and discuss membership requirements',
          'Once approved, you will receive your official membership confirmation'
        ],
        contact: 'If you have questions, please contact us at stmichaelerotc@gmail.com'
      }
    });

  } catch (error) {
    console.error('❌ Member registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Registration failed. Please try again.' 
    });
  }
});

// Handle preflight requests for member update endpoints
router.options('/update/:token', (req, res) => {
  console.log('✈️ Preflight request for member update token:', req.params.token);
  console.log('🌐 Preflight origin:', req.headers.origin);
  res.status(200).end();
});

// Get member details by update token (no authentication required)
router.get('/update/:token', async (req, res) => {
  try {
    console.log('🔍 Member update token request:', req.params.token);
    console.log('🌐 Request origin:', req.headers.origin);
    
    const { token } = req.params;
    
    const member = await Member.findOne({ 
      updateToken: token,
      updateTokenExpiry: { $gt: new Date() }
    });
    
    if (!member) {
      return res.status(404).json({ 
        success: false, 
        error: 'Invalid or expired update link' 
      });
    }
    
    // Check if token has already been used
    if (member.updateTokenUsed) {
      return res.status(410).json({ 
        success: false, 
        error: 'This update link has already been used. Please contact us for a new link if you need to make additional changes.',
        code: 'TOKEN_ALREADY_USED',
        usedAt: member.updateTokenUsedAt
      });
    }
    
    res.json({
      success: true,
      member: {
        id: member._id,
        displayId: member.displayId,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        address: member.address,
        dob: member.dob,
        joinDate: member.joinDate,
        status: member.status,
        emergencyContactName: member.emergencyContactName,
        emergencyContactPhone: member.emergencyContactPhone,
        notes: member.notes
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching member for update:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load member details' 
    });
  }
});

// Update member details by token (no authentication required)
router.put('/update/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const updateData = req.body;
    
    const member = await Member.findOne({ 
      updateToken: token,
      updateTokenExpiry: { $gt: new Date() }
    });
    
    if (!member) {
      return res.status(404).json({ 
        success: false, 
        error: 'Invalid or expired update link' 
      });
    }
    
    // Check if token has already been used
    if (member.updateTokenUsed) {
      return res.status(410).json({ 
        success: false, 
        error: 'This update link has already been used. Please contact us for a new link if you need to make additional changes.',
        code: 'TOKEN_ALREADY_USED',
        usedAt: member.updateTokenUsedAt
      });
    }
    
    // Validate update declaration
    if (!updateData.updateDeclaration) {
      return res.status(400).json({ 
        success: false, 
        error: 'You must confirm the accuracy of your updated information to proceed' 
      });
    }
    
    // Check if email is being changed and if it already exists
    if (updateData.email && updateData.email !== member.email) {
      const existingMember = await Member.findOne({ 
        email: updateData.email,
        _id: { $ne: member._id }
      });
      if (existingMember) {
        return res.status(400).json({ 
          success: false, 
          error: 'A member with this email already exists' 
        });
      }
    }
    
    // Update allowed fields
    const allowedFields = [
      'firstName', 'lastName', 'email', 'phone', 'address', 'dob', 'status',
      'emergencyContactName', 'emergencyContactPhone', 'notes'
    ];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'dob' && updateData[field]) {
          member[field] = new Date(updateData[field]);
        } else {
          member[field] = updateData[field];
        }
      }
    });
    
    // Mark token as used
    member.updateTokenUsed = true;
    member.updateTokenUsedAt = new Date();
    member.lastUpdated = new Date();
    
    const updatedMember = await member.save();
    console.log('✅ Member updated via token:', updatedMember.displayId);
    console.log('🔒 Token marked as used:', token);
    
    res.json({
      success: true,
      message: 'Member details updated successfully',
      member: {
        displayId: updatedMember.displayId,
        firstName: updatedMember.firstName,
        lastName: updatedMember.lastName,
        email: updatedMember.email
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating member:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update member details' 
    });
  }
});

// Generate new update token for existing member (admin only)
router.post('/:id/generate-update-token', authenticateToken, writeAccess, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({ 
        success: false, 
        error: 'Member not found' 
      });
    }
    
    const crypto = require('crypto');
    const updateToken = crypto.randomBytes(32).toString('hex');
    const updateTokenExpiry = new Date();
    updateTokenExpiry.setFullYear(updateTokenExpiry.getFullYear() + 1); // Token valid for 1 year
    
    member.updateToken = updateToken;
    member.updateTokenExpiry = updateTokenExpiry;
    
    await member.save();
    
    const updateLink = `${process.env.CHURCH_WEBSITE_URL || process.env.FRONTEND_URL || 'https://erotc.org'}/member-update.html?token=${updateToken}`;
    
    res.json({
      success: true,
      updateToken,
      updateLink,
      message: 'Update token generated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error generating update token:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate update token' 
    });
  }
});

// Apply authentication to all other member routes
router.use(authenticateToken);

// Read-only routes (visitors can access)
router.get('/search/:query', readOnlyAccess, async (req, res) => {
  try {
    const query = req.params.query.trim();
    console.log(`🔍 Searching for: "${query}"`);
    
    const members = await Member.searchMembers(query);
    
    // Calculate contributions for each member
    const membersWithContributions = await Promise.all(
      members.map(async (member) => {
        const memberTransactions = await Transaction.find({
          'payee.memberId': member._id,
          type: 'income'
        });
        
        const totalContributions = memberTransactions.reduce((sum, transaction) => {
          return sum + (transaction.amount || 0);
        }, 0);

        return {
          ...member.toObject(),
          displayId: member.displayId, // Add virtual field
          memberNumber: member.memberNumber, // Add virtual field
          totalContributions: totalContributions
        };
      })
    );
    
    console.log(`✅ Found ${members.length} members matching "${query}"`);
    
    res.json({
      query: query,
      count: members.length,
      members: membersWithContributions
    });
    
  } catch (err) {
    console.error('Error searching members:', err);
    res.status(500).json({ error: 'Failed to search members' });
  }
});

router.get('/', readOnlyAccess, async (req, res) => {
  try {
    // Development bypass - return mock data
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
      console.log('🔓 DEVELOPMENT: Returning mock members data');
      return res.json({
        success: true,
        list: [],
        total: 0,
        active: 0,
        inactive: 0,
        summary: {
          totalMembers: 0,
          activeMembers: 0,
          inactiveMembers: 0
        }
      });
    }
    
    const members = await Member.find();
    const total = members.length;
    const active = members.filter(m => m.status === 'active').length;
    const inactive = total - active;

    // Calculate contributions for each member
    const membersWithContributions = await Promise.all(
      members.map(async (member) => {
        try {
          // Get all transactions where this member is the payee
          const memberTransactions = await Transaction.find({
            'payee.memberId': member._id,
            type: 'income'
          });
          
          const totalContributions = memberTransactions.reduce((sum, transaction) => {
            return sum + (transaction.amount || 0);
          }, 0);

          return {
            ...member.toObject(),
            totalContributions: totalContributions
          };
        } catch (error) {
          console.error(`Error calculating contributions for member ${member._id}:`, error);
          return {
            ...member.toObject(),
            totalContributions: 0
          };
        }
      })
    );

    // Calculate total contributions across all members
    const totalContributions = membersWithContributions.reduce((sum, member) => {
      return sum + (member.totalContributions || 0);
    }, 0);

    res.json({
      total,
      active,
      inactive,
      totalContributions, // Add this to the response
      list: membersWithContributions
    });
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// ======================
// 🔍 MEMBER VERIFICATION MANAGEMENT ENDPOINTS
// ======================

// Get all pending members for verification
router.get('/pending', authenticateToken, readOnlyAccess, async (req, res) => {
  try {
    // Development bypass - return mock data
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
      console.log('🔓 DEVELOPMENT: Returning mock pending members data');
      return res.json({
        success: true,
        count: 0,
        members: []
      });
    }
    
    console.log('📋 Fetching pending members for verification');
    
    const pendingMembers = await Member.find({ 
      verificationStatus: { $in: ['pending', 'contacted'] }
    }).sort({ _id: -1 }) // Use _id instead of createdAt;
    
    const membersWithDetails = pendingMembers.map(member => ({
      ...member.toObject(),
      displayId: member.displayId,
      memberNumber: member.memberNumber,
      daysSinceRegistration: Math.floor((new Date() - member.createdAt) / (1000 * 60 * 60 * 24))
    }));
    
    res.json({
      success: true,
      count: pendingMembers.length,
      members: membersWithDetails
    });
    
  } catch (error) {
    console.error('❌ Error fetching pending members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending members'
    });
  }
});

// 🔹 Get single member by ID (supports MongoDB _id and display ID)
router.get('/:id', readOnlyAccess, async (req, res) => {
  try {
    console.log(`🔍 Looking up member: ${req.params.id}`);
    
    const member = await Member.findByAnyId(req.params.id);
    if (!member) {
      console.log(`❌ Member not found: ${req.params.id}`);
      return res.status(404).json({ message: 'Member not found' });
    }
    
    console.log(`✅ Found member: ${member.displayId} - ${member.fullName}`);
    
    // Calculate contributions for this specific member
    const memberTransactions = await Transaction.find({
      'payee.memberId': member._id,
      type: 'income'
    });
    
    const totalContributions = memberTransactions.reduce((sum, transaction) => {
      return sum + (transaction.amount || 0);
    }, 0);

    res.json({
      ...member.toObject(),
      displayId: member.displayId, // Add virtual field
      memberNumber: member.memberNumber, // Add virtual field
      totalContributions: totalContributions
    });
  } catch (err) {
    console.error('Error fetching member:', err);
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Get member transactions (UPDATED for new payee structure)
router.get('/:id/transactions', readOnlyAccess, async (req, res) => {
  try {
    const transactions = await Transaction.find({ 
      'payee.memberId': req.params.id 
    }).sort({ _id: -1 }); // Use _id instead of date for Cosmos DB
    
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching member transactions:', err);
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Get member activity (contributions + other transactions)
router.get('/:id/activity', readOnlyAccess, async (req, res) => {
  try {
    const { dateFrom, dateTo, category } = req.query;
    
    let query = {
      'payee.memberId': req.params.id
    };
    
    // Add filters
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) {
        // End of the day for dateTo (23:59:59.999)
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query.date.$lte = endOfDay;
      }
    }
    
    if (category) {
      query.category = category;
    }
    
    const activity = await Transaction.find(query).sort({ _id: -1 }); // Use _id instead of date
    
    // Calculate total contributions
    const totalContributions = activity
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    res.json({
      transactions: activity,
      totalContributions,
      transactionCount: activity.length
    });
  } catch (error) {
    console.error('Error fetching member activity:', error);
    res.status(500).json({ error: 'Failed to fetch member activity' });
  }
});

// Helper function for Member ID generation (now handled by model)
// Keeping for backward compatibility
function generateMemberId() {
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.floor(Math.random() * 90 + 10);
    return parseInt(timestamp + random).toString().substring(0, 5);
}

// POST /members - Create new member (uses MongoDB _id)
router.post('/', writeAccess, async (req, res) => {
  try {
    console.log('📝 Creating new member - Raw request body:', JSON.stringify(req.body, null, 2));
    
    // Clean the request body (remove any id-related fields that shouldn't be there)
    const memberData = { ...req.body };
    delete memberData.id; // Remove any id field that might have been sent
    delete memberData._id; // Remove any _id field
    delete memberData.memberId; // Remove any memberId field
    
    console.log('📝 Cleaned member data:', JSON.stringify(memberData, null, 2));
    
    // Create new member (MongoDB will auto-generate _id)
    const newMember = new Member(memberData);
    const saved = await newMember.save();
    
    console.log(`✅ Member created with ID: ${saved.displayId} (MongoDB _id: ${saved._id})`);
    
    res.status(201).json({ 
      success: true, 
      member: {
        ...saved.toObject(),
        displayId: saved.displayId,
        memberNumber: saved.memberNumber
      },
      message: `Member created successfully with ID: ${saved.displayId}`
    });
    
  } catch (err) {
    console.error('❌ Error creating member:', err);
    
    if (err.code === 11000) {
      // Duplicate key error
      const field = Object.keys(err.keyPattern)[0];
      console.log('🔍 Duplicate key error details:', {
        field: field,
        keyPattern: err.keyPattern,
        keyValue: err.keyValue
      });
      res.status(400).json({ 
        error: `A member with this ${field} already exists`,
        field: field
      });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
});

// 🔹 Get member statistics
router.get('/system/stats', readOnlyAccess, async (req, res) => {
  try {
    const totalMembers = await Member.countDocuments();
    const activeMembers = await Member.countDocuments({ status: 'active' });
    const inactiveMembers = totalMembers - activeMembers;
    
    // Get recent members (last 10)
    const recentMembers = await Member.find()
      .sort({ _id: -1 }) // Use _id instead of createdAt
      .limit(10)
      .select('firstName lastName createdAt');
    
    // Add display IDs to recent members
    const recentMembersWithIds = recentMembers.map(member => ({
      ...member.toObject(),
      displayId: member.displayId,
      memberNumber: member.memberNumber
    }));
    
    res.json({
      totalMembers,
      activeMembers,
      inactiveMembers,
      recentMembers: recentMembersWithIds
    });
    
  } catch (err) {
    console.error('Error getting member statistics:', err);
    res.status(500).json({ error: 'Failed to get member statistics' });
  }
});
// 🔹 Update a member by ID (supports MongoDB _id and display ID)
router.put('/:id', writeAccess, async (req, res) => {
  try {
    console.log(`📝 Updating member: ${req.params.id}`);
    console.log('📝 Update data received:', JSON.stringify(req.body, null, 2));
    
    const member = await Member.findByAnyId(req.params.id);
    if (!member) {
      console.log('❌ Member not found:', req.params.id);
      return res.status(404).json({ error: 'Member not found' });
    }
    
    console.log('✅ Found member to update:', member.displayId, member.fullName);
    
    // Remove fields that should not be updated
    const updateData = { ...req.body };
    delete updateData._id;       // Don't update MongoDB _id
    delete updateData.memberId;  // Don't update any memberId field
    
    console.log('📝 Cleaned update data:', JSON.stringify(updateData, null, 2));
    
    // Update member data
    Object.assign(member, updateData);
    console.log('📝 Member data after assignment:', JSON.stringify(member.toObject(), null, 2));
    
    const updated = await member.save();
    
    console.log(`✅ Member updated successfully: ${updated.displayId} - ${updated.fullName}`);

    res.json({ 
      success: true, 
      member: {
        ...updated.toObject(),
        displayId: updated.displayId,
        memberNumber: updated.memberNumber
      },
      message: `Member ${updated.displayId} updated successfully`
    });
  } catch (err) {
    console.error('❌ Error updating member - Full error:', err);
    console.error('❌ Error stack:', err.stack);
    
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      console.log('🔍 Duplicate key error on update:', {
        field: field,
        keyPattern: err.keyPattern,
        keyValue: err.keyValue
      });
      res.status(400).json({ 
        error: `A member with this ${field} already exists`,
        field: field
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to update member',
        details: err.message 
      });
    }
  }
});

// 🔹 Delete a member by ID (supports MongoDB _id and display ID)
router.delete('/:id', writeAccess, async (req, res) => {
  try {
    console.log(`🗑️ Deleting member: ${req.params.id}`);
    
    const member = await Member.findByAnyId(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const displayId = member.displayId;
    const memberName = member.fullName;
    
    await Member.findByIdAndDelete(member._id);
    
    console.log(`✅ Member deleted: ${displayId} - ${memberName}`);

    res.json({ 
      success: true,
      message: `Member ${displayId} (${memberName}) deleted successfully`
    });
  } catch (err) {
    console.error('Error deleting member:', err);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

// Send Welcome Email Endpoint
router.post('/send-welcome-email/:id', writeAccess, async (req, res) => {
  try {
    const memberId = req.params.id;
    
    // Find member
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (!member.email) {
      return res.status(400).json({ error: 'Member does not have an email address' });
    }

    // Import email service
    const emailService = require('../utils/emailService');

    // Create welcome email HTML
    const welcomeHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Welcome to St Michael Eritrean Orthodox Church</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #4a6fa5; padding-bottom: 20px; margin-bottom: 30px; }
          .church-name { font-size: 24px; font-weight: bold; color: #4a6fa5; margin-bottom: 10px; }
          .church-address { color: #666; font-size: 14px; }
          .welcome-title { font-size: 22px; font-weight: bold; text-align: center; margin: 30px 0; color: #2c3e50; }
          .content { background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 20px 0; }
          .member-info { background: #e8f4fd; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666; }
          .contact-info { background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="church-name">St Michael Eritrean Orthodox Church</div>
          <div class="church-address">
            60 Osborne Street, Joondanna, WA 6060<br>
            ABN: 80798549161 | stmichaelerotc@gmail.com | erotc.org
          </div>
        </div>

        <div class="welcome-title">Welcome to Our Church Family!</div>

        <div class="content">
          <p>Dear ${member.firstName} ${member.lastName},</p>
          
          <p>We are delighted to welcome you as a member of St Michael Eritrean Orthodox Church! Your membership is now active in our system, and we're excited to have you as part of our growing church family.</p>
          
          <div class="member-info">
            <h3 style="margin-top: 0; color: #4a6fa5;">Your Membership Information</h3>
            <div class="info-row">
              <span><strong>Member ID:</strong></span>
              <span>${member.displayId}</span>
            </div>
            <div class="info-row">
              <span><strong>Full Name:</strong></span>
              <span>${member.firstName} ${member.lastName}</span>
            </div>
            <div class="info-row">
              <span><strong>Email:</strong></span>
              <span>${member.email}</span>
            </div>
            ${member.phone ? `
            <div class="info-row">
              <span><strong>Phone:</strong></span>
              <span>${member.phone}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span><strong>Membership Date:</strong></span>
              <span>${new Date(member.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <h3 style="color: #4a6fa5;">What's Next?</h3>
          <ul>
            <li><strong>Sunday Services:</strong> Join us every Sunday for worship and fellowship</li>
            <li><strong>Community Events:</strong> Participate in our various church activities and celebrations</li>
            <li><strong>Contributions:</strong> Support our church through tithes, offerings, and donations</li>
            <li><strong>Stay Connected:</strong> Follow our announcements and updates</li>
          </ul>

          <div class="contact-info">
            <h4 style="margin-top: 0; color: #856404;">Need Help or Have Questions?</h4>
            <p style="margin-bottom: 0;">Please don't hesitate to contact us at <strong>stmichaelerotc@gmail.com</strong> or visit us during our office hours. Our church community is here to support you on your spiritual journey.</p>
          </div>
        </div>

        <div class="footer">
          <p><strong>Blessings and Peace,</strong></p>
          <p><strong>St Michael Eritrean Orthodox Church</strong></p>
          <p>60 Osborne Street, Joondanna, WA 6060</p>
          <p>Phone: [Church Phone] | Email: stmichaelerotc@gmail.com</p>
          <p>Website: erotc.org</p>
        </div>
      </body>
      </html>
    `;

    // Send welcome email
    await emailService.sendEmail({
      to: member.email,
      subject: `Welcome to St Michael Eritrean Orthodox Church - ${member.firstName}!`,
      html: welcomeHTML
    });

    console.log(`✅ Welcome email sent to ${member.firstName} ${member.lastName} at ${member.email}`);

    res.json({ 
      success: true, 
      message: `Welcome email sent successfully to ${member.email}` 
    });

  } catch (error) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({ 
      error: 'Failed to send welcome email',
      details: error.message 
    });
  }
});

// ======================
// 🔲 QR CODE GENERATION ENDPOINTS
// ======================

// GET generate QR code for a member
router.get('/:id/qr-code', readOnlyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { size, format } = req.query;

    console.log(`🔲 Generating QR code for member: ${id}`);

    const member = await Member.findById(id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Generate QR code with optional size parameter
    const qrCodeOptions = {};
    if (size) qrCodeOptions.size = parseInt(size);
    if (format) qrCodeOptions.type = format;

    const qrCodeDataURL = await QRCodeGenerator.generateMemberQRCode(member, qrCodeOptions);

    console.log(`✅ QR code generated for member: ${member.firstName} ${member.lastName}`);

    res.json({
      success: true,
      member: {
        id: member._id,
        name: `${member.firstName} ${member.lastName}`,
        membershipNumber: member.membershipNumber || member._id.toString().substring(18)
      },
      qrCode: qrCodeDataURL,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error generating member QR code:', error);
    res.status(500).json({ 
      error: 'Failed to generate QR code',
      details: error.message 
    });
  }
});

// GET generate member card QR code (simplified format)
router.get('/:id/member-card-qr', readOnlyAccess, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔲 QR CODE ROUTE CALLED: Generating member card QR code for: ${id}`);
    console.log(`🔍 Request URL: ${req.originalUrl}`);
    console.log(`🔍 Request method: ${req.method}`);

    const member = await Member.findById(id);
    if (!member) {
      console.log(`❌ Member not found: ${id}`);
      return res.status(404).json({ error: 'Member not found' });
    }

    console.log(`✅ Member found: ${member.firstName} ${member.lastName}`);

    const qrCodeDataURL = await QRCodeGenerator.generateMemberCardQRCode(member);

    console.log(`✅ Member card QR code generated for: ${member.firstName} ${member.lastName}`);

    res.json({
      success: true,
      member: {
        id: member._id,
        name: `${member.firstName} ${member.lastName}`,
        membershipNumber: member.membershipNumber || member._id.toString().substring(18)
      },
      qrCode: qrCodeDataURL,
      type: 'member-card',
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error generating member card QR code:', error);
    res.status(500).json({ 
      error: 'Failed to generate member card QR code',
      details: error.message 
    });
  }
});

// POST parse QR code data
router.post('/parse-qr', readOnlyAccess, async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ error: 'QR data is required' });
    }

    console.log('🔍 Parsing QR code data...');

    const parsedData = QRCodeGenerator.parseQRCodeData(qrData);

    // If it's member data, fetch additional member info
    if (parsedData.id) {
      const member = await Member.findById(parsedData.id);
      if (member) {
        parsedData.memberExists = true;
        parsedData.currentMemberData = {
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          phone: member.phone,
          membershipStatus: member.membershipStatus,
          lastUpdated: member.updatedAt
        };
      }
    }

    console.log('✅ QR code data parsed successfully');

    res.json({
      success: true,
      parsedData,
      parsedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error parsing QR code data:', error);
    res.status(500).json({ 
      error: 'Failed to parse QR code data',
      details: error.message 
    });
  }
});

// Update verification status
router.patch('/:id/verification', authenticateToken, writeAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      verificationStatus, 
      verificationNotes, 
      memberStatus 
    } = req.body;
    
    console.log(`📝 Updating verification for member: ${id}`);
    
    const member = await Member.findByAnyId(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }
    
    // Update verification fields
    if (verificationStatus) {
      member.verificationStatus = verificationStatus;
      
      // Set timestamps based on status
      const now = new Date();
      switch (verificationStatus) {
        case 'contacted':
          member.contactedAt = now;
          break;
        case 'verified':
          member.verifiedAt = now;
          member.verifiedBy = req.user.username || req.user.email;
          break;
        case 'approved':
          member.approvedAt = now;
          member.status = 'active'; // Activate the member
          break;
        case 'rejected':
          member.status = 'inactive';
          break;
      }
    }
    
    if (verificationNotes) {
      member.verificationNotes = verificationNotes;
    }
    
    if (memberStatus) {
      member.status = memberStatus;
    }
    
    member.lastUpdated = new Date();
    
    const updatedMember = await member.save();
    
    console.log(`✅ Verification updated for ${updatedMember.displayId}: ${verificationStatus}`);
    
    res.json({
      success: true,
      message: 'Verification status updated successfully',
      member: {
        displayId: updatedMember.displayId,
        firstName: updatedMember.firstName,
        lastName: updatedMember.lastName,
        status: updatedMember.status,
        verificationStatus: updatedMember.verificationStatus,
        verificationNotes: updatedMember.verificationNotes,
        verifiedBy: updatedMember.verifiedBy,
        verifiedAt: updatedMember.verifiedAt,
        contactedAt: updatedMember.contactedAt,
        approvedAt: updatedMember.approvedAt
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating verification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update verification status'
    });
  }
});

// Approve member (shortcut endpoint)
router.post('/:id/approve', authenticateToken, writeAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    console.log(`✅ Approving member: ${id}`);
    
    const member = await Member.findByAnyId(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }
    
    // Approve the member
    member.verificationStatus = 'approved';
    member.status = 'active';
    member.approvedAt = new Date();
    member.verifiedBy = req.user.username || req.user.email;
    member.lastUpdated = new Date();
    
    if (notes) {
      member.verificationNotes = notes;
    }
    
    const approvedMember = await member.save();
    
    console.log(`🎉 Member approved: ${approvedMember.displayId} - ${approvedMember.fullName}`);
    
    res.json({
      success: true,
      message: `Member ${approvedMember.displayId} approved successfully`,
      member: {
        displayId: approvedMember.displayId,
        firstName: approvedMember.firstName,
        lastName: approvedMember.lastName,
        status: approvedMember.status,
        verificationStatus: approvedMember.verificationStatus,
        approvedAt: approvedMember.approvedAt
      }
    });
    
  } catch (error) {
    console.error('❌ Error approving member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve member'
    });
  }
});

// Reject member (shortcut endpoint)
router.post('/:id/reject', authenticateToken, writeAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    console.log(`❌ Rejecting member: ${id}`);
    
    const member = await Member.findByAnyId(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }
    
    // Reject the member
    member.verificationStatus = 'rejected';
    member.status = 'inactive';
    member.verifiedBy = req.user.username || req.user.email;
    member.lastUpdated = new Date();
    
    if (reason) {
      member.verificationNotes = `Rejected: ${reason}`;
    }
    
    const rejectedMember = await member.save();
    
    console.log(`🚫 Member rejected: ${rejectedMember.displayId} - ${rejectedMember.fullName}`);
    
    res.json({
      success: true,
      message: `Member ${rejectedMember.displayId} rejected`,
      member: {
        displayId: rejectedMember.displayId,
        firstName: rejectedMember.firstName,
        lastName: rejectedMember.lastName,
        status: rejectedMember.status,
        verificationStatus: rejectedMember.verificationStatus,
        verificationNotes: rejectedMember.verificationNotes
      }
    });
    
  } catch (error) {
    console.error('❌ Error rejecting member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject member'
    });
  }
});

module.exports = router;