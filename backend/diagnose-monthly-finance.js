const moment = require('moment');

// Simulate the current date (February 25, 2026)
const now = moment('2026-02-25');

console.log('Current Date:', now.format('YYYY-MM-DD'));
console.log('');

// Calculate current month range
const currentMonthStart = now.clone().startOf('month').toDate();
const currentMonthEnd = now.clone().endOf('month').toDate();

console.log('Current Month Range:');
console.log('  Start:', moment(currentMonthStart).format('YYYY-MM-DD HH:mm:ss'));
console.log('  End:', moment(currentMonthEnd).format('YYYY-MM-DD HH:mm:ss'));
console.log('');

// Test sample transactions
const sampleTransactions = [
  { date: '2026-02-01', type: 'income', amount: 1000, description: 'Feb 1st' },
  { date: '2026-02-15', type: 'income', amount: 2000, description: 'Feb 15th' },
  { date: '2026-02-25', type: 'expense', amount: 500, description: 'Feb 25th (today)' },
  { date: '2026-02-28', type: 'income', amount: 1500, description: 'Feb 28th (last day)' },
  { date: '2026-01-15', type: 'income', amount: 3000, description: 'January' },
  { date: '2026-03-01', type: 'income', amount: 4000, description: 'March' },
];

console.log('Testing isBetween method:');
sampleTransactions.forEach(tx => {
  const txDate = moment(tx.date);
  const isInRange = txDate.isBetween(currentMonthStart, currentMonthEnd, null, '[]');
  console.log(`  ${tx.description}: ${isInRange ? '✅ INCLUDED' : '❌ EXCLUDED'}`);
});

console.log('');

// Calculate totals using isBetween
const currentMonthTransactions = sampleTransactions.filter(tx => 
  moment(tx.date).isBetween(currentMonthStart, currentMonthEnd, null, '[]')
);

const income = currentMonthTransactions
  .filter(tx => tx.type === 'income')
  .reduce((sum, tx) => sum + tx.amount, 0);

const expenses = currentMonthTransactions
  .filter(tx => tx.type === 'expense')
  .reduce((sum, tx) => sum + tx.amount, 0);

console.log('Current Month Totals (using isBetween):');
console.log(`  Income: ${income}`);
console.log(`  Expenses: ${expenses}`);
console.log(`  Net: ${income - expenses}`);
console.log('');

// Alternative method: using year and month comparison
console.log('Testing alternative method (year/month comparison):');
const currentYear = now.year();
const currentMonth = now.month(); // 0-indexed (0 = January, 1 = February)

const altCurrentMonthTransactions = sampleTransactions.filter(tx => {
  const txDate = moment(tx.date);
  return txDate.year() === currentYear && txDate.month() === currentMonth;
});

const altIncome = altCurrentMonthTransactions
  .filter(tx => tx.type === 'income')
  .reduce((sum, tx) => sum + tx.amount, 0);

const altExpenses = altCurrentMonthTransactions
  .filter(tx => tx.type === 'expense')
  .reduce((sum, tx) => sum + tx.amount, 0);

console.log('Current Month Totals (using year/month):');
console.log(`  Income: ${altIncome}`);
console.log(`  Expenses: ${altExpenses}`);
console.log(`  Net: ${altIncome - altExpenses}`);
