const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Member = require('../models/Member'); // ✅ ADD THIS LINE
const QRCodeGenerator = require('../utils/qrCodeGenerator');
const moment = require('moment');
const mongoose = require('mongoose');
const { authenticateToken, authorizeRoles, adminOnly, readOnlyAccess, writeAccess } = require('../middleware/auth');

// Apply authentication to all accounting routes
router.use(authenticateToken);

// Read-only routes (visitors can view)
router.get('/', readOnlyAccess, async (req, res) => {
  try {
    // Development bypass - return mock data
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
      console.log('🔓 DEVELOPMENT: Returning mock accounting data');
      return res.json({
        success: true,
        transactions: [],
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        summary: {
          totalTransactions: 0,
          totalIncome: 0,
          totalExpenses: 0,
          netBalance: 0
        }
      });
    }
    
    const { dateFrom, dateTo, category, type, startDate, endDate, sortBy, sortOrder, summary } = req.query;
    
    // Build query based on filters
    let query = {};
    
    // Date range filter - support both old and new parameter names
    const fromDate = dateFrom || startDate;
    const toDate = dateTo || endDate;
    
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) {
        // Start of the day for fromDate
        query.date.$gte = new Date(fromDate);
      }
      if (toDate) {
        // End of the day for toDate (23:59:59.999)
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.date.$lte = endOfDay;
      }
    }
    
    // Category filter
    if (category) {
      query.category = category;
    }
    
    // Type filter
    if (type) {
      query.type = type;
    }

    console.log('🔍 Fetching transactions with query:', query);

    // If summary is requested, return only summary data for bank statement
    if (summary === 'true') {
      const transactions = await Transaction.find(query);
      
      const totalIncome = transactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
        
      const totalExpenses = transactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
        
      const netBalance = totalIncome - totalExpenses;
      
      return res.json({
        summary: {
          totalIncome,
          totalExpenses,
          netBalance
        }
      });
    }

    // Get transactions with populated payee data
    // Use _id for sorting (always indexed in Cosmos DB)
    const transactions = await Transaction.find(query)
      .populate('payee.memberId', 'firstName lastName email phone')
      .sort({ _id: -1 }); // Sort by _id instead of dynamic fields

    console.log(`✅ Found ${transactions.length} real transactions`);

    // Calculate monthly trend for the last 12 months or all available data
    const monthlyTrend = [];
    
    if (transactions.length > 0) {
      // Get the date range from actual transactions
      const oldestTransaction = transactions[transactions.length - 1]; // Already sorted by date desc
      const newestTransaction = transactions[0];
      
      const startDate = moment(oldestTransaction.date).startOf('month');
      const endDate = moment(newestTransaction.date).endOf('month');
      
      let currentMonth = moment(startDate);
      
      while (currentMonth.isSameOrBefore(endDate, 'month')) {
        const monthName = currentMonth.format('MMM YYYY');
        const monthStart = currentMonth.clone().startOf('month').toDate();
        const monthEnd = currentMonth.clone().endOf('month').toDate();
        
        const monthTransactions = transactions.filter(tx => 
          moment(tx.date).isBetween(monthStart, monthEnd, null, '[]')
        );
        
        const income = monthTransactions
          .filter(tx => tx.type === 'income')
          .reduce((sum, tx) => sum + tx.amount, 0);
          
        const expenses = monthTransactions
          .filter(tx => tx.type === 'expense')
          .reduce((sum, tx) => sum + tx.amount, 0);
        
        monthlyTrend.push({
          month: monthName,
          income,
          expenses
        });
        
        currentMonth.add(1, 'month');
      }
    }

    // Calculate current month totals (January 2026)
    const currentMonthStart = moment().startOf('month').toDate();
    const currentMonthEnd = moment().endOf('month').toDate();
    
    const currentMonthTransactions = transactions.filter(tx => 
      moment(tx.date).isBetween(currentMonthStart, currentMonthEnd, null, '[]')
    );
    
    const currentMonthData = {
      income: currentMonthTransactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0),
      expenses: currentMonthTransactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0),
      net: 0
    };
    
    currentMonthData.net = currentMonthData.income - currentMonthData.expenses;

    // Calculate total contributions (all time)
    const totalContributions = transactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // ✅ FIXED: Return structured object with all transaction data
    const responseData = {
      transactions,        // Array of transactions
      monthlyTrend,        // Array of monthly data
      currentMonth: currentMonthData,  // Object with current month stats
      totalContributions   // Total all-time contributions
    };
    
    console.log('📤 Sending response with keys:', Object.keys(responseData));
    console.log('📤 Total transactions:', responseData.transactions.length);
    console.log('📤 Total contributions:', responseData.totalContributions);
    console.log('📤 Current month data:', responseData.currentMonth);
    
    res.json(responseData);
    
  } catch (err) {
    console.error('❌ Error fetching transactions:', err);
    res.status(500).json({ 
      error: 'Failed to fetch transactions',
      details: err.message 
    });
  }
});

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && new mongoose.Types.ObjectId(id).toString() === id;
};

// Write access routes (only admin, accountant, and super-admin)
router.post('/transaction', authorizeRoles('super-admin', 'admin', 'accountant'), async (req, res) => {
  try {
    console.log('Received transaction data:', req.body);
    
    const { type, amount, category, description, payee, paymentMethod, reference, notes } = req.body;
    
    // Enhanced validation
    if (!type || !amount || !category || !description) {
      return res.status(400).json({ error: 'Missing required fields: type, amount, category, description' });
    }
    
    // Handle payee data with proper Member verification
    let payeeData = {
      type: payee?.type || 'external',
      name: payee?.name || 'Unknown Payee',
      memberId: null,
      email: payee?.email,
      phone: payee?.phone
    };
    
    // Only set memberId if it's a valid ObjectId AND payee type is 'member'
    if (payee?.type === 'member' && payee.memberId && mongoose.Types.ObjectId.isValid(payee.memberId)) {
      try {
        const memberExists = await Member.findById(payee.memberId);
        if (memberExists) {
          payeeData.memberId = payee.memberId;
          // Use member's actual name to ensure consistency
          payeeData.name = `${memberExists.firstName} ${memberExists.lastName}`;
          console.log('✅ Valid member found:', payeeData.name);
        } else {
          console.log('❌ Member not found with ID:', payee.memberId);
          // Fallback to external if member doesn't exist
          payeeData.type = 'external';
          payeeData.memberId = null;
        }
      } catch (memberError) {
        console.log('❌ Error verifying member:', memberError.message);
        payeeData.type = 'external';
        payeeData.memberId = null;
      }
    } else if (payee?.type === 'member' && (!payee.memberId || !mongoose.Types.ObjectId.isValid(payee.memberId))) {
      console.log('❌ Invalid memberId provided for member type:', payee.memberId);
      payeeData.type = 'external';
      payeeData.memberId = null;
    }

    const transactionData = {
      type,
      amount: parseFloat(amount),
      category,
      description,
      payee: payeeData,
      paymentMethod: paymentMethod || 'cash',
      reference: reference || '',
      notes: notes || '',
      date: new Date() // Ensure date is set
    };

    console.log('✅ Creating transaction with validated data:', transactionData);

    const newTransaction = new Transaction(transactionData);
    await newTransaction.save();

    // Populate the member data if it's a member transaction
    if (payeeData.memberId) {
      await newTransaction.populate('payee.memberId', 'firstName lastName email');
    }

    res.status(201).json({ 
      success: true, 
      transaction: newTransaction 
    });
    
  } catch (err) {
    console.error('❌ Error creating transaction:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: Object.values(err.errors).map(e => e.message) 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to save transaction',
      details: err.message 
    });
  }
});
// Get single transaction
router.get('/transaction/:id', readOnlyAccess, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('payee.memberId', 'firstName lastName email');
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (err) {
    console.error('Error fetching transaction:', err);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// In backend/routes/accounting.js - IMPROVED PUT route
// In backend/routes/accounting.js - IMPROVED member handling
router.put('/transaction/:id', authorizeRoles('super-admin', 'admin', 'accountant'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    console.log('📝 Updating transaction:', id, updateData);

    // ✅ IMPROVED: Better payee handling
    if (updateData.payee) {
      let payeeData = {
        type: updateData.payee.type || 'external',
        name: updateData.payee.name || 'Unknown Payee',
        memberId: null,
        email: updateData.payee.email,
        phone: updateData.payee.phone
      };

      // Handle member payee type
      if (updateData.payee.type === 'member') {
        let memberId = updateData.payee.memberId;
        
        // ✅ FIXED: If no valid memberId, convert to external payee
        if (!memberId || memberId === '' || memberId === '[object Object]' || !mongoose.Types.ObjectId.isValid(memberId)) {
          console.log('❌ No valid memberId provided for member type, converting to external payee');
          payeeData.type = 'external';
          payeeData.memberId = null;
        } 
        else {
          // Valid memberId - verify member exists
          const memberExists = await Member.findById(memberId);
          if (memberExists) {
            payeeData.memberId = memberId;
            payeeData.name = `${memberExists.firstName} ${memberExists.lastName}`.trim();
            payeeData.email = memberExists.email || payeeData.email;
            payeeData.phone = memberExists.phone || payeeData.phone;
            console.log('✅ Valid member found for update:', payeeData.name);
          } else {
            console.log('❌ Member not found, converting to external payee');
            payeeData.type = 'external';
            payeeData.memberId = null;
          }
        }
      }

      updateData.payee = payeeData;
    }

    // Update transaction
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('payee.memberId', 'firstName lastName email');

    if (!updatedTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    console.log('✅ Transaction updated successfully');
    res.json({ success: true, transaction: updatedTransaction });
  } catch (err) {
    console.error('❌ Error updating transaction:', err);
    res.status(500).json({
      error: 'Failed to update transaction',
      details: err.message
    });
  }
});

// Delete transaction
router.delete('/transaction/:id', authorizeRoles('super-admin', 'admin', 'accountant'), async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    console.error('Error deleting transaction:', err);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Get transactions for a specific member
router.get('/member/:memberId', readOnlyAccess, async (req, res) => {
  try {
    const { dateFrom, dateTo, category } = req.query;
    
    let query = {
      'payee.memberId': req.params.memberId
    };
    
    // Add date filters
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
    
    // Add category filter
    if (category) {
      query.category = category;
    }
    
    const transactions = await Transaction.find(query)
      .sort({ _id: -1 }); // Use _id instead of date for Cosmos DB compatibility
    
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching member transactions:', err);
    res.status(500).json({ error: 'Failed to fetch member transactions' });
  }
});

// Test endpoint for debugging
router.get('/test-email-endpoint', readOnlyAccess, (req, res) => {
  res.json({ 
    success: true, 
    message: 'Email endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Send Receipt Email Endpoint (mobile app compatible - auto-detects recipient)
router.post('/send-receipt/:transactionId', authorizeRoles('super-admin', 'admin', 'accountant'), async (req, res) => {
  console.log('📧 Send receipt endpoint called (mobile) with:', req.params.transactionId);
  
  try {
    const { transactionId } = req.params;

    // Validate transaction ID
    if (!isValidObjectId(transactionId)) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    // Get transaction with populated payee data
    const transaction = await Transaction.findById(transactionId)
      .populate('payee.memberId', 'firstName lastName email phone address');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.type !== 'income') {
      return res.status(400).json({ error: 'Email receipts can only be sent for income transactions' });
    }

    // Auto-detect recipient email and name from transaction
    let recipientEmail = null;
    let recipientName = 'Valued Donor';

    if (transaction.payee) {
      if (transaction.payee.type === 'member' && transaction.payee.memberId) {
        const member = transaction.payee.memberId;
        if (typeof member === 'object') {
          recipientEmail = member.email;
          recipientName = `${member.firstName} ${member.lastName}`;
        }
      } else if (transaction.payee.type === 'external') {
        recipientEmail = transaction.payee.email;
        recipientName = transaction.payee.name || 'Valued Donor';
      }
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipientEmail || !emailRegex.test(recipientEmail)) {
      return res.status(400).json({ error: 'No valid email address found for this transaction' });
    }

    // Get signature information
    let signatureInfo = null;
    try {
      const signatureResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:5000'}/api/signatures/${transactionId}`, {
        headers: { 'Authorization': req.headers.authorization }
      });
      if (signatureResponse.ok) {
        signatureInfo = await signatureResponse.json();
      }
    } catch (error) {
      console.log('No signature found for transaction');
    }

    // Import services
    const emailService = require('../utils/emailService');
    const pdfGenerator = require('../utils/pdfGenerator');

    // Generate PDF receipt
    const pdfBuffer = await pdfGenerator.generateReceiptPDF(transaction, signatureInfo);

    // Create simple email HTML (PDF is the main receipt)
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Donation Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #4a6fa5; padding-bottom: 20px; margin-bottom: 30px; }
          .church-name { font-size: 24px; font-weight: bold; color: #4a6fa5; margin-bottom: 10px; }
          .content { background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="church-name">St Michael Eritrean Orthodox Church</div>
          <p>60 Osborne Street, Joondanna, WA 6060<br>
          ABN: 80798549161 | stmichaelerotc@gmail.com | erotc.org</p>
        </div>

        <div class="content">
          <p>Dear ${recipientName},</p>
          
          <p>Thank you for your generous contribution to St Michael Eritrean Orthodox Church!</p>
          
          <p><strong>Please find your official donation receipt attached as a PDF.</strong></p>
          
          <p>This receipt includes:</p>
          <ul>
            <li>Transaction details and amount</li>
            <li>Official church information</li>
            <li>Authorized signature (if applicable)</li>
            <li>Tax-deductible contribution notice</li>
          </ul>
          
          <p>If you have any questions about this receipt or your contribution, please don't hesitate to contact us.</p>
        </div>

        <div class="footer">
          <p><strong>Blessings and Peace,</strong></p>
          <p><strong>St Michael Eritrean Orthodox Church</strong></p>
          <p>stmichaelerotc@gmail.com | erotc.org</p>
        </div>
      </body>
      </html>
    `;

    // Send email with PDF attachment
    await emailService.sendEmail({
      to: recipientEmail,
      subject: `Donation Receipt - St Michael Eritrean Orthodox Church`,
      html: emailHTML,
      attachments: [
        {
          filename: `Receipt_${transaction._id.toString().substring(18)}_${new Date().toISOString().split('T')[0]}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    res.json({ 
      success: true, 
      message: `Receipt PDF sent successfully to ${recipientEmail}` 
    });

  } catch (error) {
    console.error('❌ Error sending receipt email:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to send receipt email',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Send Receipt Email Endpoint (web admin - requires explicit recipient)
router.post('/send-receipt-email/:transactionId', authorizeRoles('super-admin', 'admin', 'accountant'), async (req, res) => {
  console.log('📧 Email endpoint called with:', req.params.transactionId);
  console.log('📧 Request body:', req.body);
  
  try {
    const { transactionId } = req.params;
    const { recipientEmail, recipientName } = req.body;

    // Validate transaction ID
    if (!isValidObjectId(transactionId)) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipientEmail || !emailRegex.test(recipientEmail)) {
      return res.status(400).json({ error: 'Valid recipient email is required' });
    }

    // Get transaction with populated payee data
    const transaction = await Transaction.findById(transactionId)
      .populate('payee.memberId', 'firstName lastName email phone address');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.type !== 'income') {
      return res.status(400).json({ error: 'Email receipts can only be sent for income transactions' });
    }

    // Get signature information
    let signatureInfo = null;
    try {
      const signatureResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:5000'}/api/signatures/${transactionId}`, {
        headers: { 'Authorization': req.headers.authorization }
      });
      if (signatureResponse.ok) {
        signatureInfo = await signatureResponse.json();
      }
    } catch (error) {
      console.log('No signature found for transaction');
    }

    // Import services
    const emailService = require('../utils/emailService');
    const pdfGenerator = require('../utils/pdfGenerator');

    // Generate PDF receipt
    const pdfBuffer = await pdfGenerator.generateReceiptPDF(transaction, signatureInfo);

    // Get payee information
    let payeeName = recipientName || 'Valued Donor';
    
    if (transaction.payee) {
      if (transaction.payee.type === 'member' && transaction.payee.memberId) {
        const member = transaction.payee.memberId;
        if (typeof member === 'object') {
          payeeName = `${member.firstName} ${member.lastName}`;
        }
      } else {
        payeeName = transaction.payee.name || payeeName;
      }
    }

    // Create simple email HTML (PDF is the main receipt)
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Donation Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #4a6fa5; padding-bottom: 20px; margin-bottom: 30px; }
          .church-name { font-size: 24px; font-weight: bold; color: #4a6fa5; margin-bottom: 10px; }
          .content { background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="church-name">St Michael Eritrean Orthodox Church</div>
          <p>60 Osborne Street, Joondanna, WA 6060<br>
          ABN: 80798549161 | stmichaelerotc@gmail.com | erotc.org</p>
        </div>

        <div class="content">
          <p>Dear ${payeeName},</p>
          
          <p>Thank you for your generous contribution to St Michael Eritrean Orthodox Church!</p>
          
          <p><strong>Please find your official donation receipt attached as a PDF.</strong></p>
          
          <p>This receipt includes:</p>
          <ul>
            <li>Transaction details and amount</li>
            <li>Official church information</li>
            <li>Authorized signature (if applicable)</li>
            <li>Tax-deductible contribution notice</li>
          </ul>
          
          <p>If you have any questions about this receipt or your contribution, please don't hesitate to contact us.</p>
        </div>

        <div class="footer">
          <p><strong>Blessings and Peace,</strong></p>
          <p><strong>St Michael Eritrean Orthodox Church</strong></p>
          <p>stmichaelerotc@gmail.com | erotc.org</p>
        </div>
      </body>
      </html>
    `;

    // Send email with PDF attachment
    await emailService.sendEmail({
      to: recipientEmail,
      subject: `Donation Receipt - St Michael Eritrean Orthodox Church`,
      html: emailHTML,
      attachments: [
        {
          filename: `Receipt_${transaction._id.toString().substring(18)}_${new Date().toISOString().split('T')[0]}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    res.json({ 
      success: true, 
      message: `Receipt PDF sent successfully to ${recipientEmail}` 
    });

  } catch (error) {
    console.error('❌ Error sending receipt email:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to send receipt email',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Generate PDF Receipt Endpoint (for direct download)
router.get('/generate-pdf-receipt/:transactionId', readOnlyAccess, async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Validate transaction ID
    if (!isValidObjectId(transactionId)) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    // Get transaction with populated payee data
    const transaction = await Transaction.findById(transactionId)
      .populate('payee.memberId', 'firstName lastName email phone address');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.type !== 'income') {
      return res.status(400).json({ error: 'PDF receipts can only be generated for income transactions' });
    }

    // Get signature information
    let signatureInfo = null;
    try {
      const signatureResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:5000'}/api/signatures/${transactionId}`, {
        headers: { 'Authorization': req.headers.authorization }
      });
      if (signatureResponse.ok) {
        signatureInfo = await signatureResponse.json();
      }
    } catch (error) {
      console.log('No signature found for transaction');
    }

    // Generate PDF
    const pdfGenerator = require('../utils/pdfGenerator');
    const pdfBuffer = await pdfGenerator.generateReceiptPDF(transaction, signatureInfo);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Receipt_${transaction._id.toString().substring(18)}_${new Date().toISOString().split('T')[0]}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Error generating PDF receipt:', error);
    res.status(500).json({ 
      error: 'Failed to generate PDF receipt',
      details: error.message 
    });
  }
});

// ======================
// 🔲 QR CODE ENDPOINTS FOR RECEIPTS
// ======================

// GET generate QR code for a transaction receipt
router.get('/transactions/:id/qr-code', readOnlyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { size } = req.query;

    console.log(`🔲 Generating receipt QR code for transaction: ${id}`);

    const transaction = await Transaction.findById(id).populate('payee.memberId', 'firstName lastName email');
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Get member info if available
    let member = null;
    if (transaction.payee?.memberId) {
      member = transaction.payee.memberId;
    }

    // Generate QR code with optional size parameter
    const qrCodeOptions = {};
    if (size) qrCodeOptions.size = parseInt(size);

    const qrCodeDataURL = await QRCodeGenerator.generateReceiptQRCode(transaction, member);

    console.log(`✅ Receipt QR code generated for transaction: ${transaction.description}`);

    res.json({
      success: true,
      transaction: {
        id: transaction._id,
        description: transaction.description,
        amount: transaction.amount,
        date: transaction.date,
        type: transaction.type
      },
      member: member ? {
        id: member._id,
        name: `${member.firstName} ${member.lastName}`
      } : null,
      qrCode: qrCodeDataURL,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error generating receipt QR code:', error);
    res.status(500).json({ 
      error: 'Failed to generate receipt QR code',
      details: error.message 
    });
  }
});

module.exports = router;