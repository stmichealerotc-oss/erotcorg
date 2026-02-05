(function() {
    class MemberProfile {
        constructor() {
            this.currentMemberId = null;
            this.currentMember = null;
            this.activityFilters = {};
            this.allActivity = [];
            this.allMembers = [];
        }

        async init() {
            this.currentMemberId = this.getMemberId();
            
            if (this.currentMemberId) {
                await this.loadAllMembers();
                await this.loadMemberProfile();
                this.setupEventListeners();
                this.setupActivityFilters();
            } else {
                this.showError('No member selected. Please select a member from the Members page.');
            }
        }

        async loadAllMembers() {
            try {
                const data = await API.get('/members');
                this.allMembers = data?.list || [];
            } catch (error) {
                console.error('Error loading members:', error);
                this.allMembers = [];
            }
        }

        getMemberId() {
            const urlParams = new URLSearchParams(window.location.search);
            let memberId = urlParams.get('memberId') || urlParams.get('id');
            
            if (!memberId && window.dashboardApp?.currentPageData?.memberId) {
                memberId = window.dashboardApp.currentPageData.memberId;
            }
            
            if (!memberId) {
                memberId = sessionStorage.getItem('currentMemberId');
            }
            
            return memberId;
        }

        setupEventListeners() {
            const backButton = document.getElementById('back-to-members-btn');
            if (backButton) {
                backButton.addEventListener('click', () => {
                    if (window.dashboardApp && window.dashboardApp.loadPage) {
                        window.dashboardApp.loadPage('members');
                    }
                });
            }

            // QR Code generation button
            const generateQRBtn = document.getElementById('generate-qr-btn');
            if (generateQRBtn) {
                generateQRBtn.addEventListener('click', () => {
                    this.generateMemberQRCode();
                });
            }

            // QR Code modal close button
            const closeQRModal = document.getElementById('close-qr-modal');
            if (closeQRModal) {
                closeQRModal.addEventListener('click', () => {
                    this.closeQRModal();
                });
            }

            // QR Code download button
            const downloadQRBtn = document.getElementById('download-qr-btn');
            if (downloadQRBtn) {
                downloadQRBtn.addEventListener('click', () => {
                    this.downloadQRCode();
                });
            }

            // QR Code print button
            const printQRBtn = document.getElementById('print-qr-btn');
            if (printQRBtn) {
                printQRBtn.addEventListener('click', () => {
                    this.printQRCode();
                });
            }

            const addContributionBtn = document.getElementById('add-contribution-btn');
            if (addContributionBtn) {
                addContributionBtn.addEventListener('click', () => {
                    this.showAddContributionForm();
                });
            }

            const applyFiltersBtn = document.getElementById('apply-filters-btn');
            if (applyFiltersBtn) {
                applyFiltersBtn.addEventListener('click', () => {
                    this.applyActivityFilters();
                });
            }

            const clearFiltersBtn = document.getElementById('clear-filters-btn');
            if (clearFiltersBtn) {
                clearFiltersBtn.addEventListener('click', () => {
                    this.clearActivityFilters();
                });
            }

            const generatePeriodReceiptBtn = document.getElementById('generate-period-receipt-btn');
            if (generatePeriodReceiptBtn) {
                generatePeriodReceiptBtn.addEventListener('click', () => {
                    this.generatePeriodReceipt();
                });
            }

            const closeModalBtn = document.getElementById('close-modal-btn');
            if (closeModalBtn) {
                closeModalBtn.addEventListener('click', () => {
                    this.closeContributionModal();
                });
            }

            const contributionForm = document.getElementById('contribution-form');
            if (contributionForm) {
                contributionForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.addContribution();
                });
            }

            const memberSearchInput = document.getElementById('contribution-member-search');
            if (memberSearchInput) {
                memberSearchInput.addEventListener('input', (e) => {
                    this.searchMembers(e.target.value, 'contribution');
                });
            }

            const headerSearchInput = document.getElementById('header-member-search');
            if (headerSearchInput) {
                headerSearchInput.addEventListener('input', (e) => {
                    this.searchMembers(e.target.value, 'header');
                });
            }

            document.addEventListener('click', (e) => {
                const contributionResults = document.getElementById('contribution-member-results');
                const headerResults = document.getElementById('header-search-results');
                
                if (contributionResults && !e.target.closest('.member-search-container')) {
                    contributionResults.style.display = 'none';
                }
                if (headerResults && !e.target.closest('.header-search-container')) {
                    headerResults.style.display = 'none';
                }
            });
        }

        searchMembers(query, context = 'contribution') {
            const resultsContainer = context === 'header' ? 
                document.getElementById('header-search-results') : 
                document.getElementById('contribution-member-results');
            
            if (!resultsContainer) return;

            if (query.length < 2) {
                resultsContainer.style.display = 'none';
                return;
            }

            if (this.allMembers.length === 0) {
                this.loadAllMembers().then(() => {
                    if (this.allMembers.length > 0) {
                        this.searchMembers(query, context);
                    }
                });
                return;
            }

            const filteredMembers = this.allMembers.filter(member => 
                `${member.firstName} ${member.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
                member.email?.toLowerCase().includes(query.toLowerCase())
            );

            this.displayMemberSearchResults(filteredMembers, context);
        }

        displayMemberSearchResults(members, context = 'contribution') {
            const resultsContainer = context === 'header' ? 
                document.getElementById('header-search-results') : 
                document.getElementById('contribution-member-results');
            
            if (!resultsContainer) return;

            if (members.length === 0) {
                resultsContainer.innerHTML = '<div class="search-result-item">No members found</div>';
            } else {
                resultsContainer.innerHTML = members.map(member => {
                    const memberId = member._id || member.id;
                    const fullName = `${member.firstName} ${member.lastName}`;
                    const email = member.email || 'No email';
                    
                    return `
                        <div class="search-result-item" onclick="window.memberProfile.selectMember('${memberId}', '${fullName}', '${context}')">
                            <i class="fas fa-user"></i>
                            <div>
                                <strong>${fullName}</strong>
                                <div class="member-email">${email}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            resultsContainer.style.display = 'block';
        }

        selectMember(memberId, memberName, context = 'contribution') {
            if (context === 'header') {
                this.currentMemberId = memberId;
                sessionStorage.setItem('currentMemberId', memberId);
                
                const searchInput = document.getElementById('header-member-search');
                const searchResults = document.getElementById('header-search-results');
                
                if (searchInput) searchInput.value = '';
                if (searchResults) searchResults.style.display = 'none';
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
                this.loadMemberProfile();
            } else {
                const memberIdInput = document.getElementById('contribution-member-id');
                const memberSearchInput = document.getElementById('contribution-member-search');
                const searchResults = document.getElementById('contribution-member-results');
                
                if (memberIdInput) memberIdInput.value = memberId;
                if (memberSearchInput) memberSearchInput.value = memberName;
                if (searchResults) searchResults.style.display = 'none';
            }
        }

        setupActivityFilters() {
            const dateFrom = document.getElementById('activity-date-from');
            const dateTo = document.getElementById('activity-date-to');
            const typeFilter = document.getElementById('activity-type');
            const categoryFilter = document.getElementById('activity-category');
            const paymentMethodFilter = document.getElementById('activity-payment-method');

            if (dateFrom) dateFrom.addEventListener('change', () => this.applyActivityFilters());
            if (dateTo) dateTo.addEventListener('change', () => this.applyActivityFilters());
            if (typeFilter) typeFilter.addEventListener('change', () => this.applyActivityFilters());
            if (categoryFilter) categoryFilter.addEventListener('change', () => this.applyActivityFilters());
            if (paymentMethodFilter) paymentMethodFilter.addEventListener('change', () => this.applyActivityFilters());
        }

        async loadMemberProfile() {
            try {
                const memberData = await API.get(`/members/${this.currentMemberId}`);
                const activityData = await API.get(`/members/${this.currentMemberId}/activity`);
                
                // Load member contributions (non-cash)
                let memberContributions = [];
                try {
                    const contributionsResponse = await API.get(`/member-contributions/member/${this.currentMemberId}`);
                    memberContributions = contributionsResponse.contributions || [];
                } catch (error) {
                    console.warn('Could not load member contributions:', error);
                }
                
                this.currentMember = memberData;
                this.allActivity = activityData.transactions || [];
                this.memberContributions = memberContributions;
                
                // Load inventory items donated by this member
                let inventoryItems = [];
                try {
                    const inventoryResponse = await API.get(`/inventory/donor/${this.currentMemberId}`);
                    inventoryItems = inventoryResponse.items || [];
                } catch (error) {
                    console.warn('Could not load inventory items:', error);
                }
                
                this.renderMemberInfo(memberData);
                this.renderStats(activityData, memberContributions);
                this.renderActivity(this.allActivity, memberContributions);
                this.renderContributionChart(this.allActivity, memberContributions);
                this.renderInventorySection(inventoryItems);
                
            } catch (error) {
                console.error('Error loading member profile:', error);
            }
        }

        renderMemberInfo(member) {
            this.setTextContent('profile-name', `${member.firstName || 'Unknown'} ${member.lastName || ''}`.trim());
            this.setTextContent('profile-email', member.email || 'No email provided');
            this.setTextContent('profile-phone', member.phone || 'No phone provided');
            
            const statusBadge = document.getElementById('profile-status-badge');
            if (statusBadge) {
                statusBadge.textContent = member.status || 'unknown';
                statusBadge.className = `member-status status-${member.status || 'active'}`;
            }
            
            const joinDate = member.joinDate ? new Date(member.joinDate).toLocaleDateString() : 'N/A';
            this.setTextContent('profile-join-date', `Member since: ${joinDate}`);
            this.setTextContent('profile-member-since', joinDate);
            this.setTextContent('profile-dob', member.dob ? new Date(member.dob).toLocaleDateString() : 'N/A');
            this.setTextContent('profile-address', member.address || 'N/A');
            
            const emergencyContact = member.emergencyContactName ? 
                `${member.emergencyContactName}${member.emergencyContactPhone ? ` (${member.emergencyContactPhone})` : ''}` : 'N/A';
            this.setTextContent('profile-emergency-contact', emergencyContact);
            this.setTextContent('profile-membership-type', member.membershipType || 'Regular');
            this.setTextContent('profile-notes', member.notes || 'No notes available');
            this.setTextContent('modal-member-name', `${member.firstName} ${member.lastName}`);
        }

        renderStats(activityData, memberContributions = []) {
            const transactions = activityData.transactions || [];
            const totalCashContributions = activityData.totalContributions || 0;
            const transactionCount = transactions.length;
            const incomeTransactions = transactions.filter(t => t.type === 'income');
            
            // Calculate non-cash contributions
            const totalNonCashValue = memberContributions.reduce((sum, contrib) => sum + (contrib.value || 0), 0);
            const nonCashCount = memberContributions.length;
            
            // Combined totals
            const totalAllContributions = totalCashContributions + totalNonCashValue;
            const totalAllCount = transactionCount + nonCashCount;
            
            // Get last activity from both cash and non-cash
            const allDates = [
                ...transactions.map(t => new Date(t.date)),
                ...memberContributions.map(c => new Date(c.date))
            ].sort((a, b) => b - a);
            
            const lastActivity = allDates.length > 0 ? allDates[0].toLocaleDateString() : 'N/A';
            const avgContribution = incomeTransactions.length > 0 ? (totalCashContributions / incomeTransactions.length).toFixed(2) : 0;
            
            // Update stats display
            this.setTextContent('stat-total-contributions', `${totalAllContributions.toLocaleString()}`);
            this.setTextContent('stat-transactions-count', `${totalAllCount} (${transactionCount} cash, ${nonCashCount} non-cash)`);
            this.setTextContent('stat-last-activity', lastActivity);
            this.setTextContent('stat-avg-contribution', `${avgContribution}`);
        }

        renderActivity(transactions, memberContributions = []) {
            const tbody = document.getElementById('activity-body');
            if (!tbody) return;

            let filteredContributions = 0;
            let filteredCount = 0;

            // Combine transactions and member contributions
            const allActivity = [
                // Cash transactions
                ...transactions.map(transaction => ({
                    ...transaction,
                    activityType: 'cash',
                    displayType: transaction.type === 'income' ? 'Cash Contribution' : 'Cash Expense',
                    displayAmount: transaction.amount || 0,
                    hasReceipt: transaction.type === 'income'
                })),
                // Non-cash contributions
                ...memberContributions.map(contribution => ({
                    ...contribution,
                    activityType: 'non-cash',
                    displayType: `Non-Cash (${contribution.type})`,
                    displayAmount: contribution.value || 0,
                    hasReceipt: false,
                    paymentMethod: 'N/A',
                    reference: 'N/A'
                }))
            ].sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first

            if (allActivity.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="text-center">No activity found</td></tr>';
            } else {
                tbody.innerHTML = allActivity.map(activity => {
                    if (activity.activityType === 'cash' && activity.type === 'income') {
                        filteredContributions += activity.displayAmount;
                    } else if (activity.activityType === 'non-cash') {
                        filteredContributions += activity.displayAmount;
                    }
                    filteredCount++;
                    
                    return `
                        <tr>
                            <td>${new Date(activity.date).toLocaleDateString()}</td>
                            <td>
                                <span class="activity-type-badge badge-${activity.activityType === 'cash' ? activity.type : 'info'}">
                                    ${activity.displayType}
                                </span>
                            </td>
                            <td>${activity.description}</td>
                            <td>${this.formatCategory(activity.category)}</td>
                            <td>${activity.activityType === 'cash' ? this.formatPaymentMethod(activity.paymentMethod) : 'N/A'}</td>
                            <td>${activity.reference || 'N/A'}</td>
                            <td class="${activity.activityType === 'non-cash' || activity.type === 'income' ? 'text-success' : 'text-danger'}">
                                ${activity.activityType === 'non-cash' || activity.type === 'income' ? '+' : '-'}${activity.displayAmount.toLocaleString()}
                            </td>
                            <td>${activity.notes || ''}</td>
                            <td>
                                ${activity.hasReceipt ? `
                                    <button class="icon-button receipt-btn" onclick="memberProfile.generateReceipt('${activity._id}')" title="Generate Receipt">
                                        <i class="fas fa-receipt"></i>
                                    </button>
                                ` : ''}
                                ${activity.activityType === 'non-cash' ? `
                                    <span class="badge badge-info" title="Non-cash contribution">
                                        <i class="fas fa-gift"></i>
                                    </span>
                                ` : ''}
                            </td>
                        </tr>
                    `;
                }).join('');
            }
            
            this.setTextContent('filtered-contributions', `${filteredContributions.toLocaleString()}`);
            this.setTextContent('filtered-count', filteredCount.toString());
        }

        renderContributionChart(transactions, memberContributions = []) {
            const chartContainer = document.getElementById('contribution-chart');
            if (!chartContainer) return;

            // Combine cash income transactions and non-cash contributions
            const allContributions = [
                ...transactions.filter(t => t.type === 'income').map(t => ({
                    date: t.date,
                    amount: t.amount,
                    type: 'cash'
                })),
                ...memberContributions.map(c => ({
                    date: c.date,
                    amount: c.value,
                    type: 'non-cash'
                }))
            ];
            
            if (allContributions.length === 0) {
                chartContainer.innerHTML = '<div class="text-center" style="padding: 50px;">No contribution data available</div>';
                return;
            }

            const monthlyData = {};
            allContributions.forEach(contribution => {
                const date = new Date(contribution.date);
                const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                
                if (!monthlyData[monthYear]) {
                    monthlyData[monthYear] = {
                        month: monthName,
                        cash: 0,
                        nonCash: 0,
                        total: 0
                    };
                }
                
                if (contribution.type === 'cash') {
                    monthlyData[monthYear].cash += contribution.amount;
                } else {
                    monthlyData[monthYear].nonCash += contribution.amount;
                }
                monthlyData[monthYear].total += contribution.amount;
            });

            const chartData = Object.values(monthlyData).sort((a, b) => {
                return new Date(a.month) - new Date(b.month);
            });

            const maxAmount = Math.max(...chartData.map(d => d.total));
            const chartHeight = 200;

            chartContainer.innerHTML = `
                <div style="margin-bottom: 10px;">
                    <span style="display: inline-block; width: 12px; height: 12px; background: #27ae60; margin-right: 5px;"></span>Cash
                    <span style="display: inline-block; width: 12px; height: 12px; background: #3498db; margin-left: 15px; margin-right: 5px;"></span>Non-Cash
                </div>
                <div style="display: flex; align-items: end; height: ${chartHeight}px; gap: 10px; padding: 20px 0;">
                    ${chartData.map(month => `
                        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                            <div style="display: flex; flex-direction: column; align-items: center; width: 30px;">
                                ${month.nonCash > 0 ? `
                                    <div style="background: #3498db; height: ${(month.nonCash / maxAmount) * 150}px; width: 30px; border-radius: 4px 4px 0 0;" title="Non-Cash: ${month.nonCash.toLocaleString()}"></div>
                                ` : ''}
                                ${month.cash > 0 ? `
                                    <div style="background: #27ae60; height: ${(month.cash / maxAmount) * 150}px; width: 30px; ${month.nonCash > 0 ? '' : 'border-radius: 4px 4px 0 0;'}" title="Cash: ${month.cash.toLocaleString()}"></div>
                                ` : ''}
                                <div style="position: relative;">
                                    <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); font-size: 12px; white-space: nowrap;">
                                        ${month.total.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <div style="margin-top: 10px; font-size: 12px; text-align: center;">${month.month}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        renderInventorySection(items) {
            const section = document.getElementById('inventory-section');
            const container = document.getElementById('inventory-items-container');
            
            if (!section || !container) return;
            
            if (!items || items.length === 0) {
                section.style.display = 'none';
                return;
            }
            
            section.style.display = 'block';
            
            const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            
            container.innerHTML = `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${items.length}</strong> item(s) donated
                        </div>
                        <div>
                            Total Value: <strong>$${totalValue.toFixed(2)}</strong>
                        </div>
                    </div>
                </div>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Total Value</th>
                                <th>Date Added</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => {
                                const itemValue = item.quantity * item.price;
                                const isLowStock = item.quantity <= (item.lowStockThreshold || 5);
                                return `
                                    <tr>
                                        <td>
                                            <strong>${item.name}</strong>
                                            ${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ''}
                                        </td>
                                        <td>${item.quantity} ${item.unit || 'units'}</td>
                                        <td>$${item.price.toFixed(2)}</td>
                                        <td><strong>$${itemValue.toFixed(2)}</strong></td>
                                        <td>${new Date(item.dateAdded).toLocaleDateString()}</td>
                                        <td>
                                            ${isLowStock ? 
                                                '<span style="color: #e74c3c; font-weight: 600;">⚠️ Low Stock</span>' : 
                                                '<span style="color: #27ae60;">✓ In Stock</span>'
                                            }
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        async applyActivityFilters() {
            this.activityFilters = {
                dateFrom: this.getValue('activity-date-from'),
                dateTo: this.getValue('activity-date-to'),
                type: this.getValue('activity-type'),
                category: this.getValue('activity-category'),
                paymentMethod: this.getValue('activity-payment-method')
            };

            // Remove empty filters
            Object.keys(this.activityFilters).forEach(key => {
                if (!this.activityFilters[key]) {
                    delete this.activityFilters[key];
                }
            });

            let filteredActivity = this.allActivity;

            if (this.activityFilters.dateFrom) {
                const fromDate = new Date(this.activityFilters.dateFrom);
                filteredActivity = filteredActivity.filter(t => new Date(t.date) >= fromDate);
            }

            if (this.activityFilters.dateTo) {
                const toDate = new Date(this.activityFilters.dateTo);
                filteredActivity = filteredActivity.filter(t => new Date(t.date) <= toDate);
            }

            if (this.activityFilters.type) {
                filteredActivity = filteredActivity.filter(t => t.type === this.activityFilters.type);
            }

            if (this.activityFilters.category) {
                filteredActivity = filteredActivity.filter(t => t.category === this.activityFilters.category);
            }

            if (this.activityFilters.paymentMethod) {
                filteredActivity = filteredActivity.filter(t => t.paymentMethod === this.activityFilters.paymentMethod);
            }

            this.renderActivity(filteredActivity);
        }

        clearActivityFilters() {
            this.setValue('activity-date-from', '');
            this.setValue('activity-date-to', '');
            this.setValue('activity-type', '');
            this.setValue('activity-category', '');
            this.setValue('activity-payment-method', '');
            
            this.activityFilters = {};
            this.renderActivity(this.allActivity);
        }

        showAddContributionForm() {
            const form = document.getElementById('contribution-form');
            const modal = document.getElementById('contribution-modal');
            
            if (form) form.reset();
            if (modal) modal.style.display = 'block';
            
            this.setValue('contribution-date', new Date().toISOString().split('T')[0]);
            this.setValue('contribution-payment-method', 'cash');
            this.setValue('contribution-type', 'income');
            this.setValue('contribution-mode', 'cash');
            this.setValue('non-cash-quantity', '1');
            
            if (this.currentMember) {
                this.setValue('contribution-member-id', this.currentMemberId);
                this.setValue('contribution-member-search', `${this.currentMember.firstName} ${this.currentMember.lastName}`);
            }
            
            const searchResults = document.getElementById('contribution-member-results');
            if (searchResults) searchResults.style.display = 'none';
            
            // Initialize form mode
            this.toggleContributionMode();
        }

        toggleContributionMode() {
            const mode = this.getValue('contribution-mode');
            const cashFields = document.getElementById('cash-contribution-fields');
            const nonCashFields = document.getElementById('non-cash-contribution-fields');
            const amountField = document.getElementById('contribution-amount');
            const nonCashValueField = document.getElementById('non-cash-value');
            
            if (mode === 'cash') {
                if (cashFields) cashFields.style.display = 'block';
                if (nonCashFields) nonCashFields.style.display = 'none';
                if (amountField) amountField.required = true;
                if (nonCashValueField) nonCashValueField.required = false;
            } else {
                if (cashFields) cashFields.style.display = 'none';
                if (nonCashFields) nonCashFields.style.display = 'block';
                if (amountField) amountField.required = false;
                if (nonCashValueField) nonCashValueField.required = true;
            }
        }

        showSuccess(message) {
            // Simple success notification
            const notification = document.createElement('div');
            notification.className = 'alert alert-success';
            notification.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 15px; background: #d4edda; color: #155724; border: 1px solid #c3e6cb; border-radius: 4px;';
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }

        async addContribution() {
            const selectedMemberId = this.getValue('contribution-member-id') || this.currentMemberId;
            const selectedMemberName = this.getValue('contribution-member-search') || `${this.currentMember.firstName} ${this.currentMember.lastName}`;
            const contributionMode = this.getValue('contribution-mode');
            
            if (!selectedMemberId) {
                alert('Please select a member');
                return;
            }

            if (!this.getValue('contribution-description')) {
                alert('Please enter a description');
                return;
            }

            try {
                if (contributionMode === 'cash') {
                    // Handle cash transaction
                    const amount = parseFloat(this.getValue('contribution-amount'));
                    
                    if (!amount || isNaN(amount) || amount <= 0) {
                        alert('Please enter a valid amount greater than 0');
                        return;
                    }

                    const formData = {
                        type: this.getValue('contribution-type'),
                        amount: amount,
                        description: this.getValue('contribution-description'),
                        category: this.getValue('contribution-category'),
                        paymentMethod: this.getValue('contribution-payment-method'),
                        reference: this.getValue('contribution-reference'),
                        notes: this.getValue('contribution-notes'),
                        date: this.getValue('contribution-date') || new Date().toISOString().split('T')[0],
                        payee: {
                            type: 'member',
                            memberId: selectedMemberId,
                            name: selectedMemberName
                        }
                    };

                    await API.post('/accounting/transaction', formData);
                } else {
                    // Handle non-cash contribution
                    const value = parseFloat(this.getValue('non-cash-value'));
                    
                    if (!value || isNaN(value) || value <= 0) {
                        alert('Please enter a valid estimated value greater than 0');
                        return;
                    }

                    const contributionData = {
                        memberId: selectedMemberId,
                        type: this.getValue('non-cash-type'),
                        category: this.getValue('contribution-category'),
                        description: this.getValue('contribution-description'),
                        quantity: parseInt(this.getValue('non-cash-quantity')) || 1,
                        value: value,
                        date: this.getValue('contribution-date') || new Date().toISOString().split('T')[0],
                        notes: this.getValue('contribution-notes'),
                        issueReceipt: document.getElementById('issue-receipt').checked
                    };

                    await API.post('/member-contributions', contributionData);
                }

                this.closeContributionModal();
                
                if (selectedMemberId !== this.currentMemberId) {
                    this.currentMemberId = selectedMemberId;
                    sessionStorage.setItem('currentMemberId', selectedMemberId);
                }
                
                await this.loadMemberProfile();
                
                this.showSuccess(`${contributionMode === 'cash' ? 'Transaction' : 'Contribution'} added successfully!`);
                
            } catch (error) {
                console.error('Error adding contribution:', error);
                alert(`Error adding ${contributionMode === 'cash' ? 'transaction' : 'contribution'}: ${error.message}`);
            }
        }

        closeContributionModal() {
            const modal = document.getElementById('contribution-modal');
            if (modal) modal.style.display = 'none';
        }

        setTextContent(elementId, text) {
            const element = document.getElementById(elementId);
            if (element) element.textContent = text;
        }

        getValue(elementId) {
            const element = document.getElementById(elementId);
            return element ? element.value : '';
        }

        setValue(elementId, value) {
            const element = document.getElementById(elementId);
            if (element) element.value = value;
        }

        formatCategory(category) {
            const categories = {
                'tithe': 'Tithe',
                'offering': 'Offering',
                'donation': 'Donation',
                'building': 'Building Fund',
                'missions': 'Missions',
                'pledge': 'Pledge',
                'other': 'Other'
            };
            return categories[category] || category;
        }

        formatPaymentMethod(method) {
            const methods = {
                'cash': 'Cash',
                'check': 'Check',
                'card': 'Card',
                'online': 'Online',
                'transfer': 'Transfer'
            };
            return methods[method] || method;
        }

        // Receipt generation functions
        async generateReceipt(transactionId) {
            // Close any open action menus immediately to prevent multiple clicks
            document.querySelectorAll('.action-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
            
            try {
                const transaction = await API.get(`/accounting/transaction/${transactionId}`);
                
                if (!transaction) {
                    alert('Transaction not found');
                    return;
                }

                if (transaction.type !== 'income') {
                    alert('Receipts can only be generated for income transactions');
                    return;
                }

                await this.createReceiptHTML(transaction);
                
            } catch (error) {
                console.error('Error generating receipt:', error);
                alert('Error generating receipt. Please try again.');
            }
        }

        generatePeriodReceipt() {
            const dateFrom = this.getValue('activity-date-from');
            const dateTo = this.getValue('activity-date-to');
            
            if (!dateFrom || !dateTo) {
                alert('Please select a date range for the period receipt');
                return;
            }

            // Filter transactions for the period
            const fromDate = new Date(dateFrom);
            const toDate = new Date(dateTo);
            
            const periodTransactions = this.allActivity.filter(transaction => {
                const transactionDate = new Date(transaction.date);
                return transaction.type === 'income' && 
                       transactionDate >= fromDate && 
                       transactionDate <= toDate;
            });

            if (periodTransactions.length === 0) {
                alert('No contributions found for the selected period');
                return;
            }

            this.createPeriodReceiptHTML(periodTransactions, dateFrom, dateTo);
        }

        createPeriodReceiptHTML(transactions, dateFrom, dateTo) {
            const receiptDate = new Date().toLocaleDateString();
            const fromDateFormatted = new Date(dateFrom).toLocaleDateString();
            const toDateFormatted = new Date(dateTo).toLocaleDateString();
            
            // Calculate totals
            const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
            
            // Get member information
            let memberName = 'Unknown';
            let memberAddress = '';
            let memberEmail = '';
            
            if (this.currentMember) {
                memberName = `${this.currentMember.firstName} ${this.currentMember.lastName}`;
                memberAddress = this.currentMember.address || '';
                memberEmail = this.currentMember.email || '';
            }

            const receiptHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Period Donation Receipt - ${memberName}</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            max-width: 700px; 
                            margin: 0 auto; 
                            padding: 20px;
                            line-height: 1.6;
                        }
                        .header { 
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            border-bottom: 2px solid #333; 
                            padding-bottom: 20px; 
                            margin-bottom: 30px;
                            position: relative;
                            min-height: 80px;
                        }
                        .logo {
                            width: 60px;
                            height: 60px;
                            object-fit: contain;
                            flex-shrink: 0;
                        }
                        .logo-left {
                            position: absolute;
                            left: 0;
                            top: 10px;
                        }
                        .logo-right {
                            position: absolute;
                            right: 0;
                            top: 10px;
                        }
                        .church-info {
                            text-align: center;
                            flex: 1;
                            margin: 0 80px;
                            padding: 0 20px;
                        }
                        .church-name { 
                            font-size: 24px; 
                            font-weight: bold; 
                            color: #2c3e50;
                            margin-bottom: 5px;
                        }
                        .church-address { 
                            color: #666; 
                            font-size: 14px;
                        }
                        .receipt-title { 
                            font-size: 20px; 
                            font-weight: bold; 
                            text-align: center; 
                            margin: 30px 0;
                            color: #2c3e50;
                        }
                        .receipt-info { 
                            background: #f8f9fa; 
                            padding: 20px; 
                            border-radius: 8px; 
                            margin: 20px 0;
                        }
                        .receipt-header-row {
                            display: flex;
                            justify-content: space-between;
                            flex-wrap: wrap;
                            gap: 15px;
                            padding: 10px;
                            background: #e9ecef;
                            border-radius: 4px;
                            margin-bottom: 15px;
                            font-size: 14px;
                        }
                        .info-row { 
                            display: flex; 
                            justify-content: space-between; 
                            margin: 10px 0;
                            padding: 5px 0;
                        }
                        .summary-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 20px 0;
                        }
                        .summary-table th,
                        .summary-table td {
                            border: 1px solid #ddd;
                            padding: 8px;
                            text-align: left;
                        }
                        .summary-table th {
                            background: #f8f9fa;
                            font-weight: bold;
                        }
                        .total-row {
                            background: #e8f5e8;
                            font-weight: bold;
                        }
                        .contribution-notice { 
                            background: #fff3cd; 
                            border: 1px solid #ffeaa7; 
                            padding: 15px; 
                            border-radius: 8px; 
                            margin: 20px 0;
                            font-size: 14px;
                        }
                        .footer { 
                            text-align: center; 
                            margin-top: 40px; 
                            padding-top: 20px; 
                            border-top: 1px solid #ddd;
                            font-size: 12px;
                            color: #666;
                        }
                        .signature-line {
                            margin-top: 40px;
                            border-bottom: 1px solid #333;
                            width: 300px;
                            margin-left: auto;
                            margin-right: auto;
                            text-align: center;
                            padding-bottom: 5px;
                        }
                        @media print {
                            body { margin: 0; padding: 15px; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <img src="https://church-management-vjfw.onrender.com/images/church-logo.png" alt="Church Logo" class="logo logo-left">
                        <div class="church-info">
                            <div class="church-name">St Michael Eritrean Orthodox Church</div>
                            <div class="church-address">
                                60 Osborne Street, Joondanna, WA 6060<br>
                                ABN: 80798549161<br>
                                Email: stmichaelerotc@gmail.com<br>
                                Website: erotc.org
                            </div>
                        </div>
                        <img src="https://church-management-vjfw.onrender.com/images/kdus-mikaeal.jpg" alt="Kdus Mikaeal" class="logo logo-right">
                    </div>

                    <div class="receipt-title">
                        DONATION RECEIPT<br>
                        <span style="font-size: 16px; font-weight: normal;">${fromDateFormatted} - ${toDateFormatted}</span>
                    </div>

                    <div class="receipt-info">
                        <div class="receipt-header-row">
                            <span><strong>Receipt Date:</strong> ${receiptDate}</span>
                            <span><strong>Period:</strong> ${fromDateFormatted} - ${toDateFormatted}</span>
                            <span><strong>Receipt #:</strong> PERIOD-${Date.now().toString().slice(-8)}</span>
                        </div>
                        <div class="info-row">
                            <span><strong>Donor Name:</strong></span>
                            <span>${memberName}</span>
                        </div>
                        ${memberAddress ? `
                        <div class="info-row">
                            <span><strong>Address:</strong></span>
                            <span>${memberAddress}</span>
                        </div>
                        ` : ''}
                        ${memberEmail ? `
                        <div class="info-row">
                            <span><strong>Email:</strong></span>
                            <span>${memberEmail}</span>
                        </div>
                        ` : ''}
                    </div>

                    <h3>Contribution Summary</h3>
                    <table class="summary-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Category</th>
                                <th>Payment Method</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactions.map(transaction => `
                                <tr>
                                    <td>${new Date(transaction.date).toLocaleDateString()}</td>
                                    <td>${transaction.description}</td>
                                    <td>${this.formatCategory(transaction.category)}</td>
                                    <td>${this.formatPaymentMethod(transaction.paymentMethod)}</td>
                                    <td>${transaction.amount.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="4"><strong>Total Contributions</strong></td>
                                <td><strong>${totalAmount.toLocaleString()}</strong></td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="contribution-notice">
                        <strong>Important Notice:</strong><br>
                        No goods or services were provided in exchange for these contributions.
                    </div>

                    <div class="signature-line">
                        <div style="margin-top: 10px; font-size: 12px;">Authorized Signature</div>
                    </div>

                    <div class="footer">
                        <p>Thank you for your generous contributions during this period!</p>
                        <p>Generated on ${receiptDate} | Church Management System</p>
                        <div class="no-print" style="margin-top: 20px;">
                            <button onclick="window.print()" style="padding: 10px 20px; background: #4a6fa5; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Print Receipt
                            </button>
                            <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                                Close
                            </button>
                        </div>
                    </div>
                </body>
                </html>
            `;

            // Open receipt in new window
            const receiptWindow = window.open('', '_blank', 'width=800,height=1000');
            receiptWindow.document.write(receiptHTML);
            receiptWindow.document.close();
        }

        async createReceiptHTML(transaction) {
            const receiptDate = new Date().toLocaleDateString();
            const transactionDate = new Date(transaction.date).toLocaleDateString();
            
            // Get signature information - SIMPLIFIED VERSION (Name and Role Only)
            let signatureSection = `
                <div class="signature-line">
                    <div style="margin-top: 10px; font-size: 12px; color: #999;">No signature on file</div>
                </div>
            `;
            
            try {
                const signatureInfo = await API.get(`/signatures/${transaction._id}`);
                if (signatureInfo.signature) {
                    const sig = signatureInfo.signature;
                    
                    // SIMPLIFIED: Show only name and role (no image)
                    if (sig.approvedBy) {
                        signatureSection = `
                            <div class="signature-section" style="margin: 15px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                                    <div>
                                        <div style="border-bottom: 2px solid #333; padding-bottom: 6px; margin-bottom: 6px; min-width: 220px; text-align: center;">
                                            <strong style="font-size: 15px;">${sig.approvedBy.name}</strong>
                                        </div>
                                        <div style="font-size: 13px; font-weight: bold; text-align: center;">${sig.signatureTitle}</div>
                                        <div style="font-size: 10px; color: #666; text-align: center;">Digitally approved: ${new Date(sig.approvedBy.timestamp).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>
                        `;
                    } else if (sig.signatureImage) {
                        // Even if there's an image, show text-only version for reliability
                        signatureSection = `
                            <div class="signature-section" style="margin: 15px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                                    <div>
                                        <div style="border-bottom: 2px solid #333; padding-bottom: 6px; margin-bottom: 6px; min-width: 220px; text-align: center;">
                                            <strong style="font-size: 15px;">Authorized Signatory</strong>
                                        </div>
                                        <div style="font-size: 13px; font-weight: bold; text-align: center;">${sig.signatureTitle}</div>
                                        <div style="font-size: 10px; color: #666; text-align: center;">Signed: ${new Date(sig.signatureDate || sig.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                }
            } catch (error) {
                console.log('No signature found for this transaction');
            }
            
            // Get payee information
            let payeeName = 'Unknown';
            let payeeAddress = '';
            let payeeEmail = '';
            
            if (transaction.payee) {
                if (transaction.payee.type === 'member' && transaction.payee.memberId) {
                    const member = transaction.payee.memberId;
                    if (typeof member === 'object') {
                        payeeName = `${member.firstName} ${member.lastName}`;
                        payeeAddress = member.address || '';
                        payeeEmail = member.email || '';
                    } else {
                        payeeName = transaction.payee.name || 'Unknown Member';
                    }
                } else {
                    payeeName = transaction.payee.name || 'Unknown';
                    payeeAddress = transaction.payee.address || '';
                    payeeEmail = transaction.payee.email || '';
                }
            }
            
            // Use member information if available (for member profile context)
            if (this.currentMember) {
                payeeName = `${this.currentMember.firstName} ${this.currentMember.lastName}`;
                payeeAddress = this.currentMember.address || payeeAddress;
                payeeEmail = this.currentMember.email || payeeEmail;
            }

            const receiptHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Donation Receipt</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            max-width: 600px; 
                            margin: 0 auto; 
                            padding: 15px;
                            line-height: 1.4;
                        }
                        .header { 
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            border-bottom: 2px solid #333; 
                            padding-bottom: 10px; 
                            margin-bottom: 15px;
                            position: relative;
                            min-height: 60px;
                        }
                        .logo {
                            width: 45px;
                            height: 45px;
                            object-fit: contain;
                            flex-shrink: 0;
                        }
                        .logo-left {
                            position: absolute;
                            left: 0;
                            top: 5px;
                        }
                        .logo-right {
                            position: absolute;
                            right: 0;
                            top: 5px;
                        }
                        .church-info {
                            text-align: center;
                            flex: 1;
                            margin: 0 60px;
                            padding: 0 15px;
                        }
                        .church-name { 
                            font-size: 20px; 
                            font-weight: bold; 
                            color: #2c3e50;
                            margin-bottom: 5px;
                        }
                        .church-address { 
                            color: #666; 
                            font-size: 12px;
                            line-height: 1.3;
                        }
                        .receipt-title { 
                            font-size: 18px; 
                            font-weight: bold; 
                            text-align: center; 
                            margin: 15px 0;
                            color: #2c3e50;
                        }
                        .receipt-info { 
                            background: #f8f9fa; 
                            padding: 15px; 
                            border-radius: 6px; 
                            margin: 15px 0;
                        }
                        .info-row { 
                            display: flex; 
                            justify-content: space-between; 
                            margin: 8px 0;
                            padding: 3px 0;
                        }
                        .info-row.highlight { 
                            background: #e8f5e8; 
                            padding: 8px; 
                            border-radius: 4px;
                            font-weight: bold;
                        }
                        .receipt-header-row {
                            display: flex;
                            justify-content: space-between;
                            flex-wrap: wrap;
                            gap: 10px;
                            padding: 8px;
                            background: #e9ecef;
                            border-radius: 4px;
                            margin-bottom: 10px;
                            font-size: 13px;
                        }
                        .summary-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 15px 0;
                        }
                        .summary-table th,
                        .summary-table td {
                            border: 1px solid #ddd;
                            padding: 6px;
                            text-align: left;
                            font-size: 13px;
                        }
                        .summary-table th {
                            background: #f8f9fa;
                            font-weight: bold;
                        }
                        .total-row {
                            background: #e8f5e8;
                            font-weight: bold;
                        }
                        .amount { 
                            font-size: 16px; 
                            font-weight: bold; 
                            color: #27ae60;
                        }
                        .contribution-notice { 
                            background: #fff3cd; 
                            border: 1px solid #ffeaa7; 
                            padding: 10px; 
                            border-radius: 6px; 
                            margin: 15px 0;
                            font-size: 13px;
                        }
                        .footer { 
                            text-align: center; 
                            margin-top: 20px; 
                            padding-top: 15px; 
                            border-top: 1px solid #ddd;
                            font-size: 11px;
                            color: #666;
                        }
                        .signature-line {
                            margin-top: 25px;
                            border-bottom: 1px solid #333;
                            width: 250px;
                            margin-left: auto;
                            margin-right: auto;
                            text-align: center;
                            padding-bottom: 3px;
                        }
                        @media print {
                            body { margin: 0; padding: 10px; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <img src="https://churchmanagement.erotc.org/images/church-logo.png" alt="Church Logo" class="logo logo-left">
                        <div class="church-info">
                            <div class="church-name">St Michael Eritrean Orthodox Church</div>
                            <div class="church-address">
                                60 Osborne Street, Joondanna, WA 6060<br>
                                ABN: 80798549161 | stmichaelerotc@gmail.com | erotc.org
                            </div>
                        </div>
                        <img src="https://churchmanagement.erotc.org/images/kdus-mikaeal.jpg" alt="Kdus Mikaeal" class="logo logo-right">
                    </div>

                    <div class="receipt-title">
                        DONATION RECEIPT
                    </div>

                    <div class="receipt-info">
                        <div class="receipt-header-row">
                            <span><strong>Receipt Date:</strong> ${receiptDate}</span>
                            <span><strong>Transaction Date:</strong> ${transactionDate}</span>
                            <span><strong>Receipt #:</strong> ${transaction._id.substring(18)}</span>
                        </div>
                        <div class="info-row">
                            <span><strong>Donor Name:</strong></span>
                            <span>${payeeName}</span>
                        </div>
                        ${payeeAddress ? `
                        <div class="info-row">
                            <span><strong>Address:</strong></span>
                            <span>${payeeAddress}</span>
                        </div>
                        ` : ''}
                    </div>

                    <h3 style="margin: 15px 0 10px 0; font-size: 16px;">Contribution Details</h3>
                    <table class="summary-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Category</th>
                                <th>Payment Method</th>
                                ${transaction.reference ? '<th>Reference</th>' : ''}
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${transactionDate}</td>
                                <td>${transaction.description}</td>
                                <td>${this.formatCategory(transaction.category)}</td>
                                <td>${this.formatPaymentMethod(transaction.paymentMethod)}</td>
                                ${transaction.reference ? `<td>${transaction.reference}</td>` : ''}
                                <td><strong>${transaction.amount.toLocaleString()}</strong></td>
                            </tr>
                            <tr class="total-row">
                                <td colspan="${transaction.reference ? '5' : '4'}"><strong>Total Contribution</strong></td>
                                <td><strong>${transaction.amount.toLocaleString()}</strong></td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="contribution-notice">
                        <strong>Important Notice:</strong><br>
                        No goods or services were provided in exchange for this contribution.
                    </div>

                    ${signatureSection}

                    <div class="footer">
                        <p style="margin: 5px 0;">Thank you for your generous contribution!</p>
                        <p style="margin: 5px 0;"><strong>St Michael Eritrean Orthodox Church</strong></p>
                        <p style="margin: 5px 0;">60 Osborne Street, Joondanna, WA 6060 | ABN: 80798549161</p>
                        <p style="margin: 5px 0;">stmichaelerotc@gmail.com | erotc.org</p>
                        <p style="margin: 10px 0 5px 0; font-style: italic;">Generated on ${receiptDate}</p>
                        <div class="no-print" style="margin-top: 15px;">
                            <button onclick="window.print()" style="padding: 8px 16px; background: #4a6fa5; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                Print Receipt
                            </button>
                            <button onclick="window.close()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 8px; font-size: 12px;">
                                Close
                            </button>
                        </div>
                    </div>
                </body>
                </html>
            `;

            // Open receipt in new window
            const receiptWindow = window.open('', '_blank', 'width=700,height=900');
            receiptWindow.document.write(receiptHTML);
            receiptWindow.document.close();
        }

        showError(message) {
            console.error('MemberProfile error:', message);
            const container = document.querySelector('.member-profile-container');
            if (container) {
                container.innerHTML = `
                    <div class="error-message text-center">
                        <i class="fas fa-exclamation-triangle fa-3x" style="color: #dc3545; margin-bottom: 20px;"></i>
                        <h3>${message}</h3>
                        <button class="btn btn-primary" onclick="window.dashboardApp.loadPage('members')" style="margin-top: 20px;">
                            <i class="fas fa-arrow-left"></i> Back to Members
                        </button>
                    </div>
                `;
            }
        }

        // ======================
        // 🔲 QR CODE METHODS
        // ======================

        async generateMemberQRCode() {
            if (!this.currentMemberId) {
                alert('No member selected');
                return;
            }

            try {
                // Show modal and loading state
                const modal = document.getElementById('qr-code-modal');
                const loading = document.getElementById('qr-loading');
                const container = document.getElementById('qr-code-container');
                const info = document.getElementById('qr-code-info');

                modal.style.display = 'block';
                loading.style.display = 'block';
                info.style.display = 'none';
                container.innerHTML = '<div class="loading-spinner" id="qr-loading"><i class="fas fa-spinner fa-spin"></i> Generating QR Code...</div>';

                console.log('🔲 Generating QR code for member:', this.currentMemberId);

                // Generate QR code via API
                const response = await API.get(`/members/${this.currentMemberId}/member-card-qr`);

                if (response.success) {
                    // Display QR code
                    container.innerHTML = `
                        <img id="qr-code-image" src="${response.qrCode}" alt="Member QR Code" style="max-width: 250px; border: 1px solid #ddd; border-radius: 5px;">
                    `;

                    // Update member info
                    document.getElementById('qr-member-name').textContent = response.member.name;

                    // Show info section
                    info.style.display = 'block';

                    // Store QR code data for download/print
                    this.currentQRCode = {
                        dataURL: response.qrCode,
                        member: response.member,
                        generatedAt: response.generatedAt
                    };

                    console.log('✅ QR code generated successfully');
                } else {
                    throw new Error(response.error || 'Failed to generate QR code');
                }

            } catch (error) {
                console.error('❌ Error generating QR code:', error);
                
                const container = document.getElementById('qr-code-container');
                container.innerHTML = `
                    <div style="color: #dc3545; padding: 20px;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to generate QR code: ${error.message}</p>
                        <button class="btn btn-secondary" onclick="memberProfile.closeQRModal()">Close</button>
                    </div>
                `;
            }
        }

        closeQRModal() {
            const modal = document.getElementById('qr-code-modal');
            modal.style.display = 'none';
            this.currentQRCode = null;
        }

        downloadQRCode() {
            if (!this.currentQRCode) {
                alert('No QR code available to download');
                return;
            }

            try {
                // Create download link
                const link = document.createElement('a');
                link.href = this.currentQRCode.dataURL;
                link.download = `${this.currentQRCode.member.name.replace(/\s+/g, '_')}_QR_Code.png`;
                
                // Trigger download
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                console.log('✅ QR code downloaded successfully');
            } catch (error) {
                console.error('❌ Error downloading QR code:', error);
                alert('Failed to download QR code');
            }
        }

        printQRCode() {
            if (!this.currentQRCode) {
                alert('No QR code available to print');
                return;
            }

            try {
                // Create print window with QR code
                const printWindow = window.open('', '_blank', 'width=600,height=800');
                const printHTML = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Member QR Code - ${this.currentQRCode.member.name}</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                text-align: center;
                                padding: 40px;
                                margin: 0;
                            }
                            .qr-card {
                                border: 2px solid #4a6fa5;
                                border-radius: 10px;
                                padding: 30px;
                                max-width: 400px;
                                margin: 0 auto;
                                background: white;
                            }
                            .church-name {
                                color: #4a6fa5;
                                font-size: 18px;
                                font-weight: bold;
                                margin-bottom: 10px;
                            }
                            .member-name {
                                font-size: 24px;
                                font-weight: bold;
                                margin: 20px 0;
                                color: #333;
                            }
                            .member-number {
                                color: #666;
                                font-size: 14px;
                                margin-bottom: 20px;
                            }
                            .qr-code {
                                margin: 20px 0;
                            }
                            .instructions {
                                font-size: 12px;
                                color: #666;
                                margin-top: 20px;
                                line-height: 1.4;
                            }
                            @media print {
                                body { padding: 20px; }
                                .qr-card { border: 2px solid #000; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="qr-card">
                            <div class="church-name">St. Michael Eritrean Orthodox Tewahedo Church</div>
                            <div class="member-name">${this.currentQRCode.member.name}</div>
                            <div class="member-number">Member #: ${this.currentQRCode.member.membershipNumber}</div>
                            <div class="qr-code">
                                <img src="${this.currentQRCode.dataURL}" alt="Member QR Code" style="width: 200px; height: 200px;">
                            </div>
                            <div class="instructions">
                                Scan this QR code to access member information.<br>
                                Generated on ${new Date(this.currentQRCode.generatedAt).toLocaleDateString()}
                            </div>
                        </div>
                    </body>
                    </html>
                `;

                printWindow.document.write(printHTML);
                printWindow.document.close();
                
                // Wait for content to load then print
                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.print();
                    }, 500);
                };

                console.log('✅ QR code print dialog opened');
            } catch (error) {
                console.error('❌ Error printing QR code:', error);
                alert('Failed to print QR code');
            }
        }
    }

    window.loadMemberProfile = function() {
        const initProfile = () => {
            const headerSearch = document.getElementById('header-member-search');
            const profileContainer = document.querySelector('.member-profile-container');
            
            if (headerSearch || profileContainer) {
                window.memberProfile = new MemberProfile();
                window.memberProfile.init();
            } else {
                setTimeout(initProfile, 50);
            }
        };
        
        initProfile();
    };
})();