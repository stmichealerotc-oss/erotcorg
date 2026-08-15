// backend/routes/memberContributions.js
const express = require('express');
const router = express.Router();
const MemberContribution = require('../models/MemberContribution');
const Member = require('../models/Member');
const Transaction = require('../models/Transaction');
const InventoryItem = require('../models/InventoryItem');
const { authenticateToken, committeeOnly } = require('../middleware/auth');

// Parse DD/MM/YYYY and ISO/standard date strings only.
// The app must use day-first dates consistently; MM/DD/YYYY is rejected to avoid ambiguity.
function parseDateInput(val) {
  if (!val) return new Date();

  if (typeof val === 'string') {
    const trimmed = val.trim();

    // ISO-like dates first: YYYY-MM-DD or ISO string
    const isoMatch = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.exec(trimmed);
    if (isoMatch) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d;
    }

    // DD/MM/YYYY or DD-MM-YYYY only
    const dayFirstMatch = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(trimmed);
    if (dayFirstMatch) {
      const day = parseInt(dayFirstMatch[1], 10);
      const month = parseInt(dayFirstMatch[2], 10);
      const year = parseInt(dayFirstMatch[3], 10);

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const d = new Date(year, month - 1, day);
        if (!isNaN(d.getTime()) && d.getDate() === day && d.getMonth() === month - 1 && d.getFullYear() === year) {
          return d;
        }
      }
    }
  }

  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

function validateDateInput(dateValue) {
  if (!dateValue) return new Date();

  const parsedDate = parseDateInput(dateValue);
  if (!parsedDate || isNaN(parsedDate.getTime())) {
    throw new Error('Invalid date value. Use DD/MM/YYYY or YYYY-MM-DD.');
  }

  return parsedDate;
}

function normalizeContributionCategory(value) {
  return String(value || '').trim().toLowerCase();
}

function parseContributionDate(value) {
  if (!value) return null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const slashMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (slashMatch) {
      const [, dayRaw, monthRaw, yearRaw] = slashMatch;
      const day = Number(dayRaw);
      const month = Number(monthRaw);
      const year = Number(yearRaw);

      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        const parsed = new Date(year, month - 1, day);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }

    const isoDate = new Date(trimmed);
    if (!isNaN(isoDate.getTime())) return isoDate;

    const fallback = parseDateInput(trimmed);
    return !isNaN(fallback.getTime()) ? fallback : null;
  }

  const date = new Date(value);
  return !isNaN(date.getTime()) ? date : null;
}

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
      if (startDate) query.date.$gte = parseDateInput(startDate);
      if (endDate) {
        // End of the day for endDate (23:59:59.999)
        const endOfDay = parseDateInput(endDate) || new Date(endDate);
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
// For tithe: send monthsCovered (array of "YYYY-MM") to mark which months a single
// payment covers — e.g. ["2026-01","2026-02","2026-03","2026-04"] for Jan-Apr paid at once.
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
      createTransaction = false,
      monthsCovered // optional: ["2026-01","2026-02",...] for multi-month tithe
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

    let parsedDate;
    try {
      parsedDate = validateDateInput(date);
    } catch (dateError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
        details: dateError.message
      });
    }

    // Build contribution data
    const contributionData = {
      memberId,
      type,
      category,
      description,
      quantity,
      value,
      date: parsedDate,
      notes
    };

    // Store monthsCovered if provided (valid array of YYYY-MM strings)
    if (Array.isArray(monthsCovered) && monthsCovered.length > 0) {
      const validMonths = monthsCovered.filter(m => /^\d{4}-\d{2}$/.test(m));
      if (validMonths.length > 0) {
        contributionData.monthsCovered = validMonths;
        console.log(`✅ Tithe covers months: ${validMonths.join(', ')}`);
      }
    }

    // Create contribution
    const contribution = new MemberContribution(contributionData);

    // Generate receipt number if needed
    if (req.body.issueReceipt) {
      contribution.receiptNumber = contribution.generateReceiptNumber();
      contribution.receiptIssued = true;
    }

    await contribution.save();

    // Automatically create income + expense transactions for "In-Kind" type
    if (type === 'in-kind') {
      try {
        console.log('🎁 Creating in-kind income/expense transactions...');
        console.log('Member:', member.firstName, member.lastName, 'ID:', memberId);
        console.log('Description:', description, 'Value:', value);
        
        // Create income transaction (donation received)
        const incomeTransaction = new Transaction({
          type: 'income',
          description: `In-Kind Donation: ${description} - ${member.firstName} ${member.lastName}`,
          category: 'donation',
          amount: value,
          paymentMethod: 'in-kind', // Mark as in-kind to exclude from cash reports
          payee: {
            type: 'member',
            memberId: memberId,
            name: `${member.firstName} ${member.lastName}`,
            email: member.email,
            phone: member.phone
          },
          date: contribution.date,
          notes: `In-kind contribution - ${notes || 'Donated and consumed'}`
        });
        
        await incomeTransaction.save();
        console.log(`✅ Created in-kind income transaction ${incomeTransaction._id}`);
        
        // Create expense transaction (consumed immediately)
        const expenseTransaction = new Transaction({
          type: 'expense',
          description: `In-Kind Expense: ${description} (Consumed)`,
          category: 'supplies', // or appropriate expense category
          amount: value,
          paymentMethod: 'in-kind', // Mark as in-kind to exclude from cash reports
          payee: {
            type: 'external',
            name: 'In-Kind Consumption'
          },
          date: contribution.date,
          notes: `In-kind contribution consumed - ${notes || 'Used at church'}`
        });
        
        await expenseTransaction.save();
        console.log(`✅ Created in-kind expense transaction ${expenseTransaction._id}`);
        
        // Link the income transaction to the contribution
        contribution.transactionId = incomeTransaction._id;
        await contribution.save();
        
        console.log(`✅ Auto-created in-kind transactions for contribution ${contribution._id}`);
      } catch (inKindError) {
        console.error('❌ Error creating in-kind transactions:', inKindError);
        console.error('Error details:', inKindError.message);
        console.error('Stack:', inKindError.stack);
        // Don't fail the whole request if transaction creation fails
      }
    }

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

// GET /api/member-contributions/member/:memberId/tithe-debug - Raw tithe data for diagnosis
router.get('/member/:memberId/tithe-debug', async (req, res) => {
  try {
    const memberId = req.params.memberId;

    const rawContributions = await MemberContribution.find({ memberId }).limit(50).lean();
    const rawTransactions = await Transaction.find({
      'payee.memberId': memberId,
      type: 'income'
    }).limit(50).lean();

    // Return exactly what's stored — descriptions, monthsCovered, dates
    const contributions = rawContributions.map(c => ({
      source: 'MemberContribution',
      id: c._id,
      category: c.category,
      description: c.description,
      notes: c.notes,
      value: c.value,
      date: c.date,
      monthsCovered: c.monthsCovered || null
    }));

    const transactions = rawTransactions.map(t => ({
      source: 'Transaction',
      id: t._id,
      category: t.category,
      description: t.description,
      notes: t.notes,
      amount: t.amount,
      date: t.date,
      monthsCovered: t.monthsCovered || null
    }));

    res.json({ success: true, contributions, transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/member-contributions/member/:memberId/tithe-status - Get tithe payment status
router.get('/member/:memberId/tithe-status', async (req, res) => {
  try {
    const memberId = req.params.memberId;

    const rawContributions = await MemberContribution.find({ memberId }).limit(120).lean();
    const rawTransactions = await Transaction.find({
      'payee.memberId': memberId,
      type: 'income'
    }).limit(120).lean();

    const isTitheEntry = (entry) => {
      if (!entry) return false;

      const category = normalizeContributionCategory(entry.category);
      const description = normalizeContributionCategory(entry.description || entry.notes || '');
      const amount = Number(entry.value ?? entry.amount ?? 0);

      const isTitheCategory = [
        'tithe',
        'tithes',
        'tithe payment',
        'monthly tithe',
        'tithe contribution'
      ].includes(category);

      const hasTitheInDescription = description.includes('tithe');
      return amount > 0 && (isTitheCategory || hasTitheInDescription);
    };

    const titheContributions = [...rawContributions, ...rawTransactions]
      .filter(isTitheEntry)
      .map((entry) => ({
        ...entry,
        date: entry.date,
        value: Number(entry.value ?? entry.amount ?? 0),
        // Normalise monthsCovered — may exist on both contributions and transactions
        monthsCovered: Array.isArray(entry.monthsCovered) && entry.monthsCovered.length > 0
          ? entry.monthsCovered.filter(m => /^\d{4}-\d{2}$/.test(m))
          : null
      }))
      .sort((a, b) => {
        const dateA = parseContributionDate(a.date) || new Date(0);
        const dateB = parseContributionDate(b.date) || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Month name → 0-indexed number map for description parsing
    const MONTH_NAMES = {
      jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
      jul:6, aug:7, sep:8, oct:9, nov:10, dec:11
    };

    // Try to extract a list of "YYYY-MM" strings from a free-text description.
    // Handles patterns like:
    //   "Mar 2026 – Apr 2026"   "Nov 2025 - Jan 2026 (3 months)"
    //   "January 2026"          "Feb 2026"
    const parseMonthsFromDescription = (desc) => {
      if (!desc) return null;
      const text = desc.toLowerCase().trim();

      // Range pattern: "mon[th] YYYY <any non-alpha separator> mon[th] YYYY"
      // Covers: hyphen, en-dash, em-dash, " to ", slash, or multiple spaces
      const rangeMatch = text.match(
        /([a-z]{3})[a-z]*\.?\s+(\d{4})\s*(?:[\u2013\u2014\-\/]|\bto\b)\s*([a-z]{3})[a-z]*\.?\s+(\d{4})/
      );
      if (rangeMatch) {
        const fromM = MONTH_NAMES[rangeMatch[1].substring(0, 3)];
        const fromY = parseInt(rangeMatch[2], 10);
        const toM   = MONTH_NAMES[rangeMatch[3].substring(0, 3)];
        const toY   = parseInt(rangeMatch[4], 10);
        if (fromM !== undefined && toM !== undefined && fromY >= 2000 && toY >= 2000) {
          const months = [];
          let y = fromY, m = fromM;
          while (y < toY || (y === toY && m <= toM)) {
            months.push(`${y}-${String(m + 1).padStart(2, '0')}`);
            m++; if (m > 11) { m = 0; y++; }
            if (months.length > 24) break;
          }
          if (months.length > 0) return months;
        }
      }

      // Single month pattern: "mon[th] YYYY"
      const singleMatch = text.match(/\b([a-z]{3})[a-z]*\.?\s+(\d{4})\b/);
      if (singleMatch) {
        const m = MONTH_NAMES[singleMatch[1].substring(0, 3)];
        const y = parseInt(singleMatch[2], 10);
        if (m !== undefined && y >= 2000) return [`${y}-${String(m + 1).padStart(2, '0')}`];
      }

      return null;
    };

    // Helper: returns all "YYYY-MM" strings this entry covers.
    // Priority: 1) explicit monthsCovered array  2) description range parse  3) entry date month
    const getMonthsForEntry = (entry) => {
      // 1. Explicit monthsCovered array (set by new form)
      if (entry.monthsCovered && entry.monthsCovered.length > 0) {
        return entry.monthsCovered;
      }
      // 2. Parse from description / notes (handles legacy transactions recorded with range in text)
      const descText = ((entry.description || '') + ' ' + (entry.notes || '')).trim();
      const fromDesc = parseMonthsFromDescription(descText);
      if (fromDesc && fromDesc.length > 0) {
        console.log(`📅 Parsed months from description "${descText}":`, fromDesc);
        return fromDesc;
      }

      // 3. Fall back to the entry's own payment date month
      const d = parseContributionDate(entry.date);
      if (!d) return [];
      const fallback = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      console.log(`📅 Fallback to date month for "${descText}": ${fallback}`);
      return [fallback];
    };

    // Build a map: "YYYY-MM" -> { totalPaid, firstDate, paymentDate, isAdvance, totalMonths }
    // For multi-month payments:
    //   - The full amount is recorded on the EARLIEST covered month (so it shows once)
    //   - All other covered months are marked paid with amount=0 ("covered by advance")
    //   - The actual payment date is stored on all covered months for display
    const paidMonthsMap = {};
    for (const entry of titheContributions) {
      const months = getMonthsForEntry(entry);
      const entryDate = parseContributionDate(entry.date);

      // The "amount month" is the earliest month in the covered range
      const sortedMonths = [...months].sort();
      const amountMonth = sortedMonths[0];

      for (const ym of months) {
        if (!paidMonthsMap[ym]) {
          paidMonthsMap[ym] = { totalPaid: 0, firstDate: null, paymentDate: null, totalMonths: months.length };
        }
        // Put the full dollar amount only on the earliest covered month to avoid repeating
        if (ym === amountMonth) {
          paidMonthsMap[ym].totalPaid += entry.value;
        }
        // Always store the actual payment date so all covered-month rows show when it was paid
        if (entryDate) {
          paidMonthsMap[ym].paymentDate = entryDate;
          if (!paidMonthsMap[ym].firstDate || entryDate < paidMonthsMap[ym].firstDate) {
            paidMonthsMap[ym].firstDate = entryDate;
          }
        }
      }
    }

    // Build 12-month payment history (current month first, going back)
    const paymentHistory = [];
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(currentYear, currentMonth - i, 1);
      const year  = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const ym = `${year}-${String(month + 1).padStart(2, '0')}`;

      const record = paidMonthsMap[ym];
      const paid = !!record;

      paymentHistory.push({
        month: ym,
        monthLabel: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        paid,
        amount: paid ? record.totalPaid : 0,           // non-zero only on the payment month
        date: paid ? (record.paymentDate || record.firstDate) : null, // actual payment date
        totalMonths: paid ? record.totalMonths : 1,    // how many months this payment covered
        count: paid ? 1 : 0
      });
    }

    // Determine future months paid (advance payments) — any covered month after current month
    const currentMonthYM = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const futureMonthsPaid = Object.keys(paidMonthsMap).filter(ym => ym > currentMonthYM);

    const currentMonthPayment = paymentHistory[0]; // index 0 = current month
    let status = 'not-paid';
    let overdueMonths = [];
    let nextDue;

    // Find all unpaid months strictly before the current month (within 12-month window)
    const unpaidPastMonths = paymentHistory.filter((h) => {
      if (h.paid) return false;
      const [y, m] = h.month.split('-').map(Number);
      return new Date(y, m - 1, 1) < new Date(currentYear, currentMonth, 1);
    });

    if (currentMonthPayment && currentMonthPayment.paid) {
      if (futureMonthsPaid.length > 0) {
        status = 'paid-in-advance';
        const lastAdvanceYM = [...futureMonthsPaid].sort().reverse()[0];
        const [ly, lm] = lastAdvanceYM.split('-').map(Number);
        nextDue = new Date(ly, lm, 1);
      } else if (unpaidPastMonths.length > 0) {
        status = 'overdue';
        // Sort oldest-first so display reads chronologically
        overdueMonths = unpaidPastMonths
          .sort((a, b) => a.month < b.month ? -1 : 1)
          .map(h => h.monthLabel);
        nextDue = new Date();
      } else {
        status = 'paid';
        nextDue = new Date(currentYear, currentMonth + 1, 1);
      }
    } else {
      // Current month not paid — overdue = all unpaid past + current, oldest first
      overdueMonths = [
        ...unpaidPastMonths.sort((a, b) => a.month < b.month ? -1 : 1),
        currentMonthPayment
      ].map(h => h.monthLabel);
      status = 'overdue';
      nextDue = new Date();
    }

    const lastPayment = titheContributions.length > 0 ? {
      date: titheContributions[0].date,
      amount: Number(titheContributions[0].value || 0),
      monthsCovered: titheContributions[0].monthsCovered || null
    } : null;

    res.json({
      success: true,
      titheStatus: {
        status,
        lastPayment,
        nextDue,
        overdueMonths,
        overdueCount: overdueMonths.length,
        advanceMonths: futureMonthsPaid.sort(),
        paymentHistory
      }
    });

  } catch (error) {
    console.error('Error fetching tithe status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tithe status',
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