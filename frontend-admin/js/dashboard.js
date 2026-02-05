class Dashboard {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadDashboardData();
        this.setTodayDate();
    }

    setTodayDate() {
        const today = new Date();
        const el = document.getElementById('today-date');
        if (el) {
            el.textContent = today.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    async loadDashboardData() {
        try {
            const accountingData = await API.get('/accounting');

            const incomeEl = document.getElementById('monthly-income');
            const netEl = document.getElementById('month-net');
            if (incomeEl && netEl && accountingData.currentMonth) {
                incomeEl.textContent = `$${accountingData.currentMonth.income.toLocaleString()}`;
                netEl.textContent = `$${accountingData.currentMonth.net.toLocaleString()}`;
            }

            if (accountingData.transactions) {
                this.renderRecentActivity(accountingData.transactions.slice(0, 5));
            }

            if (accountingData.monthlyTrend) {
                this.renderFinancialChart(accountingData.monthlyTrend);
            }

            const membersData = await API.get('/members');
            const membersEl = document.getElementById('total-members');
            if (membersEl && membersData.total != null) {
                membersEl.textContent = membersData.total;
            }

            const inventoryData = await API.get('/inventory');

            // Total items
            const itemsEl = document.getElementById('total-items');
            if (itemsEl && inventoryData.totalItems != null) {
                itemsEl.textContent = inventoryData.totalItems;
            }

            // Low stock alert
            this.renderInventoryAlerts(inventoryData.items || []);

            // Calculate and display total assets
            await this.calculateTotalAssets(accountingData, inventoryData);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async calculateTotalAssets(accountingData, inventoryData) {
        try {
            console.log('🔍 Calculating total assets on dashboard...');
            
            // Calculate from transactions array (frontend calculation)
            let totalContributions = 0;
            let totalExpenses = 0;
            
            if (accountingData.transactions && Array.isArray(accountingData.transactions)) {
                totalContributions = accountingData.transactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + (t.amount || 0), 0);
                
                totalExpenses = accountingData.transactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + (t.amount || 0), 0);
                
                console.log('✅ Dashboard calculation:', {
                    totalTransactions: accountingData.transactions.length,
                    incomeTransactions: accountingData.transactions.filter(t => t.type === 'income').length,
                    expenseTransactions: accountingData.transactions.filter(t => t.type === 'expense').length,
                    totalContributions: totalContributions,
                    totalExpenses: totalExpenses
                });
            }
            
            // Total assets = income - expenses
            const totalAssets = totalContributions - totalExpenses;
            
            // Update display
            const totalAssetsEl = document.getElementById('total-assets');
            if (totalAssetsEl) {
                totalAssetsEl.textContent = `$${totalAssets.toLocaleString()}`;
            }
            
            console.log('✅ Dashboard total assets displayed:', { totalContributions, totalAssets });
            
        } catch (error) {
            console.error('Error calculating total assets:', error);
        }
    }

    renderRecentActivity(transactions) {
        const tbody = document.querySelector('#recent-activity-table tbody');
        if (!tbody) return;
        // If no transactions, show sample data
        if (!transactions || transactions.length === 0) {
            transactions = [
                {
                    date: new Date().toISOString(),
                    description: 'Sunday Offering',
                    amount: 1250.00,
                    type: 'income'
                },
                {
                    date: new Date(Date.now() - 86400000).toISOString(),
                    description: 'Utility Bill Payment',
                    amount: 350.00,
                    type: 'expense'
                },
                {
                    date: new Date(Date.now() - 172800000).toISOString(),
                    description: 'Building Fund Donation',
                    amount: 500.00,
                    type: 'income'
                },
                {
                    date: new Date(Date.now() - 259200000).toISOString(),
                    description: 'Office Supplies',
                    amount: 125.00,
                    type: 'expense'
                },
                {
                    date: new Date(Date.now() - 345600000).toISOString(),
                    description: 'Tithe Collection',
                    amount: 2100.00,
                    type: 'income'
                }
            ];
        }
        
        tbody.innerHTML = transactions.map(transaction => `
            <tr>
                <td>${new Date(transaction.date).toLocaleDateString()}</td>
                <td>${transaction.description}</td>
                <td>$${transaction.amount.toLocaleString()}</td>
                <td><span class="badge ${transaction.type === 'income' ? 'badge-success' : 'badge-danger'}">${transaction.type}</span></td>
            </tr>
        `).join('');
    }

    renderInventoryAlerts(items) {
        const tbody = document.querySelector('#inventory-alerts tbody');
        if (!tbody) return;

        // If no items, show sample data
        if (!items || !Array.isArray(items) || items.length === 0) {
            items = [
                { name: 'Communion Bread', quantity: 2, lowStockThreshold: 5 },
                { name: 'Candles', quantity: 1, lowStockThreshold: 3 },
                { name: 'Offering Envelopes', quantity: 15, lowStockThreshold: 20 },
                { name: 'Cleaning Supplies', quantity: 0, lowStockThreshold: 2 }
            ];
        }

        const lowStockItems = items.filter(item => {
            const quantity = item.quantity ?? item.currentStock ?? 0;
            const threshold = item.lowStockThreshold ?? item.reorderLevel ?? 0;
            return quantity <= threshold;
        });

        tbody.innerHTML = lowStockItems.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity ?? item.currentStock}</td>
                <td><span class="badge badge-warning">Low Stock</span></td>
            </tr>
        `).join('');
    }

    renderFinancialChart(monthlyData) {
        const chartContainer = document.getElementById('financial-chart');
        if (!chartContainer) return;

        // Calculate max value from income and expenses for scaling
        const maxValue = Math.max(
            ...monthlyData.flatMap(month => [month.income, month.expenses])
        );

        chartContainer.innerHTML = `
            <div style="display: flex; align-items: end; height: 200px; gap: 20px; padding: 20px 0;">
                ${monthlyData.map(month => `
                    <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                        <div style="display: flex; align-items: end; height: 150px; gap: 2px;">
                            <div 
                                style="background: #3498db; height: ${(month.income / maxValue) * 100}%; width: 20px; position: relative; cursor: pointer;"
                                data-tooltip="$${month.income.toLocaleString()}"
                            ></div>
                            <div 
                                style="background: #e74c3c; height: ${(month.expenses / maxValue) * 100}%; width: 20px; position: relative; cursor: pointer;"
                                data-tooltip="$${month.expenses.toLocaleString()}"
                            ></div>
                        </div>
                        <div style="margin-top: 10px;">${month.month}</div>
                    </div>
                `).join('')}
            </div>
            <div style="display: flex; gap: 20px; justify-content: center; margin-top: 20px;">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="width: 15px; height: 15px; background: #3498db;"></div>
                    <span>Income</span>
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="width: 15px; height: 15px; background: #e74c3c;"></div>
                    <span>Expenses</span>
                </div>
            </div>
        `;

        // Add tooltip functionality
        const bars = chartContainer.querySelectorAll('div[data-tooltip]');
        bars.forEach(bar => {
            bar.addEventListener('mouseenter', e => {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = bar.getAttribute('data-tooltip');
                document.body.appendChild(tooltip);

                const rect = bar.getBoundingClientRect();
                tooltip.style.position = 'fixed';
                tooltip.style.left = rect.left + rect.width / 2 + 'px';
                tooltip.style.top = rect.top - 30 + 'px';
                tooltip.style.transform = 'translateX(-50%)';
                tooltip.style.padding = '4px 8px';
                tooltip.style.background = 'rgba(0,0,0,0.75)';
                tooltip.style.color = '#fff';
                tooltip.style.borderRadius = '4px';
                tooltip.style.fontSize = '0.75rem';
                tooltip.style.pointerEvents = 'none';
                tooltip.style.zIndex = '10000';

                bar._tooltip = tooltip;
            });

            bar.addEventListener('mouseleave', e => {
                if (bar._tooltip) {
                    bar._tooltip.remove();
                    bar._tooltip = null;
                }
            });
        });
    }
}

// Global loader function
window.loadDashboard = function() {
    console.log('Loading dashboard page');
    try {
        window.dashboardPage = new Dashboard();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
};

console.log("✅ dashboard.js loaded successfully");