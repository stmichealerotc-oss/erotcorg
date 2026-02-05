class UserManagement {
    constructor() {
        this.users = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.currentUser = null;
        this.init();
    }

    async init() {
        console.log('🔧 UserManagement initializing...');
        
        // Wait for DOM to be fully ready with multiple checks
        await this.waitForDOM();
        
        this.setupEventListeners();
        await this.loadUsers();
        this.updateStats();
        
        console.log('✅ UserManagement initialization complete');
    }

    async waitForDOM() {
        // Wait for critical elements to be available
        const maxAttempts = 50; // 5 seconds max
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            const addUserBtn = document.getElementById('add-user-btn');
            const userModal = document.getElementById('user-modal');
            const usersTableBody = document.getElementById('users-table-body');
            
            if (addUserBtn && userModal && usersTableBody) {
                console.log('✅ Critical DOM elements found after', attempts * 100, 'ms');
                return;
            }
            
            console.log('⏳ Waiting for DOM elements... attempt', attempts + 1);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('⚠️ Some DOM elements may not be available after 5 seconds');
    }

    setupEventListeners() {
        console.log('🔧 Setting up User Management event listeners...');
        
        // Helper function to safely add event listeners with better debugging
        const safeAddEventListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
                console.log(`✅ Event listener added for: ${id} (${event})`);
                
                // Special handling for the add-user-btn to test immediately
                if (id === 'add-user-btn') {
                    console.log('🔧 Testing add-user-btn click handler...');
                    // Test the handler by simulating a click
                    setTimeout(() => {
                        console.log('🔧 Add user button element:', element);
                        console.log('🔧 Add user button visible:', element.offsetParent !== null);
                        console.log('🔧 Add user button disabled:', element.disabled);
                    }, 100);
                }
            } else {
                console.error(`❌ Element not found: ${id}`);
                // List all available elements for debugging
                console.log('🔍 Available elements with IDs:');
                document.querySelectorAll('[id]').forEach(el => {
                    console.log(`  - ${el.id}: ${el.tagName}`);
                });
            }
        };

        // Search and filters
        safeAddEventListener('user-search', 'input', this.debounce(() => this.loadUsers(), 300));
        safeAddEventListener('role-filter', 'change', () => this.loadUsers());
        safeAddEventListener('status-filter', 'change', () => this.loadUsers());

        // Add user button - this is the critical one
        safeAddEventListener('add-user-btn', 'click', (e) => {
            console.log('🔧 Add user button clicked!', e);
            e.preventDefault();
            e.stopPropagation();
            this.showUserModal();
        });

        // Modal controls
        safeAddEventListener('modal-close', 'click', () => this.hideUserModal());
        safeAddEventListener('cancel-btn', 'click', () => this.hideUserModal());
        safeAddEventListener('save-user-btn', 'click', () => this.saveUser());

        // Password reset modal
        safeAddEventListener('reset-modal-close', 'click', () => this.hidePasswordResetModal());
        safeAddEventListener('reset-cancel-btn', 'click', () => this.hidePasswordResetModal());
        safeAddEventListener('send-reset-btn', 'click', () => this.sendPasswordReset());

        // Delete modal
        safeAddEventListener('delete-modal-close', 'click', () => this.hideDeleteModal());
        safeAddEventListener('delete-cancel-btn', 'click', () => this.hideDeleteModal());
        safeAddEventListener('confirm-delete-btn', 'click', () => this.deleteUser());

        // Form submission
        const userForm = document.getElementById('user-form');
        if (userForm) {
            userForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveUser();
            });
            console.log('✅ Form submission listener added');
        } else {
            console.warn('❌ User form not found');
        }
        
        // Also add a backup event listener using event delegation on the document
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'add-user-btn') {
                console.log('🔧 Add user button clicked via event delegation!');
                e.preventDefault();
                e.stopPropagation();
                this.showUserModal();
            }
        });
        
        console.log('🔧 Event listeners setup complete');
    }

    async loadUsers() {
        try {
            const search = document.getElementById('user-search').value;
            const role = document.getElementById('role-filter').value;
            const status = document.getElementById('status-filter').value;

            const params = new URLSearchParams({
                page: this.currentPage,
                limit: 20
            });

            if (search) params.append('search', search);
            if (role) params.append('role', role);
            if (status) params.append('status', status);

            const response = await API.get(`/user-management?${params}`);
            
            this.users = response.users;
            this.totalPages = response.pagination.pages;
            this.stats = response.stats;

            this.renderUsers();
            this.renderPagination();
            this.updateStats();

        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users');
        }
    }

    renderUsers() {
        const tbody = document.getElementById('users-table-body');
        
        if (this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-users"></i>
                            <p>No users found</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.users.map(user => `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="user-details">
                            <div class="user-name">${user.name}</div>
                            <div class="user-meta">@${user.username} • ${user.email}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="role-badge role-${user.role}">
                        ${this.formatRole(user.role)}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${user.accountStatus}">
                        <i class="fas fa-circle"></i>
                        ${this.formatStatus(user.accountStatus)}
                    </span>
                </td>
                <td>
                    <div class="date-info">
                        <div>${this.formatDate(user.createdAt)}</div>
                        ${user.createdBy ? `<small>by ${user.createdBy.name}</small>` : ''}
                    </div>
                </td>
                <td>
                    ${user.lastLogin ? this.formatDate(user.lastLogin) : 'Never'}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="userManagement.editUser('${user._id}')" title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="userManagement.showPasswordResetModal('${user._id}')" title="Reset Password">
                            <i class="fas fa-key"></i>
                        </button>
                        ${user.role !== 'super-admin' ? `
                            <button class="btn-icon btn-danger" onclick="userManagement.showDeleteModal('${user._id}')" title="Delete User">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderPagination() {
        const container = document.getElementById('pagination-container');
        
        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let pagination = '<div class="pagination">';
        
        // Previous button
        if (this.currentPage > 1) {
            pagination += `<button class="page-btn" onclick="userManagement.goToPage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>`;
        }

        // Page numbers
        for (let i = 1; i <= this.totalPages; i++) {
            if (i === this.currentPage) {
                pagination += `<button class="page-btn active">${i}</button>`;
            } else {
                pagination += `<button class="page-btn" onclick="userManagement.goToPage(${i})">${i}</button>`;
            }
        }

        // Next button
        if (this.currentPage < this.totalPages) {
            pagination += `<button class="page-btn" onclick="userManagement.goToPage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>`;
        }

        pagination += '</div>';
        container.innerHTML = pagination;
    }

    updateStats() {
        if (!this.stats) return;

        const statusStats = this.stats.byStatus.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
        }, {});

        const roleStats = this.stats.byRole.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
        }, {});

        document.getElementById('total-users').textContent = this.stats.total;
        document.getElementById('active-users').textContent = statusStats.active || 0;
        document.getElementById('pending-users').textContent = statusStats.pending || 0;
        document.getElementById('admin-users').textContent = 
            (roleStats['super-admin'] || 0) + (roleStats.admin || 0);
    }

    showUserModal(userId = null) {
        console.log('🔧 showUserModal called with userId:', userId);
        
        this.currentUser = userId;
        const modal = document.getElementById('user-modal');
        const title = document.getElementById('modal-title');
        const statusGroup = document.getElementById('status-group');

        if (!modal) {
            console.error('❌ User modal not found!');
            console.log('🔍 Available elements with IDs:');
            document.querySelectorAll('[id]').forEach(el => {
                console.log(`  - ${el.id}: ${el.tagName}`);
            });
            return;
        }

        console.log('✅ Modal element found:', modal);
        console.log('🔧 Modal current classes:', modal.className);
        console.log('🔧 Modal current display:', window.getComputedStyle(modal).display);

        if (userId) {
            title.textContent = 'Edit User';
            statusGroup.style.display = 'block';
            this.loadUserForEdit(userId);
        } else {
            title.textContent = 'Add New User';
            statusGroup.style.display = 'none';
            this.clearUserForm();
        }

        console.log('🔧 Adding show class to modal...');
        modal.classList.add('show');
        
        // Check if it worked
        setTimeout(() => {
            console.log('🔧 Modal classes after adding show:', modal.className);
            console.log('🔧 Modal display after adding show:', window.getComputedStyle(modal).display);
            console.log('🔧 Modal visibility:', window.getComputedStyle(modal).visibility);
            console.log('🔧 Modal opacity:', window.getComputedStyle(modal).opacity);
            
            if (modal.classList.contains('show')) {
                console.log('✅ Modal should now be visible');
            } else {
                console.log('❌ Show class was not added properly');
            }
        }, 100);
    }

    hideUserModal() {
        document.getElementById('user-modal').classList.remove('show');
        this.currentUser = null;
    }

    async loadUserForEdit(userId) {
        const user = this.users.find(u => u._id === userId);
        if (!user) return;

        document.getElementById('user-name').value = user.name;
        document.getElementById('user-username').value = user.username;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-role').value = user.role;
        document.getElementById('user-status').value = user.accountStatus;
        document.getElementById('user-active').checked = user.isActive;
    }

    clearUserForm() {
        document.getElementById('user-form').reset();
        document.getElementById('user-active').checked = true;
    }

    async saveUser() {
        try {
            const form = document.getElementById('user-form');
            const formData = new FormData(form);
            
            const userData = {
                name: formData.get('name'),
                username: formData.get('username'),
                email: formData.get('email'),
                role: formData.get('role'),
                isActive: formData.get('isActive') === 'on'
            };

            // Basic validation
            if (!userData.name || !userData.username || !userData.email || !userData.role) {
                this.showError('Please fill in all required fields');
                return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(userData.email)) {
                this.showError('Please enter a valid email address');
                return;
            }

            // Username validation (no spaces, special characters)
            const usernameRegex = /^[a-zA-Z0-9_-]+$/;
            if (!usernameRegex.test(userData.username)) {
                this.showError('Username can only contain letters, numbers, hyphens, and underscores');
                return;
            }

            // Check for duplicates in existing users (client-side check)
            if (!this.currentUser) { // Only for new users
                const existingUser = this.users.find(user => 
                    user.email.toLowerCase() === userData.email.toLowerCase() || 
                    user.username.toLowerCase() === userData.username.toLowerCase()
                );
                
                if (existingUser) {
                    if (existingUser.email.toLowerCase() === userData.email.toLowerCase()) {
                        this.showError(`Email "${userData.email}" is already in use by ${existingUser.name}`);
                    } else {
                        this.showError(`Username "${userData.username}" is already in use by ${existingUser.name}`);
                    }
                    return;
                }
            }

            if (this.currentUser) {
                userData.accountStatus = formData.get('accountStatus');
            }

            // Show loading state
            const saveBtn = document.getElementById('save-user-btn');
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            saveBtn.disabled = true;

            let response;
            if (this.currentUser) {
                response = await API.put(`/user-management/${this.currentUser}`, userData);
            } else {
                response = await API.post('/user-management', userData);
            }

            if (response.success) {
                this.showSuccess(response.message);
                this.hideUserModal();
                await this.loadUsers();
            } else {
                this.showError(response.error);
            }

            // Restore button state
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;

        } catch (error) {
            console.error('Error saving user:', error);
            this.showError(error.message || 'Failed to save user');
            
            // Restore button state
            const saveBtn = document.getElementById('save-user-btn');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save User';
                saveBtn.disabled = false;
            }
        }
    }

    editUser(userId) {
        this.showUserModal(userId);
    }

    showPasswordResetModal(userId) {
        const user = this.users.find(u => u._id === userId);
        if (!user) return;

        this.currentUser = userId;
        document.getElementById('reset-user-name').textContent = user.name;
        document.getElementById('password-reset-modal').classList.add('show');
    }

    hidePasswordResetModal() {
        document.getElementById('password-reset-modal').classList.remove('show');
        this.currentUser = null;
    }

    async sendPasswordReset() {
        try {
            const response = await API.post(`/user-management/${this.currentUser}/reset-password`);
            
            if (response.success) {
                this.showSuccess('Password reset email sent successfully');
                this.hidePasswordResetModal();
            } else {
                this.showError(response.error);
            }

        } catch (error) {
            console.error('Error sending password reset:', error);
            this.showError('Failed to send password reset email');
        }
    }

    showDeleteModal(userId) {
        const user = this.users.find(u => u._id === userId);
        if (!user) return;

        this.currentUser = userId;
        document.getElementById('delete-user-name').textContent = user.name;
        document.getElementById('delete-user-modal').classList.add('show');
    }

    hideDeleteModal() {
        document.getElementById('delete-user-modal').classList.remove('show');
        this.currentUser = null;
    }

    async deleteUser() {
        try {
            const response = await API.delete(`/user-management/${this.currentUser}`);
            
            if (response.success) {
                this.showSuccess('User deleted successfully');
                this.hideDeleteModal();
                await this.loadUsers();
            } else {
                this.showError(response.error);
            }

        } catch (error) {
            console.error('Error deleting user:', error);
            this.showError('Failed to delete user');
        }
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadUsers();
    }

    // Utility functions
    formatRole(role) {
        const roleNames = {
            'super-admin': 'Super Admin',
            'admin': 'Admin',
            'chairperson': 'Chairperson',
            'secretary': 'Secretary',
            'accountant': 'Accountant',
            'holder-of-goods': 'Holder of Goods',
            'community-coordinator': 'Community Coordinator',
            'member': 'Member',
            'visitor': 'Visitor (Read-Only)'
        };
        return roleNames[role] || role;
    }

    formatStatus(status) {
        const statusNames = {
            'active': 'Active',
            'pending': 'Pending',
            'inactive': 'Inactive',
            'suspended': 'Suspended'
        };
        return statusNames[status] || status;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    debounce(func, wait) {
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

    showError(message) {
        // Create a better error notification instead of alert
        console.error('❌ Error:', message);
        
        // Try to extract the actual error message from API response
        let errorText = message;
        if (typeof message === 'string' && message.includes('HTTP 400:')) {
            try {
                const jsonPart = message.split('HTTP 400: ')[1];
                const errorObj = JSON.parse(jsonPart);
                errorText = errorObj.error || message;
            } catch (e) {
                // If parsing fails, use original message
            }
        }
        
        // Show a styled error message instead of alert
        this.showNotification(errorText, 'error');
    }

    showSuccess(message) {
        // Create a better success notification instead of alert
        console.log('✅ Success:', message);
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add styles if not already present
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    min-width: 300px;
                    max-width: 500px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    animation: slideInRight 0.3s ease-out;
                }
                .notification.success {
                    background: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }
                .notification.error {
                    background: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }
                .notification.info {
                    background: #d1ecf1;
                    color: #0c5460;
                    border: 1px solid #bee5eb;
                }
                .notification-content {
                    display: flex;
                    align-items: center;
                    padding: 12px 16px;
                    gap: 10px;
                }
                .notification-close {
                    background: none;
                    border: none;
                    cursor: pointer;
                    opacity: 0.7;
                    margin-left: auto;
                }
                .notification-close:hover {
                    opacity: 1;
                }
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Global instance
let userManagement;

// Global loader function
window.loadUserManagement = function() {
    console.log('🚀 Loading user management page');
    try {
        userManagement = new UserManagement();
        
        // Make userManagement globally accessible for debugging
        window.userManagement = userManagement;
        
        console.log('✅ UserManagement instance created and initialized');
        
    } catch (error) {
        console.error('❌ Error initializing user management:', error);
    }
};

// Also add the function name that app.js expects (removes hyphens and capitalizes)
window.loadUsermanagement = window.loadUserManagement;

// Debug function to test the Add User button
window.testAddUserButton = function() {
    console.log('🔧 Testing Add User button...');
    
    const button = document.getElementById('add-user-btn');
    if (button) {
        console.log('✅ Add User button found');
        console.log('🔧 Button properties:');
        console.log('  - Visible:', button.offsetParent !== null);
        console.log('  - Disabled:', button.disabled);
        console.log('  - Display:', window.getComputedStyle(button).display);
        console.log('  - Visibility:', window.getComputedStyle(button).visibility);
        console.log('🔧 Simulating click...');
        button.click();
    } else {
        console.log('❌ Add User button not found');
        console.log('🔍 Available buttons:');
        document.querySelectorAll('button').forEach((btn, index) => {
            console.log(`  ${index}: ${btn.id || 'no-id'} - ${btn.textContent.trim()}`);
        });
    }
    
    if (window.userManagement) {
        console.log('🔧 UserManagement instance found, calling showUserModal directly...');
        try {
            window.userManagement.showUserModal();
        } catch (error) {
            console.error('❌ Error calling showUserModal:', error);
        }
    } else {
        console.log('❌ UserManagement instance not found');
        console.log('🔍 Available window properties:', Object.keys(window).filter(key => key.includes('user') || key.includes('User')));
    }
};

// Debug function to test modal visibility
window.testModal = function() {
    console.log('🔧 Testing modal...');
    
    const modal = document.getElementById('user-modal');
    if (modal) {
        console.log('✅ Modal found');
        console.log('🔧 Modal classes:', modal.className);
        console.log('🔧 Modal display:', window.getComputedStyle(modal).display);
        console.log('🔧 Adding show class...');
        modal.classList.add('show');
        console.log('✅ Modal should now be visible');
    } else {
        console.log('❌ Modal not found');
    }
};

console.log("✅ user-management.js loaded successfully");