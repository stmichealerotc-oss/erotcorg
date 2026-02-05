const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['quarterly', 'annual', 'custom']
    },
    financialYear: {
        type: String,
        required: true // Format: "2024-2025" for Australian FY
    },
    year: {
        type: Number, // Kept for backward compatibility
        required: false
    },
    quarter: {
        type: Number,
        min: 1,
        max: 4
    },
    customDateRange: {
        start: Date,
        end: Date
    },
    period: {
        type: String,
        required: true
    },
    dateRange: {
        type: String,
        required: true
    },
    incomeByCategory: [{
        category: String,
        amount: Number
    }],
    expensesByCategory: [{
        category: String,
        amount: Number
    }],
    cashIncomeByCategory: [{
        category: String,
        amount: Number
    }],
    cashExpensesByCategory: [{
        category: String,
        amount: Number
    }],
    nonCashIncomeByCategory: [{
        category: String,
        amount: Number
    }],
    nonCashExpensesByCategory: [{
        category: String,
        amount: Number
    }],
    totalIncome: {
        type: Number,
        default: 0
    },
    totalExpenses: {
        type: Number,
        default: 0
    },
    netBalance: {
        type: Number,
        default: 0
    },
    previousAsset: {
        type: Number,
        default: 0
    },
    cashFlow: {
        previousBalance: Number,
        totalIncome: Number,
        totalExpenses: Number,
        currentBalance: Number,
        // Enhanced cash flow with quarterly details
        startingBalance: Number,
        previousQuarters: [{
            quarter: Number,
            income: Number,
            expenses: Number,
            netBalance: Number,
            label: String
        }],
        totalFromPreviousQuarters: Number,
        // Asset tracking
        cashAssets: Number,
        inventoryAssets: Number,
        totalAssets: Number
    },
    // Enhanced reporting with non-cash contributions
    contributionBreakdown: {
        totalCashIncome: {
            type: Number,
            default: 0
        },
        totalCashExpenses: {
            type: Number,
            default: 0
        },
        totalInKindIncome: {
            type: Number,
            default: 0
        },
        totalInKindExpense: {
            type: Number,
            default: 0
        },
        totalNonCashValue: {
            type: Number,
            default: 0
        },
        nonCashContributionsCount: {
            type: Number,
            default: 0
        },
        cashTransactionsCount: {
            type: Number,
            default: 0
        },
        cashIncomeByCategory: [{
            category: String,
            amount: Number
        }],
        cashExpensesByCategory: [{
            category: String,
            amount: Number
        }],
        nonCashIncomeByCategory: [{
            category: String,
            amount: Number
        }],
        nonCashExpensesByCategory: [{
            category: String,
            amount: Number
        }]
    },
    quarterlyBreakdown: {
        previousQuarters: [{
            quarter: Number,
            income: Number,
            expenses: Number,
            netBalance: Number,
            label: String
        }],
        totalFromPreviousQuarters: {
            type: Number,
            default: 0
        },
        startingBalance: {
            type: Number,
            default: 0
        }
    },
    monthlyOverview: [{
        month: String,
        income: Number,
        expenses: Number,
        net: Number,
        transactionCount: Number
    }],
    transactionCount: {
        type: Number,
        default: 0
    },
    notes: {
        type: String,
        default: ''
    },
    generatedAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    // Report history tracking
    reportHistory: {
        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        submittedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['draft', 'submitted', 'approved', 'rejected'],
            default: 'submitted'
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        approvedAt: Date,
        version: {
            type: Number,
            default: 1
        }
    }
});

// Index for faster queries
reportSchema.index({ financialYear: -1, quarter: -1 });
reportSchema.index({ type: 1, financialYear: -1 });
reportSchema.index({ 'reportHistory.status': 1 });

// Unique compound index to prevent duplicate reports
reportSchema.index(
    { type: 1, financialYear: 1, quarter: 1 }, 
    { 
        unique: true,
        partialFilterExpression: { quarter: { $exists: true } } // Only for quarterly reports
    }
);
reportSchema.index(
    { type: 1, financialYear: 1 }, 
    { 
        unique: true,
        partialFilterExpression: { type: 'annual' } // Only for annual reports
    }
);

// Indexes and model export
module.exports = mongoose.model('Report', reportSchema);
