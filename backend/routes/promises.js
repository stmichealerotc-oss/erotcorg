const express = require('express');
const router = express.Router();
const Promise = require('../models/Promise');
const Member = require('../models/Member');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');
const moment = require('moment');
const { authenticateToken, authorizeRoles, committeeOnly } = require('../middleware/auth');

function parseDateInput(value) {
  if (!value) return null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const isoMatch = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.exec(trimmed);
    if (isoMatch) {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    const dayFirstMatch = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(trimmed);
    if (dayFirstMatch) {
      const day = Number(dayFirstMatch[1]);
      const month = Number(dayFirstMatch[2]);
      const year = Number(dayFirstMatch[3]);

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const parsed = new Date(year, month - 1, day);
        if (!isNaN(parsed.getTime()) && parsed.getDate() === day && parsed.getMonth() === month - 1 && parsed.getFullYear() === year) {
          return parsed;
        }
      }
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function formatDateForInput(dateValue) {
  const parsed = parseDateInput(dateValue);
  if (!parsed) return '';
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

// Apply authentication to all promise routes
router.use(authenticateToken);

// Only committee members can access promises
router.use(committeeOnly);

// GET /api/promises - Get all promises with filters
router.get('/', async (req, res) => {
  try {
    const { status, category, memberId, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    
    let query = {};
    
    // Status filter
    if (status && status !== 'all') {
      if (status === 'overdue') {
        query.status = 'pending';
        query.dueDate = { $lt: new Date() };
      } else {
        query.status = status;
      }
    }
    
    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Member filter
    if (memberId && mongoose.Types.ObjectId.isValid(memberId)) {
      query.memberId = memberId;
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      query.dueDate = {};
      if (dateFrom) {
        const parsedFrom = parseDateInput(dateFrom);
        if (!parsedFrom) {
          return res.status(400).json({ error: 'Invalid dateFrom. Use DD/MM/YYYY or YYYY-MM-DD.' });
        }
        query.dueDate.$gte = parsedFrom;
      }
      if (dateTo) {
        const parsedTo = parseDateInput(dateTo);
        if (!parsedTo) {
          return res.status(400).json({ error: 'Invalid dateTo. Use DD/MM/YYYY or YYYY-MM-DD.' });
        }
        const endOfDay = new Date(parsedTo);
        endOfDay.setHours(23, 59, 59, 999);
        query.dueDate.$lte = endOfDay;
      }
    }
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { dueDate: 1, createdAt: -1 },
      populate: 'memberId'
    };
    
    const promises = await Promise.find(query)
      .populate('memberId', 'firstName lastName email phone')
      .sort({ _id: -1 }) // Use _id instead of dynamic sort
      .limit(options.limit * options.page)
      .skip((options.page - 1) * options.limit);
    
    // Get totals for stats
    const totalCount = await Promise.countDocuments(query);
    const pendingAmount = await Promise.aggregate([
      { $match: { ...query, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const fulfilledAmount = await Promise.aggregate([
      { $match: { ...query, status: 'fulfilled' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const overdueCount = await Promise.countDocuments({
      status: 'pending',
      dueDate: { $lt: new Date() }
    });
    
    res.json({
      promises,
      stats: {
        total: totalCount,
        pendingAmount: pendingAmount[0]?.total || 0,
        fulfilledAmount: fulfilledAmount[0]?.total || 0,
        overdueCount
      },
      pagination: {
        page: options.page,
        limit: options.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / options.limit)
      }
    });
    
  } catch (err) {
    console.error('Error fetching promises:', err);
    res.status(500).json({ 
      error: 'Failed to fetch promises',
      details: err.message 
    });
  }
});

// GET /api/promises/stats - Get promise statistics
router.get('/stats', async (req, res) => {
  try {
    const { period = 'month' } = req.query; // month, quarter, year
    
    let startDate;
    const endDate = new Date();
    
    switch (period) {
      case 'month':
        startDate = moment().startOf('month').toDate();
        break;
      case 'quarter':
        startDate = moment().startOf('quarter').toDate();
        break;
      case 'year':
        startDate = moment().startOf('year').toDate();
        break;
      default:
        startDate = moment().startOf('month').toDate();
    }
    
    const stats = await Promise.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    const overdueCount = await Promise.countDocuments({
      status: 'pending',
      dueDate: { $lt: new Date() },
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    res.json({
      period,
      startDate,
      endDate,
      stats,
      overdueCount
    });
    
  } catch (err) {
    console.error('Error fetching promise stats:', err);
    res.status(500).json({ error: 'Failed to fetch promise statistics' });
  }
});

// POST /api/promises - Create new promise
router.post('/', async (req, res) => {
  try {
    const { memberId, amount, category, description, dueDate } = req.body;
    
    // Validation
    if (!memberId || !amount || !category || !dueDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: memberId, amount, category, dueDate' 
      });
    }
    
    // Verify member exists
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const parsedDueDate = parseDateInput(dueDate);
    if (!parsedDueDate) {
      return res.status(400).json({
        error: 'Invalid due date. Use DD/MM/YYYY or YYYY-MM-DD.'
      });
    }

    const promiseData = {
      memberId,
      memberName: `${member.firstName} ${member.lastName}`,
      amount: parseFloat(amount),
      category,
      description: description || '',
      dueDate: parsedDueDate,
      promiseDate: new Date()
    };
    
    const newPromise = new Promise(promiseData);
    await newPromise.save();
    
    await newPromise.populate('memberId', 'firstName lastName email phone');
    
    res.status(201).json({
      success: true,
      promise: newPromise
    });
    
  } catch (err) {
    console.error('Error creating promise:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: Object.values(err.errors).map(e => e.message) 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create promise',
      details: err.message 
    });
  }
});

// PUT /api/promises/:id - Update promise
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Remove fields that shouldn't be updated directly
    delete updateData.status;
    delete updateData.fulfilledDate;
    delete updateData.actualAmount;
    
    // If memberId is being updated, verify the member and update memberName
    if (updateData.memberId) {
      const member = await Member.findById(updateData.memberId);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      updateData.memberName = `${member.firstName} ${member.lastName}`;
    }

    if (updateData.dueDate) {
      const parsedDueDate = parseDateInput(updateData.dueDate);
      if (!parsedDueDate) {
        return res.status(400).json({
          error: 'Invalid due date. Use DD/MM/YYYY or YYYY-MM-DD.'
        });
      }
      updateData.dueDate = parsedDueDate;
    }
    
    const updatedPromise = await Promise.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('memberId', 'firstName lastName email phone');
    
    if (!updatedPromise) {
      return res.status(404).json({ error: 'Promise not found' });
    }
    
    res.json({
      success: true,
      promise: updatedPromise
    });
    
  } catch (err) {
    console.error('Error updating promise:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: Object.values(err.errors).map(e => e.message) 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to update promise',
      details: err.message 
    });
  }
});

// POST /api/promises/:id/fulfill - Fulfill promise and create transaction
router.post('/:id/fulfill', async (req, res) => {
  try {
    const { id } = req.params;
    const { actualAmount, paymentDate, paymentMethod, notes } = req.body;
    
    const promise = await Promise.findById(id).populate('memberId');
    
    if (!promise) {
      return res.status(404).json({ error: 'Promise not found' });
    }
    
    if (promise.status === 'fulfilled') {
      return res.status(400).json({ error: 'Promise already fulfilled' });
    }
    
    // Create transaction from promise
    const transactionData = {
      type: 'income',
      amount: actualAmount || promise.amount,
      category: promise.category,
      description: `Fulfilled promise: ${promise.description || promise.category}`,
      paymentMethod: paymentMethod || 'cash',
      reference: `Promise-${promise._id}`,
      notes: notes || '',
      date: parseDateInput(paymentDate) || new Date(),
      payee: {
        type: 'member',
        memberId: promise.memberId._id,
        name: promise.memberName
      }
    };
    
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Create transaction
      const newTransaction = new Transaction(transactionData);
      await newTransaction.save({ session });
      
      // Update promise status
      promise.status = 'fulfilled';
      promise.fulfilledDate = new Date();
      promise.actualAmount = actualAmount || promise.amount;
      promise.paymentMethod = paymentMethod || '';
      promise.notes = notes || promise.notes;
      await promise.save({ session });
      
      // Commit transaction
      await session.commitTransaction();
      
      await newTransaction.populate('payee.memberId', 'firstName lastName email');
      
      res.json({
        success: true,
        promise: promise,
        transaction: newTransaction
      });
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
  } catch (err) {
    console.error('Error fulfilling promise:', err);
    res.status(500).json({ 
      error: 'Failed to fulfill promise',
      details: err.message 
    });
  }
});

// DELETE /api/promises/:id - Delete promise
router.delete('/:id', async (req, res) => {
  try {
    const promise = await Promise.findByIdAndDelete(req.params.id);
    
    if (!promise) {
      return res.status(404).json({ error: 'Promise not found' });
    }
    
    res.json({
      success: true,
      message: 'Promise deleted successfully'
    });
    
  } catch (err) {
    console.error('Error deleting promise:', err);
    res.status(500).json({ error: 'Failed to delete promise' });
  }
});

// GET /api/promises/member/:memberId - Get promises for specific member
router.get('/member/:memberId', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    let query = { memberId: req.params.memberId };
    
    if (status && status !== 'all') {
      if (status === 'overdue') {
        query.status = 'pending';
        query.dueDate = { $lt: new Date() };
      } else {
        query.status = status;
      }
    }
    
    const promises = await Promise.find(query)
      .sort({ _id: -1 }) // Use _id instead of dueDate for Cosmos DB compatibility
      .limit(parseInt(limit) * parseInt(page))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const totalCount = await Promise.countDocuments(query);
    
    res.json({
      promises,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });
    
  } catch (err) {
    console.error('Error fetching member promises:', err);
    res.status(500).json({ error: 'Failed to fetch member promises' });
  }
});

// GET /api/promises/overdue - Get overdue promises
router.get('/overdue', async (req, res) => {
  try {
    const overduePromises = await Promise.find({
      status: 'pending',
      dueDate: { $lt: new Date() }
    }).populate('memberId', 'firstName lastName email phone')
      .sort({ _id: -1 }) // Use _id instead of dueDate;
    
    res.json(overduePromises);
    
  } catch (err) {
    console.error('Error fetching overdue promises:', err);
    res.status(500).json({ error: 'Failed to fetch overdue promises' });
  }
});

module.exports = router;