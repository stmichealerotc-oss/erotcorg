console.log("🧪 reports.js loaded at", new Date().toISOString());

class ReportsPage {
    constructor() {
        this.currentReport = null;
        this.allReports = [];
        this.monthlyChart = null;
        this.selectedReportSlot = null;
        this.init();
    }

    async init() {
        console.log('🧪 ReportsPage.init() called');
        
        // Load Chart.js if not already loaded
        if (!window.Chart && window.mainApp) {
            await window.mainApp.loadChartJS();
        }
        
        await this.loadAllReports();
        this.setupEventListeners();
        this.updatePeriodOptions();
        this.showScreen('reports-list-screen');
        console.log('✅ Reports page initialized');
    }

    async loadAllReports() {
        try {
            // Use the authenticated API class instead of direct fetch
            this.allReports = await API.get('/reports/all-slots');
            this.renderAllReports();
            
        } catch (error) {
            console.error('Failed to load reports:', error);
            this.renderAllReports(); // Show empty state
        }
    }

    renderAllReports() {
        // Try both container IDs for compatibility
        const container = document.getElementById('all-reports') || document.getElementById('reports-list-container');
        if (!container) {
            console.warn('Reports list container not found');
            return;
        }

        container.innerHTML = '';

        if (this.allReports.length === 0) {
            container.innerHTML = '<p class="no-reports">No reports available.</p>';
            return;
        }

        this.allReports.forEach(reportSlot => {
            const reportElement = document.createElement('div');
            reportElement.className = `report-item ${reportSlot.status}`;
            
            const statusBadge = reportSlot.status === 'pending' 
                ? '<span class="report-status pending">PENDING</span>'
                : '<span class="report-status generated">SUBMITTED</span>';
            
            // Format due date
            const dueDate = reportSlot.dueDate ? new Date(reportSlot.dueDate).toLocaleDateString('en-US', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            }) : 'No due date';
            
            // Format submitted date
            const submittedDate = reportSlot.submittedDate ? new Date(reportSlot.submittedDate).toLocaleDateString('en-US', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            }) : 'Not yet submitted';
            
            const dateInfo = reportSlot.status === 'generated' 
                ? `<div class="report-dates">
                    <small><strong>Due:</strong> ${dueDate}</small>
                    <small><strong>Submitted:</strong> ${submittedDate}</small>
                </div>`
                : `<div class="report-dates">
                    <small><strong>Due:</strong> ${dueDate}</small>
                    <small class="text-warning"><strong>Status:</strong> Not yet submitted</small>
                </div>`;
            
            const summaryInfo = reportSlot.status === 'generated'
                ? `<div class="report-item-summary">
                    <span>Income: $${reportSlot.totalIncome?.toFixed(2) || '0.00'}</span>
                    <span>Expenses: $${reportSlot.totalExpenses?.toFixed(2) || '0.00'}</span>
                    <span>Net: $${reportSlot.netBalance?.toFixed(2) || '0.00'}</span>
                </div>`
                : '';
            
            const actionButton = reportSlot.status === 'pending'
                ? `<button class="btn btn-sm btn-primary" onclick="reportsPage.openGenerateModal('${reportSlot.type}', ${reportSlot.year}, ${reportSlot.quarter || null})">
                    Generate Report
                </button>`
                : `<button class="btn btn-sm btn-primary" onclick="reportsPage.viewReport('${reportSlot.reportId}')">
                    View Report
                </button>`;
            
            reportElement.innerHTML = `
                <div class="report-item-header">
                    <h4>${reportSlot.label} ${statusBadge}</h4>
                    ${dateInfo}
                </div>
                ${summaryInfo}
                ${actionButton}
            `;
            container.appendChild(reportElement);
        });
    }

    setupEventListeners() {
        console.log("🔧 Setting up event listeners...");

        // Generate report button
        const generateBtn = document.getElementById('generate-report-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateReport());
        }

        // Report type change
        const reportType = document.getElementById('report-type');
        if (reportType) {
            reportType.addEventListener('change', () => this.updatePeriodOptions());
        }

        // Back to list button
        const backBtn = document.getElementById('back-to-list-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.showReportsList());
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-reports-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadPreviousReports());
        }
    }

    // Screen management
    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }

    showReportsList() {
        this.showScreen('reports-list-screen');
    }

    showReportDetail() {
        this.showScreen('report-detail-screen');
    }

    async generateReport() {
        try {
            const type = document.getElementById('report-type').value;
            const year = document.getElementById('report-year').value;
            const quarter = type === 'quarterly' ? document.getElementById('report-quarter').value : null;

            console.log('📊 Generating report:', { type, year, quarter });

            if (!type || !year) {
                this.showNotification('Please select report type and year', 'error');
                return;
            }

            // Show loading state
            this.showLoading();

            // Load financial data from API
            const financialData = await this.loadFinancialData();
            console.log('✅ Financial data loaded');

            // Generate report from actual data
            const report = await this.generateReportData(type, year, quarter, financialData);
            
            if (!report) {
                throw new Error('No data available for selected period');
            }

            this.currentReport = report;
            
            // Save and display report
            await this.saveReport(this.currentReport);
            this.renderReport(this.currentReport);
            this.showReportDetail();
            await this.loadPreviousReports();

            this.showNotification('Report generated successfully!', 'success');

        } catch (error) {
            console.error('❌ Error generating report:', error);
            this.showNotification('Failed to generate report: ' + error.message, 'error');
        }
    }

    updatePeriodOptions() {
        const typeEl = document.getElementById('report-type');
        if (!typeEl) return;
        const type = typeEl.value;
        const periodContainer = document.getElementById('period-container');
        if (!periodContainer) return;

        if (type === 'annual') {
            periodContainer.innerHTML = this.createAnnualControls();
        } else {
            periodContainer.innerHTML = this.createQuarterlyControls();
        }
    }

    createAnnualControls() {
        const currentYear = new Date().getFullYear();
        return `
            <div class="form-group">
                <label for="report-year" class="form-label">Year</label>
                <select id="report-year" class="form-control">
                    ${this.generateYearOptions(currentYear)}
                </select>
            </div>
        `;
    }

    createQuarterlyControls() {
        const currentYear = new Date().getFullYear();
        const currentQuarter = Math.floor((new Date().getMonth() + 3) / 3);
        
        return `
            <div class="form-group">
                <label for="report-year" class="form-label">Year</label>
                <select id="report-year" class="form-control">
                    ${this.generateYearOptions(currentYear)}
                </select>
            </div>
            <div class="form-group">
                <label for="report-quarter" class="form-label">Quarter</label>
                <select id="report-quarter" class="form-control">
                    <option value="1" ${currentQuarter === 1 ? 'selected' : ''}>Q1 (Jan-Mar)</option>
                    <option value="2" ${currentQuarter === 2 ? 'selected' : ''}>Q2 (Apr-Jun)</option>
                    <option value="3" ${currentQuarter === 3 ? 'selected' : ''}>Q3 (Jul-Sep)</option>
                    <option value="4" ${currentQuarter === 4 ? 'selected' : ''}>Q4 (Oct-Dec)</option>
                </select>
            </div>
        `;
    }

    generateYearOptions(currentYear) {
        let options = '';
        for (let year = currentYear; year >= currentYear - 5; year--) {
            const selected = year === currentYear ? 'selected' : '';
            options += `<option value="${year}" ${selected}>${year}</option>`;
        }
        return options;
    }

  async loadFinancialData() {
    try {
        // Use your API utility, which respects window.API_BASE_URL
        const data = await API.get('/accounting');
        return { transactions: data.transactions || [] };
    } catch (error) {
        console.error('Error loading financial data:', error);
        // Fallback to sample data for demo
        return this.getSampleFinancialData();
    }
}


    getSampleFinancialData() {
        // Sample data for demonstration
        return {
            transactions: [
                { date: '2024-01-15', type: 'income', category: 'donations', amount: 5000, description: 'Weekly offering' },
                { date: '2024-01-20', type: 'income', category: 'tithes', amount: 3000, description: 'Monthly tithes' },
                { date: '2024-01-05', type: 'expense', category: 'utilities', amount: 800, description: 'Electricity bill' },
                { date: '2024-01-10', type: 'expense', category: 'salaries', amount: 2000, description: 'Staff salary' },
                { date: '2024-02-15', type: 'income', category: 'donations', amount: 4500, description: 'Weekly offering' },
                { date: '2024-02-20', type: 'income', category: 'events', amount: 1500, description: 'Church event' },
                { date: '2024-02-05', type: 'expense', category: 'maintenance', amount: 600, description: 'Building maintenance' }
            ]
        };
    }

    async generateReportData(type, year, quarter, financialData) {
        const transactions = financialData.transactions || [];
        const dateRange = this.getPeriodDateRange(type, parseInt(year), quarter);
        
        if (!dateRange) {
            throw new Error('Invalid period selected');
        }

        console.log('📅 Filtering transactions for period:', dateRange);

        // Filter transactions by date range
        const filteredTransactions = transactions.filter(transaction => {
            if (!transaction.date) return false;
            const transactionDate = new Date(transaction.date);
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);
            
            // Set end date to end of day (23:59:59.999) to include all transactions on the last day
            endDate.setHours(23, 59, 59, 999);
            
            return transactionDate >= startDate && transactionDate <= endDate;
        });

        console.log(`✅ Found ${filteredTransactions.length} transactions`);

        if (filteredTransactions.length === 0) {
            return null;
        }

        // Calculate report data
        const incomeByCategory = this.calculateCategoryTotals(filteredTransactions, 'income');
        const expensesByCategory = this.calculateCategoryTotals(filteredTransactions, 'expense');
        
        const totalIncome = this.calculateTotal(incomeByCategory);
        const totalExpenses = this.calculateTotal(expensesByCategory);
        const netBalance = totalIncome - totalExpenses;
        const monthlyOverview = this.generateMonthlyOverview(filteredTransactions, dateRange);

        return {
            id: Date.now().toString(),
            type,
            year: parseInt(year),
            quarter,
            period: type === 'annual' ? `Annual Report ${year}` : `Q${quarter} Report ${year}`,
            dateRange: `${this.formatDate(dateRange.start)} - ${this.formatDate(dateRange.end)}`,
            incomeByCategory,
            expensesByCategory,
            totalIncome,
            totalExpenses,
            netBalance,
            monthlyOverview,
            generatedAt: new Date().toISOString(),
            transactionCount: filteredTransactions.length
        };
    }

    getPeriodDateRange(type, year, quarter) {
        if (type === 'annual') {
            return {
                start: `${year}-01-01`,
                end: `${year}-12-31`
            };
        } else {
            const quarterRanges = {
                1: { start: `${year}-01-01`, end: `${year}-03-31` },
                2: { start: `${year}-04-01`, end: `${year}-06-30` },
                3: { start: `${year}-07-01`, end: `${year}-09-30` },
                4: { start: `${year}-10-01`, end: `${year}-12-31` }
            };
            
            return quarterRanges[quarter] || null;
        }
    }

    calculateCategoryTotals(transactions, type) {
        const categoryTotals = {};
        
        transactions
            .filter(transaction => transaction.type === type)
            .forEach(transaction => {
                const category = transaction.category || 'Uncategorized';
                categoryTotals[category] = (categoryTotals[category] || 0) + (transaction.amount || 0);
            });

        return categoryTotals;
    }

    calculateTotal(categoryTotals) {
        return Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
    }

    generateMonthlyOverview(transactions, dateRange) {
        const months = [];
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        
        let current = new Date(start.getFullYear(), start.getMonth(), 1);
        
        while (current <= end) {
            const monthKey = current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
            const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
            
            // Set monthEnd to end of day to include all transactions on the last day of the month
            monthEnd.setHours(23, 59, 59, 999);
            
            const monthTransactions = transactions.filter(transaction => {
                if (!transaction.date) return false;
                const transactionDate = new Date(transaction.date);
                return transactionDate >= monthStart && transactionDate <= monthEnd;
            });
            
            const income = monthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + (t.amount || 0), 0);
                
            const expenses = monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + (t.amount || 0), 0);
            
            months.push({ 
                month: monthKey, 
                income, 
                expenses, 
                net: income - expenses,
                transactionCount: monthTransactions.length 
            });
            current.setMonth(current.getMonth() + 1);
        }
        
        return months;
    }

    formatDate(dateString) {
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

async loadPreviousReports() {
    try {
        const response = await API.get('/reports'); // <-- use API class
        if (response.error) throw new Error(response.message);
        this.reportsList = response;
        this.renderReportsList();
    } catch (error) {
        console.error('Failed to load previous reports:', error);
        this.reportsList = [];
        this.renderReportsList();
    }
}

    async saveReport(report) {
        try {
            console.log('📤 Saving report:', report);

            // Use authenticated API class
            const data = await API.post('/reports/save', report);

            console.log('✅ Report saved successfully:', data);
            return data;
            console.log('✅ Report saved successfully:', data);
            return data;

        } catch (error) {
            console.error('Error saving report:', error);
        }
    }

    loadReport(reportId) {
        const report = this.reportsList.find(r => r.id === reportId);
        if (report) {
            this.currentReport = report;
            this.renderReport(report);
            this.showReportDetail();
        }
    }

    renderReport(report) {
        if (!report) return;

        const reportContent = document.getElementById('report-content');
        if (reportContent) {
            reportContent.innerHTML = this.createReportHTML(report);
            this.renderCharts(report);
        }
    }

    createReportHTML(report) {
        const income = report.incomeByCategory || {};
        const expenses = report.expensesByCategory || {};
        const monthlyData = report.monthlyOverview || [];

        return `
            <div class="report-header">
                <h3>${report.period}</h3>
                <div class="report-meta">
                    <span><i class="fas fa-calendar"></i> ${report.dateRange}</span>
                    <span><i class="fas fa-file-invoice"></i> ${report.transactionCount} transactions</span>
                    <span><i class="fas fa-clock"></i> ${new Date(report.generatedAt).toLocaleDateString()}</span>
                </div>
            </div>

            <div class="report-sections">
                <!-- Summary -->
                <div class="report-section full-width">
                    <h4><i class="fas fa-chart-line"></i> Financial Summary</h4>
                    <table class="reports-table">
                        <tr><td>Total Income:</td><td>$${report.totalIncome.toLocaleString()}</td></tr>
                        <tr><td>Total Expenses:</td><td>$${report.totalExpenses.toLocaleString()}</td></tr>
                        <tr class="total-row"><td><strong>Net Income:</strong></td><td><strong>$${report.netBalance.toLocaleString()}</strong></td></tr>
                    </table>
                </div>

                <!-- Income Breakdown -->
                <div class="report-section">
                    <h4><i class="fas fa-money-bill-wave"></i> Income Breakdown</h4>
                    ${Object.keys(income).length ? `
                        <table class="reports-table">
                            ${Object.entries(income).map(([cat, amt]) => `
                                <tr><td>${this.formatCategoryName(cat)}</td><td>$${amt.toLocaleString()}</td></tr>
                            `).join('')}
                        </table>
                        <div class="chart-container"><canvas id="income-chart"></canvas></div>
                    ` : `<p class="empty-state">No income data available</p>`}
                </div>

                <!-- Expense Breakdown -->
                <div class="report-section">
                    <h4><i class="fas fa-credit-card"></i> Expense Breakdown</h4>
                    ${Object.keys(expenses).length ? `
                        <table class="reports-table">
                            ${Object.entries(expenses).map(([cat, amt]) => `
                                <tr><td>${this.formatCategoryName(cat)}</td><td>$${amt.toLocaleString()}</td></tr>
                            `).join('')}
                        </table>
                        <div class="chart-container"><canvas id="expense-chart"></canvas></div>
                    ` : `<p class="empty-state">No expense data available</p>`}
                </div>

                <!-- Monthly Overview -->
                ${monthlyData.length ? `
                <div class="report-section full-width">
                    <h4><i class="fas fa-chart-bar"></i> Monthly Overview</h4>
                    <table class="reports-table">
                        <thead>
                            <tr>
                                <th>Month</th><th>Income</th><th>Expenses</th><th>Net</th><th>Transactions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${monthlyData.map(m => `
                                <tr>
                                    <td>${m.month}</td>
                                    <td>$${m.income.toLocaleString()}</td>
                                    <td>$${m.expenses.toLocaleString()}</td>
                                    <td style="color:${m.net>=0?'#10b981':'#ef4444'}">$${m.net.toLocaleString()}</td>
                                    <td>${m.transactionCount}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="chart-container"><canvas id="monthly-chart"></canvas></div>
                </div>
                ` : ''}
            </div>

            <div class="report-actions">
                <button class="btn btn-primary" onclick="reportsPage.exportPDF()">
                    <i class="fas fa-download"></i> Export PDF
                </button>
                <button class="btn btn-secondary" onclick="reportsPage.printReport()">
                    <i class="fas fa-print"></i> Print Report
                </button>
            </div>
        `;
    }

    formatCategoryName(category) {
        return category.replace(/_/g, ' ')
                      .replace(/\b\w/g, l => l.toUpperCase());
    }

    renderCharts(report) {
        const income = report.incomeByCategory || {};
        const expenses = report.expensesByCategory || {};
        const monthlyData = report.monthlyOverview || [];

        // Income Chart
        if (Object.keys(income).length > 0) {
            const incomeCtx = document.getElementById('income-chart');
            if (incomeCtx) {
                new Chart(incomeCtx, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(income).map(this.formatCategoryName),
                        datasets: [{
                            data: Object.values(income),
                            backgroundColor: ['#4361ee', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0']
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'bottom' }
                        }
                    }
                });
            }
        }

        // Expense Chart
        if (Object.keys(expenses).length > 0) {
            const expenseCtx = document.getElementById('expense-chart');
            if (expenseCtx) {
                new Chart(expenseCtx, {
                    type: 'pie',
                    data: {
                        labels: Object.keys(expenses).map(this.formatCategoryName),
                        datasets: [{
                            data: Object.values(expenses),
                            backgroundColor: ['#ff6b6b', '#ff9e6b', '#ffd166', '#06d6a0', '#118ab2']
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'bottom' }
                        }
                    }
                });
            }
        }

        // Monthly Chart
        if (monthlyData.length > 0) {
            const monthlyCtx = document.getElementById('monthly-chart');
            if (monthlyCtx) {
                new Chart(monthlyCtx, {
                    type: 'bar',
                    data: {
                        labels: monthlyData.map(m => m.month),
                        datasets: [
                            {
                                label: 'Income',
                                data: monthlyData.map(m => m.income),
                                backgroundColor: '#10b981'
                            },
                            {
                                label: 'Expenses',
                                data: monthlyData.map(m => m.expenses),
                                backgroundColor: '#ef4444'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Monthly Income vs Expenses'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return '$' + value;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }
    }

    renderReportsList() {
        const container = document.getElementById('previous-reports');
        if (!container) return;

        if (this.reportsList.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <i class="fas fa-file-alt"></i>
                        <p>No reports generated yet. Create your first report to see it here.</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Use real data from reportsList (loaded from API)
        container.innerHTML = this.reportsList.map(report => {
            const dueDate = report.dueDate ? new Date(report.dueDate).toLocaleDateString('en-US', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            }) : 'No due date';
            
            const submittedDate = report.generatedAt ? new Date(report.generatedAt).toLocaleDateString('en-US', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            }) : 'Not yet submitted';
            
            const statusClass = report.status === 'generated' ? 'status-submitted' : 'status-pending';
            const statusIcon = report.status === 'generated' ? 'fa-check' : 'fa-clock';
            const statusText = report.status === 'generated' ? 'Submitted' : 'Pending';
            
            return `
                <tr onclick="reportsPage.loadReport('${report.id || report._id}')">
                    <td><strong>${report.period || report.label}</strong></td>
                    <td>${dueDate}</td>
                    <td>${submittedDate}</td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            <i class="fas ${statusIcon}"></i>
                            ${statusText}
                        </span>
                    </td>
                    <td>
                        ${report.status === 'generated' 
                            ? '<a href="#" class="action-btn"><i class="fas fa-eye"></i> View Report</a>' 
                            : '—'}
                    </td>
                </tr>
            `;
        }).join('');
    }

    showLoading() {
        const reportContent = document.getElementById('report-content');
        if (reportContent) {
            reportContent.innerHTML = `
                <div class="empty-state">
                    <div class="loading-spinner"></div>
                    <p>Generating financial report...</p>
                </div>
            `;
        }
    }

    printReport() {
        if (!this.currentReport) {
            this.showNotification('No report to print', 'error');
            return;
        }
        window.print();
    }

    exportPDF() {
        if (!this.currentReport) {
            this.showNotification('No report to export', 'error');
            return;
        }
        this.showNotification('PDF export feature coming soon!', 'info');
    }

    showNotification(message, type = 'info') {
        // Simple notification implementation
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 12px 20px;
            border-radius: 5px;
            z-index: 10000;
            box-shadow: var(--shadow-lg);
        `;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            ${message}
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    openGenerateModal(type, year, quarter) {
        this.selectedReportSlot = { type, year, quarter };
        
        const modal = document.getElementById('generate-modal');
        const modalPeriod = document.getElementById('modal-period');
        const modalNotes = document.getElementById('modal-notes-input');
        
        if (!modal) {
            console.error('Generate modal not found');
            return;
        }
        
        if (modalPeriod) {
            if (type === 'quarterly') {
                modalPeriod.textContent = `Q${quarter} ${year}`;
            } else {
                modalPeriod.textContent = `Annual ${year}`;
            }
        }
        
        if (modalNotes) {
            modalNotes.value = '';
        }
        
        modal.style.display = 'flex';
    }

    closeGenerateModal() {
        const modal = document.getElementById('generate-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.selectedReportSlot = null;
    }

    async viewReport(reportId) {
        try {
            // Use authenticated API class
            const report = await API.get(`/reports/${reportId}`);
            this.currentReport = report;
            
            // If there's a renderReport method, use it
            if (typeof this.renderReport === 'function') {
                this.renderReport(report);
            } else {
                // Otherwise show report detail screen
                this.showReportDetail();
            }
            
        } catch (error) {
            console.error('Error loading report:', error);
            alert('Failed to load report: ' + error.message);
        }
    }
}

// Make available globally
window.ReportsPage = ReportsPage;

// Loader function
window.loadReports = function() {
    console.log("🚀 loadReports() function called");
    
    if (typeof ReportsPage !== 'undefined') {
        console.log("📊 Initializing ReportsPage");
        window.reportsPage = new ReportsPage();
    } else {
        console.error("❌ ReportsPage class not defined");
    }
};

// Auto-initialize
document.addEventListener('DOMContentLoaded', window.loadReports);