(function () {
    // Utility class for safe DOM manipulation and XSS prevention
    class DOMUtils {
        // Escape HTML to prevent XSS
        static escapeHtml(text) {
            if (typeof text !== 'string') return text;
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Escape attributes to prevent XSS in attributes
        static escapeAttribute(text) {
            if (typeof text !== 'string') text = String(text);
            return text
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\//g, '&#x2F;');
        }
        
        // Create element safely with escaped content
        static createElement(tag, options = {}) {
            const element = document.createElement(tag);
            
            if (options.className) element.className = options.className;
            if (options.id) element.id = options.id;
            if (options.textContent) element.textContent = options.textContent;
            if (options.innerHTML) element.innerHTML = options.innerHTML; // Only use when content is trusted
            if (options.attributes) {
                Object.entries(options.attributes).forEach(([key, value]) => {
                    element.setAttribute(key, this.escapeAttribute(value));
                });
            }
            if (options.style) {
                Object.entries(options.style).forEach(([key, value]) => {
                    element.style[key] = value;
                });
            }
            
            return element;
        }
        
        // Add event listener with proper cleanup tracking
        static addEventListenerSafe(element, event, handler, options = {}) {
            if (!element || typeof handler !== 'function') return null;
            
            element.addEventListener(event, handler, options);
            
            // Return cleanup function
            return () => element.removeEventListener(event, handler, options);
        }
        
        // Debounce function for performance
        static debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    }

    class AccountingPage {
    constructor() {
        // Prevent multiple instances
        if (AccountingPage.instance) {
            return AccountingPage.instance;
        }
        
        this.currentFilters = {};
        this.allMembers = [];
        this.editingTransactionId = null;
        this.isSubmitting = false;
        this.eventCleanupFunctions = []; // Track cleanup functions
        this.transactionRowCleanup = []; // Track transaction row event listeners
        this.searchResultCleanup = []; // Track search result event listeners
        
        // Bind methods once to prevent memory leaks
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.handlePayeeTypeChange = this.handlePayeeTypeChange.bind(this);
        
        // Store instance
        AccountingPage.instance = this;
        
        this.init();
    }

    async init() {
        try {
            await this.loadMembersList();
            await this.loadAccountingData();
            await this.loadPromises();
            await this.loadContributions();
            
            // Create debounced search functions after methods are defined
            this.debouncedSearch = DOMUtils.debounce(this.performMemberSearch.bind(this), 300);
            this.debouncedPromiseSearch = DOMUtils.debounce(this.searchMembersForPromise.bind(this), 300);
            this.debouncedContributionSearch = DOMUtils.debounce(this.searchMembersForContribution.bind(this), 300);
            
            this.setupEventListeners();
        } catch (error) {
            console.error('❌ Failed to initialize accounting page:', error);
            this.showError('Failed to initialize the accounting system. Please refresh the page.');
        }
    }

    // Tab switching functionality
    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        const selectedTab = document.getElementById(`tab-${tabName}`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        // Activate button
        event.target.closest('.tab-button').classList.add('active');
        
        // Update add button based on tab
        const addBtn = document.getElementById('add-transaction-btn');
        if (addBtn) {
            if (tabName === 'transactions') {
                addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Transaction';
                addBtn.onclick = () => this.showAddTransactionForm();
            } else if (tabName === 'contributions') {
                addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Contribution';
                addBtn.onclick = () => this.showAddContributionForm();
            } else if (tabName === 'promises') {
                addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Promise';
                addBtn.onclick = () => this.showAddPromiseForm();
            }
        }
    }

    // Clear filter functions
    clearFilters() {
        document.getElementById('transaction-type-filter').value = '';
        document.getElementById('transaction-category-filter').value = '';
        document.getElementById('transaction-search').value = '';
        this.filterTransactions();
    }

    clearContributionFilters() {
        document.getElementById('contribution-type-filter').value = '';
        document.getElementById('contribution-category-filter').value = '';
        document.getElementById('contribution-member-filter').value = '';
        this.filterContributions();
    }

    clearPromiseFilters() {
        document.getElementById('promise-status-filter').value = '';
        document.getElementById('promise-member-filter').value = '';
        this.filterPromises();
    }

setupEventListeners() {
    // Remove existing listeners to prevent duplicates
    this.removeEventListeners();
    
    // Transaction form submission
    const transactionForm = document.getElementById('transaction-form');
    if (transactionForm) {
        const cleanup = DOMUtils.addEventListenerSafe(transactionForm, 'submit', this.handleFormSubmit);
        if (cleanup) this.eventCleanupFunctions.push(cleanup);
    }

    // Add transaction button
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    if (addTransactionBtn) {
        const cleanup = DOMUtils.addEventListenerSafe(addTransactionBtn, 'click', () => {
            this.showAddTransactionForm();
        });
        if (cleanup) this.eventCleanupFunctions.push(cleanup);
    }

    // Filter event listeners
    const filterElements = [
        'filter-date-from',
        'filter-date-to', 
        'filter-category',
        'filter-type'
    ];
    
    filterElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const cleanup = DOMUtils.addEventListenerSafe(element, 'change', () => this.applyFilters());
            if (cleanup) this.eventCleanupFunctions.push(cleanup);
        }
    });

    // Payee type change
    const payeeTypeRadios = document.querySelectorAll('input[name="payee-type"]');
    payeeTypeRadios.forEach(radio => {
        const cleanup = DOMUtils.addEventListenerSafe(radio, 'change', this.handlePayeeTypeChange);
        if (cleanup) this.eventCleanupFunctions.push(cleanup);
    });

    // Document-level event listeners
    const docCleanup = DOMUtils.addEventListenerSafe(document, 'click', this.handleDocumentClick);
    if (docCleanup) this.eventCleanupFunctions.push(docCleanup);

    // Member search with debouncing
    const memberSearchInput = document.getElementById('member-search');
    if (memberSearchInput) {
        const cleanup = DOMUtils.addEventListenerSafe(memberSearchInput, 'input', (e) => {
            this.debouncedSearch(e.target.value);
        });
        if (cleanup) this.eventCleanupFunctions.push(cleanup);
    }

    // Contribution member search with debouncing
    const contributionMemberSearchInput = document.getElementById('contribution-member-search');
    if (contributionMemberSearchInput) {
        const cleanup = DOMUtils.addEventListenerSafe(contributionMemberSearchInput, 'input', (e) => {
            this.debouncedContributionSearch(e.target.value);
        });
        if (cleanup) this.eventCleanupFunctions.push(cleanup);
    }

    // Promise member search with debouncing
    const promiseMemberSearchInput = document.getElementById('promise-member-search');
    if (promiseMemberSearchInput) {
        const cleanup = DOMUtils.addEventListenerSafe(promiseMemberSearchInput, 'input', (e) => {
            this.debouncedPromiseSearch(e.target.value);
        });
        if (cleanup) this.eventCleanupFunctions.push(cleanup);
    }

    // Promise forms
    const promiseForm = document.getElementById('promise-form');
    if (promiseForm) {
        const cleanup = DOMUtils.addEventListenerSafe(promiseForm, 'submit', (e) => this.addPromise(e));
        if (cleanup) this.eventCleanupFunctions.push(cleanup);
    }

    const fulfillForm = document.getElementById('fulfill-form');
    if (fulfillForm) {
        const cleanup = DOMUtils.addEventListenerSafe(fulfillForm, 'submit', (e) => this.fulfillPromise(e));
        if (cleanup) this.eventCleanupFunctions.push(cleanup);
    }

    // Handle contribution form submission
    const contributionForm = document.getElementById('contribution-form');
    if (contributionForm) {
        const cleanup = DOMUtils.addEventListenerSafe(contributionForm, 'submit', (e) => {
            e.preventDefault();
            this.addContribution();
        });
        if (cleanup) this.eventCleanupFunctions.push(cleanup);
    }
}

// Clean up event listeners to prevent memory leaks
removeEventListeners() {
    // Call all cleanup functions
    this.eventCleanupFunctions.forEach(cleanup => {
        if (typeof cleanup === 'function') {
            try {
                cleanup();
            } catch (error) {
                console.warn('Error during event cleanup:', error);
            }
        }
    });
    
    // Clear the cleanup functions array
    this.eventCleanupFunctions = [];
}

// Bound event handlers
handleFormSubmit(e) {
    e.preventDefault();
    this.addTransaction();
}

handlePayeeTypeChange() {
    this.togglePayeeFields();
}

handleDocumentClick(e) {
    // Edit transaction buttons
    if (e.target.closest('.edit-transaction-btn')) {
        const transactionId = e.target.closest('.edit-transaction-btn').dataset.id;
        this.editTransaction(transactionId);
        return;
    }
    
    // Close search results when clicking outside
    const searchResults = document.getElementById('member-search-results');
    if (searchResults && !e.target.closest('.search-container')) {
        searchResults.style.display = 'none';
    }
    
    // Close contribution member search results when clicking outside
    const contributionSearchResults = document.getElementById('contribution-member-results');
    if (contributionSearchResults && !e.target.closest('.search-container')) {
        contributionSearchResults.style.display = 'none';
    }
    
    // Close action menus when clicking outside
    if (!e.target.closest('.action-dropdown')) {
        document.querySelectorAll('.action-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }
}
async loadMembersList() {
    try {
        const data = await API.get('/members');
        this.allMembers = data.list || [];
        console.log('Loaded members for search:', this.allMembers.length);
    } catch (error) {
        console.error('Error loading members list:', error);
        this.allMembers = [];
        // Show user-friendly error
        this.showUserNotification('Unable to load member list. Member search may not work properly.', 'warning');
    }
}

// Add user notification system
showUserNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.user-notification');
    existingNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `user-notification alert alert-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
        padding: 15px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease-out;
    `;
    
    const icon = type === 'error' ? 'fa-exclamation-circle' : 
                 type === 'warning' ? 'fa-exclamation-triangle' : 
                 type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
        <button type="button" class="close" onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 18px; cursor: pointer;">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}
        
 async loadAccountingData(filters = {}) {
    try {
        let url = '/accounting';
        if (Object.keys(filters).length > 0) {
            const params = new URLSearchParams(filters);
            url += `?${params.toString()}`;
        }

        console.log('📊 Fetching accounting data from:', url);
        const data = await API.get(url);
        
        // ✅ FIXED: Handle null/undefined response
        if (!data) {
            throw new Error('No data received from server - API returned null');
        }

        console.log('✅ Received accounting data:', data);

        // ✅ FIXED: Safe rendering with fallback data
        this.renderStats(data.currentMonth || {});
        this.renderChart(data.monthlyTrend || []);
        this.renderTransactions(data.transactions || []);
        this.renderTotalStats(data);
        
    } catch (error) {
        console.error('❌ Error loading accounting data:', error);
        this.showError(`Failed to load accounting data: ${error.message}`);
    }
}
// Add error display method
showError(message) {
    const contentArea = document.getElementById('content-area');
    if (contentArea) {
        contentArea.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 50px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc3545; margin-bottom: 20px;"></i>
                <h3>${message}</h3>
                <button class="btn btn-primary" onclick="accountingPage.loadAccountingData()">
                    <i class="fas fa-refresh"></i> Try Again
                </button>
            </div>
        `;
    }
}

// Add success display method
showSuccess(message) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.success-notification');
    existingNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = 'success-notification alert alert-success';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
        padding: 15px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease-out;
        background: #d4edda;
        border: 1px solid #c3e6cb;
        color: #155724;
    `;
    
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
        <button type="button" class="close" onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 18px; cursor: pointer; color: #155724;">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}
// Update renderTransactions to show actual payee data
renderTransactions(transactions) {
    const tbody = document.querySelector('#transactions-table tbody');
    if (!tbody) return;

    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No transactions found</td></tr>';
        return;
    }

    tbody.innerHTML = transactions.map(transaction => {
        // Get payee/recipient information from ACTUAL data
        let payeeInfo = 'N/A';
        let payeeType = 'external';
        
        if (transaction.payee) {
            if (transaction.payee.type === 'member' && transaction.payee.memberId) {
                // Member transaction - use actual member data
                const member = transaction.payee.memberId;
                payeeInfo = `${member.firstName} ${member.lastName}`;
                payeeType = 'member';
            } else if (transaction.payee.name) {
                // External payee - use actual name
                payeeInfo = transaction.payee.name;
                payeeType = 'external';
            }
        }

        return `
            <tr>
                <td>${new Date(transaction.date).toLocaleDateString()}</td>
                <td>${transaction.description}</td>
                <td>
                    ${payeeType === 'member' ? 
                        `<a href="#" onclick="accountingPage.viewMemberProfile('${transaction.payee.memberId?._id || transaction.payee.memberId}')" class="member-link">
                            ${payeeInfo}
                        </a>` : 
                        `<span>${payeeInfo}</span>`
                    }
                    ${payeeType === 'external' ? '<small class="text-muted"> (External)</small>' : ''}
                </td>
                <td>${this.formatCategory(transaction.category)}</td>
                <td>
                    <span class="badge ${transaction.type === 'income' ? 'badge-success' : 'badge-danger'}">
                        ${transaction.type}
                    </span>
                </td>
                <td class="${transaction.type === 'income' ? 'income' : 'expense'}">
                    ${transaction.type === 'income' ? '+' : '-'}$${transaction.amount.toLocaleString()}
                </td>
                <td>
                    <div class="action-dropdown">
                        <button class="action-menu-btn" onclick="accountingPage.toggleActionMenu(event, '${transaction._id}')" title="Actions">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="action-menu" id="action-menu-${transaction._id}">
                            <div class="action-item" onclick="accountingPage.editTransaction('${transaction._id}')">
                                <i class="fas fa-edit"></i>
                                <span>Edit Transaction</span>
                            </div>
                            ${transaction.type === 'income' ? `
                                <div class="action-item" onclick="accountingPage.generateReceipt('${transaction._id}')">
                                    <i class="fas fa-receipt"></i>
                                    <span>Generate Receipt</span>
                                </div>
                                <div class="action-item" onclick="accountingPage.downloadPDFReceipt('${transaction._id}')">
                                    <i class="fas fa-file-pdf"></i>
                                    <span>Download PDF</span>
                                </div>
                                <div class="action-item" onclick="accountingPage.openSignatureModal('${transaction._id}')">
                                    <i class="fas fa-signature"></i>
                                    <span>Add Signature</span>
                                </div>
                                <div class="action-item" onclick="accountingPage.sendReceiptEmail('${transaction._id}')">
                                    <i class="fas fa-envelope"></i>
                                    <span>Email PDF Receipt</span>
                                </div>
                            ` : ''}
                            <div class="action-item delete-action" onclick="accountingPage.deleteTransaction('${transaction._id}')">
                                <i class="fas fa-trash"></i>
                                <span>Delete</span>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Create a safe transaction row without XSS vulnerabilities
createTransactionRow(transaction) {
    const row = document.createElement('tr');
    
    // Get payee information safely
    let payeeInfo = 'N/A';
    let payeeType = 'external';
    let memberId = null;
    
    if (transaction.payee) {
        if (transaction.payee.type === 'member' && transaction.payee.memberId) {
            const member = transaction.payee.memberId;
            payeeInfo = `${DOMUtils.escapeHtml(member.firstName)} ${DOMUtils.escapeHtml(member.lastName)}`;
            payeeType = 'member';
            memberId = member._id || transaction.payee.memberId;
        } else if (transaction.payee.name) {
            payeeInfo = DOMUtils.escapeHtml(transaction.payee.name);
            payeeType = 'external';
        }
    }

    // Date cell
    const dateCell = document.createElement('td');
    dateCell.textContent = new Date(transaction.date).toLocaleDateString();
    row.appendChild(dateCell);

    // Description cell
    const descCell = document.createElement('td');
    descCell.textContent = transaction.description;
    row.appendChild(descCell);

    // Payee cell
    const payeeCell = document.createElement('td');
    if (payeeType === 'member' && memberId) {
        const memberLink = document.createElement('a');
        memberLink.href = '#';
        memberLink.className = 'member-link';
        memberLink.textContent = payeeInfo;
        memberLink.dataset.memberId = memberId;
        
        // Safe event handler
        const cleanup = DOMUtils.addEventListenerSafe(memberLink, 'click', (e) => {
            e.preventDefault();
            this.viewMemberProfile(memberId);
        });
        if (cleanup) this.transactionRowCleanup.push(cleanup);
        
        payeeCell.appendChild(memberLink);
    } else {
        const payeeSpan = document.createElement('span');
        payeeSpan.textContent = payeeInfo;
        payeeCell.appendChild(payeeSpan);
        
        if (payeeType === 'external') {
            const externalLabel = document.createElement('small');
            externalLabel.className = 'text-muted';
            externalLabel.textContent = ' (External)';
            payeeCell.appendChild(externalLabel);
        }
    }
    row.appendChild(payeeCell);

    // Category cell
    const categoryCell = document.createElement('td');
    categoryCell.textContent = this.formatCategory(transaction.category);
    row.appendChild(categoryCell);

    // Type cell
    const typeCell = document.createElement('td');
    const typeBadge = document.createElement('span');
    typeBadge.className = `badge ${transaction.type === 'income' ? 'badge-success' : 'badge-danger'}`;
    typeBadge.textContent = transaction.type;
    typeCell.appendChild(typeBadge);
    row.appendChild(typeCell);

    // Amount cell
    const amountCell = document.createElement('td');
    amountCell.className = transaction.type === 'income' ? 'income' : 'expense';
    amountCell.textContent = `${transaction.type === 'income' ? '+' : '-'}$${transaction.amount.toLocaleString()}`;
    row.appendChild(amountCell);

    // Actions cell
    const actionsCell = document.createElement('td');
    const actionDropdown = this.createActionDropdown(transaction);
    actionsCell.appendChild(actionDropdown);
    row.appendChild(actionsCell);

    return row;
}

// Create safe action dropdown without inline handlers
createActionDropdown(transaction) {
    const dropdown = document.createElement('div');
    dropdown.className = 'action-dropdown';

    const menuBtn = document.createElement('button');
    menuBtn.className = 'action-menu-btn';
    menuBtn.title = 'Actions';
    menuBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
    menuBtn.dataset.transactionId = transaction._id;
    
    // Safe event handler
    const cleanup = DOMUtils.addEventListenerSafe(menuBtn, 'click', (e) => {
        this.toggleActionMenu(e, transaction._id);
    });
    if (cleanup) this.eventCleanupFunctions.push(cleanup);

    const menu = document.createElement('div');
    menu.className = 'action-menu';
    menu.id = `action-menu-${transaction._id}`;

    // Edit action
    const editItem = this.createActionItem('fas fa-edit', 'Edit Transaction', () => {
        this.editTransaction(transaction._id);
    });
    menu.appendChild(editItem);

    // Income-specific actions
    if (transaction.type === 'income') {
        const receiptItem = this.createActionItem('fas fa-receipt', 'Generate Receipt', () => {
            this.generateReceipt(transaction._id);
        });
        menu.appendChild(receiptItem);

        const pdfItem = this.createActionItem('fas fa-file-pdf', 'Download PDF', () => {
            this.downloadPDFReceipt(transaction._id);
        });
        menu.appendChild(pdfItem);

        const signatureItem = this.createActionItem('fas fa-signature', 'Add Signature', () => {
            this.openSignatureModal(transaction._id);
        });
        menu.appendChild(signatureItem);

        const emailItem = this.createActionItem('fas fa-envelope', 'Email PDF Receipt', () => {
            this.sendReceiptEmail(transaction._id);
        });
        menu.appendChild(emailItem);
    }

    // Delete action
    const deleteItem = this.createActionItem('fas fa-trash', 'Delete', () => {
        this.deleteTransaction(transaction._id);
    });
    deleteItem.className += ' delete-action';
    menu.appendChild(deleteItem);

    dropdown.appendChild(menuBtn);
    dropdown.appendChild(menu);
    
    return dropdown;
}

// Create safe action item
createActionItem(iconClass, text, handler) {
    const item = document.createElement('div');
    item.className = 'action-item';
    
    const icon = document.createElement('i');
    icon.className = iconClass;
    
    const span = document.createElement('span');
    span.textContent = text;
    
    item.appendChild(icon);
    item.appendChild(span);
    
    // Safe event handler
    const cleanup = DOMUtils.addEventListenerSafe(item, 'click', handler);
    if (cleanup) this.eventCleanupFunctions.push(cleanup);
    
    return item;
}

        // MEMBER SEARCH FUNCTIONALITY
        // Debounced search method for performance
        performMemberSearch(query) {
            this.searchMembers(query);
        }
        
        searchMembers(query) {
            const resultsContainer = document.getElementById('member-search-results');
            const payeeSearch = document.getElementById('payee-search');
            
            if (query.length < 2) {
                resultsContainer.innerHTML = '';
                resultsContainer.style.display = 'none';
                return;
            }

            const filteredMembers = this.allMembers.filter(member => 
                `${member.firstName} ${member.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
                member.email?.toLowerCase().includes(query.toLowerCase())
            );

            this.displaySearchResults(filteredMembers, query);
        }
       displaySearchResults(members, query) {
    const resultsContainer = document.getElementById('member-search-results');
    
    if (members.length === 0) {
        resultsContainer.innerHTML = `
            <div class="search-result-item" onclick="accountingPage.selectExternalPayee('${query}')">
                <i class="fas fa-user-plus"></i>
                <span>Add "${query}" as external payee</span>
            </div>
        `;
    } else {
        resultsContainer.innerHTML = members.map(member => {
            // Use member._id for MongoDB
            const memberId = member._id || member.id;
            const isValidObjectId = memberId && memberId.length === 24 && /^[0-9a-fA-F]+$/.test(memberId);
            
            return `
                <div class="search-result-item" onclick="accountingPage.selectMember('${memberId}', '${member.firstName} ${member.lastName}')">
                    <i class="fas fa-user"></i>
                    <div>
                        <strong>${member.firstName} ${member.lastName}</strong>
                        <div class="member-email">${member.email || 'No email'}</div>
                        <small class="text-muted">ID: ${memberId ? memberId.substring(0, 8) + '...' : 'N/A'}</small>
                        <small class="${isValidObjectId ? 'text-success' : 'text-danger'}">
                            ${isValidObjectId ? '✓ Valid ID' : '✗ Invalid ID'}
                        </small>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    resultsContainer.style.display = 'block';
}
// In accounting.js - FIXED member selection
selectMember(memberId, memberName) {
    console.log('Selecting member:', memberId, memberName);
    
    // Validate if it's a proper ObjectId format
    if (memberId && memberId.length === 24 && /^[0-9a-fA-F]+$/.test(memberId)) {
        document.getElementById('selected-member-id').value = memberId;
    } else {
        console.warn('Invalid memberId format:', memberId);
        document.getElementById('selected-member-id').value = '';
        return;
    }
    
    // Set the payee name
    document.getElementById('payee-search').value = memberName;
    
    // Set payee type to MEMBER (this was missing!)
    document.querySelector('input[name="payee-type"][value="member"]').checked = true;
    
    // Hide search results
    document.getElementById('member-search-results').style.display = 'none';
    
    // Update the form fields
    this.togglePayeeFields();
    
    console.log('Member selected successfully:', {
        memberId: memberId,
        memberName: memberName,
        payeeType: 'member'
    });
}
// Also fix the external payee selection
selectExternalPayee(name) {
    console.log('Selecting external payee:', name);
    
    document.getElementById('selected-member-id').value = '';
    document.getElementById('payee-search').value = name;
    document.getElementById('member-search-results').style.display = 'none';
    
    // Set payee type to EXTERNAL
    document.querySelector('input[name="payee-type"][value="external"]').checked = true;
    
    // Update the form fields
    this.togglePayeeFields();
    
    console.log('External payee selected successfully');
}
// Update the displaySearchResults function
displaySearchResults(members, query) {
    const resultsContainer = document.getElementById('member-search-results');
    
    if (members.length === 0) {
        resultsContainer.innerHTML = `
            <div class="search-result-item" onclick="accountingPage.selectExternalPayee('${query}')">
                <i class="fas fa-user-plus"></i>
                <span>Add "${query}" as external payee</span>
            </div>
        `;
    } else {
        resultsContainer.innerHTML = members.map(member => {
            // Use member._id instead of member.id
            const memberId = member._id || member.id;
            return `
                <div class="search-result-item" onclick="accountingPage.selectMember('${memberId}', '${member.firstName} ${member.lastName}')">
                    <i class="fas fa-user"></i>
                    <div>
                        <strong>${member.firstName} ${member.lastName}</strong>
                        <div class="member-email">${member.email || 'No email'}</div>
                        <small class="text-muted">ID: ${memberId ? memberId.substring(0, 8) + '...' : 'N/A'}</small>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    resultsContainer.style.display = 'block';
}
 // FIXED togglePayeeFields method - Preserve category during edit
togglePayeeFields() {
    // Safety checks - ensure all required DOM elements exist
    const transactionTypeEl = document.getElementById('transaction-type');
    const payeeTypeEl = document.querySelector('input[name="payee-type"]:checked');
    const payeeLabel = document.getElementById('payee-label');
    const externalFields = document.getElementById('external-payee-fields');
    const incomeCategories = document.getElementById('income-categories');
    const expenseCategories = document.getElementById('expense-categories');
    const categorySelect = document.getElementById('transaction-category');
    
    // Exit early if required elements don't exist
    if (!transactionTypeEl || !payeeTypeEl || !payeeLabel || !externalFields || 
        !incomeCategories || !expenseCategories || !categorySelect) {
        console.warn('togglePayeeFields: Required DOM elements not found');
        return;
    }
    
    const transactionType = transactionTypeEl.value;
    const payeeType = payeeTypeEl.value;
    
    // Get current category BEFORE changing visibility
    const currentCategory = categorySelect.value;
    
    // Update label based on transaction type
    if (transactionType === 'income') {
        payeeLabel.textContent = 'Payee *';
    } else {
        payeeLabel.textContent = 'Recipient *';
    }

    // Show/hide external payee fields
    if (payeeType === 'external') {
        externalFields.style.display = 'block';
    } else {
        externalFields.style.display = 'none';
    }

    // Show/hide category groups based on transaction type
    if (transactionType === 'income') {
        incomeCategories.style.display = 'block';
        expenseCategories.style.display = 'none';
        
        // Only set default category if we're in ADD mode, not EDIT mode
        const isEditing = this.editingTransactionId;
        
        if (!isEditing && (!currentCategory || !this.isIncomeCategory(currentCategory))) {
            categorySelect.value = 'tithe';
        }
    } else {
        // FIXED: Remove duplicate line - only set once
        incomeCategories.style.display = 'none';
        expenseCategories.style.display = 'block';
        
        // Only set default category if we're in ADD mode, not EDIT mode
        const form = document.getElementById('transaction-form');
        const isEditing = form?.dataset?.editingTransactionId;
        
        if (!isEditing && (!currentCategory || !this.isExpenseCategory(currentCategory))) {
            categorySelect.value = 'honorarium';
        }
    }
    
    // Restore the original category if it exists in the current group
    if (currentCategory) {
        const optionExists = categorySelect.querySelector(`option[value="${currentCategory}"]`);
        if (optionExists) {
            categorySelect.value = currentCategory;
        }
    }
    
    // Toggle month selector based on category
    this.toggleMonthSelector();
}
// Add helper methods to check category types
isIncomeCategory(category) {
    const incomeCategories = [
        'tithe', 'offering', 'donation', 'pledge', 'building', 'missions', 
        'youth_activity', 'cultural_events', 'fundraising', 'special_donations', 
        'membership', 'other'
    ];
    return incomeCategories.includes(category);
}
isExpenseCategory(category) {
    const expenseCategories = [
        'honorarium', 'utilities', 'salaries', 'supplies', 'benevolence', 
        'building', 'youth_programs', 'cultural_events', 'maintenance', 
        'office_expenses', 'insurance', 'technology', 'training', 
        'volunteer_support', 'events', 'other'
    ];
    return expenseCategories.includes(category);
}

// Get the final transaction description
getTransactionDescription() {
    const descriptionSelect = document.getElementById('transaction-description');
    const customDescription = document.getElementById('custom-description');
    
    if (descriptionSelect.value === 'custom') {
        return customDescription.value.trim();
    } else if (descriptionSelect.value === '') {
        // If no selection, require user to select something
        throw new Error('Please select or enter a description');
    } else {
        return descriptionSelect.value;
    }
}

// Handle description dropdown change
handleDescriptionChange() {
    const descriptionSelect = document.getElementById('transaction-description');
    const customDescInput = document.getElementById('custom-description-input');
    const customDescription = document.getElementById('custom-description');
    
    if (descriptionSelect && customDescInput) {
        if (descriptionSelect.value === 'custom') {
            customDescInput.style.display = 'block';
            customDescription.required = true;
        } else {
            customDescInput.style.display = 'none';
            customDescription.required = false;
            customDescription.value = '';
        }
    }
}

// Update description options based on category
updateDescriptionOptions() {
    const categorySelect = document.getElementById('transaction-category');
    const descriptionSelect = document.getElementById('transaction-description');
    const transactionType = document.getElementById('transaction-type').value;
    
    if (!categorySelect || !descriptionSelect) return;
    
    const category = categorySelect.value;
    
    // Clear existing options
    descriptionSelect.innerHTML = '<option value="">Select or enter description...</option>';
    
    // If no category selected, return
    if (!category) {
        return;
    }
    
    // If category is "other", just show custom option
    if (category === 'other') {
        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = 'Custom (Enter your own)';
        descriptionSelect.appendChild(customOption);
        return;
    }
    
    // Add the category label as an option (but don't auto-select it)
    const categoryLabel = this.getCategoryLabel(category);
    const categoryOption = document.createElement('option');
    categoryOption.value = categoryLabel;
    categoryOption.textContent = categoryLabel;
    descriptionSelect.appendChild(categoryOption);
    
    // Get description suggestions based on category and type
    const suggestions = this.getDescriptionSuggestions(category, transactionType);
    
    // Add suggestions to dropdown (excluding the category label if it's already in suggestions)
    suggestions.forEach(suggestion => {
        if (suggestion !== categoryLabel) {
            const option = document.createElement('option');
            option.value = suggestion;
            option.textContent = suggestion;
            descriptionSelect.appendChild(option);
        }
    });
    
    // Add "Custom" option
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom (Enter your own)';
    descriptionSelect.appendChild(customOption);
    
    // Ensure the blank option remains selected
    descriptionSelect.value = '';
}

// Get description suggestions based on category
getDescriptionSuggestions(category, type) {
    const suggestions = {
        // Income categories
        'tithe': [
            'Weekly Tithe',
            'Monthly Tithe',
            'Annual Tithe',
            'Special Tithe Offering'
        ],
        'offering': [
            'Sunday Morning Offering',
            'Evening Service Offering',
            'Special Service Offering',
            'Thanksgiving Offering',
            'Christmas Offering',
            'Easter Offering'
        ],
        'donation': [
            'General Donation',
            'Anonymous Donation',
            'Memorial Donation',
            'Birthday Donation',
            'Wedding Donation'
        ],
        'pledge': [
            'Annual Pledge Payment',
            'Building Fund Pledge',
            'Mission Pledge Payment',
            'Special Project Pledge'
        ],
        'building': [
            'Building Fund Contribution',
            'Church Renovation Fund',
            'Maintenance Fund',
            'Property Development Fund'
        ],
        'missions': [
            'Mission Support',
            'Missionary Support',
            'Overseas Mission Fund',
            'Local Mission Project'
        ],
        'youth_activity': [
            'Youth Camp Fee',
            'Kids Activity Fee',
            'Youth Event Registration',
            'Children\'s Program Fee',
            'Youth Trip Contribution'
        ],
        'cultural_events': [
            'Cultural Event Fee',
            'Community Event Contribution',
            'Festival Participation Fee',
            'Cultural Program Support'
        ],
        'fundraising': [
            'Fundraising Event Income',
            'Charity Auction Proceeds',
            'Bake Sale Income',
            'Car Wash Fundraiser'
        ],
        'special_donations': [
            'Bequest Donation',
            'Memorial Gift',
            'Special Occasion Gift',
            'Legacy Donation'
        ],
        'membership': [
            'Annual Membership Fee',
            'New Member Registration',
            'Membership Renewal',
            'Family Membership Fee'
        ],
        
        // Expense categories
        'honorarium': [
            'Guest Speaker Honorarium',
            'Clergy Honorarium',
            'Volunteer Appreciation',
            'Special Service Honorarium'
        ],
        'utilities': [
            'Electricity Bill',
            'Water Bill',
            'Gas Bill',
            'Internet/Phone Bill',
            'Waste Management'
        ],
        'salaries': [
            'Pastor Salary',
            'Staff Salary',
            'Part-time Worker Payment',
            'Contract Worker Payment'
        ],
        'supplies': [
            'Office Supplies',
            'Cleaning Supplies',
            'Kitchen Supplies',
            'Worship Supplies',
            'General Supplies'
        ],
        'benevolence': [
            'Family Assistance',
            'Emergency Aid',
            'Community Support',
            'Charity Donation',
            'Relief Fund'
        ],
        'youth_programs': [
            'Youth Program Supplies',
            'Kids Activity Materials',
            'Youth Event Expenses',
            'Children\'s Program Costs'
        ],
        'cultural_events': [
            'Cultural Event Expenses',
            'Community Event Costs',
            'Festival Organization Costs',
            'Cultural Program Expenses'
        ],
        'maintenance': [
            'Building Maintenance',
            'Equipment Repair',
            'Facility Upkeep',
            'Preventive Maintenance',
            'Emergency Repair'
        ],
        'office_expenses': [
            'Administrative Costs',
            'Printing/Copying',
            'Postage/Shipping',
            'Office Equipment',
            'Software License'
        ],
        'insurance': [
            'Property Insurance',
            'Liability Insurance',
            'Vehicle Insurance',
            'Workers Compensation'
        ],
        'technology': [
            'Computer Equipment',
            'Audio/Visual Equipment',
            'Software Purchase',
            'IT Support',
            'Website Maintenance'
        ],
        'training': [
            'Staff Training',
            'Workshop Attendance',
            'Conference Registration',
            'Educational Materials'
        ],
        'volunteer_support': [
            'Volunteer Refreshments',
            'Volunteer Appreciation Event',
            'Volunteer Training Materials',
            'Volunteer Recognition'
        ],
        'events': [
            'Special Event Costs',
            'Church Event Expenses',
            'Community Event Costs',
            'Holiday Event Expenses'
        ]
    };
    
    return suggestions[category] || [
        type === 'income' ? 'General Income' : 'General Expense',
        'Miscellaneous',
        'Other'
    ];
}

// Handle category change - update descriptions and toggle "Other" input
handleCategoryChange() {
    const categorySelect = document.getElementById('transaction-category');
    const category = categorySelect.value;
    
    // Update description options first
    this.updateDescriptionOptions();
    
    // Only auto-fill description if we're in edit mode or user explicitly changed category
    // Don't auto-fill on initial form load
    if (this.editingTransactionId && category && category !== 'other') {
        const categoryLabel = this.getCategoryLabel(category);
        const descriptionSelect = document.getElementById('transaction-description');
        
        // Set the description to the category label only in edit mode
        descriptionSelect.value = categoryLabel;
        this.handleDescriptionChange();
    } else if (category === 'other') {
        // For "other", show custom description input
        const descriptionSelect = document.getElementById('transaction-description');
        descriptionSelect.value = 'custom';
        this.handleDescriptionChange();
    }
    
    // Toggle "Other" category input and month selector
    this.toggleOtherCategory();
}

// Get category label from value (matches HTML dropdown labels)
getCategoryLabel(categoryValue) {
    const categoryLabels = {
        // Income categories
        'tithe': 'Tithe',
        'offering': 'Offering',
        'donation': 'Donation',
        'pledge': 'Pledge',
        'building': 'Building Fund',
        'missions': 'Missions',
        'youth_activity': 'Youth Activity Fees',
        'cultural_events': 'Cultural / Community Events',
        'fundraising': 'Fundraising Event',
        'special_donations': 'Special Donations',
        'membership': 'Membership Fees',
        
        // Expense categories
        'honorarium': 'Honorarium (Clergy/Volunteers)',
        'utilities': 'Utilities',
        'salaries': 'Salaries',
        'supplies': 'Supplies',
        'benevolence': 'Benevolence / Aid',
        'youth_programs': 'Youth Program Expenses',
        'cultural_events': 'Cultural / Community Expenses',
        'maintenance': 'Maintenance & Repairs',
        'office_expenses': 'Office / Admin Expenses',
        'insurance': 'Insurance',
        'technology': 'Technology / IT',
        'training': 'Training / Workshops',
        'volunteer_support': 'Volunteer Support',
        'events': 'Events',
        'other': 'Other (Specify)'
    };
    
    return categoryLabels[categoryValue] || categoryValue;
}

// Toggle "Other" category custom input
toggleOtherCategory() {
    const categorySelect = document.getElementById('transaction-category');
    const otherInput = document.getElementById('other-category-input');
    const customCategoryInput = document.getElementById('custom-category');
    
    if (categorySelect && otherInput) {
        if (categorySelect.value === 'other') {
            otherInput.style.display = 'block';
            customCategoryInput.required = true;
        } else {
            otherInput.style.display = 'none';
            customCategoryInput.required = false;
            customCategoryInput.value = '';
        }
    }
    
    // Show/hide month selector for tithe/monthly categories
    this.toggleMonthSelector();
}

// MULTI-MONTH PAYMENT FEATURE
// Toggle month selector visibility based on category
toggleMonthSelector() {
    const categorySelect = document.getElementById('transaction-category');
    const monthSelectorContainer = document.getElementById('month-selector-container');
    const transactionType = document.getElementById('transaction-type').value;
    
    if (!categorySelect || !monthSelectorContainer) return;
    
    const category = categorySelect.value.toLowerCase();
    const isTitheOrMonthly = category.includes('tithe') || category.includes('monthly');
    const isIncome = transactionType === 'income';
    
    if (isTitheOrMonthly && isIncome) {
        monthSelectorContainer.style.display = 'block';
        this.generateMonthCheckboxes();
    } else {
        monthSelectorContainer.style.display = 'none';
    }
}

// Generate month checkboxes dynamically
generateMonthCheckboxes() {
    const container = document.getElementById('month-checkboxes');
    if (!container) return;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    
    const months = [];
    
    // Generate last 12 months + current + next 3 months (16 months total)
    for (let i = -12; i <= 3; i++) {
        const date = new Date(currentYear, currentMonth + i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        let status = '';
        let statusClass = '';
        if (i < 0) {
            status = ` (Overdue - ${Math.abs(i)} month${Math.abs(i) > 1 ? 's' : ''})`;
            statusClass = 'overdue';
        } else if (i === 0) {
            status = ' (Current Month)';
            statusClass = 'current';
        }
        
        months.push({
            key: monthKey,
            label: monthLabel,
            status: status,
            statusClass: statusClass,
            isOverdue: i < 0,
            isCurrent: i === 0
        });
    }
    
    // Build HTML
    container.innerHTML = months.map(month => `
        <div style="padding: 8px; border-bottom: 1px solid #e0e0e0; ${month.isCurrent ? 'background: #e8f4f8;' : ''}">
            <label style="display: flex; align-items: center; cursor: pointer; user-select: none;">
                <input type="checkbox" 
                       class="month-checkbox" 
                       value="${month.key}" 
                       ${month.isCurrent ? 'checked' : ''}
                       onchange="accountingPage.updateMultiMonthTotal()"
                       style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
                <span style="flex: 1; ${month.isOverdue ? 'color: #dc3545; font-weight: 600;' : ''}">
                    ${month.label}${month.status}
                </span>
            </label>
        </div>
    `).join('');
    
    // Initialize total
    this.updateMultiMonthTotal();
}

// Update multi-month total calculation
updateMultiMonthTotal() {
    const checkboxes = document.querySelectorAll('.month-checkbox:checked');
    const amountPerMonth = parseFloat(document.getElementById('amount-per-month')?.value || 0);
    const count = checkboxes.length;
    const total = count * amountPerMonth;
    
    // Update display
    document.getElementById('months-selected-count').textContent = count;
    document.getElementById('multi-month-total').textContent = `$${total.toFixed(2)}`;
    
    // Update main amount field
    const amountField = document.getElementById('transaction-amount');
    if (amountField && count > 0) {
        amountField.value = total.toFixed(2);
    }
    
    // Auto-generate description
    this.updateMultiMonthDescription();
}

// Auto-generate description for multi-month payments
updateMultiMonthDescription() {
    const checkboxes = Array.from(document.querySelectorAll('.month-checkbox:checked'));
    const descriptionSelect = document.getElementById('transaction-description');
    const customDescInput = document.getElementById('custom-description');
    
    if (checkboxes.length === 0) return;
    
    // Sort months chronologically
    const selectedMonths = checkboxes
        .map(cb => cb.value)
        .sort();
    
    let description = '';
    if (selectedMonths.length === 1) {
        // Single month
        const date = new Date(selectedMonths[0] + '-01');
        description = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
        // Multiple months
        const firstDate = new Date(selectedMonths[0] + '-01');
        const lastDate = new Date(selectedMonths[selectedMonths.length - 1] + '-01');
        description = `${firstDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} (${selectedMonths.length} months)`;
    }
    
    // Set description
    if (descriptionSelect) {
        descriptionSelect.value = 'custom';
        const customDescContainer = document.getElementById('custom-description-input');
        if (customDescContainer) {
            customDescContainer.style.display = 'block';
        }
    }
    if (customDescInput) {
        customDescInput.value = description;
    }
}

// Member Contributions Functions
showAddContributionForm() {
    // Reset form first
    const form = document.getElementById('contribution-form');
    if (form) {
        form.reset();
    }
    
    // Set default values - format date as DD/MM/YYYY for mobile-date input
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    document.getElementById('contribution-date').value = formattedDate;
    document.getElementById('contribution-member-id').value = '';
    document.getElementById('contribution-member-search').value = '';
    document.getElementById('contribution-quantity').value = '1';
    
    // Hide search results
    document.getElementById('contribution-member-results').style.display = 'none';
    
    // Hide cash transaction option by default
    const cashOption = document.getElementById('cash-transaction-option');
    if (cashOption) {
        cashOption.style.display = 'none';
    }
    
    // Show modal
    document.getElementById('contribution-modal').style.display = 'block';
    
    console.log('✅ Contribution form opened and initialized');
}

closeContributionModal() {
    document.getElementById('contribution-modal').style.display = 'none';
    document.getElementById('contribution-form').reset();
    document.getElementById('contribution-member-results').style.display = 'none';
}

toggleContributionFields() {
    // This function is kept for compatibility but no longer needed
    // since we removed cash contributions from this form
    // Cash contributions are now only in the Transactions tab
    const type = document.getElementById('contribution-type')?.value;
    console.log('Contribution type changed to:', type);
}

async searchMembersForContribution(query) {
    const resultsContainer = document.getElementById('contribution-member-results');
    
    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        return;
    }

    // Use the same logic as transaction member search
    const filteredMembers = this.allMembers.filter(member => 
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
        member.email?.toLowerCase().includes(query.toLowerCase())
    );

    this.displayContributionMemberResults(filteredMembers, query);
}

displayContributionMemberResults(members, query) {
    const resultsContainer = document.getElementById('contribution-member-results');
    
    if (members.length === 0) {
        resultsContainer.innerHTML = `
            <div class="search-result-item" style="color: #666; font-style: italic;">
                <i class="fas fa-search"></i>
                <span>No members found matching "${query}"</span>
            </div>
        `;
    } else {
        resultsContainer.innerHTML = members.map(member => {
            // Use member._id for MongoDB (same as transaction search)
            const memberId = member._id || member.id;
            const isValidObjectId = memberId && memberId.length === 24 && /^[0-9a-fA-F]+$/.test(memberId);
            
            return `
                <div class="search-result-item" onclick="accountingPage.selectContributionMember('${memberId}', '${member.firstName} ${member.lastName}')">
                    <i class="fas fa-user"></i>
                    <div>
                        <strong>${member.firstName} ${member.lastName}</strong>
                        <div class="member-email">${member.email || 'No email'}</div>
                        <small class="text-muted">ID: ${memberId ? memberId.substring(0, 8) + '...' : 'N/A'}</small>
                        <small class="${isValidObjectId ? 'text-success' : 'text-danger'}">
                            ${isValidObjectId ? '✓ Valid ID' : '✗ Invalid ID'}
                        </small>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    resultsContainer.style.display = 'block';
}

selectContributionMember(memberId, memberName) {
    console.log('Selecting contribution member:', memberId, memberName);
    
    // Use the same validation as transaction member selection
    if (memberId && memberId.length === 24 && /^[0-9a-fA-F]+$/.test(memberId)) {
        document.getElementById('contribution-member-id').value = memberId;
    } else {
        console.warn('Invalid memberId format:', memberId);
        document.getElementById('contribution-member-id').value = '';
        return;
    }
    
    // Set the payee name
    document.getElementById('contribution-member-search').value = memberName;
    
    // Hide search results
    document.getElementById('contribution-member-results').style.display = 'none';
    
    console.log('✅ Member selected for contribution:', {
        memberId: memberId,
        memberName: memberName
    });
}

async addContribution() {
    const form = document.getElementById('contribution-form');
    const formData = new FormData(form);
    
    const contributionData = {
        memberId: document.getElementById('contribution-member-id').value,
        type: document.getElementById('contribution-type').value,
        category: document.getElementById('contribution-category').value,
        description: document.getElementById('contribution-description').value,
        quantity: parseInt(document.getElementById('contribution-quantity').value) || 1,
        value: parseFloat(document.getElementById('contribution-value').value),
        date: document.getElementById('contribution-date').value,
        notes: document.getElementById('contribution-notes').value,
        issueReceipt: document.getElementById('issue-receipt').checked
    };

    // Validation
    if (!contributionData.memberId) {
        this.showError('Please select a member');
        return;
    }

    if (!contributionData.description || !contributionData.value) {
        this.showError('Please fill in all required fields');
        return;
    }

    try {
        const result = await API.post('/member-contributions', contributionData);
        
        if (result.success) {
            this.showSuccess('Contribution added successfully');
            this.closeContributionModal();
            this.loadContributions();
            
            // Refresh transactions if cash transaction was created
            if (contributionData.createTransaction) {
                this.loadTransactions();
            }
        } else {
            this.showError(result.error || 'Failed to add contribution');
        }
    } catch (error) {
        console.error('Error adding contribution:', error);
        this.showError('Error adding contribution: ' + error.message);
    }
}

async loadContributions() {
    try {
        const response = await API.get('/member-contributions?limit=1000'); // Get more for statistics
        const contributions = response.contributions || [];
        
        // Calculate tithe statistics
        await this.calculateTitheStatistics(contributions);
        
        // Display contributions table
        this.displayContributions(contributions);
    } catch (error) {
        console.error('Error loading contributions:', error);
        document.getElementById('contributions-list').innerHTML = '<tr><td colspan="8">Error loading contributions</td></tr>';
    }
}

async calculateTitheStatistics(contributions) {
    try {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Filter contributions for current month
        const monthContributions = contributions.filter(c => {
            const date = new Date(c.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        
        // Filter tithes for current month
        const monthTithes = monthContributions.filter(c => c.category === 'tithe');
        const monthTithesTotal = monthTithes.reduce((sum, c) => sum + c.value, 0);
        
        // Year total
        const yearContributions = contributions.filter(c => {
            const date = new Date(c.date);
            return date.getFullYear() === currentYear;
        });
        const yearTotal = yearContributions.reduce((sum, c) => sum + c.value, 0);
        
        // Get active members count
        const membersResponse = await API.get('/members');
        const totalActiveMembers = (membersResponse.list || []).filter(m => m.status === 'active').length;
        
        // Members who paid tithes this month (unique member IDs)
        const membersPaidThisMonth = new Set(monthTithes.map(c => c.memberId?._id || c.memberId)).size;
        
        // Average tithe
        const avgTithe = membersPaidThisMonth > 0 ? monthTithesTotal / membersPaidThisMonth : 0;
        
        // Update UI
        document.getElementById('month-tithes-total').textContent = `$${monthTithesTotal.toFixed(2)}`;
        document.getElementById('month-tithes-count').textContent = `${monthTithes.length} contributions`;
        
        document.getElementById('year-contributions-total').textContent = `$${yearTotal.toFixed(2)}`;
        document.getElementById('year-contributions-count').textContent = `${yearContributions.length} contributions`;
        
        document.getElementById('members-paid-count').textContent = membersPaidThisMonth;
        document.getElementById('members-total-count').textContent = `of ${totalActiveMembers} active members`;
        
        document.getElementById('avg-tithe-amount').textContent = `$${avgTithe.toFixed(2)}`;
        
    } catch (error) {
        console.error('Error calculating tithe statistics:', error);
    }
}

displayContributions(contributions) {
    const tbody = document.getElementById('contributions-list');
    
    if (contributions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #666;">No contributions found</td></tr>';
        return;
    }

    tbody.innerHTML = contributions.map(contribution => {
        // Handle different display for "item" type (Physical Items)
        if (contribution.type === 'item') {
            return `
                <tr style="background-color: #f8f9fa;">
                    <td>${new Date(contribution.date).toLocaleDateString('en-AU')}</td>
                    <td>${DOMUtils.escapeHtml(contribution.memberId?.firstName && contribution.memberId?.lastName ? 
                        `${contribution.memberId.firstName} ${contribution.memberId.lastName}` : 
                        contribution.memberId?.name || 'Unknown Member')}</td>
                    <td>
                        <span class="badge badge-primary">
                            📦 Physical Item
                        </span>
                    </td>
                    <td>${this.formatCategory(contribution.category)}</td>
                    <td>
                        ${DOMUtils.escapeHtml(contribution.description)}
                        <br><small style="color: #666;">
                            <i class="fas fa-arrow-right"></i> 
                            <a href="#" onclick="loadPage('inventory')" style="color: #007bff;">
                                View in Inventory Page
                            </a>
                        </small>
                    </td>
                    <td>$${contribution.value.toFixed(2)}</td>
                    <td>
                        <span class="badge badge-info">
                            <i class="fas fa-box"></i> In Inventory
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-danger" onclick="accountingPage.deleteContribution('${contribution._id}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            // Regular display for "in-kind" type (Consumable donations)
            return `
                <tr>
                    <td>${new Date(contribution.date).toLocaleDateString('en-AU')}</td>
                    <td>${DOMUtils.escapeHtml(contribution.memberId?.firstName && contribution.memberId?.lastName ? 
                        `${contribution.memberId.firstName} ${contribution.memberId.lastName}` : 
                        contribution.memberId?.name || 'Unknown Member')}</td>
                    <td>
                        <span class="badge ${contribution.type === 'cash' ? 'badge-success' : 'badge-info'}">
                            ${contribution.type === 'in-kind' ? '🎁 In-Kind' : contribution.type}
                        </span>
                    </td>
                    <td>${this.formatCategory(contribution.category)}</td>
                    <td>${DOMUtils.escapeHtml(contribution.description)}</td>
                    <td>$${contribution.value.toFixed(2)}</td>
                    <td>
                        ${contribution.verified?.isVerified ? 
                            '<span class="badge badge-success">✓ Verified</span>' : 
                            '<span class="badge badge-warning">Pending</span>'
                        }
                    </td>
                    <td>
                        <div class="action-buttons">
                            ${!contribution.verified?.isVerified ? 
                                `<button class="btn btn-sm btn-success" onclick="accountingPage.verifyContribution('${contribution._id}')">Verify</button>` : 
                                ''
                            }
                            <button class="btn btn-sm btn-danger" onclick="accountingPage.deleteContribution('${contribution._id}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }).join('');
}

async verifyContribution(contributionId) {
    try {
        const result = await API.post(`/member-contributions/${contributionId}/verify`, {
            verificationNotes: 'Verified by administrator'
        });
        
        if (result.success) {
            this.showSuccess('Contribution verified successfully');
            this.loadContributions();
        } else {
            this.showError(result.error || 'Failed to verify contribution');
        }
    } catch (error) {
        console.error('Error verifying contribution:', error);
        this.showError('Error verifying contribution: ' + error.message);
    }
}

async deleteContribution(contributionId) {
    if (!confirm('Are you sure you want to delete this contribution?')) {
        return;
    }

    try {
        const result = await API.delete(`/member-contributions/${contributionId}`);
        
        if (result.success) {
            this.showSuccess('Contribution deleted successfully');
            this.loadContributions();
        } else {
            this.showError(result.error || 'Failed to delete contribution');
        }
    } catch (error) {
        console.error('Error deleting contribution:', error);
        this.showError('Error deleting contribution: ' + error.message);
    }
}

filterContributions() {
    // This would implement filtering logic
    // For now, just reload contributions
    this.loadContributions();
}

// Format category for display
formatCategory(category) {
    const categoryMap = {
        'tithe': 'Tithe',
        'offering': 'Offering',
        'donation': 'Donation',
        'pledge': 'Pledge',
        'building': 'Building Fund',
        'missions': 'Missions',
        'honorarium': 'Honorarium (Clergy)',
        'utilities': 'Utilities',
        'salaries': 'Salaries',
        'supplies': 'Supplies',
        'benevolence': 'Benevolence',
        'membership': 'Membership',
        'events': 'Events',
        'other': 'Other'
    };
    return categoryMap[category] || category;
}
// Add the editTransaction function:
async editTransaction(transactionId) {
    // Close the action menu immediately to prevent multiple clicks
    document.querySelectorAll('.action-menu.show').forEach(menu => {
        menu.classList.remove('show');
    });
    
    try {
        console.log('Editing transaction:', transactionId);
        
        // Fetch the transaction data
        const transaction = await API.get(`/accounting/transaction/${transactionId}`);
        
        // Populate the form with existing data
        this.populateEditForm(transaction);
        
        // Show the modal
        document.getElementById('transaction-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading transaction for edit:', error);
        alert('Error loading transaction data. Please try again.');
    }
}
// FIXED populateEditForm method - Added null checks for all form elements
populateEditForm(transaction) {
    console.log('📝 Populating edit form with transaction:', transaction);
    
    // Set basic fields with null checks
    const typeField = document.getElementById('transaction-type');
    const descField = document.getElementById('transaction-description');
    const amountField = document.getElementById('transaction-amount');
    const paymentField = document.getElementById('payment-method');
    const refField = document.getElementById('transaction-reference');
    const noteField = document.getElementById('transaction-note');
    const categoryField = document.getElementById('transaction-category');
    
    if (!typeField || !descField || !amountField || !categoryField) {
        console.error('❌ Required form fields not found in DOM');
        alert('Error: Form fields are missing. Please refresh the page.');
        return;
    }
    
    typeField.value = transaction.type;
    descField.value = transaction.description;
    amountField.value = transaction.amount;
    if (paymentField) paymentField.value = transaction.paymentMethod || 'cash';
    if (refField) refField.value = transaction.reference || '';
    if (noteField) noteField.value = transaction.notes || '';
    
    // ✅ CRITICAL FIX: Set the category FIRST before calling togglePayeeFields
    categoryField.value = transaction.category;
    
    // Handle "Other" category - check if custom category info is in notes
    if (transaction.category === 'other' && transaction.notes) {
        const customCategoryField = document.getElementById('custom-category');
        if (customCategoryField) {
            // Try to extract custom category from notes (format: "CustomCategory | other notes")
            const notesParts = transaction.notes.split(' | ');
            if (notesParts.length > 1) {
                customCategoryField.value = notesParts[0];
                if (noteField) noteField.value = notesParts.slice(1).join(' | ');
            }
        }
    }
    
    // Toggle the "Other" category input if needed
    this.toggleOtherCategory();
    
    // Update description options based on new category
    this.updateDescriptionOptions();
    
    // Set description after options are populated
    const descriptionSelect = document.getElementById('transaction-description');
    if (descriptionSelect) {
        const existingOption = descriptionSelect.querySelector(`option[value="${transaction.description}"]`);
        
        if (existingOption) {
            descriptionSelect.value = transaction.description;
        } else {
            // If description doesn't match any option, set to custom
            descriptionSelect.value = 'custom';
            const customDescField = document.getElementById('custom-description');
            if (customDescField) {
                customDescField.value = transaction.description;
                this.handleDescriptionChange();
            }
        }
    }
    
    console.log('🔍 Setting category to:', transaction.category);
    
    // ✅ CRITICAL FIX: Set the editing transaction ID IMMEDIATELY
    const form = document.getElementById('transaction-form');
    if (form) {
        form.dataset.editingTransactionId = transaction._id;
        console.log('✅ Set editingTransactionId:', form.dataset.editingTransactionId);
    }
    
    // ✅ FIXED: Better payee data handling
    const selectedMemberIdField = document.getElementById('selected-member-id');
    const payeeSearchField = document.getElementById('payee-search');
    
    if (transaction.payee) {
        const payeeType = transaction.payee.type || 'member'; // Default to member if not specified
        
        console.log('🔍 Setting payee type to:', payeeType);
        console.log('🔍 Payee data structure:', {
            payee: transaction.payee,
            memberId: transaction.payee.memberId,
            memberIdType: typeof transaction.payee.memberId
        });
        
        // Set the radio button
        const payeeTypeRadio = document.querySelector(`input[name="payee-type"][value="${payeeType}"]`);
        if (payeeTypeRadio) {
            payeeTypeRadio.checked = true;
            console.log('✅ Payee type radio set to:', payeeType);
        }
        
        if (payeeType === 'member') {
            // Extract member ID properly
            let memberId = '';
            let memberName = transaction.payee.name || '';
            
            // Extract memberId from different possible structures
            if (transaction.payee.memberId) {
                if (typeof transaction.payee.memberId === 'object' && transaction.payee.memberId !== null) {
                    // Object structure (populated member)
                    memberId = transaction.payee.memberId._id || transaction.payee.memberId.id || '';
                    
                    // Get name from populated member if available
                    if (transaction.payee.memberId.firstName) {
                        memberName = `${transaction.payee.memberId.firstName} ${transaction.payee.memberId.lastName || ''}`.trim();
                    }
                } else if (typeof transaction.payee.memberId === 'string') {
                    // String ID
                    memberId = transaction.payee.memberId;
                }
            }
            
            // If we have a member name but no ID, try to find the member in our list
            if (!memberId && memberName && this.allMembers.length > 0) {
                const foundMember = this.allMembers.find(member => 
                    `${member.firstName} ${member.lastName}`.toLowerCase() === memberName.toLowerCase()
                );
                if (foundMember) {
                    memberId = foundMember._id || foundMember.id;
                    console.log('✅ Found member in local list:', { memberId, memberName });
                }
            }
            
            console.log('🔍 Final member data for form:', {
                memberId,
                memberName,
                isValid: memberId && memberId.length === 24 && /^[0-9a-fA-F]+$/.test(memberId)
            });
            
            // Set the form fields with null checks
            if (selectedMemberIdField) selectedMemberIdField.value = memberId || '';
            if (payeeSearchField) payeeSearchField.value = memberName;
            
        } else {
            // External payee
            if (selectedMemberIdField) selectedMemberIdField.value = '';
            if (payeeSearchField) payeeSearchField.value = transaction.payee.name || '';
            
            if (payeeType === 'external') {
                const emailField = document.getElementById('external-payee-email');
                const phoneField = document.getElementById('external-payee-phone');
                if (emailField) emailField.value = transaction.payee.email || '';
                if (phoneField) phoneField.value = transaction.payee.phone || '';
            }
        }
    } else {
        console.warn('❌ No payee data in transaction');
        // Set defaults
        const memberRadio = document.querySelector('input[name="payee-type"][value="member"]');
        if (memberRadio) memberRadio.checked = true;
        if (selectedMemberIdField) selectedMemberIdField.value = '';
        if (payeeSearchField) payeeSearchField.value = '';
    }
    
    // ✅ Call togglePayeeFields AFTER setting all values
    this.togglePayeeFields();
    
    // ✅ CRITICAL FIX: Remove the duplicate setFormToEditMode call since we already set the ID above
    // Just update the UI for edit mode
    this.updateFormUIForEditMode(transaction._id);
    
    // Debug after population
    setTimeout(() => {
        const currentPayeeType = document.querySelector('input[name="payee-type"]:checked');
        const selectedMemberId = selectedMemberIdField ? selectedMemberIdField.value : '';
        const currentCategory = categoryField ? categoryField.value : '';
        const form = document.getElementById('transaction-form');
        
        console.log('🔍 AFTER POPULATION - Final form state:', {
            editingTransactionId: form ? form.dataset.editingTransactionId : 'form not found',
            selectedMemberId: selectedMemberId,
            payeeSearch: payeeSearchField ? payeeSearchField.value : '',
            payeeType: currentPayeeType ? currentPayeeType.value : 'none',
            category: currentCategory,
            memberIdValid: selectedMemberId && selectedMemberId.length === 24 && /^[0-9a-fA-F]+$/.test(selectedMemberId)
        });
    }, 100);
}

// Add this new method to update UI without touching dataset
updateFormUIForEditMode(transactionId) {
    const submitBtn = document.querySelector('#transaction-form button[type="submit"]');
    const modalTitle = document.querySelector('#transaction-modal h3');
    
    console.log('🔧 Updating UI for EDIT mode with transaction ID:', transactionId);
    
    // Update UI for edit mode
    if (modalTitle) modalTitle.textContent = 'Edit Transaction';
    if (submitBtn) {
        submitBtn.textContent = 'Update Transaction';
        submitBtn.classList.add('btn-warning');
    }
    
    console.log('✅ UI updated for EDIT mode');
}
// Add function to handle form mode (add vs edit)
setFormToEditMode(transactionId) {
    const form = document.getElementById('transaction-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const modalTitle = document.querySelector('#transaction-modal h3');
    
    console.log('🔧 Setting form to EDIT mode with transaction ID:', transactionId);
    
    // Store transaction ID in both places for reliability
    this.editingTransactionId = transactionId;
    form.dataset.editingTransactionId = transactionId;
    
    console.log('✅ Stored editing ID:', { 
        classProperty: this.editingTransactionId, 
        formDataset: form.dataset.editingTransactionId 
    });
    
    // Update UI for edit mode
    if (modalTitle) modalTitle.textContent = 'Edit Transaction';
    if (submitBtn) {
        submitBtn.textContent = 'Update Transaction';
        submitBtn.classList.add('btn-warning');
    }
    
    console.log('✅ Form is now in EDIT mode');
}
// Add function to reset form to add mode
setFormToAddMode() {
    const form = document.getElementById('transaction-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const modalTitle = document.querySelector('#transaction-modal h3');
    
    // Remove transaction ID from both places
    this.editingTransactionId = null;
    delete form.dataset.editingTransactionId;
    
    console.log('🔄 Form reset to ADD mode');
    
    // Reset "Other" category input
    const otherInput = document.getElementById('other-category-input');
    const customCategoryInput = document.getElementById('custom-category');
    if (otherInput && customCategoryInput) {
        otherInput.style.display = 'none';
        customCategoryInput.required = false;
        customCategoryInput.value = '';
    }
    
    // Reset description dropdown
    const descriptionSelect = document.getElementById('transaction-description');
    const customDescInput = document.getElementById('custom-description-input');
    const customDescription = document.getElementById('custom-description');
    if (descriptionSelect) {
        descriptionSelect.innerHTML = '<option value="">Select or enter description...</option>';
    }
    if (customDescInput && customDescription) {
        customDescInput.style.display = 'none';
        customDescription.required = false;
        customDescription.value = '';
    }
    
    // Update UI for add mode
    if (modalTitle) modalTitle.textContent = 'Add New Transaction';
    if (submitBtn) {
        submitBtn.textContent = 'Add Transaction';
        submitBtn.classList.remove('btn-warning');
    }
}
// Add this to your AccountingPage class
logFormData() {
    const payeeType = document.querySelector('input[name="payee-type"]:checked').value;
    const memberId = document.getElementById('selected-member-id').value;
    const payeeName = document.getElementById('payee-search').value;
    
    console.log('=== FORM DEBUG ===');
    console.log('Payee Type:', payeeType);
    console.log('Member ID:', memberId);
    console.log('Payee Name:', payeeName);
    console.log('Member ID Valid:', memberId && memberId.length === 24 && /^[0-9a-fA-F]+$/.test(memberId));
    console.log('=== END DEBUG ===');
}
// Updated addTransaction method with better debugging
async addTransaction() {
    const callId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    console.log('🚀 addTransaction called with ID:', callId, 'isSubmitting:', this.isSubmitting);
    
    if (this.isSubmitting) {
        console.log('⏳ Already submitting, please wait... (Call ID:', callId, ')');
        return;
    }
    
    this.isSubmitting = true;
    console.log('🔒 Set isSubmitting to true (Call ID:', callId, ')');

    // Disable the submit button to prevent multiple clicks
    const submitBtn = document.querySelector('#transaction-form button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const form = document.getElementById('transaction-form');

    // ✅ BETTER DEBUGGING: Check all dataset properties
    console.log('🔍 BEFORE CHECKING - Form dataset:', {
        editingTransactionId: form.dataset.editingTransactionId,
        allDatasetKeys: Object.keys(form.dataset),
        dataset: form.dataset
    });
    
    const isEditing = !!form.dataset.editingTransactionId;
    const transactionId = form.dataset.editingTransactionId;
    
    console.log('💾 Saving transaction:', { 
        isEditing, 
        transactionId, 
        datasetKeys: Object.keys(form.dataset),
        datasetValues: Object.values(form.dataset)
    });
    
    const payeeType = document.querySelector('input[name="payee-type"]:checked').value;
    const payeeName = document.getElementById('payee-search').value;
    const memberId = document.getElementById('selected-member-id').value;

    const formData = {
        type: document.getElementById('transaction-type').value,
        amount: parseFloat(document.getElementById('transaction-amount').value),
        description: this.getTransactionDescription(),
        category: document.getElementById('transaction-category').value,
        paymentMethod: document.getElementById('payment-method').value,
        reference: document.getElementById('transaction-reference').value,
        notes: document.getElementById('transaction-note').value,
        
        // PAYEE DATA
        payee: {
            type: payeeType,
            memberId: payeeType === 'member' ? (memberId || null) : null,
            name: payeeName
        }
    };

    // MULTI-MONTH PAYMENT: Collect selected months
    const selectedMonthCheckboxes = document.querySelectorAll('.month-checkbox:checked');
    if (selectedMonthCheckboxes.length > 0) {
        formData.monthsCovered = Array.from(selectedMonthCheckboxes).map(cb => cb.value);
        console.log('✅ Multi-month payment covering:', formData.monthsCovered);
    }

    // Handle custom category for "Other"
    if (formData.category === 'other') {
        const customCategory = document.getElementById('custom-category').value.trim();
        if (!customCategory) {
            this.showError('Please specify the custom category');
            this.isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
        }
        // Store the custom description in notes and keep category as 'other'
        formData.customCategory = customCategory;
        formData.notes = customCategory + (formData.notes ? ' | ' + formData.notes : '');
    }

    // TEMPORARY: Validate category on frontend to prevent server errors
    const validCategories = [
        // Income categories
        'tithe', 'offering', 'donation', 'pledge', 'building', 'missions', 
        'youth_activity', 'cultural_events', 'fundraising', 'special_donations', 
        'membership', 'other',
        
        // Expense categories  
        'honorarium', 'utilities', 'salaries', 'supplies', 'benevolence', 
        'youth_programs', 'maintenance', 'office_expenses', 'insurance', 
        'technology', 'training', 'volunteer_support', 'events',
        
        // Legacy categories for backward compatibility
        'benevolence'
    ];

    if (!validCategories.includes(formData.category)) {
        console.warn('⚠️ Invalid category detected:', formData.category);
        this.showError(`Invalid category: ${formData.category}. Please select a valid category.`);
        this.isSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }

    // Add external payee contact info if available
    if (payeeType === 'external') {
        formData.payee.email = document.getElementById('external-payee-email').value;
        formData.payee.phone = document.getElementById('external-payee-phone').value;
    }

    // Validation
    if (!formData.payee.name) {
        alert('Please select or enter a payee/recipient name');
        this.isSubmitting = false;
        // Re-enable the submit button
        const submitBtn = document.querySelector('#transaction-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.classList.contains('btn-warning') ? 'Update Transaction' : 'Add Transaction';
        }
        return;
    }

    if (!formData.description || !formData.category || isNaN(formData.amount) || formData.amount <= 0) {
        alert('Please fill out all required fields correctly.');
        this.isSubmitting = false;
        // Re-enable the submit button
        const submitBtn = document.querySelector('#transaction-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.classList.contains('btn-warning') ? 'Update Transaction' : 'Add Transaction';
        }
        return;
    }

    console.log('📤 Submitting form data:', { isEditing, transactionId, formData });

    try {
        let savedTransaction;
        if (isEditing && transactionId) {
            console.log('✏️ Updating transaction:', transactionId);
            savedTransaction = await API.put(`/accounting/transaction/${transactionId}`, formData);
            console.log('✅ Transaction updated successfully');
        } else {
            const transactionId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            console.log('➕ Creating new transaction with ID:', transactionId);
            console.log('📤 Form data:', formData);
            
            savedTransaction = await API.post('/accounting/transaction', formData);
            console.log('✅ Transaction created successfully with ID:', transactionId);
            
            // Auto-add signature based on current user
            if (savedTransaction && savedTransaction.transaction) {
                await this.autoAddSignature(savedTransaction.transaction._id);
            }
        }
        
        this.closeModal();
        await this.loadAccountingData(this.currentFilters);
        
        // Show post-transaction actions dialog
        if (savedTransaction && savedTransaction.transaction) {
            this.showPostTransactionActions(savedTransaction.transaction);
        }
        
    } catch (error) {
        console.error('❌ Error saving transaction:', error);
        alert('Error saving transaction. Please try again.');
    } finally {
        // Re-enable the submit button
        const submitBtn = document.querySelector('#transaction-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.classList.contains('btn-warning') ? 'Update Transaction' : 'Add Transaction';
        }
        
        this.isSubmitting = false;
        console.log('🔓 Reset isSubmitting to false');
    }
}
// Updated showAddTransactionForm method
showAddTransactionForm() {
    const form = document.getElementById('transaction-form');
    
    // ✅ CRITICAL: Clear any existing editing state
    delete form.dataset.editingTransactionId;
    
    form.reset();
    
    // Explicitly set category to blank to prevent auto-selection
    document.getElementById('transaction-category').value = '';
    
    document.getElementById('transaction-modal').style.display = 'block';
    document.getElementById('member-search-results').style.display = 'none';
    document.getElementById('payment-method').value = 'cash';
    
    // Reset "Other" category input
    const otherInput = document.getElementById('other-category-input');
    const customCategoryInput = document.getElementById('custom-category');
    if (otherInput && customCategoryInput) {
        otherInput.style.display = 'none';
        customCategoryInput.required = false;
        customCategoryInput.value = '';
    }
    
    // Reset description dropdown
    const descriptionSelect = document.getElementById('transaction-description');
    const customDescInput = document.getElementById('custom-description-input');
    const customDescription = document.getElementById('custom-description');
    if (descriptionSelect) {
        descriptionSelect.innerHTML = '<option value="">Select or enter description...</option>';
    }
    if (customDescInput && customDescription) {
        customDescInput.style.display = 'none';
        customDescription.required = false;
        customDescription.value = '';
    }
    
    // Reset payee fields
    document.getElementById('selected-member-id').value = '';
    document.querySelector('input[name="payee-type"][value="member"]').checked = true;
    this.togglePayeeFields();
    
    // Populate description options based on default category (should be blank)
    this.updateDescriptionOptions();
    
    // Reset UI to add mode
    this.setFormToAddMode();
    
    console.log('✅ Form reset to ADD mode, editingTransactionId cleared');
}
// Update your closeModal to reset form mode:
closeModal() {
    document.getElementById('transaction-modal').style.display = 'none';
    document.getElementById('member-search-results').style.display = 'none';
    this.setFormToAddMode(); // Reset to add mode when closing
}

// Post-Transaction Actions Dialog
showPostTransactionActions(transaction) {
    const receiptNumber = transaction.transactionNumber || transaction._id.substring(18);
    const payeeName = transaction.payee?.name || 'Unknown';
    const amount = transaction.amount.toFixed(2);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div class="post-transaction-dialog" style="
            background: white;
            border-radius: 12px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            text-align: center;
        ">
            <div style="margin-bottom: 20px;">
                <i class="fas fa-check-circle" style="color: #28a745; font-size: 48px; margin-bottom: 15px;"></i>
                <h2 style="color: #28a745; margin: 0 0 10px 0;">Transaction Saved Successfully!</h2>
                <p style="color: #666; margin: 0;">
                    <strong>Receipt #${receiptNumber}</strong><br>
                    ${payeeName} - $${amount}
                </p>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #333;">What would you like to do next?</h3>
                <p style="color: #666; font-size: 14px; margin: 0;">Choose one or more actions (dialog stays open until you click Done):</p>
            </div>
            
            <div class="action-buttons" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                <button class="action-btn signature-btn" data-action="signature" style="
                    background: linear-gradient(135deg, #6f42c1 0%, #8e44ad 100%);
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    transition: all 0.3s ease;
                    position: relative;
                " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-signature"></i>
                        <span>Add Additional Signature</span>
                    </div>
                    <i class="fas fa-check action-check" style="display: none; color: #90EE90;"></i>
                </button>
                
                <button class="action-btn email-btn" data-action="email" style="
                    background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    transition: all 0.3s ease;
                    position: relative;
                " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-envelope"></i>
                        <span>Email Receipt to Payee</span>
                    </div>
                    <i class="fas fa-check action-check" style="display: none; color: #90EE90;"></i>
                </button>
                
                <button class="action-btn print-btn" data-action="print" style="
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    transition: all 0.3s ease;
                    position: relative;
                " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-download"></i>
                        <span>Download Receipt PDF</span>
                    </div>
                    <i class="fas fa-check action-check" style="display: none; color: #90EE90;"></i>
                </button>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px;">
                <button class="close-btn" style="
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 12px 40px;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='#5a6268'" onmouseout="this.style.background='#6c757d'">
                    <i class="fas fa-times" style="margin-right: 8px;"></i>
                    Done
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    const signatureBtn = modal.querySelector('.signature-btn');
    const emailBtn = modal.querySelector('.email-btn');
    const printBtn = modal.querySelector('.print-btn');
    const closeBtn = modal.querySelector('.close-btn');
    
    // Helper function to mark action as completed
    const markActionCompleted = (button) => {
        const checkIcon = button.querySelector('.action-check');
        checkIcon.style.display = 'block';
        button.style.opacity = '0.8';
        button.style.transform = 'scale(0.98)';
    };
    
    signatureBtn.addEventListener('click', () => {
        this.addSignatureToTransaction(transaction._id);
        markActionCompleted(signatureBtn);
        // Don't close modal - let user perform multiple actions
    });
    
    emailBtn.addEventListener('click', async () => {
        await this.emailReceiptToPayee(transaction._id);
        markActionCompleted(emailBtn);
        // Don't close modal - let user perform multiple actions
    });
    
    printBtn.addEventListener('click', () => {
        this.printReceipt(transaction._id);
        markActionCompleted(printBtn);
        // Don't close modal - let user perform multiple actions
    });
    
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    // Only close on "Done" button, not on outside click
    // Remove the outside click handler to prevent accidental closing
}

// Post-Transaction Action Methods

// Auto-add signature based on current logged-in user
async autoAddSignature(transactionId) {
    try {
        // Get current user from auth system
        const currentUser = window.authSystem?.currentUser;
        
        if (!currentUser) {
            console.log('🔐 No current user found, skipping auto-signature');
            return;
        }
        
        console.log('✍️ Auto-adding signature for user:', currentUser.name, 'Role:', currentUser.role);
        
        // Map user roles to signature titles
        const roleToTitle = {
            'super-admin': 'Administrator',
            'admin': 'Administrator', 
            'treasurer': 'Treasurer',
            'financial-secretary': 'Financial Secretary',
            'committee': 'Committee Member',
            'pastor': 'Pastor',
            'chairman': 'Chairman',
            'secretary': 'Secretary'
        };
        
        const signatureTitle = roleToTitle[currentUser.role] || 'Authorized Signatory';
        
        // Prepare signature data
        const signatureData = {
            method: 'digital_approval',
            signatureTitle: signatureTitle,
            approvedBy: {
                userId: currentUser.id,
                name: currentUser.name,
                role: currentUser.role,
                timestamp: new Date().toISOString()
            },
            signatureDate: new Date().toISOString(),
            isRequired: false // Auto-signatures are not required, just convenient
        };
        
        // Submit signature using the correct endpoint
        const result = await API.post(`/signatures/digital-approval/${transactionId}`, signatureData);
        
        if (result.success) {
            console.log('✅ Auto-signature added successfully');
            
            // Show subtle notification
            this.showAutoSignatureNotification(currentUser.name, signatureTitle);
        } else {
            console.log('⚠️ Auto-signature failed:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Error auto-adding signature:', error);
        // Don't show error to user - auto-signature is optional
    }
}

// Show notification that auto-signature was added
showAutoSignatureNotification(userName, title) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #6f42c1 0%, #8e44ad 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(111, 66, 193, 0.3);
        z-index: 10003;
        font-size: 14px;
        max-width: 300px;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    notification.innerHTML = `
        <i class="fas fa-signature" style="font-size: 16px;"></i>
        <div>
            <div style="font-weight: bold;">Auto-Signature Added</div>
            <div style="font-size: 12px; opacity: 0.9;">${userName} - ${title}</div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

async addSignatureToTransaction(transactionId) {
    // Use existing signature functionality
    this.openSignatureModal(transactionId);
}

async emailReceiptToPayee(transactionId) {
    try {
        // Get transaction details first to check for recipient email
        const transaction = await API.get(`/accounting/transaction/${transactionId}`);
        
        if (!transaction || !transaction.payee) {
            throw new Error('Transaction or payee information not found');
        }
        
        let recipientEmail = transaction.payee.email;
        
        // If no email in transaction, try to find it in the system
        if (!recipientEmail || recipientEmail.trim() === '') {
            console.log('🔍 No email in transaction, checking system for:', transaction.payee.name);
            
            // If payee is a member, get email from member record
            if (transaction.payee.type === 'member' && transaction.payee.memberId) {
                try {
                    const member = await API.get(`/members/${transaction.payee.memberId}`);
                    if (member && member.email) {
                        recipientEmail = member.email;
                        console.log('✅ Found member email:', recipientEmail);
                    }
                } catch (memberError) {
                    console.log('⚠️ Could not fetch member details:', memberError.message);
                }
            }
            
            // If still no email, search members by name
            if (!recipientEmail || recipientEmail.trim() === '') {
                try {
                    const members = await API.get('/members');
                    const matchingMember = members.list?.find(member => 
                        `${member.firstName} ${member.lastName}`.toLowerCase().trim() === 
                        transaction.payee.name.toLowerCase().trim()
                    );
                    
                    if (matchingMember && matchingMember.email) {
                        recipientEmail = matchingMember.email;
                        console.log('✅ Found matching member email:', recipientEmail);
                    }
                } catch (searchError) {
                    console.log('⚠️ Could not search members:', searchError.message);
                }
            }
        }
        
        // If still no email, prompt user
        if (!recipientEmail || recipientEmail.trim() === '') {
            recipientEmail = prompt(`No email found for ${transaction.payee.name}.\n\nPlease enter email address to send receipt:`);
            
            if (!recipientEmail || recipientEmail.trim() === '') {
                alert('Email address is required to send receipt');
                return;
            }
            
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(recipientEmail.trim())) {
                alert('Please enter a valid email address');
                return;
            }
        }
        
        // Show loading state
        const loadingDiv = document.createElement('div');
        loadingDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10001;
            text-align: center;
        `;
        loadingDiv.innerHTML = `
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #17a2b8; margin-bottom: 10px;"></i>
            <p style="margin: 0;">Sending receipt email to ${recipientEmail}...</p>
        `;
        document.body.appendChild(loadingDiv);
        
        // Send email with recipient email
        const result = await API.post(`/accounting/send-receipt-email/${transactionId}`, {
            recipientEmail: recipientEmail.trim()
        });
        
        document.body.removeChild(loadingDiv);
        
        if (result.success) {
            this.showSuccessMessage(`✅ Receipt emailed successfully to ${result.email || recipientEmail}`);
        } else {
            throw new Error(result.error || 'Failed to send email');
        }
    } catch (error) {
        console.error('Error sending receipt email:', error);
        alert(`❌ Failed to send receipt email: ${error.message}`);
    }
}

async printReceipt(transactionId) {
    try {
        // Use the existing receipt generation from the action menu
        // This will ensure consistent layout and authentication
        await this.downloadPDFReceipt(transactionId);
        
        this.showSuccessMessage('✅ Receipt downloaded - you can now print it');
    } catch (error) {
        console.error('Error printing receipt:', error);
        alert(`❌ Failed to generate receipt: ${error.message}`);
    }
}

showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #d4edda;
        color: #155724;
        padding: 15px 20px;
        border-radius: 8px;
        border: 1px solid #c3e6cb;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 10002;
        font-size: 14px;
        max-width: 300px;
    `;
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        if (successDiv.parentElement) {
            successDiv.remove();
        }
    }, 4000);
}
// Add delete functionality:
setupDeleteButtons() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('.delete-transaction-btn')) {
            const transactionId = e.target.closest('.delete-transaction-btn').dataset.id;
            this.deleteTransaction(transactionId);
        }
    });
}
async deleteTransaction(transactionId) {
    // Close the action menu immediately to prevent multiple clicks
    document.querySelectorAll('.action-menu.show').forEach(menu => {
        menu.classList.remove('show');
    });
    
    if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
        return;
    }
    
    try {
        await API.delete(`/accounting/transaction/${transactionId}`);
        await this.loadAccountingData(this.currentFilters);
    } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Error deleting transaction. Please try again.');
    }
}
        // FILTER FUNCTIONALITY
        applyFilters() {
            this.currentFilters = {
                dateFrom: document.getElementById('filter-date-from').value,
                dateTo: document.getElementById('filter-date-to').value,
                category: document.getElementById('filter-category').value,
                type: document.getElementById('filter-type').value
            };

            // Remove empty filters
            Object.keys(this.currentFilters).forEach(key => {
                if (!this.currentFilters[key]) {
                    delete this.currentFilters[key];
                }
            });

            this.loadAccountingData(this.currentFilters);
        }
        clearFilters() {
            document.getElementById('filter-date-from').value = '';
            document.getElementById('filter-date-to').value = '';
            document.getElementById('filter-category').value = '';
            document.getElementById('filter-type').value = '';
            
            this.currentFilters = {};
            this.loadAccountingData();
        }
        viewMemberProfile(memberId) {
            // Navigate to member profile
            if (window.membersPage) {
                window.membersPage.viewMemberProfile(memberId);
            } else {
                // Fallback: store in session and navigate
                sessionStorage.setItem('currentMemberId', memberId);
                window.dashboardApp.loadPage('memberProfile');
            }
        }

        // Action Dropdown Menu Functions
        toggleActionMenu(event, transactionId) {
            event.stopPropagation();
            
            // Close all other open menus
            document.querySelectorAll('.action-menu.show').forEach(menu => {
                if (menu.id !== `action-menu-${transactionId}`) {
                    menu.classList.remove('show');
                }
            });
            
            // Toggle current menu
            const menu = document.getElementById(`action-menu-${transactionId}`);
            if (menu) {
                menu.classList.toggle('show');
            }
        }

        // Send Receipt Email Function
        async sendReceiptEmail(transactionId) {
            // Close the action menu immediately to prevent multiple clicks
            document.querySelectorAll('.action-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
            
            try {
                // Get transaction details
                const transaction = await API.get(`/accounting/transaction/${transactionId}`);
                
                if (!transaction) {
                    alert('Transaction not found');
                    return;
                }

                if (transaction.type !== 'income') {
                    alert('Email receipts can only be sent for income transactions');
                    return;
                }

                // Get payee email
                let recipientEmail = '';
                let recipientName = '';
                
                if (transaction.payee) {
                    if (transaction.payee.type === 'member' && transaction.payee.memberId) {
                        const member = transaction.payee.memberId;
                        if (typeof member === 'object') {
                            recipientEmail = member.email || '';
                            recipientName = `${member.firstName} ${member.lastName}`;
                        }
                    } else if (transaction.payee.email) {
                        recipientEmail = transaction.payee.email;
                        recipientName = transaction.payee.name || 'Valued Donor';
                    }
                }

                if (!recipientEmail) {
                    // Prompt for email if not available
                    recipientEmail = prompt('Enter recipient email address:');
                    if (!recipientEmail) {
                        return;
                    }
                    
                    // Validate email format
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(recipientEmail)) {
                        alert('Please enter a valid email address');
                        return;
                    }
                }

                // Send email
                const response = await API.post(`/accounting/send-receipt-email/${transactionId}`, {
                    recipientEmail,
                    recipientName
                });

                if (response.success) {
                    alert(`✅ PDF Receipt sent successfully to ${recipientEmail}`);
                } else {
                    throw new Error(response.error || 'Failed to send email');
                }

            } catch (error) {
                console.error('Error sending receipt email:', error);
                alert('Error sending receipt email: ' + error.message);
            }
        }

        // Download PDF Receipt Function
        async downloadPDFReceipt(transactionId) {
            // Close the action menu immediately to prevent multiple clicks
            document.querySelectorAll('.action-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
            
            try {
                // Get transaction details first to validate
                const transaction = await API.get(`/accounting/transaction/${transactionId}`);
                
                if (!transaction) {
                    alert('Transaction not found');
                    return;
                }

                if (transaction.type !== 'income') {
                    alert('PDF receipts can only be generated for income transactions');
                    return;
                }

                // Create download URL
                const token = window.authSystem?.getToken();
                if (!token) {
                    alert('Authentication required. Please login again.');
                    return;
                }

                const downloadUrl = `${API.baseUrl}/accounting/generate-pdf-receipt/${transactionId}`;
                
                // Create a temporary link to trigger download
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.setAttribute('download', `Receipt_${transactionId.substring(18)}_${new Date().toISOString().split('T')[0]}.pdf`);
                
                // Add authorization header by opening in new window with proper headers
                // Since we can't add headers to a direct download link, we'll use fetch and blob
                const response = await fetch(downloadUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/pdf'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // Get the PDF blob
                const pdfBlob = await response.blob();
                
                // Create download link
                const url = window.URL.createObjectURL(pdfBlob);
                link.href = url;
                
                // Trigger download
                document.body.appendChild(link);
                link.click();
                
                // Cleanup
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                console.log('✅ PDF receipt downloaded successfully');

            } catch (error) {
                console.error('Error downloading PDF receipt:', error);
                alert('Error downloading PDF receipt: ' + error.message);
            }
        }
  renderStats(data) {
    try {
        console.log('📊 Rendering stats with data:', data);
        
        // ✅ FIXED: Handle null/undefined data
        const currentMonth = data || {};
        const income = currentMonth.income || 0;
        const expenses = currentMonth.expenses || 0;
        const net = currentMonth.net || 0;
        const totalBalance = income - expenses;

        // ✅ FIXED: Safe element access
        const monthIncomeEl = document.getElementById('month-income');
        const monthExpensesEl = document.getElementById('month-expenses');
        const netBalanceEl = document.getElementById('net-balance');
        const totalBalanceEl = document.getElementById('total-balance');

        if (monthIncomeEl) monthIncomeEl.textContent = `$${income.toLocaleString()}`;
        if (monthExpensesEl) monthExpensesEl.textContent = `$${expenses.toLocaleString()}`;
        if (netBalanceEl) netBalanceEl.textContent = `$${net.toLocaleString()}`;
        if (totalBalanceEl) totalBalanceEl.textContent = `$${totalBalance.toLocaleString()}`;

        // Update CSS classes
        if (monthIncomeEl) monthIncomeEl.className = 'value income';
        if (monthExpensesEl) monthExpensesEl.className = 'value expense';
        if (netBalanceEl) netBalanceEl.className = `value ${net >= 0 ? 'income' : 'expense'}`;
        
        console.log('✅ Stats rendered successfully:', { income, expenses, net });
        
    } catch (error) {
        console.error('❌ Error rendering stats:', error);
        this.showError('Error displaying statistics');
    }
}

async renderTotalStats(data) {
    try {
        console.log('🔍 Calculating total contributions and assets on frontend...');
        
        // Calculate from transactions array (frontend calculation)
        let totalContributions = 0;
        let totalExpenses = 0;
        
        if (data.transactions && Array.isArray(data.transactions)) {
            totalContributions = data.transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + (t.amount || 0), 0);
            
            totalExpenses = data.transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + (t.amount || 0), 0);
            
            console.log('✅ Frontend calculation:', {
                totalTransactions: data.transactions.length,
                incomeTransactions: data.transactions.filter(t => t.type === 'income').length,
                expenseTransactions: data.transactions.filter(t => t.type === 'expense').length,
                totalContributions: totalContributions,
                totalExpenses: totalExpenses
            });
        }
        
        // Total assets = income - expenses
        const totalAssets = totalContributions - totalExpenses;
        
        // Update the display
        const totalContributionsEl = document.getElementById('total-contributions');
        const totalAssetsEl = document.getElementById('total-assets');
        
        if (totalContributionsEl) {
            totalContributionsEl.textContent = `$${totalContributions.toLocaleString()}`;
        }
        
        if (totalAssetsEl) {
            totalAssetsEl.textContent = `$${totalAssets.toLocaleString()}`;
        }
        
        console.log('✅ Total stats displayed:', { totalContributions, totalAssets });
        
    } catch (error) {
        console.error('❌ Error rendering total stats:', error);
    }
}
     renderChart(monthlyData) {
    try {
        console.log('📊 Rendering chart with data:', monthlyData);
        
        // ✅ FIXED: Handle null/undefined data
        const data = monthlyData || [];
        const chartContainer = document.getElementById('accounting-chart');
        
        if (!chartContainer) {
            console.warn('Chart container not found');
            return;
        }

        if (!data || data.length === 0) {
            chartContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-chart-bar" style="font-size: 48px; margin-bottom: 10px;"></i>
                    <p>No chart data available</p>
                </div>
            `;
            return;
        }

        const maxValue = Math.max(...data.map(m => Math.max(m.income || 0, m.expenses || 0))) * 1.2 || 100;

        chartContainer.innerHTML = `
            <div style="display: flex; align-items: end; height: 200px; gap: 20px; padding: 20px 0;">
                ${data.map(month => `
                    <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                        <div style="display: flex; align-items: end; height: 150px; gap: 4px; justify-content: center;">
                            <div style="background: #27ae60; height: ${((month.income || 0) / maxValue) * 100}%; width: 20px; border-radius: 2px 2px 0 0;"></div>
                            <div style="background: #e74c3c; height: ${((month.expenses || 0) / maxValue) * 100}%; width: 20px; border-radius: 2px 2px 0 0;"></div>
                        </div>
                        <div style="margin-top: 10px; font-size: 12px;">${month.month || 'Unknown'}</div>
                    </div>
                `).join('')}
            </div>
            <div style="display: flex; gap: 20px; justify-content: center; margin-top: 20px;">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="width: 15px; height: 15px; background: #27ae60;"></div>
                    <span>Income</span>
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="width: 15px; height: 15px; background: #e74c3c;"></div>
                    <span>Expenses</span>
                </div>
            </div>
        `;
        
        console.log('✅ Chart rendered successfully');
        
    } catch (error) {
        console.error('❌ Error rendering chart:', error);
        const chartContainer = document.getElementById('accounting-chart');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 10px;"></i>
                    <p>Error loading chart</p>
                </div>
            `;
        }
    }
}
//=============================================================
// Promise to Pay Methods
async loadPromises() {
    try {
        const response = await API.get('/promises');
        this.promises = response.promises || [];
        this.promiseStats = response.stats || {};
        this.renderPromises();
        this.updatePromiseStats();
    } catch (error) {
        console.error('Error loading promises:', error);
        this.promises = [];
        this.renderPromises();
    }
}

renderPromises() {
    const tbody = document.getElementById('promises-tbody');
    if (!tbody) return;

    if (!this.promises || this.promises.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No promises found</td></tr>';
        return;
    }

    const filteredPromises = this.filterPromisesList(this.promises);
    
    tbody.innerHTML = filteredPromises.map(promise => {
        const isOverdue = new Date(promise.dueDate) < new Date() && promise.status === 'pending';
        const status = isOverdue ? 'overdue' : promise.status;
        
        return `
            <tr>
                <td>
                    <strong>${promise.memberName}</strong>
                    ${promise.description ? `<br><small class="text-muted">${promise.description}</small>` : ''}
                </td>
                <td>$${promise.amount.toLocaleString()}</td>
                <td>${this.formatCategory(promise.category)}</td>
                <td>${new Date(promise.promiseDate).toLocaleDateString()}</td>
                <td class="${isOverdue ? 'text-danger' : ''}">
                    ${new Date(promise.dueDate).toLocaleDateString()}
                    ${isOverdue ? '<br><small class="text-danger">Overdue</small>' : ''}
                </td>
                <td>
                    <span class="promise-status ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                </td>
                <td>
                    <div class="promise-actions">
                        <button class="icon-button" onclick="accountingPage.viewPromiseDetails('${promise._id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${promise.status === 'pending' ? `
                            <button class="icon-button btn-success" onclick="accountingPage.showFulfillPromiseModal('${promise._id}')" title="Mark as Paid">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        <button class="icon-button" onclick="accountingPage.editPromise('${promise._id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="icon-button btn-danger" onclick="accountingPage.deletePromise('${promise._id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

filterPromisesList(promises) {
    const statusFilter = document.getElementById('promise-status-filter')?.value || 'all';
    const categoryFilter = document.getElementById('promise-category-filter')?.value || 'all';

    return promises.filter(promise => {
        const isOverdue = new Date(promise.dueDate) < new Date() && promise.status === 'pending';
        const currentStatus = isOverdue ? 'overdue' : promise.status;
        
        const statusMatch = statusFilter === 'all' || 
                           (statusFilter === 'overdue' ? isOverdue : currentStatus === statusFilter);
        const categoryMatch = categoryFilter === 'all' || promise.category === categoryFilter;
        
        return statusMatch && categoryMatch;
    });
}

filterPromises() {
    this.renderPromises();
}

updatePromiseStats() {
    const stats = this.promiseStats;
    
    document.getElementById('total-promises').textContent = stats.total || 0;
    document.getElementById('pending-amount').textContent = `$${(stats.pendingAmount || 0).toLocaleString()}`;
    document.getElementById('fulfilled-amount').textContent = `$${(stats.fulfilledAmount || 0).toLocaleString()}`;
    document.getElementById('overdue-count').textContent = stats.overdueCount || 0;
}

// Promise Modal Methods
showAddPromiseForm() {
    document.getElementById('promise-form').reset();
    // Set default due date - format as DD/MM/YYYY for mobile-date input
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1); // Default to tomorrow
    const formattedDate = `${tomorrow.getDate().toString().padStart(2, '0')}/${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}/${tomorrow.getFullYear()}`;
    document.getElementById('promise-due-date').value = formattedDate;
    document.getElementById('promise-modal').style.display = 'block';
    this.setFormToAddMode();
}

closePromiseModal() {
    document.getElementById('promise-modal').style.display = 'none';
    document.getElementById('promise-member-results').style.display = 'none';
    this.setFormToAddMode();
}

searchMembersForPromise(query) {
    const resultsContainer = document.getElementById('promise-member-results');
    
    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        return;
    }

    const filteredMembers = this.allMembers.filter(member => 
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
        member.email?.toLowerCase().includes(query.toLowerCase())
    );

    this.displayPromiseMemberResults(filteredMembers);
}

displayPromiseMemberResults(members) {
    const resultsContainer = document.getElementById('promise-member-results');
    
    if (members.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">No members found</div>';
    } else {
        resultsContainer.innerHTML = members.map(member => `
            <div class="search-result-item" onclick="accountingPage.selectPromiseMember('${member._id}', '${member.firstName} ${member.lastName}')">
                <i class="fas fa-user"></i>
                <div>
                    <strong>${member.firstName} ${member.lastName}</strong>
                    <div class="member-email">${member.email || 'No email'}</div>
                </div>
            </div>
        `).join('');
    }
    
    resultsContainer.style.display = 'block';
}

selectPromiseMember(memberId, memberName) {
    document.getElementById('promise-member-id').value = memberId;
    document.getElementById('promise-member-search').value = memberName;
    document.getElementById('promise-member-results').style.display = 'none';
}

// Add/Edit Promise Functions
async addPromise(e) {
    e.preventDefault();
    
    const form = document.getElementById('promise-form');
    const isEditing = form.dataset.editingPromiseId;
    
    const formData = {
        memberId: document.getElementById('promise-member-id').value,
        amount: parseFloat(document.getElementById('promise-amount').value),
        category: document.getElementById('promise-category').value,
        description: document.getElementById('promise-description').value,
        dueDate: document.getElementById('promise-due-date').value
    };

    // Validation
    if (!formData.memberId) {
        alert('Please select a member');
        return;
    }

    if (!formData.amount || formData.amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }

    if (!formData.dueDate) {
        alert('Please select a due date');
        return;
    }

    try {
        let result;
        if (isEditing) {
            // Update existing promise
            result = await API.put(`/promises/${form.dataset.editingPromiseId}`, formData);
        } else {
            // Add new promise
            result = await API.post('/promises', formData);
        }
        
        if (result.success) {
            this.closePromiseModal();
            await this.loadPromises();
        }
        
    } catch (error) {
        console.error('Error saving promise:', error);
        alert('Error saving promise. Please try again.');
    }
}
async editPromise(promiseId) {
    try {
        const response = await API.get(`/promises`);
        const promise = response.promises.find(p => p._id === promiseId);
        
        if (!promise) {
            console.error('Promise not found:', promiseId);
            return;
        }

        // Populate the form with existing promise data
        document.getElementById('promise-member-id').value = promise.memberId?._id || promise.memberId;
        document.getElementById('promise-member-search').value = promise.memberName;
        document.getElementById('promise-amount').value = promise.amount;
        document.getElementById('promise-category').value = promise.category;
        document.getElementById('promise-description').value = promise.description || '';
        document.getElementById('promise-due-date').value = new Date(promise.dueDate).toISOString().split('T')[0];

        // Change modal to edit mode
        this.setFormToEditMode(promise._id);

        document.getElementById('promise-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading promise for edit:', error);
        alert('Error loading promise data. Please try again.');
    }
}

// Delete Promise Function
async deletePromise(promiseId) {
    if (!confirm('Are you sure you want to delete this promise? This action cannot be undone.')) {
        return;
    }

    try {
        const result = await API.delete(`/promises/${promiseId}`);
        
        if (result.success) {
            await this.loadPromises();
        }
        
    } catch (error) {
        console.error('Error deleting promise:', error);
        alert('Error deleting promise. Please try again.');
    }
}

// Form Mode Management
setFormToEditMode(promiseId) {
    const form = document.getElementById('promise-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const modalTitle = document.querySelector('#promise-modal h3');
    
    // Store promise ID for update
    form.dataset.editingPromiseId = promiseId;
    
    // Update UI for edit mode
    modalTitle.textContent = 'Edit Promise';
    submitBtn.textContent = 'Update Promise';
    submitBtn.classList.add('btn-warning');
}

setFormToAddMode() {
    const form = document.getElementById('promise-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const modalTitle = document.querySelector('#promise-modal h3');
    
    // Remove promise ID
    delete form.dataset.editingPromiseId;
    
    // Update UI for add mode
    modalTitle.textContent = 'Add Promise to Pay';
    submitBtn.textContent = 'Add Promise';
    submitBtn.classList.remove('btn-warning');
}

// Fulfill Promise Methods
showFulfillPromiseModal(promiseId) {
    const promise = this.promises.find(p => p._id === promiseId);
    if (!promise) return;

    document.getElementById('fulfill-promise-id').value = promiseId;
    document.getElementById('fulfill-amount').value = promise.amount;
    // Set default payment date - format as DD/MM/YYYY for mobile-date input
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    document.getElementById('fulfill-date').value = formattedDate;
    
    // Show promise details
    document.getElementById('fulfill-promise-details').innerHTML = `
        <h4>Promise Details</h4>
        <p><strong>Member:</strong> ${promise.memberName}</p>
        <p><strong>Amount:</strong> $${promise.amount.toLocaleString()}</p>
        <p><strong>Category:</strong> ${this.formatCategory(promise.category)}</p>
        <p><strong>Due Date:</strong> ${new Date(promise.dueDate).toLocaleDateString()}</p>
        ${promise.description ? `<p><strong>Description:</strong> ${promise.description}</p>` : ''}
    `;

    document.getElementById('fulfill-modal').style.display = 'block';
}

closeFulfillModal() {
    document.getElementById('fulfill-modal').style.display = 'none';
    document.getElementById('fulfill-form').reset();
}

async fulfillPromise(e) {
    e.preventDefault();
    
    const promiseId = document.getElementById('fulfill-promise-id').value;
    const actualAmount = parseFloat(document.getElementById('fulfill-amount').value);
    const paymentDate = document.getElementById('fulfill-date').value;
    const paymentMethod = document.getElementById('fulfill-payment-method').value;
    const notes = document.getElementById('fulfill-notes').value;

    try {
        const result = await API.post(`/promises/${promiseId}/fulfill`, {
            actualAmount,
            paymentDate,
            paymentMethod,
            notes
        });

        if (result.success) {
            this.closeFulfillModal();
            await this.loadPromises();
            await this.loadAccountingData(); // Reload accounting data to show new transaction
        }
        
    } catch (error) {
        console.error('Error fulfilling promise:', error);
        alert('Error fulfilling promise. Please try again.');
    }
}

// View Promise Details
viewPromiseDetails(promiseId) {
    const promise = this.promises.find(p => p._id === promiseId);
    if (!promise) return;

    const detailsHtml = `
        <div class="promise-details">
            <h4>Promise Details</h4>
            <div class="detail-row">
                <label>Member:</label>
                <span>${promise.memberName}</span>
            </div>
            <div class="detail-row">
                <label>Amount:</label>
                <span>$${promise.amount.toLocaleString()}</span>
            </div>
            <div class="detail-row">
                <label>Category:</label>
                <span>${this.formatCategory(promise.category)}</span>
            </div>
            <div class="detail-row">
                <label>Promise Date:</label>
                <span>${new Date(promise.promiseDate).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
                <label>Due Date:</label>
                <span>${new Date(promise.dueDate).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
                <label>Status:</label>
                <span class="promise-status ${promise.status}">${promise.status.charAt(0).toUpperCase() + promise.status.slice(1)}</span>
            </div>
            ${promise.description ? `
            <div class="detail-row">
                <label>Description:</label>
                <span>${promise.description}</span>
            </div>
            ` : ''}
            ${promise.fulfilledDate ? `
            <div class="detail-row">
                <label>Fulfilled Date:</label>
                <span>${new Date(promise.fulfilledDate).toLocaleDateString()}</span>
            </div>
            ` : ''}
            ${promise.actualAmount ? `
            <div class="detail-row">
                <label>Actual Amount Paid:</label>
                <span>$${promise.actualAmount.toLocaleString()}</span>
            </div>
            ` : ''}
        </div>
    `;

    // Create a modal to show details
    this.showDetailsModal('Promise Details', detailsHtml);
}

showDetailsModal(title, content) {
    // Remove existing modal if any
    const existingModal = document.getElementById('details-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalHtml = `
        <div id="details-modal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <span class="close" onclick="this.closest('.modal').style.display='none'">&times;</span>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="this.closest('.modal').style.display='none'">Close</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Utility Methods
formatCategory(category) {
    const categories = {
        // Income categories
        'tithe': 'Tithe',
        'offering': 'Offering',
        'donation': 'Donation',
        'pledge': 'Pledge',
        'building': 'Building Fund',
        'missions': 'Missions',
        'youth_activity': 'Youth Activity Fees',
        'cultural_events': 'Cultural / Community Events',
        'fundraising': 'Fundraising Event',
        'special_donations': 'Special Donations',
        'membership': 'Membership Fees',
        
        // Expense categories
        'honorarium': 'Honorarium (Clergy/Volunteers)',
        'utilities': 'Utilities',
        'salaries': 'Salaries',
        'supplies': 'Supplies',
        'benevolence': 'Benevolence / Aid',
        'youth_programs': 'Youth Program Expenses',
        'maintenance': 'Maintenance & Repairs',
        'office_expenses': 'Office / Admin Expenses',
        'insurance': 'Insurance',
        'technology': 'Technology / IT',
        'training': 'Training / Workshops',
        'volunteer_support': 'Volunteer Support',
        'events': 'Events',
        'other': 'Other (Specify)'
    };
    return categories[category] || category;
}

exportPromises() {
    const csvContent = this.convertPromisesToCSV(this.promises);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promises-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

convertPromisesToCSV(promises) {
    const headers = ['Member Name', 'Amount', 'Category', 'Promise Date', 'Due Date', 'Status', 'Description'];
    const rows = promises.map(promise => [
        promise.memberName,
        promise.amount,
        this.formatCategory(promise.category),
        new Date(promise.promiseDate).toLocaleDateString(),
        new Date(promise.dueDate).toLocaleDateString(),
        promise.status,
        promise.description || ''
    ]);
    
    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
}

// Receipt Generation Methods==================================
async generateReceipt(transactionId) {
    // Close the action menu immediately to prevent multiple clicks
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
    
    // Get payee information (no total contributions calculation needed)
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
               <!-- <img src="https://churchmanagement.erotc.org/images/church-logo.png" alt="Church Logo" class="logo logo-left"> -->
                                <img src="https://church-management-vjfw.onrender.com/images/church-logo.png" alt="Church Logo" class="logo logo-left">
                <div class="church-info">
                    <div class="church-name">St Michael Eritrean Orthodox Church</div>
                    <div class="church-address">
                        60 Osborne Street, Joondanna, WA 6060<br>
                        ABN: 80798549161 | stmichaelerotc@gmail.com | erotc.org
                    </div>
                </div>
<!-- <img src="https://churchmanagement.erotc.org/images/kdus-mikaeal.jpg" alt="Kdus Mikaeal" class="logo logo-right"> -->
                                <img src="https://church-management-vjfw.onrender.com/images/kdus-mikaeal.jpg" alt="Kdus Mikaeal" class="logo logo-right">
            </div>

            <div class="receipt-title">
                DONATION RECEIPT
            </div>

            <div class="receipt-info">
                <div class="receipt-header-row">
                    <span><strong>Receipt Date:</strong> ${receiptDate}</span>
                    <span><strong>Transaction Date:</strong> ${transactionDate}</span>
                    <span><strong>Receipt #:</strong> ${transaction.transactionNumber || transaction._id.substring(18)}</span>
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
                        <td><strong>$${transaction.amount.toLocaleString()}</strong></td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="${transaction.reference ? '5' : '4'}"><strong>Total Contribution</strong></td>
                        <td><strong>$${transaction.amount.toLocaleString()}</strong></td>
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

formatPaymentMethod(method) {
    const methods = {
        'cash': 'Cash',
        'check': 'Check',
        'card': 'Credit/Debit Card',
        'online': 'Online Transfer',
        'transfer': 'Bank Transfer'
    };
    return methods[method] || method;
}

// Signature Management Methods ================================
async openSignatureModal(transactionId) {
    // Close the action menu immediately to prevent multiple clicks
    document.querySelectorAll('.action-menu.show').forEach(menu => {
        menu.classList.remove('show');
    });
    
    try {
        this.currentSignatureTransactionId = transactionId;
        
        // Get transaction details
        const transaction = await API.get(`/accounting/transaction/${transactionId}`);
        if (!transaction) {
            alert('Transaction not found');
            return;
        }

        // Get current signature info
        const signatureInfo = await API.get(`/signatures/${transactionId}`);
        
        // Populate transaction info
        const transactionInfo = document.getElementById('signature-transaction-info');
        transactionInfo.innerHTML = `
            <h4 style="margin: 0 0 10px 0; color: #4a6fa5;">
                <i class="fas fa-receipt"></i> Transaction Details
            </h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div><strong>Date:</strong> ${new Date(transaction.date).toLocaleDateString()}</div>
                <div><strong>Amount:</strong> $${transaction.amount.toFixed(2)}</div>
                <div><strong>Description:</strong> ${transaction.description}</div>
                <div><strong>Category:</strong> ${transaction.category}</div>
            </div>
        `;

        // Update signature status
        this.updateSignatureStatus(signatureInfo.signature);
        
        // Set default signature title based on user role
        this.setDefaultSignatureTitle();
        
        // Show modal
        document.getElementById('signature-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Error opening signature modal:', error);
        alert('Error loading signature information. Please try again.');
    }
}

setDefaultSignatureTitle() {
    // Get current user info from localStorage or API
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Display current user info
    const userDisplayElement = document.getElementById('current-user-display');
    if (userDisplayElement && currentUser.name) {
        const roleDisplay = currentUser.role ? currentUser.role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'User';
        userDisplayElement.textContent = `${currentUser.name} (${roleDisplay})`;
    }
    
    // Map user roles to appropriate signature titles
    const roleToSignatureTitle = {
        'super-admin': 'Administrator',
        'admin': 'Administrator', 
        'chairperson': 'Chairperson',
        'secretary': 'Secretary',
        'accountant': 'Accountant',
        'holder-of-goods': 'Treasurer',
        'community-coordinator': 'Community Coordinator'
    };
    
    const defaultTitle = roleToSignatureTitle[currentUser.role] || 'Authorized Signatory';
    
    // Set digital approval signature title only (image signature removed)
    const signatureTitleSelect = document.getElementById('signature-title');
    
    if (signatureTitleSelect) {
        const optionExists = Array.from(signatureTitleSelect.options).some(option => option.value === defaultTitle);
        if (optionExists) {
            signatureTitleSelect.value = defaultTitle;
        } else {
            // Fallback mapping for specific roles
            if (currentUser.role === 'holder-of-goods') {
                signatureTitleSelect.value = 'Treasurer';
            } else if (currentUser.role === 'accountant') {
                signatureTitleSelect.value = 'Accountant';
            } else if (currentUser.role === 'secretary') {
                signatureTitleSelect.value = 'Financial Secretary';
            } else {
                signatureTitleSelect.value = 'Authorized Signatory';
            }
        }
    }
}

updateSignatureStatus(signature) {
    const statusDiv = document.getElementById('current-signature-status');
    const removeBtn = document.getElementById('remove-signature-btn');
    
    if (!signature) {
        statusDiv.innerHTML = `
            <div class="signature-status no-signature">
                <h4 style="margin: 0 0 10px 0;">
                    <i class="fas fa-exclamation-triangle"></i> No Signature
                </h4>
                <p style="margin: 0;">This receipt does not have a signature. Add a digital approval or upload a signature image.</p>
            </div>
        `;
        removeBtn.style.display = 'none';
        return;
    }

    let statusHTML = `
        <div class="signature-status has-signature">
            <h4 style="margin: 0 0 15px 0;">
                <i class="fas fa-check-circle"></i> Signature Present (${signature.method.replace('_', ' ').toUpperCase()})
            </h4>
    `;

    if (signature.approvedBy) {
        statusHTML += `
            <div class="signature-details">
                <div class="signature-detail">
                    <strong>Approved By</strong>
                    ${signature.approvedBy.name}
                </div>
                <div class="signature-detail">
                    <strong>Role</strong>
                    ${signature.approvedBy.role}
                </div>
                <div class="signature-detail">
                    <strong>Title</strong>
                    ${signature.signatureTitle}
                </div>
                <div class="signature-detail">
                    <strong>Date</strong>
                    ${new Date(signature.approvedBy.timestamp).toLocaleString()}
                </div>
            </div>
        `;
    }

    // Note: Image signature display removed - using text-only signatures

    statusHTML += '</div>';
    statusDiv.innerHTML = statusHTML;
    removeBtn.style.display = 'inline-block';
}

switchSignatureTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${tab}-tab`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.signature-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(`${tab}-signature-tab`).style.display = 'block';
}

async addDigitalApproval() {
    try {
        const signatureTitle = document.getElementById('signature-title').value;
        const approvalBtn = document.getElementById('digital-approval-btn');
        
        approvalBtn.disabled = true;
        approvalBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding Approval...';
        
        const response = await API.post(`/signatures/digital-approval/${this.currentSignatureTransactionId}`, {
            signatureTitle
        });

        if (response.success) {
            alert('✅ Digital approval added successfully!');
            this.updateSignatureStatus(response.signature);
        } else {
            throw new Error(response.error || 'Failed to add digital approval');
        }
        
    } catch (error) {
        console.error('Error adding digital approval:', error);
        alert('Error adding digital approval: ' + error.message);
    } finally {
        const approvalBtn = document.getElementById('digital-approval-btn');
        approvalBtn.disabled = false;
        approvalBtn.innerHTML = '<i class="fas fa-check-circle"></i> Add Digital Approval';
    }
}

// Image signature functionality removed - using text-only signatures

async removeSignature() {
    if (!confirm('Are you sure you want to remove the signature from this receipt? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await API.delete(`/signatures/${this.currentSignatureTransactionId}`);
        
        if (response.success) {
            alert('✅ Signature removed successfully!');
            this.updateSignatureStatus(null);
        } else {
            throw new Error(response.error || 'Failed to remove signature');
        }
        
    } catch (error) {
        console.error('Error removing signature:', error);
        alert('Error removing signature: ' + error.message);
    }
}

closeSignatureModal() {
    document.getElementById('signature-modal').style.display = 'none';
    this.currentSignatureTransactionId = null;
    
    // Reset form (digital approval only)
    const signatureTitleEl = document.getElementById('signature-title');
    if (signatureTitleEl) {
        signatureTitleEl.value = 'Treasurer';
    }
}

    // Cleanup method to prevent memory leaks
    destroy() {
        this.removeEventListeners();
        this.cleanupTransactionRowEventListeners();
        this.cleanupSearchResultListeners();
        
        // Clear references
        this.allMembers = null;
        this.currentFilters = null;
        this.eventCleanupFunctions = null;
        this.transactionRowCleanup = null;
        this.searchResultCleanup = null;
        
        // Remove from window
        if (window.accountingPage === this) {
            window.accountingPage = null;
        }
        
        // Clear singleton instance
        AccountingPage.instance = null;
    }

    // Add missing cleanup methods
    cleanupTransactionRowEventListeners() {
        if (this.transactionRowCleanup) {
            this.transactionRowCleanup.forEach(cleanup => {
                if (typeof cleanup === 'function') {
                    try {
                        cleanup();
                    } catch (error) {
                        console.warn('Error during transaction row cleanup:', error);
                    }
                }
            });
            this.transactionRowCleanup = [];
        }
    }

    cleanupSearchResultListeners() {
        if (this.searchResultCleanup) {
            this.searchResultCleanup.forEach(cleanup => {
                if (typeof cleanup === 'function') {
                    try {
                        cleanup();
                    } catch (error) {
                        console.warn('Error during search result cleanup:', error);
                    }
                }
            });
            this.searchResultCleanup = [];
        }
    }

    // Static method to get current instance
    static getInstance() {
        return AccountingPage.instance;
    }

    // ===== BANK STATEMENT FUNCTIONALITY =====
    
    async loadBankStatement() {
            try {
                const startDate = document.getElementById('statement-start-date').value;
                const endDate = document.getElementById('statement-end-date').value;
                
                if (!startDate || !endDate) {
                    this.showError('Please select both start and end dates');
                    return;
                }
                
                if (new Date(startDate) > new Date(endDate)) {
                    this.showError('Start date cannot be after end date');
                    return;
                }
                
                console.log('Loading bank statement from', startDate, 'to', endDate);
                
                // Get transactions for the date range
                const response = await API.get(`/accounting?startDate=${startDate}&endDate=${endDate}&sortBy=date&sortOrder=asc`);
                const transactions = response.transactions || [];
                
                // Calculate opening balance (all transactions before start date)
                const openingResponse = await API.get(`/accounting?endDate=${startDate}&summary=true`);
                const openingBalance = openingResponse.summary?.netBalance || 0;
                
                this.renderBankStatement(transactions, openingBalance, startDate, endDate);
                
            } catch (error) {
                console.error('Error loading bank statement:', error);
                this.showError('Failed to load bank statement: ' + error.message);
            }
        }
        
        renderBankStatement(transactions, openingBalance, startDate, endDate) {
            // Show statement sections
            document.getElementById('statement-summary').style.display = 'inline';
            document.getElementById('statement-table-section').style.display = 'block';
            
            let runningBalance = openingBalance;
            let totalDebits = 0;
            let totalCredits = 0;
            
            // Calculate totals
            transactions.forEach(transaction => {
                if (transaction.type === 'expense') {
                    totalDebits += transaction.amount;
                } else {
                    totalCredits += transaction.amount;
                }
            });
            
            const closingBalance = openingBalance + totalCredits - totalDebits;
            
            // Update summary
            document.getElementById('opening-balance').textContent = `$${openingBalance.toFixed(2)}`;
            document.getElementById('total-debits').textContent = `$${totalDebits.toFixed(2)}`;
            document.getElementById('total-credits').textContent = `$${totalCredits.toFixed(2)}`;
            document.getElementById('closing-balance').textContent = `$${closingBalance.toFixed(2)}`;
            
            // Render statement table
            const tbody = document.getElementById('statement-tbody');
            
            // Add opening balance row
            let statementRows = `
                <tr style="background-color: #f8f9fa; font-weight: bold;">
                    <td>${new Date(startDate).toLocaleDateString()}</td>
                    <td>Opening Balance</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>$${runningBalance.toFixed(2)}</td>
                </tr>
            `;
            
            // Add transaction rows
            transactions.forEach(transaction => {
                const date = new Date(transaction.date).toLocaleDateString();
                const description = DOMUtils.escapeHtml(transaction.description || 'No description');
                const reference = DOMUtils.escapeHtml(transaction.reference || '-');
                const payeeName = transaction.payee?.name ? ` (${DOMUtils.escapeHtml(transaction.payee.name)})` : '';
                
                let debit = '-';
                let credit = '-';
                
                if (transaction.type === 'expense') {
                    debit = `$${transaction.amount.toFixed(2)}`;
                    runningBalance -= transaction.amount;
                } else {
                    credit = `$${transaction.amount.toFixed(2)}`;
                    runningBalance += transaction.amount;
                }
                
                statementRows += `
                    <tr>
                        <td>${date}</td>
                        <td>${description}${payeeName}</td>
                        <td>${reference}</td>
                        <td class="debit-amount">${debit}</td>
                        <td class="credit-amount">${credit}</td>
                        <td class="balance-amount">$${runningBalance.toFixed(2)}</td>
                    </tr>
                `;
            });
            
            // Add closing balance row
            statementRows += `
                <tr style="background-color: #f8f9fa; font-weight: bold; border-top: 2px solid #dee2e6;">
                    <td>${new Date(endDate).toLocaleDateString()}</td>
                    <td>Closing Balance</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>$${runningBalance.toFixed(2)}</td>
                </tr>
            `;
            
            tbody.innerHTML = statementRows;
            
            console.log('Bank statement rendered successfully');
        }
        
        async exportBankStatement() {
            try {
                // Check authentication first
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const authSystemToken = window.authSystem?.getToken();
                
                console.log('🔍 Authentication Debug:');
                console.log('- Token exists:', !!token);
                console.log('- Token preview:', token ? token.substring(0, 20) + '...' : 'null');
                console.log('- localStorage token:', localStorage.getItem('token') ? 'exists' : 'missing');
                console.log('- sessionStorage token:', sessionStorage.getItem('token') ? 'exists' : 'missing');
                console.log('- authSystem token:', authSystemToken ? 'exists' : 'missing');
                console.log('- authSystem token preview:', authSystemToken ? authSystemToken.substring(0, 20) + '...' : 'null');
                
                // Test authentication with a simple API call first
                try {
                    console.log('🔍 Testing authentication with simple API call...');
                    const testResponse = await API.get('/auth/verify');
                    console.log('✅ Authentication test successful:', testResponse);
                } catch (authTestError) {
                    console.error('❌ Authentication test failed:', authTestError);
                    this.showError('Authentication failed. Please log in again.');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                    return;
                }
                
                const startDate = document.getElementById('statement-start-date').value;
                const endDate = document.getElementById('statement-end-date').value;
                
                if (!startDate || !endDate) {
                    this.showError('Please generate a statement first');
                    return;
                }
                
                // Get the statement data
                const response = await API.get(`/accounting?startDate=${startDate}&endDate=${endDate}&sortBy=date&sortOrder=asc`);
                const transactions = response.transactions || [];
                
                const openingResponse = await API.get(`/accounting?endDate=${startDate}&summary=true`);
                const openingBalance = openingResponse.summary?.netBalance || 0;
                
                // Generate PDF using the API class with proper authentication
                const pdfData = {
                    type: 'bank-statement',
                    startDate,
                    endDate,
                    openingBalance,
                    transactions,
                    churchName: 'St. Michael Eritrean Orthodox Tewahedo Church',
                    churchAddress: '60 Osborne Street, Joondanna, WA 6060',
                    churchABN: 'ABN: 80 798 549 161'
                };
                
                console.log('🔍 PDF Export Debug:');
                console.log('- PDF Data:', pdfData);
                
                // Use the new downloadBlob method for PDF download
                const pdfBlob = await API.downloadBlob('/reports/generate-pdf', pdfData, 'POST');
                
                // Create download link
                const url = window.URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Financial_Statement_${startDate}_to_${endDate}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up the URL object
                window.URL.revokeObjectURL(url);
                
                this.showSuccess('Financial statement PDF downloaded successfully');
                
            } catch (error) {
                console.error('Error exporting bank statement:', error);
                
                // Handle authentication errors specifically
                if (error.message.includes('401') || error.message.includes('Unauthorized') || error.message.includes('Authentication required')) {
                    this.showError('Please log in to export financial statements. Redirecting to login page...');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    this.showError('Failed to export financial statement: ' + error.message);
                }
            }
        }

    // Static method to get current instance
    static getInstance() {
        return AccountingPage.instance;
    }
}

    // ✅ Register loader with singleton enforcement
    window.loadAccounting = function () {
        // Clean up existing instance if any
        if (window.accountingPage && typeof window.accountingPage.destroy === 'function') {
            window.accountingPage.destroy();
        }
        
        window.accountingPage = new AccountingPage();
    };
})();


// Global tab switching function for accounting page
window.switchAccountingTab = function(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Activate clicked button
    event.target.closest('.tab-button').classList.add('active');
    
    // Load data for the selected tab
    if (window.accountingPage) {
        switch(tabName) {
            case 'transactions':
                window.accountingPage.loadAccountingData();
                break;
            case 'contributions':
                window.accountingPage.loadContributions();
                break;
            case 'promises':
                window.accountingPage.loadPromises();
                break;
            case 'statement':
                // Set default dates for statement (last 30 days)
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);
                
                document.getElementById('statement-start-date').value = startDate.toISOString().split('T')[0];
                document.getElementById('statement-end-date').value = endDate.toISOString().split('T')[0];
                break;
        }
    }
    
    // Update the add button text based on active tab
    const addBtn = document.getElementById('add-transaction-btn');
    if (addBtn) {
        switch(tabName) {
            case 'transactions':
                addBtn.textContent = 'Add Transaction';
                addBtn.onclick = () => window.accountingPage.showAddTransactionForm();
                break;
            case 'contributions':
                addBtn.textContent = 'Add Contribution';
                addBtn.onclick = () => window.accountingPage.showAddContributionForm();
                break;
            case 'promises':
                addBtn.textContent = 'Add Promise';
                addBtn.onclick = () => window.accountingPage.showAddPromiseForm();
                break;
            case 'statement':
                addBtn.textContent = 'Generate Statement';
                addBtn.onclick = () => window.accountingPage.loadBankStatement();
                break;
        }
    }
};
