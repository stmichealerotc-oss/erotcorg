const moment = require('moment');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables - when run from backend directory, .env is in current dir
require('dotenv').config();

// Import Transaction model
const transactionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  description: String,
  category: String,
  payee: {
    type: { type: String },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
    name: String
  },
  monthsCovered: [String]
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

async function checkCurrentMonthTransactions() {
  try {
    console.log('Connecting to database...');
    const connectionString = process.env.COSMOS_CONNECTION_STRING || process.env.MONGODB_URI;
    console.log('Connection string:', connectionString ? 'Found' : 'NOT FOUND');
    
    if (!connectionString) {
      console.error('❌ Connection string not found in environment variables');
      console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('COSMOS') || k.includes('MONGO')));
      return;
    }
    
    await mongoose.connect(connectionString);
    console.log('✅ Connected to database');
    console.log('');
    
    const currentMonthStart = moment().startOf('month').toDate();
    const currentMonthEnd = moment().endOf('month').toDate();
    
    console.log('📅 Current Month Range:');
    console.log(`   Start: ${moment(currentMonthStart).format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`   End: ${moment(currentMonthEnd).format('YYYY-MM-DD HH:mm:ss')}`);
    console.log('');
    
    const allTransactions = await Transaction.find({}).sort({ date: -1 });
    console.log(`📊 Total transactions in database: ${allTransactions.length}`);
    console.log('');
    
    const currentMonthTransactions = allTransactions.filter(tx => 
      moment(tx.date).isBetween(currentMonthStart, currentMonthEnd, null, '[]')
    );
    
    console.log(`📊 Transactions in current month (${moment().format('MMMM YYYY')}): ${currentMonthTransactions.length}`);
    console.log('');
    
    if (currentMonthTransactions.length > 0) {
      console.log('Current Month Transactions:');
      console.log('─'.repeat(80));
      currentMonthTransactions.forEach(tx => {
        const dateStr = moment(tx.date).format('YYYY-MM-DD');
        const typeStr = tx.type.padEnd(8);
        const amountStr = `$${tx.amount.toFixed(2)}`.padStart(12);
        const desc = (tx.description || 'No description').substring(0, 40);
        console.log(`  ${dateStr} | ${typeStr} | ${amountStr} | ${desc}`);
      });
      console.log('─'.repeat(80));
      console.log('');
      
      const income = currentMonthTransactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const expenses = currentMonthTransactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      console.log('💰 Current Month Totals:');
      console.log(`   Income:   $${income.toFixed(2)}`);
      console.log(`   Expenses: $${expenses.toFixed(2)}`);
      console.log(`   Net:      $${(income - expenses).toFixed(2)}`);
      console.log('');
      
      // Show breakdown by category
      const incomeByCategory = {};
      const expensesByCategory = {};
      
      currentMonthTransactions.forEach(tx => {
        const category = tx.category || 'Uncategorized';
        if (tx.type === 'income') {
          incomeByCategory[category] = (incomeByCategory[category] || 0) + tx.amount;
        } else {
          expensesByCategory[category] = (expensesByCategory[category] || 0) + tx.amount;
        }
      });
      
      if (Object.keys(incomeByCategory).length > 0) {
        console.log('📈 Income by Category:');
        Object.entries(incomeByCategory)
          .sort((a, b) => b[1] - a[1])
          .forEach(([category, amount]) => {
            console.log(`   ${category.padEnd(30)} $${amount.toFixed(2)}`);
          });
        console.log('');
      }
      
      if (Object.keys(expensesByCategory).length > 0) {
        console.log('📉 Expenses by Category:');
        Object.entries(expensesByCategory)
          .sort((a, b) => b[1] - a[1])
          .forEach(([category, amount]) => {
            console.log(`   ${category.padEnd(30)} $${amount.toFixed(2)}`);
          });
        console.log('');
      }
    } else {
      console.log('⚠️  No transactions found for current month');
      console.log('');
      console.log('📋 Recent transactions (last 10):');
      console.log('─'.repeat(80));
      allTransactions.slice(0, 10).forEach(tx => {
        const dateStr = moment(tx.date).format('YYYY-MM-DD');
        const typeStr = tx.type.padEnd(8);
        const amountStr = `$${tx.amount.toFixed(2)}`.padStart(12);
        const desc = (tx.description || 'No description').substring(0, 40);
        console.log(`  ${dateStr} | ${typeStr} | ${amountStr} | ${desc}`);
      });
      console.log('─'.repeat(80));
      console.log('');
    }
    
    // Show monthly summary for last 6 months
    console.log('📊 Monthly Summary (Last 6 Months):');
    console.log('─'.repeat(80));
    for (let i = 5; i >= 0; i--) {
      const monthStart = moment().subtract(i, 'months').startOf('month').toDate();
      const monthEnd = moment().subtract(i, 'months').endOf('month').toDate();
      const monthName = moment().subtract(i, 'months').format('MMM YYYY');
      
      const monthTransactions = allTransactions.filter(tx => 
        moment(tx.date).isBetween(monthStart, monthEnd, null, '[]')
      );
      
      const monthIncome = monthTransactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const monthExpenses = monthTransactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const monthNet = monthIncome - monthExpenses;
      
      console.log(`  ${monthName.padEnd(12)} | Income: $${monthIncome.toFixed(2).padStart(10)} | Expenses: $${monthExpenses.toFixed(2).padStart(10)} | Net: $${monthNet.toFixed(2).padStart(10)}`);
    }
    console.log('─'.repeat(80));
    
    await mongoose.disconnect();
    console.log('');
    console.log('✅ Disconnected from database');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

checkCurrentMonthTransactions();
