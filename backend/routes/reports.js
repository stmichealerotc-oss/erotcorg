const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Transaction = require('../models/Transaction');
const moment = require('moment');
const { authenticateToken, authorizeRoles, committeeOnly, readOnlyAccess, writeAccess } = require('../middleware/auth');

// Apply authentication to all report routes
router.use(authenticateToken);

// Add debugging middleware for generate-pdf route
router.use('/generate-pdf', (req, res, next) => {
    console.log('🔍 Generate-PDF Route Debug:');
    console.log('- Method:', req.method);
    console.log('- Headers:', req.headers);
    console.log('- Body keys:', Object.keys(req.body || {}));
    next();
});

// Reports are read-only for visitors, write access for committee members
router.get('/', readOnlyAccess, async (req, res) => {
    try {
        const reports = await Report.find({})
            .sort({ _id: -1 }) // Use _id instead of financialYear, quarter
            .lean();
        
        console.log(`📊 Found ${reports.length} reports in database`);
        res.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// ======================
// 🔧 Utilities
// ======================

async function getTransactionsFromDB() {
    try {
        const transactions = await Transaction.find({})
            .populate('payee.memberId', 'firstName lastName email')
            .sort({ _id: -1 }); // Use _id instead of date for Cosmos DB
        return transactions;
    } catch (error) {
        console.error('Error fetching transactions from database:', error);
        return [];
    }
}

async function getMemberContributionsFromDB() {
    try {
        const MemberContribution = require('../models/MemberContribution');
        const contributions = await MemberContribution.find({})
            .populate('memberId', 'firstName lastName email')
            .sort({ _id: -1 }); // Use _id instead of date for Cosmos DB
        return contributions;
    } catch (error) {
        console.error('Error fetching member contributions from database:', error);
        return [];
    }
}

async function getCurrentInventoryValue() {
    try {
        const InventoryItem = require('../models/InventoryItem');
        const inventoryItems = await InventoryItem.find({ quantity: { $gt: 0 } });
        
        let totalInventoryValue = 0;
        inventoryItems.forEach(item => {
            item.calculateCurrentValue();
            totalInventoryValue += item.currentValue;
        });
        
        console.log(`📦 Current inventory value: $${totalInventoryValue}`);
        return totalInventoryValue;
    } catch (error) {
        console.error('Error calculating inventory value:', error);
        return 0;
    }
}

async function getCombinedFinancialData() {
    try {
        const [transactions, contributions] = await Promise.all([
            getTransactionsFromDB(),
            getMemberContributionsFromDB()
        ]);
        
        // Convert member contributions to transaction-like format for reporting
        const contributionTransactions = contributions.map(contrib => ({
            _id: contrib._id,
            type: 'income', // All member contributions are income
            amount: contrib.value,
            description: `${contrib.description} (Non-Cash: ${contrib.type})`,
            category: contrib.category,
            date: contrib.date,
            payee: {
                type: 'member',
                memberId: contrib.memberId,
                name: contrib.memberId ? `${contrib.memberId.firstName} ${contrib.memberId.lastName}` : 'Unknown Member'
            },
            paymentMethod: 'non-cash',
            reference: `Non-Cash-${contrib.type}`,
            notes: contrib.notes || `Non-cash contribution: ${contrib.type}`,
            isNonCash: true // Flag to identify non-cash items
        }));
        
        // Combine and sort by date
        const allFinancialData = [...transactions, ...contributionTransactions]
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log(`📊 Combined financial data: ${transactions.length} transactions + ${contributions.length} contributions = ${allFinancialData.length} total`);
        
        return allFinancialData;
    } catch (error) {
        console.error('Error fetching combined financial data:', error);
        return [];
    }
}

function formatDate(dateString) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Australian Financial Year: July 1 - June 30
function getAustralianFinancialYear(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    
    // If month is July (6) or later, FY is current year to next year
    // If month is before July, FY is previous year to current year
    if (month >= 6) { // July onwards
        return {
            startYear: year,
            endYear: year + 1,
            label: `${year}-${year + 1}`
        };
    } else { // January to June
        return {
            startYear: year - 1,
            endYear: year,
            label: `${year - 1}-${year}`
        };
    }
}

function getPeriodDateRange(type, financialYear, quarter, customStart = null, customEnd = null) {
    // Handle custom date range
    if (customStart && customEnd) {
        return {
            start: customStart,
            end: customEnd,
            label: `Custom Period (${formatDate(customStart)} - ${formatDate(customEnd)})`
        };
    }
    
    // Parse financial year (e.g., "2024-2025" -> startYear: 2024, endYear: 2025)
    const [startYear, endYear] = financialYear.split('-').map(y => parseInt(y));
    
    if (type === 'annual') {
        return {
            start: `${startYear}-07-01`, // July 1
            end: `${endYear}-06-30`,     // June 30
            label: `Financial Year ${financialYear}`
        };
    }
    
    if (type === 'quarterly' && quarter) {
        const quarterRanges = {
            1: { start: `${startYear}-07-01`, end: `${startYear}-09-30`, label: `Q1 FY${financialYear}` }, // Jul-Sep
            2: { start: `${startYear}-10-01`, end: `${startYear}-12-31`, label: `Q2 FY${financialYear}` }, // Oct-Dec
            3: { start: `${endYear}-01-01`, end: `${endYear}-03-31`, label: `Q3 FY${financialYear}` },     // Jan-Mar
            4: { start: `${endYear}-04-01`, end: `${endYear}-06-30`, label: `Q4 FY${financialYear}` }      // Apr-Jun
        };
        return quarterRanges[quarter] || null;
    }
    
    return null;
}

function calculateCategoryTotals(transactions, type) {
    return transactions
        .filter(t => t.type === type)
        .reduce((totals, t) => {
            const category = t.category || 'Uncategorized';
            totals[category] = (totals[category] || 0) + (t.amount || 0);
            return totals;
        }, {});
}

function generateMonthlyOverview(transactions, dateRange) {
    const months = [];
    let current = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    while (current <= end) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        
        // Set monthEnd to end of day to include all transactions on the last day of the month
        monthEnd.setHours(23, 59, 59, 999);
        
        const monthTransactions = transactions.filter(t => {
            const d = new Date(t.date);
            return d >= monthStart && d <= monthEnd;
        });
        const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
        const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
        months.push({ 
            month: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), 
            income, 
            expenses, 
            net: income - expenses, 
            transactionCount: monthTransactions.length 
        });
        current.setMonth(current.getMonth() + 1);
    }

    return months;
}

async function getQuarterlyBreakdown(financialYear, currentQuarter, type) {
    try {
        const breakdown = {
            previousQuarters: [],
            totalFromPreviousQuarters: 0,
            startingBalance: 0
        };
        
        if (type === 'quarterly' && currentQuarter) {
            console.log(`📊 Getting quarterly breakdown for Q${currentQuarter} FY${financialYear}`);
            
            // Get all previous quarters in the same financial year
            for (let q = 1; q < currentQuarter; q++) {
                const quarterReport = await Report.findOne({ 
                    financialYear: financialYear, 
                    quarter: q,
                    type: 'quarterly'
                }).sort({ _id: -1 }) // Use _id instead of generatedAt;
                
                if (quarterReport) {
                    breakdown.previousQuarters.push({
                        quarter: q,
                        income: quarterReport.totalIncome || 0,
                        expenses: quarterReport.totalExpenses || 0,
                        netBalance: quarterReport.netBalance || 0,
                        label: `Q${q} FY${financialYear}`
                    });
                    breakdown.totalFromPreviousQuarters += (quarterReport.netBalance || 0);
                    console.log(`📊 Added Q${q}: Income=${quarterReport.totalIncome}, Expenses=${quarterReport.totalExpenses}, Net=${quarterReport.netBalance}`);
                }
            }
            
            // Get starting balance (from previous FY if this is Q1, or from Q1's previousAsset if later quarters)
            if (currentQuarter === 1 || breakdown.previousQuarters.length === 0) {
                // Get from previous financial year
                const [startYear] = financialYear.split('-').map(y => parseInt(y));
                const prevFY = `${startYear - 1}-${startYear}`;
                
                // Try Q4 of previous FY first
                const prevQ4Report = await Report.findOne({ 
                    financialYear: prevFY, 
                    quarter: 4,
                    type: 'quarterly'
                }).sort({ _id: -1 }) // Use _id instead of generatedAt;
                
                if (prevQ4Report) {
                    breakdown.startingBalance = (prevQ4Report.previousAsset || 0) + (prevQ4Report.netBalance || 0);
                    console.log(`📊 Starting balance from previous FY Q4: ${breakdown.startingBalance}`);
                } else {
                    // Try annual report of previous FY
                    const prevAnnualReport = await Report.findOne({ 
                        financialYear: prevFY,
                        type: 'annual'
                    }).sort({ _id: -1 }) // Use _id instead of generatedAt;
                    
                    if (prevAnnualReport) {
                        breakdown.startingBalance = (prevAnnualReport.previousAsset || 0) + (prevAnnualReport.netBalance || 0);
                        console.log(`📊 Starting balance from previous FY Annual: ${breakdown.startingBalance}`);
                    }
                }
            } else {
                // Use Q1's previousAsset as starting balance
                const q1Report = breakdown.previousQuarters.find(r => r.quarter === 1);
                if (q1Report) {
                    const q1FullReport = await Report.findOne({ 
                        financialYear: financialYear, 
                        quarter: 1,
                        type: 'quarterly'
                    }).sort({ _id: -1 }) // Use _id instead of generatedAt;
                    
                    if (q1FullReport) {
                        breakdown.startingBalance = q1FullReport.previousAsset || 0;
                        console.log(`📊 Starting balance from Q1 previous asset: ${breakdown.startingBalance}`);
                    }
                }
            }
        }
        
        console.log(`📊 Quarterly breakdown complete:`, breakdown);
        return breakdown;
        
    } catch (error) {
        console.error('Error getting quarterly breakdown:', error);
        return {
            previousQuarters: [],
            totalFromPreviousQuarters: 0,
            startingBalance: 0
        };
    }
}

async function getPreviousAsset(financialYear, quarter, type) {
    try {
        let cumulativeAsset = 0;
        
        if (type === 'quarterly' && quarter) {
            // For quarterly reports, calculate cumulative balance from all previous quarters in the same FY
            console.log(`📊 Calculating cumulative asset for Q${quarter} FY${financialYear}`);
            
            // Get all previous quarters in the same financial year
            const previousQuarters = [];
            for (let q = 1; q < quarter; q++) {
                const prevReport = await Report.findOne({ 
                    financialYear: financialYear, 
                    quarter: q,
                    type: 'quarterly'
                }).sort({ _id: -1 }) // Use _id instead of generatedAt;
                
                if (prevReport) {
                    previousQuarters.push(prevReport);
                    console.log(`📊 Found Q${q} report: Income=${prevReport.totalIncome}, Expenses=${prevReport.totalExpenses}, Net=${prevReport.netBalance}`);
                }
            }
            
            // If this is Q1 or no previous quarters in current FY, get the starting balance from previous FY
            if (previousQuarters.length === 0) {
                // Get Q4 of previous financial year as starting balance
                const [startYear] = financialYear.split('-').map(y => parseInt(y));
                const prevFY = `${startYear - 1}-${startYear}`;
                const prevFYReport = await Report.findOne({ 
                    financialYear: prevFY, 
                    quarter: 4,
                    type: 'quarterly'
                }).sort({ _id: -1 }) // Use _id instead of generatedAt;
                
                if (prevFYReport) {
                    cumulativeAsset = (prevFYReport.previousAsset || 0) + (prevFYReport.netBalance || 0);
                    console.log(`📊 Starting balance from previous FY Q4: ${cumulativeAsset}`);
                } else {
                    // Try annual report of previous FY
                    const prevAnnualReport = await Report.findOne({ 
                        financialYear: prevFY,
                        type: 'annual'
                    }).sort({ _id: -1 }) // Use _id instead of generatedAt;
                    
                    if (prevAnnualReport) {
                        cumulativeAsset = (prevAnnualReport.previousAsset || 0) + (prevAnnualReport.netBalance || 0);
                        console.log(`📊 Starting balance from previous FY Annual: ${cumulativeAsset}`);
                    }
                }
            } else {
                // Calculate cumulative balance from all previous quarters in current FY
                // Start with the previousAsset from Q1 (which comes from previous FY)
                const q1Report = previousQuarters.find(r => r.quarter === 1);
                if (q1Report) {
                    cumulativeAsset = q1Report.previousAsset || 0;
                    console.log(`📊 Starting with Q1 previous asset: ${cumulativeAsset}`);
                }
                
                // Add net balance from all previous quarters
                previousQuarters.forEach(report => {
                    cumulativeAsset += (report.netBalance || 0);
                    console.log(`📊 Added Q${report.quarter} net balance: ${report.netBalance}, cumulative: ${cumulativeAsset}`);
                });
            }
            
        } else if (type === 'annual') {
            // For annual, find the previous financial year
            const [startYear] = financialYear.split('-').map(y => parseInt(y));
            const prevFY = `${startYear - 1}-${startYear}`;
            const previousReport = await Report.findOne({ 
                financialYear: prevFY,
                type: 'annual'
            }).sort({ _id: -1 }) // Use _id instead of generatedAt;
            
            if (previousReport) {
                cumulativeAsset = (previousReport.previousAsset || 0) + (previousReport.netBalance || 0);
                console.log(`📊 Annual previous asset from FY${prevFY}: ${cumulativeAsset}`);
            }
        }
        
        console.log(`📊 Final cumulative asset for ${type} Q${quarter || 'N/A'} FY${financialYear}: ${cumulativeAsset}`);
        return cumulativeAsset;
        
    } catch (error) {
        console.error('Error getting previous asset:', error);
        return 0;
    }
}

// ======================
// 🔹 Routes
// ======================

// GET all report slots (auto-generated pending + generated reports)
router.get('/all-slots', async (req, res) => {
    try {
        const currentDate = new Date();
        const currentFY = getAustralianFinancialYear(currentDate);
        const currentMonth = currentDate.getMonth() + 1; // 1-12
        
        // Determine current quarter in Australian FY
        let currentQuarter;
        if (currentMonth >= 7 && currentMonth <= 9) currentQuarter = 1; // Jul-Sep
        else if (currentMonth >= 10 && currentMonth <= 12) currentQuarter = 2; // Oct-Dec
        else if (currentMonth >= 1 && currentMonth <= 3) currentQuarter = 3; // Jan-Mar
        else currentQuarter = 4; // Apr-Jun
        
        // Get all existing reports from database
        const existingReports = await Report.find().sort({ _id: -1 }) // Use _id instead of financialYear, quarter;
        
        // Find the earliest financial year with a report
        const earliestFY = existingReports.length > 0 
            ? existingReports[existingReports.length - 1].financialYear
            : currentFY.label;
        
        const allSlots = [];
        
        // Generate financial years from current to 3 years back
        const fyYears = [];
        const [currentStartYear] = currentFY.label.split('-').map(y => parseInt(y));
        
        for (let i = 1; i >= -3; i--) { // Next year, current year, and 3 years back
            const startYear = currentStartYear + i;
            const endYear = startYear + 1;
            fyYears.push(`${startYear}-${endYear}`);
        }
        
        // Generate slots for all financial years
        for (const fy of fyYears) {
            const [startYear, endYear] = fy.split('-').map(y => parseInt(y));
            
            // Annual report - Due date is 28 days after FY ends (June 30 + 28 days = July 28)
            const fyEndDate = new Date(endYear, 5, 30); // June 30
            const annualDueDate = new Date(fyEndDate);
            annualDueDate.setDate(fyEndDate.getDate() + 28); // 28 days after FY end
            
            const existingAnnual = await Report.findOne({ 
                type: 'annual', 
                financialYear: fy 
            }).sort({ _id: -1 }) // Use _id instead of generatedAt;
            
            if (existingAnnual) {
                allSlots.push({
                    type: 'annual',
                    financialYear: fy,
                    label: `Annual Report FY${fy}`,
                    status: 'generated',
                    reportId: existingAnnual._id.toString(),
                    totalIncome: existingAnnual.totalIncome,
                    totalExpenses: existingAnnual.totalExpenses,
                    netBalance: existingAnnual.netBalance,
                    generatedAt: existingAnnual.generatedAt,
                    dueDate: annualDueDate,
                    submittedDate: existingAnnual.generatedAt,
                    reportHistory: existingAnnual.reportHistory
                });
            } else {
                // Only show as pending for current and next FY
                if (fy === currentFY.label || startYear === currentStartYear + 1) {
                    allSlots.push({
                        type: 'annual',
                        financialYear: fy,
                        label: `Annual Report FY${fy}`,
                        status: 'pending',
                        dueDate: annualDueDate
                    });
                }
            }
            
            // Quarterly reports - Due dates are 28 days after quarter ends
            for (let quarter = 4; quarter >= 1; quarter--) {
                // Calculate quarter end date for Australian FY
                let quarterEndDate;
                if (quarter === 1) quarterEndDate = new Date(startYear, 8, 30); // Sep 30
                else if (quarter === 2) quarterEndDate = new Date(startYear, 11, 31); // Dec 31
                else if (quarter === 3) quarterEndDate = new Date(endYear, 2, 31); // Mar 31
                else quarterEndDate = new Date(endYear, 5, 30); // Jun 30
                
                // Add 28 days to get due date
                const quarterDueDate = new Date(quarterEndDate);
                quarterDueDate.setDate(quarterEndDate.getDate() + 28);
                
                const existingQuarterly = await Report.findOne({ 
                    type: 'quarterly', 
                    financialYear: fy, 
                    quarter 
                }).sort({ _id: -1 }) // Use _id instead of generatedAt;
                
                if (existingQuarterly) {
                    allSlots.push({
                        type: 'quarterly',
                        financialYear: fy,
                        quarter,
                        label: `Q${quarter} FY${fy} Report`,
                        status: 'generated',
                        reportId: existingQuarterly._id.toString(),
                        totalIncome: existingQuarterly.totalIncome,
                        totalExpenses: existingQuarterly.totalExpenses,
                        netBalance: existingQuarterly.netBalance,
                        generatedAt: existingQuarterly.generatedAt,
                        dueDate: quarterDueDate,
                        submittedDate: existingQuarterly.generatedAt,
                        reportHistory: existingQuarterly.reportHistory
                    });
                } else {
                    // Show pending quarters for current FY
                    // Include all quarters that are due (current and overdue) plus next quarter
                    const isCurrentFY = fy === currentFY.label;
                    const isOverdueQuarter = isCurrentFY && quarter < currentQuarter; // Q1, Q2 if we're in Q3
                    const isCurrentQuarter = isCurrentFY && quarter === currentQuarter; // Current quarter
                    const isNextQuarter = (isCurrentFY && quarter === currentQuarter + 1) || 
                                         (fy === `${currentStartYear + 1}-${currentStartYear + 2}` && quarter === 1 && currentQuarter === 4);
                    
                    if (isOverdueQuarter || isCurrentQuarter || isNextQuarter) {
                        // Determine status based on due date
                        const now = new Date();
                        const isOverdue = quarterDueDate < now;
                        
                        allSlots.push({
                            type: 'quarterly',
                            financialYear: fy,
                            quarter,
                            label: `Q${quarter} FY${fy} Report`,
                            status: isOverdue ? 'overdue' : 'pending',
                            dueDate: quarterDueDate
                        });
                    }
                }
            }
        }
        
        res.json(allSlots);
    } catch (error) {
        console.error('Error fetching report slots:', error);
        res.status(500).json({ error: 'Failed to fetch report slots' });
    }
});

// GET available financial years
router.get('/financial-years', async (req, res) => {
    try {
        const currentFY = getAustralianFinancialYear();
        const [currentStartYear] = currentFY.label.split('-').map(y => parseInt(y));
        
        // Generate financial years (current + 1 future + 5 past)
        const financialYears = [];
        for (let i = 1; i >= -5; i--) {
            const startYear = currentStartYear + i;
            const endYear = startYear + 1;
            const fy = `${startYear}-${endYear}`;
            
            financialYears.push({
                value: fy,
                label: `FY ${fy}`,
                isCurrent: fy === currentFY.label,
                startDate: `${startYear}-07-01`,
                endDate: `${endYear}-06-30`
            });
        }
        
        res.json({ 
            currentFinancialYear: currentFY,
            financialYears 
        });
    } catch (error) {
        console.error('Error fetching financial years:', error);
        res.status(500).json({ error: 'Failed to fetch financial years' });
    }
});

// GET single report by ID
router.get('/:id', async (req, res) => {
    try {
        const report = await Report.findById(req.params.id).lean();
        
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        res.json({
            ...report,
            id: report._id.toString()
        });
    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({ error: 'Failed to fetch report' });
    }
});

// POST save a report
router.post('/save', async (req, res) => {
    try {
        const reportData = req.body;
        
        if (!reportData.type || !reportData.year) {
            return res.status(400).json({ error: 'Missing required report data: type and year' });
        }

        // Use findOneAndUpdate with upsert to handle duplicates
        const query = {
            type: reportData.type,
            year: reportData.year,
            quarter: reportData.quarter || null
        };

        const updatedReport = await Report.findOneAndUpdate(
            query,
            { ...reportData, generatedAt: new Date() },
            { 
                new: true, 
                upsert: true,
                runValidators: true
            }
        );
        
        console.log(`📊 Report saved/updated: ${reportData.type} ${reportData.year}${reportData.quarter ? ` Q${reportData.quarter}` : ''}`);
        
        res.json({ 
            message: 'Report saved successfully', 
            report: {
                ...updatedReport.toObject(),
                id: updatedReport._id.toString()
            }
        });
    } catch (error) {
        console.error('Error saving report:', error);
        res.status(500).json({ 
            error: 'Failed to save report',
            details: error.message 
        });
    }
});

// POST generate a report from accounting data
router.post('/generate', async (req, res) => {
    try {
        const { type, financialYear, quarter, customStart, customEnd, notes } = req.body;
        
        if (!type) {
            return res.status(400).json({ error: 'Missing report type' });
        }

        if (type === 'custom' && (!customStart || !customEnd)) {
            return res.status(400).json({ error: 'Custom reports require start and end dates' });
        }

        if ((type === 'annual' || type === 'quarterly') && !financialYear) {
            return res.status(400).json({ error: 'Missing financial year' });
        }

        if (type === 'quarterly' && !quarter) {
            return res.status(400).json({ error: 'Missing quarter for quarterly report' });
        }

        // Get combined financial data (transactions + member contributions)
        const allFinancialData = await getCombinedFinancialData();
        
        if (!allFinancialData.length) {
            return res.status(404).json({ error: 'No financial data available' });
        }

        console.log(`📊 Generating ${type} report for FY${financialYear}${quarter ? ` Q${quarter}` : ''}`);
        console.log(`📊 Total financial records in database: ${allFinancialData.length}`);

        const dateRange = getPeriodDateRange(type, financialYear, quarter, customStart, customEnd);
        if (!dateRange) {
            return res.status(400).json({ error: 'Invalid period parameters' });
        }

        console.log(`📊 Date range: ${dateRange.start} to ${dateRange.end}`);

        const filteredData = allFinancialData.filter(item => {
            const d = new Date(item.date);
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);
            
            // Set end date to end of day (23:59:59.999) to include all transactions on the last day
            endDate.setHours(23, 59, 59, 999);
            
            return d >= startDate && d <= endDate;
        });
        
        console.log(`📊 Filtered financial data for period: ${filteredData.length}`);
        console.log(`📊 Non-cash contributions in period: ${filteredData.filter(item => item.isNonCash).length}`);
        
        if (!filteredData.length) {
            return res.status(404).json({ 
                error: 'No financial data for the selected period', 
                period: dateRange,
                totalRecords: allFinancialData.length,
                dateRange: dateRange
            });
        }

        const incomeByCategory = Object.entries(calculateCategoryTotals(filteredData, 'income'))
            .map(([category, amount]) => ({ category, amount }));
        const expensesByCategory = Object.entries(calculateCategoryTotals(filteredData, 'expense'))
            .map(([category, amount]) => ({ category, amount }));
        
        const totalIncome = incomeByCategory.reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = expensesByCategory.reduce((sum, t) => sum + t.amount, 0);
        const netBalance = totalIncome - totalExpenses;

        // Get previous asset and quarterly breakdown
        const previousAsset = await getPreviousAsset(financialYear, quarter, type);
        const quarterlyBreakdown = await getQuarterlyBreakdown(financialYear, quarter, type);

        // Separate cash and non-cash contributions for detailed reporting
        const cashTransactions = filteredData.filter(item => !item.isNonCash);
        const nonCashContributions = filteredData.filter(item => item.isNonCash);
        const totalNonCashValue = nonCashContributions.reduce((sum, item) => sum + (item.amount || 0), 0);

        console.log(`📊 Data separation:`, {
            totalFiltered: filteredData.length,
            cashTransactions: cashTransactions.length,
            nonCashContributions: nonCashContributions.length,
            totalNonCashValue,
            sampleNonCash: nonCashContributions.slice(0, 2).map(nc => ({ 
                amount: nc.amount, 
                value: nc.value,
                isNonCash: nc.isNonCash, 
                description: nc.description 
            }))
        });

        // Calculate CASH ONLY totals and categories (for accurate cash flow)
        const cashIncomeTransactions = cashTransactions.filter(t => t.type === 'income');
        const cashExpenseTransactions = cashTransactions.filter(t => t.type === 'expense');
        const totalCashIncome = cashIncomeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalCashExpenses = cashExpenseTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const netCashBalance = totalCashIncome - totalCashExpenses;

        console.log(`💰 Cash calculations:`, {
            cashIncomeTransactions: cashIncomeTransactions.length,
            totalCashIncome,
            cashExpenseTransactions: cashExpenseTransactions.length,
            totalCashExpenses,
            netCashBalance
        });

        // Calculate CASH ONLY categories (separate from in-kind)
        const cashIncomeByCategory = Object.entries(calculateCategoryTotals(cashTransactions, 'income'))
            .map(([category, amount]) => ({ category, amount }));
        const cashExpensesByCategory = Object.entries(calculateCategoryTotals(cashTransactions, 'expense'))
            .map(([category, amount]) => ({ category, amount }));

        // Calculate IN-KIND ONLY categories
        const nonCashIncomeByCategory = Object.entries(calculateCategoryTotals(nonCashContributions, 'income'))
            .map(([category, amount]) => ({ category, amount }));
        
        // IN-KIND as BOTH income AND expense (shows full operational value)
        const totalInKindIncome = totalNonCashValue;
        const totalInKindExpense = totalNonCashValue; // Same amount - donated and used
        
        // Create in-kind expense categories with professional naming
        const nonCashExpensesByCategory = totalInKindExpense > 0 ? [{
            category: 'In-kind program expenses',
            amount: totalInKindExpense
        }] : [];

        console.log(`📊 Breakdown calculation:`, {
            totalTransactions: filteredData.length,
            cashTransactions: cashTransactions.length,
            nonCashContributions: nonCashContributions.length,
            totalCashIncome,
            totalCashExpenses,
            netCashBalance,
            totalInKindIncome,
            totalInKindExpense,
            cashIncomeByCategory,
            cashExpensesByCategory,
            nonCashIncomeByCategory,
            nonCashExpensesByCategory,
            previousAsset,
            currentInventoryValue: await getCurrentInventoryValue()
        });

        // Get inventory value once
        const currentInventoryValue = await getCurrentInventoryValue();

        const reportData = {
            type,
            financialYear,
            quarter,
            customDateRange: type === 'custom' ? { start: customStart, end: customEnd } : undefined,
            period: dateRange.label,
            dateRange: `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`,
            
            // Separated categories for clear reporting
            cashIncomeByCategory,
            cashExpensesByCategory,
            nonCashIncomeByCategory,
            nonCashExpensesByCategory,
            
            // COMBINED totals (cash + in-kind)
            totalIncome: totalCashIncome + totalInKindIncome,
            totalExpenses: totalCashExpenses + totalInKindExpense,
            netBalance: netCashBalance, // Net is still cash only (in-kind cancels out)
            
            previousAsset,
            quarterlyBreakdown,
            
            // Enhanced reporting with breakdown
            contributionBreakdown: {
                totalCashIncome: totalCashIncome,
                totalCashExpenses: totalCashExpenses,
                totalInKindIncome: totalInKindIncome,
                totalInKindExpense: totalInKindExpense,
                nonCashContributionsCount: nonCashContributions.length,
                cashTransactionsCount: cashTransactions.length,
                // Separate category arrays
                cashIncomeByCategory,
                cashExpensesByCategory,
                nonCashIncomeByCategory,
                nonCashExpensesByCategory
            },
            
            cashFlow: { 
                previousBalance: previousAsset, 
                totalIncome: totalCashIncome,  // CASH ONLY
                totalExpenses: totalCashExpenses, // CASH ONLY
                currentBalance: previousAsset + netCashBalance, // CASH ONLY
                // Enhanced cash flow with quarterly details
                startingBalance: quarterlyBreakdown.startingBalance,
                previousQuarters: quarterlyBreakdown.previousQuarters,
                totalFromPreviousQuarters: quarterlyBreakdown.totalFromPreviousQuarters,
                // Separate asset tracking
                cashAssets: previousAsset + netCashBalance,
                inventoryAssets: currentInventoryValue,
                totalAssets: previousAsset + netCashBalance + currentInventoryValue
            },
            monthlyOverview: generateMonthlyOverview(filteredData, dateRange),
            transactionCount: filteredData.length,
            notes: notes || '',
            generatedAt: new Date(),
            reportHistory: {
                submittedBy: req.user._id,
                submittedAt: new Date(),
                status: 'submitted',
                version: 1
            }
        };

        // Use findOneAndUpdate with upsert to handle duplicates
        const query = type === 'custom' 
            ? { type, customDateRange: { start: customStart, end: customEnd } }
            : { type, financialYear, quarter: quarter || null };

        const report = await Report.findOneAndUpdate(
            query,
            reportData,
            { 
                new: true, 
                upsert: true,
                runValidators: true
            }
        );

        console.log(`📊 Report saved: ${type} FY${financialYear}${quarter ? ` Q${quarter}` : ''}`);
        console.log(`📊 Sending contributionBreakdown:`, reportData.contributionBreakdown);

        res.json({ 
            message: 'Report generated successfully', 
            report: {
                ...report.toObject(),
                id: report._id.toString()
            }
        });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report: ' + error.message });
    }
});

// PUT update report notes
router.put('/:id/notes', async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        
        const report = await Report.findById(id);
        
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        report.notes = notes;
        report.updatedAt = new Date();
        await report.save();
        
        res.json({ 
            message: 'Notes updated successfully', 
            report: {
                ...report.toObject(),
                id: report._id.toString()
            }
        });
    } catch (error) {
        console.error('Error updating notes:', error);
        res.status(500).json({ error: 'Failed to update notes' });
    }
});

// GET available periods
router.get('/periods', async (req, res) => {
    try {
        const transactions = await getTransactionsFromDB();
        
        if (!transactions.length) {
            return res.json({ periods: [] });
        }

        const years = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))].sort((a, b) => b - a);

        console.log(`📊 Available years from database: ${years.join(', ')}`);

        const periods = years.map(year => {
            const quarters = [1, 2, 3, 4].filter(q => {
                const range = getPeriodDateRange('quarterly', year, q);
                return transactions.some(t => {
                    const d = new Date(t.date);
                    return d >= new Date(range.start) && d <= new Date(range.end);
                });
            });
            return { 
                year, 
                quarters, 
                hasAnnualData: transactions.some(t => new Date(t.date).getFullYear() === year) 
            };
        });

        console.log(`📊 Generated periods:`, periods);
        res.json({ periods });
    } catch (error) {
        console.error('Error fetching periods:', error);
        res.status(500).json({ error: 'Failed to fetch periods' });
    }
});

// POST generate PDF for bank statement
router.post('/generate-pdf', authenticateToken, async (req, res) => {
    console.log('📄 PDF Generation Request Received');
    console.log('- Request body keys:', Object.keys(req.body));
    console.log('- Request type:', req.body.type);
    console.log('- Transactions count:', req.body.transactions?.length || 0);
    
    try {
        const { type, startDate, endDate, openingBalance, transactions, churchName, churchAddress, churchABN } = req.body;
        
        console.log('🔄 Validating request data...');
        if (type !== 'bank-statement') {
            console.log('❌ Invalid type:', type);
            return res.status(400).json({ error: 'Only bank-statement PDF generation is supported' });
        }
        
        if (!startDate || !endDate || !transactions) {
            console.log('❌ Missing required fields:', { startDate: !!startDate, endDate: !!endDate, transactions: !!transactions });
            return res.status(400).json({ error: 'Missing required fields: startDate, endDate, transactions' });
        }

        console.log('✅ Request validation passed');
        console.log('🔄 Calculating totals...');
        
        // Calculate totals
        let runningBalance = openingBalance || 0;
        let totalDebits = 0;
        let totalCredits = 0;
        
        transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                totalDebits += transaction.amount;
            } else {
                totalCredits += transaction.amount;
            }
        });
        
        const closingBalance = runningBalance + totalCredits - totalDebits;

        console.log('📊 Totals calculated:', { totalDebits, totalCredits, closingBalance });
        console.log('🔄 Generating HTML template...');

        // Generate HTML for the bank statement
        const statementHTML = generateBankStatementHTML({
            startDate,
            endDate,
            openingBalance: runningBalance,
            closingBalance,
            totalDebits,
            totalCredits,
            transactions,
            churchName: churchName || 'St. Michael Eritrean Orthodox Tewahedo Church',
            churchAddress: churchAddress || '60 Osborne Street, Joondanna, WA 6060',
            churchABN: churchABN || 'ABN: 80 798 549 161'
        });

        console.log('✅ HTML template generated, length:', statementHTML.length);
        console.log('🔄 Initializing PDF generator...');

        // Generate PDF using puppeteer (use singleton instance, not constructor)
        const pdfGenerator = require('../utils/pdfGenerator');
        
        console.log('🔄 Generating PDF with Puppeteer...');
        
        // Test: Try generating a simple PDF first
        try {
            console.log('🧪 Testing simple PDF generation...');
            const testHTML = '<html><body><h1>Test PDF</h1><p>This is a test.</p></body></html>';
            const testPdfBuffer = await pdfGenerator.generateBankStatementPDF(testHTML);
            console.log('✅ Test PDF generated successfully, size:', testPdfBuffer.length);
        } catch (testError) {
            console.error('❌ Test PDF generation failed:', testError.message);
        }
        
        const pdfBuffer = await pdfGenerator.generateBankStatementPDF(statementHTML);
        
        console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
        console.log('🔍 PDF buffer type:', typeof pdfBuffer);
        console.log('🔍 PDF buffer is Buffer:', Buffer.isBuffer(pdfBuffer));
        console.log('🔍 First 20 bytes:', pdfBuffer.slice(0, 20));
        
        // Test: Save PDF to file for debugging
        try {
            const fs = require('fs');
            const path = require('path');
            const testFilePath = path.join(__dirname, '..', 'test_bank_statement.pdf');
            fs.writeFileSync(testFilePath, pdfBuffer);
            console.log('🧪 Test PDF saved to:', testFilePath);
        } catch (saveError) {
            console.error('❌ Could not save test PDF:', saveError.message);
        }
        
        console.log('🔄 Setting response headers...');
        
        // Set response headers for PDF download with proper binary handling
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Financial_Statement_${startDate}_to_${endDate}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        console.log('📤 Sending PDF response as binary...');
        console.log('🔍 Response headers set:', res.getHeaders());
        
        // Send PDF as binary data (not JSON)
        res.end(pdfBuffer, 'binary');
        
        console.log('✅ PDF sent successfully');
        
    } catch (error) {
        console.error('❌ Error generating bank statement PDF:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to generate PDF',
            details: error.message 
        });
    }
});

// Helper function to generate bank statement HTML
function generateBankStatementHTML(data) {
    const { startDate, endDate, openingBalance, closingBalance, totalDebits, totalCredits, transactions, churchName, churchAddress, churchABN } = data;
    
    let runningBalance = openingBalance;
    
    const transactionRows = transactions.map(transaction => {
        const date = new Date(transaction.date).toLocaleDateString();
        const description = transaction.description || 'No description';
        const reference = transaction.reference || '-';
        const payeeName = transaction.payee?.name ? ` (${transaction.payee.name})` : '';
        
        let debit = '-';
        let credit = '-';
        
        if (transaction.type === 'expense') {
            debit = transaction.amount.toFixed(2);
            runningBalance -= transaction.amount;
        } else {
            credit = transaction.amount.toFixed(2);
            runningBalance += transaction.amount;
        }
        
        return `
            <tr>
                <td>${date}</td>
                <td>${description}${payeeName}</td>
                <td>${reference}</td>
                <td class="amount debit">${debit}</td>
                <td class="amount credit">${credit}</td>
                <td class="amount balance">${runningBalance.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Financial Statement</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 15px;
                    font-size: 11px;
                    line-height: 1.3;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #4a6fa5;
                    padding-bottom: 15px;
                }
                .church-name {
                    font-size: 22px;
                    font-weight: bold;
                    color: #4a6fa5;
                    margin-bottom: 8px;
                }
                .church-details {
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 4px;
                }
                .statement-title {
                    font-size: 18px;
                    font-weight: bold;
                    margin: 15px 0;
                    text-align: center;
                }
                .summary-section {
                    background: #f8f9fa;
                    padding: 12px;
                    border-radius: 5px;
                    margin-bottom: 15px;
                    font-size: 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }
                .summary-period {
                    flex: 1;
                    font-weight: bold;
                    font-size: 13px;
                    padding-right: 20px;
                }
                .summary-values {
                    flex: 1;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }
                .summary-item {
                    margin-bottom: 3px;
                }
                .summary-label {
                    color: #666;
                    font-weight: normal;
                    display: inline;
                }
                .summary-value {
                    color: #333;
                    font-weight: bold;
                    display: inline;
                    margin-left: 5px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                    font-size: 10px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 6px 4px;
                    text-align: left;
                }
                th {
                    background-color: #4a6fa5;
                    color: white;
                    font-weight: bold;
                    font-size: 10px;
                }
                .amount {
                    text-align: right;
                    font-family: monospace;
                    font-size: 10px;
                }
                .debit {
                    color: #dc3545;
                }
                .credit {
                    color: #28a745;
                }
                .balance {
                    font-weight: bold;
                    background-color: #f8f9fa;
                }
                .opening-row, .closing-row {
                    background-color: #f8f9fa;
                    font-weight: bold;
                }
                .closing-row {
                    border-top: 2px solid #4a6fa5;
                }
                .footer {
                    margin-top: 20px;
                    text-align: center;
                    font-size: 9px;
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 10px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="church-name">${churchName}</div>
                <div class="church-details">${churchAddress}</div>
                <div class="church-details">${churchABN}</div>
                <div class="church-details">Email: stmichaelerotc@gmail.com | Website: erotc.org</div>
            </div>

            <div class="statement-title">FINANCIAL STATEMENT</div>
            
            <div class="summary-section">
                <div class="summary-period">
                    <span class="summary-label">Statement Period:</span><br>
                    <span class="summary-value">${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}</span>
                </div>
                
                <div class="summary-values">
                    <div class="summary-item">
                        <span class="summary-label">Opening Balance:</span>
                        <span class="summary-value">$${openingBalance.toFixed(2)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Closing Balance:</span>
                        <span class="summary-value">$${closingBalance.toFixed(2)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Total Debits:</span>
                        <span class="summary-value">$${totalDebits.toFixed(2)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Total Credits:</span>
                        <span class="summary-value">$${totalCredits.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Reference</th>
                        <th>Debit</th>
                        <th>Credit</th>
                        <th>Balance</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="opening-row">
                        <td>${new Date(startDate).toLocaleDateString()}</td>
                        <td>Opening Balance</td>
                        <td>-</td>
                        <td class="amount">-</td>
                        <td class="amount">-</td>
                        <td class="amount balance">${openingBalance.toFixed(2)}</td>
                    </tr>
                    ${transactionRows}
                    <tr class="closing-row">
                        <td>${new Date(endDate).toLocaleDateString()}</td>
                        <td>Closing Balance</td>
                        <td>-</td>
                        <td class="amount">-</td>
                        <td class="amount">-</td>
                        <td class="amount balance">${closingBalance.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="footer">
                <p>This statement was generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                <p>${churchName} - Financial Statement</p>
            </div>
        </body>
        </html>
    `;
}

module.exports = router;
