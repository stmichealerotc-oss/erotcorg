// Inventory Management Module
class InventoryPage {
    constructor() {
        this.items = [];
        this.documentClickHandlerAdded = false;
        this.init();
    }

    async init() {
        console.log('📦 Inventory module loaded');
        await this.loadInventoryData();
        this.setupEventListeners();
    }

    async loadInventoryData() {
        try {
            console.log('📦 Loading inventory data...');
            const data = await API.get('/inventory');
            console.log('📦 Received inventory data:', data.totalItems, 'items');
            this.items = data.items || [];
            this.updateStats(data);
            this.renderInventoryTable();
        } catch (error) {
            console.error('❌ Error loading inventory:', error);
            this.showError('Error loading inventory data');
        }
    }

    updateStats(data) {
        const totalItemsEl = document.getElementById('total-items-count');
        const lowStockEl = document.getElementById('low-stock-count');
        const totalValueEl = document.getElementById('total-value');
        const reorderEl = document.getElementById('reorder-count');

        if (totalItemsEl) totalItemsEl.textContent = data.totalItems || 0;
        if (lowStockEl) lowStockEl.textContent = data.lowStock || 0;
        if (totalValueEl) totalValueEl.textContent = `$${(data.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        if (reorderEl) reorderEl.textContent = data.lowStock || 0;
    }

    renderInventoryTable() {
        const tbody = document.querySelector('#inventory-table tbody');
        if (!tbody) return;

        if (this.items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-boxes"></i>
                            <p>No inventory items found</p>
                            <button class="btn btn-primary" onclick="inventoryPage.showAddItemForm()">
                                <i class="fas fa-plus"></i> Add First Item
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.items.map(item => {
            const isLowStock = item.quantity <= (item.lowStockThreshold || 5);
            const totalValue = (item.quantity * item.price).toFixed(2);
            const donorDisplay = item.donorName || '-';
            
            return `
                <tr>
                    <td>${item._id.slice(-6)}</td>
                    <td>${item.name}</td>
                    <td>${item.category || 'N/A'}</td>
                    <td>${donorDisplay}</td>
                    <td class="${isLowStock ? 'text-danger' : ''}">${item.quantity}</td>
                    <td>${item.lowStockThreshold || 5}</td>
                    <td>$${item.price.toFixed(2)}</td>
                    <td>$${totalValue}</td>
                    <td>
                        <span class="status-badge ${isLowStock ? 'status-inactive' : 'status-active'}">
                            ${isLowStock ? 'Low Stock' : 'In Stock'}
                        </span>
                    </td>
                    <td class="action-cell">
                        <div class="action-dropdown">
                            <button class="action-menu-btn" onclick="inventoryPage.toggleActionMenu(event, '${item._id}')" title="Actions">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="action-menu" id="action-menu-${item._id}">
                                <div class="action-item" onclick="inventoryPage.closeAllMenus(); inventoryPage.showDonateModal('${item._id}')">
                                    <i class="fas fa-gift"></i> Record Donation
                                </div>
                                <div class="action-item" onclick="inventoryPage.closeAllMenus(); inventoryPage.showConsumeModal('${item._id}')">
                                    <i class="fas fa-minus-circle"></i> Record Consumption
                                </div>
                                <div class="action-item" onclick="inventoryPage.closeAllMenus(); inventoryPage.showHistory('${item._id}')">
                                    <i class="fas fa-history"></i> View History
                                </div>
                                <hr>
                                <div class="action-item" onclick="inventoryPage.closeAllMenus(); inventoryPage.editItem('${item._id}')">
                                    <i class="fas fa-edit"></i> Edit Item
                                </div>
                                <div class="action-item delete-action" onclick="inventoryPage.closeAllMenus(); inventoryPage.deleteItem('${item._id}')">
                                    <i class="fas fa-trash"></i> Delete Item
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    setupEventListeners() {
        const form = document.getElementById('item-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
        
        // Prevent duplicate event listeners
        if (!this.documentClickHandlerAdded) {
            // Close action menus when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.action-dropdown')) {
                    document.querySelectorAll('.action-menu.show').forEach(menu => {
                        menu.classList.remove('show');
                    });
                }
                
                // Close search results when clicking outside
                if (!e.target.closest('.search-container')) {
                    document.querySelectorAll('.search-results').forEach(results => {
                        results.style.display = 'none';
                    });
                }
            });
            this.documentClickHandlerAdded = true;
        }
    }

    showAddItemForm() {
        const modal = document.getElementById('item-modal');
        const title = document.getElementById('item-modal-title');
        const deleteBtn = document.getElementById('delete-item-btn');
        
        if (modal && title) {
            title.innerHTML = '<i class="fas fa-plus"></i> Add New Item';
            if (deleteBtn) deleteBtn.style.display = 'none';
            this.clearForm();
            modal.style.display = 'flex';
            
            // Load members for donor dropdown
            this.loadMembersForItemForm();
        }
    }

    async loadMembersForItemForm() {
        try {
            const data = await API.get('/members');
            this.members = data.list || [];
            console.log('✅ Loaded members for item form:', this.members.length);
        } catch (error) {
            console.error('Error loading members:', error);
            this.members = [];
        }
    }

    searchMembersForItem(query) {
        console.log('🔍 Searching members for item, query:', query, 'members loaded:', this.members.length);
        const resultsContainer = document.getElementById('item-member-search-results');
        
        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'none';
            return;
        }

        const filteredMembers = this.members.filter(member => 
            `${member.firstName} ${member.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
            member.email?.toLowerCase().includes(query.toLowerCase())
        );

        console.log('🔍 Filtered members:', filteredMembers.length);

        if (filteredMembers.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-result-item">
                    <i class="fas fa-search"></i>
                    <span>No members found</span>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = filteredMembers.map(member => `
                <div class="search-result-item" onclick="inventoryPage.selectMemberForItem('${member._id}', '${member.firstName} ${member.lastName}')">
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

    selectMemberForItem(memberId, memberName) {
        console.log('Selecting member for item:', memberId, memberName);
        document.getElementById('item-donor-member').value = memberId;
        document.getElementById('item-donor-member-search').value = memberName;
        document.getElementById('item-member-search-results').style.display = 'none';
    }

    handleItemDonorTypeChange() {
        const donorType = document.getElementById('item-donor-type').value;
        const memberGroup = document.getElementById('item-member-select-group');
        const externalGroup = document.getElementById('item-external-name-group');
        
        if (donorType === 'member') {
            memberGroup.style.display = 'block';
            externalGroup.style.display = 'none';
        } else if (donorType === 'external') {
            memberGroup.style.display = 'none';
            externalGroup.style.display = 'block';
        } else {
            memberGroup.style.display = 'none';
            externalGroup.style.display = 'none';
        }
    }

    editItem(itemId) {
        const item = this.items.find(i => i._id === itemId);
        if (!item) return;

        const modal = document.getElementById('item-modal');
        const title = document.getElementById('item-modal-title');
        const deleteBtn = document.getElementById('delete-item-btn');
        
        if (modal && title) {
            title.innerHTML = '<i class="fas fa-edit"></i> Edit Item';
            if (deleteBtn) deleteBtn.style.display = 'inline-block';
            this.populateForm(item);
            modal.style.display = 'flex';
            
            // Load members for donor dropdown
            this.loadMembersForItemForm();
        }
    }

    populateForm(item) {
        document.getElementById('item-id').value = item._id;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-category').value = item.category || '';
        document.getElementById('item-quantity').value = item.quantity;
        document.getElementById('item-threshold').value = item.lowStockThreshold || 5;
        document.getElementById('item-price').value = item.price;
        document.getElementById('item-note').value = item.note || '';
        
        // Populate donor fields if they exist
        if (item.donorId) {
            document.getElementById('item-donor-type').value = 'member';
            document.getElementById('item-donor-member').value = item.donorId;
            document.getElementById('item-donor-member-search').value = item.donorName || '';
        } else if (item.donorName && item.donorName !== 'Anonymous') {
            document.getElementById('item-donor-type').value = 'external';
            document.getElementById('item-donor-name').value = item.donorName;
        } else if (item.donorName === 'Anonymous') {
            document.getElementById('item-donor-type').value = 'anonymous';
        } else {
            document.getElementById('item-donor-type').value = '';
        }
        
        this.handleItemDonorTypeChange();
    }

    clearForm() {
        document.getElementById('item-form').reset();
        document.getElementById('item-id').value = '';
        document.getElementById('item-donor-type').value = '';
        document.getElementById('item-donor-member').value = '';
        document.getElementById('item-donor-member-search').value = '';
        document.getElementById('item-member-search-results').style.display = 'none';
        this.handleItemDonorTypeChange();
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const itemId = document.getElementById('item-id').value;
        const itemData = {
            name: document.getElementById('item-name').value.trim(),
            category: document.getElementById('item-category').value,
            quantity: parseInt(document.getElementById('item-quantity').value) || 0,
            lowStockThreshold: parseInt(document.getElementById('item-threshold').value) || 5,
            price: parseFloat(document.getElementById('item-price').value) || 0,
            note: document.getElementById('item-note').value.trim(),
            location: document.getElementById('item-location')?.value.trim() || ''
        };

        // Add donor information if provided
        const donorType = document.getElementById('item-donor-type').value;
        console.log('Donor type:', donorType);
        
        if (donorType === 'member') {
            const donorId = document.getElementById('item-donor-member').value;
            console.log('Donor ID:', donorId);
            
            if (donorId) {
                itemData.donorId = donorId;
                // Get donor name from search input
                const donorName = document.getElementById('item-donor-member-search').value;
                if (donorName) {
                    itemData.donorName = donorName;
                }
                console.log('Added donor info:', itemData.donorId, itemData.donorName);
            }
        } else if (donorType === 'external') {
            const donorName = document.getElementById('item-donor-name').value.trim();
            if (donorName) {
                itemData.donorName = donorName;
                console.log('Added external donor:', itemData.donorName);
            }
        } else if (donorType === 'anonymous') {
            itemData.donorName = 'Anonymous';
            console.log('Added anonymous donor');
        }

        console.log('Submitting item data:', itemData);

        if (!itemData.name) {
            this.showError('Item name is required');
            return;
        }

        try {
            let result;
            if (itemId) {
                result = await API.put(`/inventory/item/${itemId}`, itemData);
            } else {
                result = await API.post('/inventory/item', itemData);
            }
            
            this.showSuccess(result.message || 'Item saved successfully');
            this.closeModal();
            await this.loadInventoryData();
        } catch (error) {
            console.error('Error saving item:', error);
            this.showError('Error saving item');
        }
    }

    async deleteItem(itemId) {
        if (!itemId) {
            itemId = document.getElementById('item-id').value;
        }
        
        if (!itemId) return;

        if (!confirm('Are you sure you want to delete this item?')) {
            return;
        }

        try {
            await API.delete(`/inventory/item/${itemId}`);
            this.showSuccess('Item deleted successfully');
            this.closeModal();
            await this.loadInventoryData();
        } catch (error) {
            console.error('Error deleting item:', error);
            this.showError('Error deleting item');
        }
    }

    closeModal() {
        const modal = document.getElementById('item-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showSuccess(message) {
        // You can implement a toast notification system here
        alert(message);
    }

    showError(message) {
        // You can implement a toast notification system here
        alert('Error: ' + message);
    }

    // ===== DONATION FUNCTIONALITY =====
    
    async loadMembers() {
        try {
            const data = await API.get('/members');
            this.members = data.list || [];
            console.log('✅ Loaded members for donations:', this.members.length);
        } catch (error) {
            console.error('Error loading members:', error);
            this.members = [];
        }
    }

    searchMembersForDonation(query) {
        const resultsContainer = document.getElementById('donate-member-search-results');
        
        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'none';
            return;
        }

        const filteredMembers = this.members.filter(member => 
            `${member.firstName} ${member.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
            member.email?.toLowerCase().includes(query.toLowerCase())
        );

        if (filteredMembers.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-result-item">
                    <i class="fas fa-search"></i>
                    <span>No members found</span>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = filteredMembers.map(member => `
                <div class="search-result-item" onclick="inventoryPage.selectMemberForDonation('${member._id}', '${member.firstName} ${member.lastName}')">
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

    selectMemberForDonation(memberId, memberName) {
        console.log('Selecting member for donation:', memberId, memberName);
        document.getElementById('donor-member').value = memberId;
        document.getElementById('donor-member-search').value = memberName;
        document.getElementById('donate-member-search-results').style.display = 'none';
    }

    showDonateModal(itemId) {
        this.currentItemId = itemId;
        const item = this.items.find(i => i._id === itemId);
        if (!item) return;
        
        this.currentItem = item;
        document.getElementById('donate-modal').style.display = 'flex';
        this.loadMembers();
        
        // Reset form
        document.getElementById('donate-form').reset();
        document.getElementById('donor-type').value = 'member';
        document.getElementById('donor-member').value = '';
        document.getElementById('donor-member-search').value = '';
        document.getElementById('donate-member-search-results').style.display = 'none';
        this.handleDonorTypeChange();
    }

    handleDonorTypeChange() {
        const donorType = document.getElementById('donor-type').value;
        const memberGroup = document.getElementById('member-select-group');
        const externalGroup = document.getElementById('external-name-group');
        
        if (donorType === 'member') {
            memberGroup.style.display = 'block';
            externalGroup.style.display = 'none';
        } else if (donorType === 'external') {
            memberGroup.style.display = 'none';
            externalGroup.style.display = 'block';
        } else {
            memberGroup.style.display = 'none';
            externalGroup.style.display = 'none';
        }
    }

    async submitDonation() {
        const donorType = document.getElementById('donor-type').value;
        const quantity = parseFloat(document.getElementById('donate-quantity').value);
        const value = parseFloat(document.getElementById('donate-value').value);
        const notes = document.getElementById('donate-notes').value;
        
        if (!quantity || quantity <= 0) {
            this.showError('Please enter a valid quantity');
            return;
        }
        
        if (!value || value <= 0) {
            this.showError('Please enter a valid value');
            return;
        }
        
        let donorId = null;
        let donorName = 'Anonymous';
        
        if (donorType === 'member') {
            donorId = document.getElementById('donor-member').value;
            if (!donorId) {
                this.showError('Please select a member');
                return;
            }
            const member = this.members.find(m => m._id === donorId);
            if (member) {
                donorName = `${member.firstName} ${member.lastName}`;
            }
        } else if (donorType === 'external') {
            donorName = document.getElementById('donor-name').value.trim();
            if (!donorName) {
                this.showError('Please enter donor name');
                return;
            }
        }
        
        const donationData = {
            donorId: donorId,
            donorName: donorName,
            quantity: quantity,
            estimatedValue: value,
            notes: notes,
            category: 'donation',
            createContribution: donorId ? true : false
        };
        
        try {
            await API.post(`/inventory/item/${this.currentItemId}/donate`, donationData);
            this.showSuccess('Donation recorded successfully!');
            this.closeDonateModal();
            await this.loadInventoryData();
        } catch (error) {
            console.error('Error recording donation:', error);
            this.showError('Error recording donation');
        }
    }

    closeDonateModal() {
        const modal = document.getElementById('donate-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // ===== CONSUMPTION FUNCTIONALITY =====
    
    showConsumeModal(itemId) {
        this.currentItemId = itemId;
        const item = this.items.find(i => i._id === itemId);
        if (!item) return;
        
        this.currentItem = item;
        document.getElementById('available-quantity').textContent = item.quantity;
        document.getElementById('consume-modal').style.display = 'flex';
        
        // Reset form
        document.getElementById('consume-form').reset();
    }

    async submitConsumption() {
        const quantity = parseFloat(document.getElementById('consume-quantity').value);
        const purpose = document.getElementById('consume-purpose').value;
        const category = document.getElementById('consume-category').value;
        const notes = document.getElementById('consume-notes').value;
        
        if (!quantity || quantity <= 0) {
            this.showError('Please enter a valid quantity');
            return;
        }
        
        if (quantity > this.currentItem.quantity) {
            this.showError(`Cannot consume more than available quantity (${this.currentItem.quantity})`);
            return;
        }
        
        const consumptionData = {
            quantity: quantity,
            purpose: purpose,
            category: category,
            notes: notes
        };
        
        try {
            await API.post(`/inventory/item/${this.currentItemId}/consume`, consumptionData);
            this.showSuccess('Consumption recorded successfully!');
            this.closeConsumeModal();
            await this.loadInventoryData();
        } catch (error) {
            console.error('Error recording consumption:', error);
            this.showError('Error recording consumption');
        }
    }

    closeConsumeModal() {
        const modal = document.getElementById('consume-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // ===== HISTORY FUNCTIONALITY =====
    
    async showHistory(itemId) {
        try {
            const data = await API.get(`/inventory/item/${itemId}/history`);
            this.renderHistory(data);
            document.getElementById('history-modal').style.display = 'flex';
        } catch (error) {
            console.error('Error loading history:', error);
            this.showError('Error loading history');
        }
    }

    renderHistory(data) {
        // Render donations
        const donationsBody = document.getElementById('donations-history');
        if (data.donations && data.donations.length > 0) {
            donationsBody.innerHTML = data.donations.map(d => `
                <tr>
                    <td>${new Date(d.date).toLocaleDateString()}</td>
                    <td>${d.donorName}</td>
                    <td>${d.quantity}</td>
                    <td>$${d.estimatedValue.toFixed(2)}</td>
                    <td>${d.notes || '-'}</td>
                </tr>
            `).join('');
        } else {
            donationsBody.innerHTML = '<tr><td colspan="5" class="text-center">No donations recorded</td></tr>';
        }
        
        // Render consumption
        const consumptionBody = document.getElementById('consumption-history');
        if (data.consumption && data.consumption.length > 0) {
            consumptionBody.innerHTML = data.consumption.map(c => `
                <tr>
                    <td>${new Date(c.date).toLocaleDateString()}</td>
                    <td>${c.quantity}</td>
                    <td>${c.purpose}</td>
                    <td>$${c.value.toFixed(2)}</td>
                    <td>${c.consumedBy ? c.consumedBy.name : 'Unknown'}</td>
                </tr>
            `).join('');
        } else {
            consumptionBody.innerHTML = '<tr><td colspan="5" class="text-center">No consumption recorded</td></tr>';
        }
    }

    closeHistoryModal() {
        const modal = document.getElementById('history-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // ===== ACTION MENU FUNCTIONALITY =====
    
    closeAllMenus() {
        document.querySelectorAll('.action-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }
    
    toggleActionMenu(event, itemId) {
        console.log('🔘 Toggle action menu called for item:', itemId);
        event.stopPropagation();
        
        // Close all other open menus
        document.querySelectorAll('.action-menu.show').forEach(menu => {
            if (menu.id !== `action-menu-${itemId}`) {
                menu.classList.remove('show');
            }
        });
        
        // Toggle current menu
        const menu = document.getElementById(`action-menu-${itemId}`);
        if (menu) {
            menu.classList.toggle('show');
            console.log('🔘 Menu toggled, now showing:', menu.classList.contains('show'));
        } else {
            console.error('❌ Menu not found for item:', itemId);
        }
    }

    render() {
        // This method is kept for compatibility but not used since we have HTML file
        return `
            <div class="page-header">
                <h2>Inventory Management</h2>
                <button class="btn btn-primary" onclick="inventoryPage.showAddItemForm()">
                    <i class="fas fa-plus"></i> Add New Item
                </button>
            </div>
            <div class="content-section">
                <p>Inventory functionality is now available!</p>
            </div>
        `;
    }
}

// Initialize inventory page
let inventoryPage;

// Register loader function
window.loadInventory = function() {
    console.log('Loading inventory page');
    try {
        inventoryPage = new InventoryPage();
        window.inventoryPage = inventoryPage; // Make it globally accessible
    } catch (error) {
        console.error('Error initializing inventory:', error);
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InventoryPage;
}

console.log("✅ inventory.js loaded successfully");