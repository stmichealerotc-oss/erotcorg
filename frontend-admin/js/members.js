// Enhanced members.js with profile integration
(function () {

// API Configuration
const API_BASE_URL = window.Config ? Config.getApiBaseUrl() : '/api';

// Development mode helper for handling API errors
async function handleDevModeApiCall(fetchPromise, mockData = {}) {
    try {
        const response = await fetchPromise;
        
        if (response.ok) {
            return await response.json();
        } else if (response.status === 500 && window.Config && window.Config.isDevelopment() && localStorage.getItem('devAuthBypass') === 'true') {
            console.log('🔓 Members: Mocking 500 error response in development mode');
            return { success: true, ...mockData };
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        if (window.Config && window.Config.isDevelopment() && localStorage.getItem('devAuthBypass') === 'true') {
            console.log('🔓 Members: Mocking API error in development mode:', error.message);
            return { success: true, ...mockData };
        }
        throw error;
    }
}

class MembersPage {
    constructor() {
        this.currentlyEditing = null;
        this.allMembers = []; // Store all members for filtering
        this.filteredMembers = []; // Store filtered results
        this.currentSearch = '';
        this.currentStatusFilter = '';
        this.init();
    }

    // Utility function to convert DD/MM/YYYY to YYYY-MM-DD
    convertDateToISO(dateStr) {
        if (!dateStr) return '';
        
        // If already in ISO format, return as is
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr;
        }
        
        // Convert DD/MM/YYYY to YYYY-MM-DD
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        return dateStr;
    }

    // Utility function to convert YYYY-MM-DD to DD/MM/YYYY
    convertDateFromISO(dateStr) {
        if (!dateStr) return '';
        
        // If already in DD/MM/YYYY format, return as is
        if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            return dateStr;
        }
        
        // Convert YYYY-MM-DD to DD/MM/YYYY
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        }
        
        return dateStr;
    }
        async init() {
            await this.loadMembersData();
            await this.loadPendingMembers(); // Load pending members
            this.setupEventListeners();
            this.setupSearchListeners();
            this.setupVisitorRestrictions();
            this.updateTabCounts(); // Update tab counts
        }

        setupVisitorRestrictions() {
            // Hide write actions for visitors
            if (window.authSystem && window.authSystem.isVisitor()) {
                console.log('👁️ Visitor detected - hiding write actions');
                
                // Hide add member button
                const addMemberBtn = document.getElementById('add-member-btn');
                if (addMemberBtn) {
                    addMemberBtn.style.display = 'none';
                }
                
                // Hide bulk actions dropdown
                const bulkActionsDropdown = document.querySelector('.bulk-actions-dropdown');
                if (bulkActionsDropdown) {
                    bulkActionsDropdown.style.display = 'none';
                }
                
                // Hide pending members tab for visitors
                const pendingTab = document.getElementById('pending-tab');
                if (pendingTab) {
                    pendingTab.style.display = 'none';
                }
                
                // Add visitor notice
                this.addVisitorNotice();
            }
            
            // Also check if user is not authenticated at all
            if (!window.authSystem || !window.authSystem.isLoggedIn()) {
                console.log('🔒 No authentication - limiting access to pending members');
                
                // Hide pending members tab for unauthenticated users
                const pendingTab = document.getElementById('pending-tab');
                if (pendingTab) {
                    pendingTab.style.display = 'none';
                }
            }
        }

        addVisitorNotice() {
            const pageHeader = document.querySelector('.page-header');
            if (pageHeader) {
                const notice = document.createElement('div');
                notice.className = 'visitor-notice';
                notice.innerHTML = `
                    <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 6px; padding: 12px; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-eye" style="color: #2196f3;"></i>
                        <span style="color: #1976d2; font-size: 0.9rem;">
                            <strong>Read-Only Access:</strong> You can view all information but cannot make changes.
                        </span>
                    </div>
                `;
                pageHeader.appendChild(notice);
            }
        }

        setupEventListeners() {
            console.log('🎯 Setting up event listeners...');
            
            // Member form submission
            const memberForm = document.getElementById('member-form');
            const addMemberBtn = document.getElementById('add-member-btn');

            if (memberForm) {
                memberForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    console.log('📝 Form submitted, calling saveMember()');
                    this.saveMember();
                });
                console.log('✅ Member form listener attached');
            } else {
                console.warn('❌ Member form not found');
            }

            if (addMemberBtn) {
                addMemberBtn.addEventListener('click', () => {
                    this.showAddMemberForm();
                });
                console.log('✅ Add member button listener attached');
            }

            // CSV Import event listeners
            const csvFileInput = document.getElementById('csv-file');
            const importBtn = document.getElementById('import-btn');
            const downloadTemplateBtn = document.getElementById('download-template-btn');

            if (csvFileInput) {
                csvFileInput.addEventListener('change', (e) => {
                    this.handleFileSelect(e);
                });
            }

            if (importBtn) {
                importBtn.addEventListener('click', () => {
                    this.importMembers();
                });
            }

            if (downloadTemplateBtn) {
                downloadTemplateBtn.addEventListener('click', () => {
                    this.downloadTemplate();
                });
            }

            // Close modal when clicking outside
            const modal = document.getElementById('csv-import-modal');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeImportModal();
                    }
                });
            }

            // Close action menus when clicking outside
            document.addEventListener('click', (e) => {
                // Close action menus when clicking outside
                if (!e.target.closest('.action-dropdown')) {
                    document.querySelectorAll('.action-menu.show').forEach(menu => {
                        menu.classList.remove('show');
                    });
                }
                
                // Close bulk actions menu when clicking outside
                if (!e.target.closest('.bulk-actions-dropdown')) {
                    const bulkMenu = document.getElementById('bulk-actions-menu');
                    if (bulkMenu) {
                        bulkMenu.classList.remove('show');
                    }
                }
            });
            
            // Pending members checkbox event listeners
            document.addEventListener('change', (e) => {
                if (e.target.classList.contains('pending-member-checkbox')) {
                    this.updateBulkActionButtons();
                }
            });
        }

        renderStats(data) {
            const totalMembers = document.getElementById('total-members-count');
            const activeMembers = document.getElementById('active-members-count');
            const inactiveMembers = document.getElementById('inactive-members-count');
            const totalContributions = document.getElementById('total-contributions');

            if (totalMembers) totalMembers.textContent = data.total || 0;
            if (activeMembers) activeMembers.textContent = data.active || 0;
            if (inactiveMembers) inactiveMembers.textContent = data.inactive || 0;
            if (totalContributions) totalContributions.textContent = `$${(data.totalContributions || 0).toLocaleString()}`;
        }


    // Add search and filter methods
    searchMembers(searchTerm) {
        this.currentSearch = searchTerm.toLowerCase().trim();
        this.applyFilters();
    }

    applyFilters() {
        this.currentStatusFilter = document.getElementById('status-filter')?.value || '';
        
        let filtered = this.allMembers;
        
        // Apply search filter
        if (this.currentSearch) {
            filtered = filtered.filter(member => 
                `${member.firstName} ${member.lastName}`.toLowerCase().includes(this.currentSearch) ||
                member.email?.toLowerCase().includes(this.currentSearch) ||
                member.phone?.includes(this.currentSearch) ||
                member.status?.toLowerCase().includes(this.currentSearch)
            );
        }
        
        // Apply status filter
        if (this.currentStatusFilter) {
            filtered = filtered.filter(member => 
                member.status === this.currentStatusFilter
            );
        } else {
            // When no specific status filter is applied (i.e., "All Members" tab),
            // exclude pending members since they have their own dedicated tab
            filtered = filtered.filter(member => 
                member.status !== 'pending'
            );
        }
        
        this.filteredMembers = filtered;
        this.renderMembersTable(this.filteredMembers);
        this.updateSearchResultsInfo();
    }
    clearSearch() {
        this.currentSearch = '';
        this.currentStatusFilter = '';
        
        // Clear both search inputs
        const memberIdSearch = document.getElementById('member-id-search');
        const memberSearch = document.getElementById('member-search');
        const statusFilter = document.getElementById('status-filter');
        
        if (memberIdSearch) memberIdSearch.value = '';
        if (memberSearch) memberSearch.value = '';
        if (statusFilter) statusFilter.value = '';
        
        // Hide search results info
        const searchInfo = document.getElementById('search-results-info');
        if (searchInfo) {
            searchInfo.style.display = 'none';
        }
        
        this.applyFilters();
    }

    updateSearchResultsInfo() {
        const infoElement = document.getElementById('search-results-info');
        if (!infoElement) return;
        
        const totalMembers = this.allMembers.length;
        const showingMembers = this.filteredMembers.length;
        
        if (this.currentSearch || this.currentStatusFilter) {
            let message = `Showing ${showingMembers} of ${totalMembers} members`;
            
            if (this.currentSearch) {
                message += ` for "${this.currentSearch}"`;
            }
            
            if (this.currentStatusFilter) {
                message += ` with status: ${this.currentStatusFilter}`;
            }
            
            infoElement.textContent = message;
        } else {
            infoElement.textContent = `Showing all ${totalMembers} members`;
        }
    }

    // Update your loadMembersData method
    async loadMembersData() {
        try {
            const data = await API.get('/members');
            this.allMembers = data.list || [];
            this.filteredMembers = [...this.allMembers]; // Start with all members
            
            this.renderStats(data);
            this.renderMembersTable(this.filteredMembers);
            this.updateSearchResultsInfo();
            
        } catch (error) {
            console.error('Error loading members data:', error);
            // Fallback to demo data
            this.renderDemoData();
        }
    }

    // Update renderMembersTable to use filteredMembers
   renderMembersTable(members) {
    const tbody = document.querySelector('#members-table tbody');
    if (!tbody) return;

    tbody.innerHTML = members.map(member => {
        // Use the memberNumber field from database (sequential format: M0001, M0002, etc.)
        const memberNumber = member.memberNumber || 'Pending';
        
        const totalContributions = member.totalContributions || 0;
        const joinDate = member.joinDate ? new Date(member.joinDate).toLocaleDateString() : 'N/A';

        return `
            <tr>
                <td class="mobile-hide"><strong>${memberNumber}</strong></td>
                <td>
                    <div class="member-name">
                        <strong>${member.firstName} ${member.lastName}</strong>
                        <div class="member-details mobile-only">
                            <small class="member-id">ID: ${memberNumber}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge ${member.status === 'active' ? 'badge-success' : 
                                      member.status === 'inactive' ? 'badge-danger' : 'badge-warning'}">
                        ${member.status}
                    </span>
                </td>
                <td class="mobile-hide">$${totalContributions.toFixed(2)}</td>
                <td class="mobile-hide join-date-col">${joinDate}</td>
                <td>
                    <div class="action-dropdown">
                        <button class="action-menu-btn" onclick="membersPage.toggleActionMenu(event, '${member._id}')" title="Actions">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="action-menu" id="action-menu-${member._id}">
                            <div class="action-item member-info-item">
                                <i class="fas fa-info-circle"></i>
                                <div class="member-info">
                                    <strong>Member Info</strong>
                                    <div>ID: ${memberNumber}</div>
                                    <div>Contributions: $${totalContributions.toFixed(2)}</div>
                                    <div>Joined: ${joinDate}</div>
                                </div>
                            </div>
                            <div class="action-divider"></div>
                            <div class="action-item" onclick="membersPage.editMember('${member._id}')">
                                <i class="fas fa-edit"></i>
                                <span>Edit Member</span>
                            </div>
                            <div class="action-item" onclick="membersPage.viewMemberProfile('${member._id}')">
                                <i class="fas fa-user"></i>
                                <span>View Profile</span>
                            </div>
                            <div class="action-item" onclick="membersPage.generateUpdateLink('${member._id}')">
                                <i class="fas fa-link"></i>
                                <span>Generate Update Link</span>
                            </div>
                            <div class="action-item" onclick="membersPage.quickLookup('${memberNumber}')">
                                <i class="fas fa-search"></i>
                                <span>Quick Lookup</span>
                            </div>
                            <div class="action-item" onclick="membersPage.viewDigitalCard('${member._id}')">
                                <i class="fas fa-id-card"></i>
                                <span>Digital ID Card</span>
                            </div>
                            <div class="action-item" onclick="membersPage.emailDigitalCard('${member._id}')">
                                <i class="fas fa-envelope"></i>
                                <span>Email ID Card</span>
                            </div>
                            <div class="action-item" onclick="membersPage.sendWelcomeEmail('${member._id}')">
                                <i class="fas fa-paper-plane"></i>
                                <span>Send Welcome Email</span>
                            </div>
                            <div class="action-item delete-action" onclick="membersPage.deleteMember('${member._id}')">
                                <i class="fas fa-trash"></i>
                                <span>Delete Member</span>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

    // Optional: Add search term highlighting
    highlightSearchTerm(text) {
        if (!this.currentSearch) return '';
        
        const lowerText = text.toLowerCase();
        const lowerSearch = this.currentSearch.toLowerCase();
        const index = lowerText.indexOf(lowerSearch);
        
        if (index === -1) return '';
        
        const before = text.substring(0, index);
        const match = text.substring(index, index + this.currentSearch.length);
        const after = text.substring(index + this.currentSearch.length);
        
        return `<div class="search-highlight"><small>Matches: <mark>${match}</mark></small></div>`;
    }

// Add event listeners for table actions
attachTableEventListeners() {
    const tbody = document.querySelector('#members-table tbody');
    if (!tbody) return;

    // View Profile buttons
    tbody.addEventListener('click', (e) => {
        const viewProfileBtn = e.target.closest('.view-profile');
        if (viewProfileBtn) {
            const memberId = viewProfileBtn.dataset.memberId;
            this.viewMemberProfile(memberId);
        }
        
        // You can also handle edit and delete here
        const editBtn = e.target.closest('.edit-member');
        if (editBtn) {
            const memberId = editBtn.dataset.memberId;
            this.editMember(memberId);
        }
        
        const deleteBtn = e.target.closest('.delete-member');
        if (deleteBtn) {
            const memberId = deleteBtn.dataset.memberId;
            this.deleteMember(memberId);
        }
    });
}
        showAddMemberForm() {
            this.currentlyEditing = null;
            const modalTitle = document.getElementById('member-modal-title');
            const memberForm = document.getElementById('member-form');
            const memberJoinDate = document.getElementById('member-join-date');
            const modal = document.getElementById('member-modal');

            if (modalTitle) modalTitle.textContent = 'Add New Member';
            if (memberForm) {
                memberForm.reset();
                console.log('🔄 Form reset completed');
            }
            if (memberJoinDate) memberJoinDate.value = new Date().toISOString().split('T')[0];
            
            // AGGRESSIVE CLEARING: Clear the hidden member-id field to prevent duplicate ID errors
            this.setFormField('member-id', '');
            
            // Double-check that the field is actually cleared
            const memberIdAfterClear = this.getFormFieldValue('member-id');
            console.log('🔍 After clearing, member-id field value:', memberIdAfterClear);
            
            if (modal) modal.style.display = 'block';
            
            console.log('✅ Add member form shown, currentlyEditing:', this.currentlyEditing);
        }

        async editMember(memberId) {
            try {
                console.log('✏️ Editing member:', memberId);
                const member = await API.get(`/members/${memberId}`);
                console.log('📋 Member data loaded:', member);
                
                if (member) {
                    this.currentlyEditing = memberId;
                    console.log('🔧 Set currentlyEditing to:', this.currentlyEditing);
                    
                    const modalTitle = document.getElementById('member-modal-title');
                    const modal = document.getElementById('member-modal');

                    if (modalTitle) modalTitle.textContent = 'Edit Member';

                    // Populate form fields
                    this.setFormField('member-id', member._id || member.id);
                    this.setFormField('member-first-name', member.firstName);
                    this.setFormField('member-last-name', member.lastName);
                    this.setFormField('member-email', member.email);
                    this.setFormField('member-phone', member.phone);
                    this.setFormField('member-address', member.address);
                    this.setFormField('member-dob', this.convertDateFromISO(member.dob));
                    this.setFormField('member-join-date', this.convertDateFromISO(member.joinDate));
                    this.setFormField('member-status', member.status || 'active');
                    this.setFormField('emergency-contact-name', member.emergencyContactName);
                    this.setFormField('emergency-contact-phone', member.emergencyContactPhone);
                    this.setFormField('member-notes', member.notes);

                    if (modal) modal.style.display = 'block';
                }
            } catch (error) {
                console.error('Error loading member data:', error);
                alert('Error loading member data. Please try again.');
            }
        }

        setFormField(fieldId, value) {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = value || '';
            }
        }

        async saveMember() {
            console.log('💾 Saving member - Edit mode:', !!this.currentlyEditing, 'ID:', this.currentlyEditing);
            
            // Debug: Check all form fields
            const form = document.getElementById('member-form');
            const formData = new FormData(form);
            console.log('🔍 Raw FormData entries:');
            for (let [key, value] of formData.entries()) {
                console.log(`  ${key}: ${value}`);
            }
            
            const memberData = {
                firstName: this.getFormFieldValue('member-first-name'),
                lastName: this.getFormFieldValue('member-last-name'),
                email: this.getFormFieldValue('member-email'),
                phone: this.getFormFieldValue('member-phone'),
                address: this.getFormFieldValue('member-address'),
                dob: this.convertDateToISO(this.getFormFieldValue('member-dob')),
                joinDate: this.convertDateToISO(this.getFormFieldValue('member-join-date')),
                status: this.getFormFieldValue('member-status'),
                emergencyContactName: this.getFormFieldValue('emergency-contact-name'),
                emergencyContactPhone: this.getFormFieldValue('emergency-contact-phone'),
                notes: this.getFormFieldValue('member-notes')
            };

            // Only include id field when editing (not when creating new member)
            if (this.currentlyEditing) {
                const memberId = this.getFormFieldValue('member-id');
                console.log('🔍 Edit mode - member-id field value:', memberId);
                
                // DON'T include the id field in updates - MongoDB _id should not be sent as 'id'
                // The id field in the model is for legacy numeric IDs, not MongoDB ObjectIds
                console.log('⚠️ Skipping id field for update - using URL parameter instead');
            } else {
                console.log('➕ Create mode - NOT adding id field');
                // Explicitly check if member-id field has a value when it shouldn't
                const memberIdValue = this.getFormFieldValue('member-id');
                console.log('🔍 Create mode - member-id field value (should be empty):', memberIdValue);
                
                // AGGRESSIVE FIX: Ensure no id-related fields are included
                delete memberData.id;
                delete memberData._id;
                delete memberData.memberId;
            }

            console.log('📝 Final member data being sent:', JSON.stringify(memberData, null, 2));

            // Final safety check: Remove any id-related fields that might have been added
            delete memberData.id;
            delete memberData._id;
            delete memberData.memberId;
            
            console.log('📝 After safety cleanup:', JSON.stringify(memberData, null, 2));

            // Basic validation
            if (!memberData.firstName.trim()) {
                alert('First name is required.');
                return;
            }

            if (!memberData.lastName.trim()) {
                alert('Last name is required.');
                return;
            }

            // Email validation (if provided)
            if (memberData.email && memberData.email.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(memberData.email.trim())) {
                    alert('Please enter a valid email address.');
                    return;
                }
                
                // Check for duplicate email (only for new members)
                if (!this.currentlyEditing) {
                    const existingMember = this.allMembers.find(member => 
                        member.email && member.email.toLowerCase() === memberData.email.toLowerCase()
                    );
                    if (existingMember) {
                        alert(`A member with email "${memberData.email}" already exists:\n${existingMember.firstName} ${existingMember.lastName}\n\nPlease use a different email address or update the existing member.`);
                        return;
                    }
                }
            }

            try {
                if (this.currentlyEditing) {
                    console.log('✏️ Updating member:', this.currentlyEditing);
                    const result = await API.put(`/members/${this.currentlyEditing}`, memberData);
                    console.log('✅ Update result:', result);
                } else {
                    console.log('➕ Creating new member');
                    const result = await API.post('/members', memberData);
                    console.log('✅ Create result:', result);
                }

                this.closeModal();
                await this.loadMembersData();
            } catch (error) {
                console.error('❌ Error saving member:', error);
                
                // Parse the error message to provide better user feedback
                let errorMessage = 'Error saving member. Please try again.';
                
                if (error.message && (error.message.includes('email already exists') || error.message.includes('id already exists'))) {
                    if (error.message.includes('email already exists')) {
                        errorMessage = 'A member with this email address already exists. Please use a different email address or update the existing member.';
                    } else if (error.message.includes('id already exists')) {
                        errorMessage = 'A member with this ID already exists. This is likely a system error - please try again or contact support.';
                    }
                } else if (error.message && error.message.includes('HTTP 400')) {
                    // Try to extract the specific error from the HTTP 400 response
                    try {
                        const match = error.message.match(/{"error":"([^"]+)"/);
                        if (match && match[1]) {
                            errorMessage = match[1];
                            
                            // Make the error message more user-friendly
                            if (errorMessage.includes('email already exists')) {
                                errorMessage = 'A member with this email address already exists. Please use a different email address or update the existing member.';
                            } else if (errorMessage.includes('id already exists')) {
                                errorMessage = 'A member with this ID already exists. This is likely a system error - please try again or contact support.';
                            }
                        }
                    } catch (parseError) {
                        console.warn('Could not parse error message:', parseError);
                    }
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                // Show error in a more prominent way
                this.showErrorMessage(errorMessage);
            }
        }

        showErrorMessage(message) {
            // Create a more prominent error display
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #dc3545;
                color: white;
                padding: 15px 20px;
                border-radius: 5px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 400px;
                font-size: 14px;
                line-height: 1.4;
            `;
            errorDiv.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                    <i class="fas fa-exclamation-triangle" style="margin-top: 2px;"></i>
                    <div style="flex: 1;">${message}</div>
                    <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 16px; cursor: pointer; padding: 0; margin-left: 10px;">&times;</button>
                </div>
            `;
            
            document.body.appendChild(errorDiv);
            
            // Auto-remove after 8 seconds
            setTimeout(() => {
                if (errorDiv.parentElement) {
                    errorDiv.remove();
                }
            }, 8000);
            
            // Also show the alert as fallback
            alert(message);
        }

        getFormFieldValue(fieldId) {
            const field = document.getElementById(fieldId);
            return field ? field.value.trim() : '';
        }

        async deleteMember(memberId) {
            if (confirm('Are you sure you want to delete this member?')) {
                try {
                    await API.delete(`/members/${memberId}`);
                    await this.loadMembersData();
                } catch (error) {
                    console.error('Error deleting member:', error);
                    alert('Error deleting member. Please try again.');
                }
            }
        }

viewMemberProfile(memberId) {
    console.log('👤 Navigating to member profile for:', memberId);
    
    // Validate memberId
    if (!memberId) {
        console.error('❌ No member ID provided');
        alert('Error: No member ID provided');
        return;
    }
    
    // Store member ID for the profile page
    sessionStorage.setItem('currentMemberId', memberId);
    console.log('✅ Stored memberId in sessionStorage:', memberId);
    
    // Use DashboardApp to load the page (this will use the file mapping)
    if (window.dashboardApp && window.dashboardApp.loadPage) {
        console.log('🚀 Loading member profile page via DashboardApp');
        window.dashboardApp.loadPage('memberProfile', { memberId });
    } else {
        console.error('❌ Dashboard app not available');
        
        // Fallback: try to trigger the same navigation as sidebar
        this.fallbackNavigation(memberId);
    }
}

async generateUpdateLink(memberId) {
    try {
        console.log('🔗 Generating update link for member:', memberId);
        
        // Use the global auth system if available
        if (window.authSystem && window.authSystem.getToken()) {
            const token = window.authSystem.getToken();
            console.log('🔑 Using auth system token:', !!token);
            
            const response = await fetch(`${API_BASE_URL}/members/${memberId}/generate-update-token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Response status:', response.status);
            const result = await response.json();
            console.log('📡 Response data:', result);

            if (response.ok && result.success) {
                // Show modal with the update link
                this.showUpdateLinkModal(result.updateLink, result.updateToken);
            } else {
                throw new Error(result.error || `HTTP ${response.status}: Failed to generate update link`);
            }
        } else {
            // Fallback to manual token retrieval
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || localStorage.getItem('token');
            console.log('🔑 Fallback token exists:', !!token);
            
            if (!token) {
                throw new Error('No authentication token found. Please login again.');
            }
            
            const response = await fetch(`${API_BASE_URL}/members/${memberId}/generate-update-token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Response status:', response.status);
            const result = await response.json();
            console.log('📡 Response data:', result);

            if (response.ok && result.success) {
                // Show modal with the update link
                this.showUpdateLinkModal(result.updateLink, result.updateToken);
            } else {
                throw new Error(result.error || `HTTP ${response.status}: Failed to generate update link`);
            }
        }

    } catch (error) {
        console.error('❌ Error generating update link:', error);
        alert(`Error generating update link: ${error.message}`);
    }
}

showUpdateLinkModal(updateLink, updateToken) {
    // Create modal HTML
    const modalHTML = `
        <div id="update-link-modal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-link"></i> Member Update Link Generated</h3>
                    <span class="close-btn" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <p><strong>Update link has been generated successfully!</strong></p>
                    <p>Share this link with the member so they can update their own details:</p>
                    
                    <div class="link-container" style="background: #f8f9fa; padding: 1rem; border-radius: 5px; margin: 1rem 0; border: 1px solid #dee2e6;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="text" id="update-link-input" value="${updateLink}" readonly 
                                   style="flex: 1; padding: 0.5rem; border: 1px solid #ccc; border-radius: 3px; font-family: monospace; font-size: 0.9rem;">
                            <button class="btn btn-secondary" onclick="membersPage.copyUpdateLink()" title="Copy Link">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="alert alert-info" style="background: #d1ecf1; color: #0c5460; padding: 0.75rem; border-radius: 5px; border: 1px solid #bee5eb;">
                        <i class="fas fa-info-circle"></i>
                        <strong>Note:</strong> This link is valid for 1 year and allows the member to update their details once. After they submit the form, it will be hidden and they won't be able to access it again.
                    </div>
                    
                    <div class="modal-actions" style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: flex-end;">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Close
                        </button>
                        <button class="btn btn-primary" onclick="membersPage.copyUpdateLink()">
                            <i class="fas fa-copy"></i> Copy Link
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing modal
    const existingModal = document.getElementById('update-link-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

copyUpdateLink() {
    const linkInput = document.getElementById('update-link-input');
    if (linkInput) {
        linkInput.select();
        linkInput.setSelectionRange(0, 99999); // For mobile devices
        
        try {
            document.execCommand('copy');
            
            // Show success feedback
            const copyBtn = document.querySelector('#update-link-modal .btn-primary');
            if (copyBtn) {
                const originalHTML = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyBtn.style.background = '#28a745';
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalHTML;
                    copyBtn.style.background = '';
                }, 2000);
            }
            
        } catch (err) {
            console.error('Failed to copy link:', err);
            alert('Failed to copy link. Please copy it manually.');
        }
    }
}

// Fallback navigation method
fallbackNavigation(memberId) {
    console.log('🔄 Attempting fallback navigation');
    
    // Method 1: Update URL hash to trigger DashboardApp navigation
    window.location.hash = `memberProfile?memberId=${memberId}`;
    
    // Method 2: If DashboardApp listens to hash changes, this might work
    setTimeout(() => {
        // Try to find and click the member profile sidebar link
        const profileLink = document.querySelector('[data-page="memberProfile"]');
        if (profileLink) {
            console.log('🎯 Clicking sidebar profile link');
            profileLink.click();
        } else {
            console.error('❌ Could not find profile sidebar link');
            alert('Navigation failed. Please use the sidebar to navigate to Member Profile.');
        }
    }, 100);
}

        closeModal() {
            const modal = document.getElementById('member-modal');
            if (modal) {
                modal.style.display = 'none';
            }
            this.currentlyEditing = null;
        }

        // Action Dropdown Menu Functions
        toggleActionMenu(event, memberId) {
            event.stopPropagation();
            
            // Close all other open menus
            document.querySelectorAll('.action-menu.show').forEach(menu => {
                if (menu.id !== `action-menu-${memberId}`) {
                    menu.classList.remove('show');
                }
            });
            
            // Close bulk actions menu
            const bulkMenu = document.getElementById('bulk-actions-menu');
            if (bulkMenu) {
                bulkMenu.classList.remove('show');
            }
            
            // Toggle current menu
            const menu = document.getElementById(`action-menu-${memberId}`);
            if (menu) {
                menu.classList.toggle('show');
            }
        }
        
        // Bulk Actions Dropdown Functions
        toggleBulkActions(event) {
            event.stopPropagation();
            
            // Close all individual action menus first
            document.querySelectorAll('.action-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
            
            // Toggle bulk actions menu
            const bulkMenu = document.getElementById('bulk-actions-menu');
            if (bulkMenu) {
                bulkMenu.classList.toggle('show');
            }
        }

        // Send Welcome Email Function
        async sendWelcomeEmail(memberId) {
            try {
                // Get member details
                const member = this.allMembers.find(m => m._id === memberId);
                
                if (!member) {
                    alert('Member not found');
                    return;
                }

                if (!member.email) {
                    alert('This member does not have an email address on file');
                    return;
                }

                // Confirm before sending
                if (!confirm(`Send welcome email to ${member.firstName} ${member.lastName} at ${member.email}?`)) {
                    return;
                }

                // Send welcome email
                const response = await API.post(`/members/send-welcome-email/${memberId}`);

                if (response.success) {
                    alert(`✅ Welcome email sent successfully to ${member.email}`);
                    
                    // Close the action menu
                    document.querySelectorAll('.action-menu.show').forEach(menu => {
                        menu.classList.remove('show');
                    });
                } else {
                    throw new Error(response.error || 'Failed to send welcome email');
                }

            } catch (error) {
                console.error('Error sending welcome email:', error);
                alert('Error sending welcome email: ' + error.message);
            }
        }

    //===============================
// Duplicate setupEventListeners removed - consolidated above

handleFileSelect(event) {
    const file = event.target.files[0];
    const fileName = document.getElementById('file-name');
    const importBtn = document.getElementById('import-btn');

    if (file) {
        fileName.textContent = file.name;
        importBtn.disabled = false;
        
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('Please select a CSV file');
            this.resetImport();
            return;
        }
    } else {
        this.resetImport();
    }
}

resetImport() {
    document.getElementById('csv-file').value = '';
    document.getElementById('file-name').textContent = 'No file chosen';
    document.getElementById('import-btn').disabled = true;
    this.hideProgress();
    document.getElementById('import-results').innerHTML = '';
}

async importMembers() {
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a CSV file first');
        return;
    }

    this.showProgress(0, 'Reading CSV file...');

    try {
        const csvText = await this.readFileAsText(file);
        
        // Debug the CSV parsing
        console.log('=== CSV DEBUG INFO ===');
        console.log('Raw CSV text (first 500 chars):', csvText.substring(0, 500));
        console.log('Total lines:', csvText.split('\n').length);
        console.log('=== END DEBUG INFO ===');
        
        const members = this.parseCSV(csvText);
        
        if (members.length === 0) {
            throw new Error('No valid member data found in CSV');
        }

        await this.processMembersImport(members);
        
    } catch (error) {
        console.error('Import error:', error);
        this.showError('Import failed: ' + error.message);
    }
}

readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

parseCSV(csvText) {
    // Filter out empty lines and commented lines
    const lines = csvText.split('\n')
        .filter(line => line.trim()) // Remove empty lines
        .filter(line => !line.trim().startsWith('#')); // Remove commented lines
    
    if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    console.log('📋 Detected CSV headers:', headers);

    const members = [];
    let skippedRows = 0;
    
    for (let i = 1; i < lines.length; i++) {
        try {
            const line = lines[i].trim();
            
            // Skip empty lines or commented lines that might have slipped through
            if (!line || line.startsWith('#')) {
                skippedRows++;
                continue;
            }

            const values = this.parseCSVLine(line);
            
            // Skip rows that don't have enough values or are likely header rows
            if (values.length < 2 || this.isHeaderRow(values, headers)) {
                console.warn('❌ Skipping row - insufficient data or appears to be headers:', values);
                skippedRows++;
                continue;
            }

            const member = this.mapCSVRowToMember(headers, values);
            
            // Validate required fields and ensure it's actual data (not example headers)
            if (this.isValidMember(member)) {
                console.log('✅ Parsed member:', member);
                members.push(member);
            } else {
                console.warn('❌ Skipping row - invalid member data:', {
                    values,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    email: member.email
                });
                skippedRows++;
            }
        } catch (error) {
            console.error(`❌ Error parsing row ${i + 1}:`, error, 'Row content:', lines[i]);
            skippedRows++;
        }
    }

    console.log(`📊 CSV Import Results: ${members.length} valid members, ${skippedRows} skipped rows`);
    
    if (members.length === 0) {
        throw new Error(`No valid member data found. Please ensure your CSV contains actual member data, not just template examples.`);
    }
    
    return members;
}

// Add these new helper methods:

isHeaderRow(values, headers) {
    // Check if this row looks like headers (contains common header-like values)
    const headerIndicators = ['firstname', 'lastname', 'email', 'phone', 'address', 'dob', 'status', 'emergency', 'contact', 'notes', 'id', 'date'];
    
    return values.some(value => {
        const lowerValue = value.toLowerCase().trim();
        return headerIndicators.some(indicator => lowerValue.includes(indicator));
    });
}

isValidMember(member) {
    // Basic validation for required fields
    if (!member.firstName || !member.lastName) {
        return false;
    }
    
    // Check if this looks like actual data (not example/placeholder)
    const invalidFirstNames = ['firstname', 'first_name', 'firstName', 'example', 'test', 'demo'];
    const invalidLastNames = ['lastname', 'last_name', 'lastName', 'example', 'test', 'demo'];
    const invalidEmails = ['email', 'example.com', 'test.com'];
    
    const firstName = member.firstName.toLowerCase();
    const lastName = member.lastName.toLowerCase();
    const email = member.email ? member.email.toLowerCase() : '';
    
    // Skip if names look like placeholders
    if (invalidFirstNames.includes(firstName) || invalidLastNames.includes(lastName)) {
        return false;
    }
    
    // Skip if email looks like a placeholder
    if (email && invalidEmails.some(invalid => email.includes(invalid))) {
        return false;
    }
    
    return true;
}

mapCSVRowToMember(headers, values) {
    const member = {
        status: 'active', // Default value
        joinDate: new Date().toISOString().split('T')[0] // Default to today
    };
    
    headers.forEach((header, index) => {
        if (values[index] !== undefined) {
            let value = values[index].trim().replace(/"/g, '');
            
            if (!value || value === 'null' || value === '""') {
                return; // Skip empty values
            }
            
            // Map CSV headers to member fields
            switch(header) {
                // Name fields
                case 'firstname':
                case 'first_name':
                case 'firstName':
                case '"first_name"':
                    member.firstName = this.cleanName(value);
                    break;
                    
                case 'lastname':
                case 'last_name':
                case 'lastName':
                case '"last_name"':
                    member.lastName = this.cleanName(value);
                    break;
                    
                // Contact fields
                case 'email':
                case '"email"':
                    member.email = value.toLowerCase();
                    break;
                    
                case 'phone':
                case '"phone"':
                    member.phone = this.cleanPhone(value);
                    break;
                    
                case 'address':
                case '"address"':
                    member.address = value;
                    break;
                    
                // Date fields
                case 'dob':
                case 'date_of_birth':
                case '"date_of_birth"':
                    member.dob = this.formatDate(value);
                    break;
                    
                case 'joindate':
                case 'member_since':
                case 'join_date':
                case '"member_since"':
                    member.joinDate = this.formatDate(value);
                    break;
                    
                case 'created_date':
                case 'createdat':
                case '"created_date"':
                    // Use as join date if no other join date provided
                    if (!member.joinDate) {
                        member.joinDate = this.formatDate(value);
                    }
                    break;
                    
                // Status fields
                case 'status':
                case 'membership_status':
                case '"membership_status"':
                    member.status = this.mapStatus(value.toLowerCase());
                    break;
                    
                // Emergency contact
                case 'emergencycontactname':
                case 'emergency_contact_name':
                case '"emergency_contact_name"':
                    member.emergencyContactName = value;
                    break;
                    
                case 'emergencycontactphone':
                case 'emergency_contact_phone':
                case '"emergency_contact_phone"':
                    member.emergencyContactPhone = this.cleanPhone(value);
                    break;
                    
                // Notes
                case 'notes':
                case '"notes"':
                    member.notes = value;
                    break;
                    
                // Ignored fields (MongoDB will generate these)
                case 'id':
                case '_id':
                case 'created_by_id':
                case 'created_by':
                case 'is_sample':
                case 'updated_date':
                case '__v':
                    break;
            }
        }
    });

    return member;
}

// Helper methods
cleanName(name) {
    return name.replace(/"/g, '').trim();
}

cleanPhone(phone) {
    // Remove any non-digit characters except + for international numbers
    return phone.replace(/[^\d+]/g, '').trim();
}

mapStatus(status) {
    const statusMap = {
        'active': 'active',
        'inactive': 'inactive', 
        'visitor': 'visitor',
        'regular': 'active',
        'member': 'active',
        'former': 'inactive',
        '"active"': 'active',
        '"inactive"': 'inactive'
    };
    return statusMap[status] || 'active';
}

formatDate(dateString) {
    if (!dateString) return null;
    
    // Clean the date string
    dateString = dateString.replace(/"/g, '').trim();
    
    if (dateString === 'null' || dateString === '""' || !dateString) {
        return null;
    }

    try {
        // Handle ISO date strings (from your MongoDB data)
        if (dateString.includes('T') && dateString.includes('Z')) {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        }
        
        // Handle $date objects from MongoDB exports
        if (dateString.includes('$date')) {
            const match = dateString.match(/"\$date":"([^"]+)"/);
            if (match) {
                const date = new Date(match[1]);
                return date.toISOString().split('T')[0];
            }
        }
        
        // Handle YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }
        
        // Handle DD/MM/YYYY format (common in your data)
        if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                // Try DD/MM/YYYY
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const year = parseInt(parts[2]);
                
                if (day > 0 && day <= 31 && month >= 0 && month <= 11 && year > 1900) {
                    const date = new Date(year, month, day);
                    if (!isNaN(date.getTime())) {
                        return date.toISOString().split('T')[0];
                    }
                }
            }
        }
        
        // Try direct date parsing
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    } catch (error) {
        console.warn('Could not parse date:', dateString, error);
    }
    
    return null;
}

parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '"';
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if ((char === '"' || char === "'") && !inQuotes) {
            inQuotes = true;
            quoteChar = char;
        } else if (char === quoteChar && inQuotes) {
            // Check if this is an escaped quote or closing quote
            if (i + 1 < line.length && line[i + 1] === quoteChar) {
                // Escaped quote - add one quote and skip the next
                current += char;
                i++;
            } else {
                // Closing quote
                inQuotes = false;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current);
    return values;
}

async processMembersImport(members) {
    const total = members.length;
    let successful = 0;
    let errors = [];
    
    this.showProgress(0, `Importing ${total} members...`);

    for (let i = 0; i < members.length; i++) {
        const member = members[i];
        const progress = ((i + 1) / total) * 100;
        
        this.showProgress(progress, `Importing ${i + 1}/${total}: ${member.firstName} ${member.lastName}`);
        
        try {
            // Validate member data before sending
            const validationError = this.validateMember(member);
            if (validationError) {
                throw new Error(validationError);
            }
            
            const response = await API.post('/members', member);
            
            if (response && response.success) {
                successful++;
            } else {
                throw new Error(response?.error || 'Unknown server error');
            }
            
        } catch (error) {
            errors.push({
                member: `${member.firstName} ${member.lastName}`,
                error: error.message || 'Unknown error'
            });
            console.error(`Failed to import ${member.firstName} ${member.lastName}:`, error);
        }
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    this.showImportResults(successful, total, errors);
}

validateMember(member) {
    if (!member.firstName || member.firstName.trim().length === 0) {
        return 'First name is required';
    }
    if (!member.lastName || member.lastName.trim().length === 0) {
        return 'Last name is required';
    }
    if (member.email && !this.isValidEmail(member.email)) {
        return 'Invalid email format';
    }
    return null;
}

isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

showProgress(percent, message) {
    const progressElement = document.getElementById('import-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressElement && progressFill && progressText) {
        progressElement.style.display = 'block';
        progressFill.style.width = percent + '%';
        progressText.textContent = message;
    }
}

hideProgress() {
    const progressElement = document.getElementById('import-progress');
    if (progressElement) {
        progressElement.style.display = 'none';
    }
}

showImportResults(successful, total, errors) {
    const resultsElement = document.getElementById('import-results');
    
    if (!resultsElement) return;
    
    let html = `<div class="import-success">✅ Successfully imported ${successful} of ${total} members</div>`;
    
    if (errors.length > 0) {
        html += `<div class="import-error"><strong>Errors (${errors.length}):</strong><ul>`;
        errors.forEach(error => {
            html += `<li>${error.member}: ${error.error}</li>`;
        });
        html += '</ul></div>';
    }
    
    resultsElement.innerHTML = html;
    resultsElement.style.display = 'block';
    
    // Reload members list after successful imports
    if (successful > 0) {
        setTimeout(() => {
            this.loadMembersData();
        }, 2000);
    }
}

// Quick lookup function for Member ID
async quickLookup(memberId) {
    try {
        console.log(`🔍 Quick lookup for Member ID: ${memberId}`);
        
        const member = await API.get(`/members/search/${memberId}`);
        
        if (member.members && member.members.length > 0) {
            const foundMember = member.members[0];
            alert(`Member Found!\n\nID: ${foundMember.memberId}\nName: ${foundMember.firstName} ${foundMember.lastName}\nEmail: ${foundMember.email || 'N/A'}\nStatus: ${foundMember.status}\nTotal Contributions: $${foundMember.totalContributions?.toFixed(2) || '0.00'}`);
        } else {
            alert(`Member ID "${memberId}" not found.`);
        }
        
    } catch (error) {
        console.error('Error in quick lookup:', error);
        alert(`Error looking up Member ID "${memberId}": ${error.message}`);
    }
}

// Enhanced search functionality
async searchMembers(query) {
    try {
        if (!query || query.trim().length < 1) {
            // If empty query, reload all members
            await this.loadMembersData();
            return;
        }
        
        console.log(`🔍 Searching members for: "${query}"`);
        
        const searchResult = await API.get(`/members/search/${encodeURIComponent(query.trim())}`);
        
        if (searchResult.members) {
            this.renderMembersTable(searchResult.members);
            
            // Update search results info
            const searchInfo = document.getElementById('search-results-info');
            if (searchInfo) {
                searchInfo.textContent = `Found ${searchResult.count} member(s) matching "${query}"`;
                searchInfo.style.display = 'block';
            }
        }
        
    } catch (error) {
        console.error('Error searching members:', error);
        alert(`Search failed: ${error.message}`);
    }
}

// Digital Member ID Card Functions
async viewDigitalCard(memberId) {
    // Close action menu immediately to prevent multiple clicks
    document.querySelectorAll('.action-menu.show').forEach(menu => {
        menu.classList.remove('show');
    });
    
    try {
        console.log(`🆔 Opening digital card for member: ${memberId}`);
        
        // Open digital card in new window using public route
        const cardUrl = `${API_BASE_URL}/member-cards/public/${memberId}`;
        const cardWindow = window.open(cardUrl, '_blank', 'width=500,height=700,scrollbars=yes,resizable=yes');
        
        if (!cardWindow) {
            alert('Please allow popups to view the digital member card');
        }
        
    } catch (error) {
        console.error('Error opening digital card:', error);
        alert(`Failed to open digital card: ${error.message}`);
    }
}

async emailDigitalCard(memberId, buttonElement = null) {
    // Close action menu immediately to prevent multiple clicks
    document.querySelectorAll('.action-menu.show').forEach(menu => {
        menu.classList.remove('show');
    });
    
    try {
        console.log(`📧 Emailing digital card for member: ${memberId}`);
        
        // Show loading state
        let button = buttonElement;
        if (!button && window.event) {
            button = window.event.target.closest('button');
        }
        
        let originalHTML = '';
        if (button) {
            originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            button.disabled = true;
        }
        
        const result = await API.post(`/member-cards/${memberId}/email`);
        
        if (result.success) {
            alert(`✅ Digital member card sent successfully!\n\nMember ID: ${result.memberId}\nCard emailed to member's registered email address.`);
        } else {
            throw new Error(result.error || 'Failed to send email');
        }
        
        // Restore button state
        if (button) {
            button.innerHTML = '<i class="fas fa-envelope"></i>';
            button.disabled = false;
        }
        
    } catch (error) {
        console.error('Error emailing digital card:', error);
        alert(`❌ Failed to email digital card: ${error.message}`);
        
        // Restore button state on error
        let button = buttonElement;
        if (!button && window.event) {
            button = window.event.target.closest('button');
        }
        if (button) {
            button.innerHTML = '<i class="fas fa-envelope"></i>';
            button.disabled = false;
        }
    }
}

// Bulk email all digital cards
async emailAllDigitalCards() {
    // Show options dialog
    const choice = await this.showBulkEmailDialog();
    if (!choice) return;
    
    try {
        console.log(`📧 Starting bulk email in ${choice.mode} mode...`);
        
        // Show progress
        const progressDiv = document.createElement('div');
        progressDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); 
                        z-index: 10000; text-align: center;">
                <div style="font-size: 18px; margin-bottom: 15px;">📧 Sending Digital Member Cards</div>
                <div style="color: #666; margin-bottom: 10px;">${choice.mode === 'TEST' ? '🧪 TEST MODE: Only sending to debesay304@gmail.com' : '📧 PRODUCTION: Sending to all members'}</div>
                <div style="color: #666;">Please wait while we email cards...</div>
                <div style="margin-top: 15px;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>
            </div>
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.5); z-index: 9999;"></div>
        `;
        document.body.appendChild(progressDiv);
        
        const result = await API.post('/member-cards/bulk/email', choice.payload);
        
        document.body.removeChild(progressDiv);
        
        if (result.success) {
            alert(`✅ Bulk email completed!\n\nMode: ${result.mode}\n${result.stats.successful} cards sent successfully\n${result.stats.failed} failed\n\nTotal members processed: ${result.stats.total}`);
        } else {
            throw new Error(result.error || 'Bulk email failed');
        }
        
    } catch (error) {
        console.error('Error in bulk email:', error);
        alert(`❌ Bulk email failed: ${error.message}`);
        
        // Remove progress div if still there
        const progressDiv = document.querySelector('[style*="z-index: 10000"]');
        if (progressDiv && progressDiv.parentElement) {
            progressDiv.parentElement.removeChild(progressDiv);
        }
    }
}

// Show bulk email options dialog
showBulkEmailDialog() {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); 
                        z-index: 10000; max-width: 500px;">
                <h3 style="margin-top: 0; color: #1e3c72;">📧 Send Digital Member Cards</h3>
                <p style="color: #666; margin-bottom: 20px;">Choose how you want to send the digital member ID cards:</p>
                
                <div style="margin-bottom: 20px;">
                    <button id="test-mode-btn" style="width: 100%; padding: 15px; margin-bottom: 10px; 
                                                     background: #28a745; color: white; border: none; border-radius: 5px; 
                                                     font-size: 14px; cursor: pointer;">
                        🧪 TEST MODE - Send only to debesay304@gmail.com
                    </button>
                    <button id="production-mode-btn" style="width: 100%; padding: 15px; margin-bottom: 10px; 
                                                           background: #dc3545; color: white; border: none; border-radius: 5px; 
                                                           font-size: 14px; cursor: pointer;">
                        📧 PRODUCTION MODE - Send to ALL members
                    </button>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <strong>⚠️ Recommendation:</strong> Use TEST MODE first to verify the cards look correct before sending to all members.
                </div>
                
                <button id="cancel-btn" style="width: 100%; padding: 10px; background: #6c757d; color: white; 
                                               border: none; border-radius: 5px; cursor: pointer;">
                    Cancel
                </button>
            </div>
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.5); z-index: 9999;"></div>
        `;
        
        document.body.appendChild(dialog);
        
        // Event listeners
        document.getElementById('test-mode-btn').onclick = () => {
            document.body.removeChild(dialog);
            resolve({
                mode: 'TEST',
                payload: { testMode: true }
            });
        };
        
        document.getElementById('production-mode-btn').onclick = () => {
            if (confirm('⚠️ Are you sure you want to send digital member cards to ALL active members?\n\nThis will send emails to everyone with an email address. This action cannot be undone.')) {
                document.body.removeChild(dialog);
                resolve({
                    mode: 'PRODUCTION',
                    payload: { confirmBulkEmail: true }
                });
            }
        };
        
        document.getElementById('cancel-btn').onclick = () => {
            document.body.removeChild(dialog);
            resolve(null);
        };
        
        // Close on background click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog.lastElementChild) {
                document.body.removeChild(dialog);
                resolve(null);
            }
        });
    });
}

// Add search event listeners
setupSearchListeners() {
    const searchInput = document.getElementById('member-search-input');
    const searchButton = document.getElementById('member-search-btn');
    const clearSearchButton = document.getElementById('clear-search-btn');
    
    if (searchInput) {
        // Search on Enter key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchMembers(searchInput.value);
            }
        });
        
        // Real-time search (debounced)
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (e.target.value.length >= 2 || e.target.value.length === 0) {
                    this.searchMembers(e.target.value);
                }
            }, 300);
        });
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            this.searchMembers(searchInput?.value || '');
        });
    }
    
    if (clearSearchButton) {
        clearSearchButton.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            this.loadMembersData(); // Reload all members
            
            const searchInfo = document.getElementById('search-results-info');
            if (searchInfo) searchInfo.style.display = 'none';
        });
    }
}

showError(message) {
    const resultsElement = document.getElementById('import-results');
    if (resultsElement) {
        resultsElement.innerHTML = `<div class="import-error">❌ ${message}</div>`;
        resultsElement.style.display = 'block';
    }
    this.showProgress(100, 'Import completed with errors');
}

downloadTemplate() {
    const template = `firstName,lastName,email,phone,address,dob,status,emergencyContactName,emergencyContactPhone,notes
John,Doe,john.doe@example.com,555-0101,123 Main St,1985-05-15,active,Jane Doe,555-0102,Regular attendee
Jane,Smith,jane.smith@example.com,555-0202,456 Oak Ave,1990-08-22,active,John Smith,555-0203,Serves in children ministry`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'members-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Quick lookup function for Member ID
async quickLookup(memberId) {
    try {
        console.log(`🔍 Quick lookup for Member ID: ${memberId}`);
        
        const member = await API.get(`/members/search/${memberId}`);
        
        if (member.members && member.members.length > 0) {
            const foundMember = member.members[0];
            alert(`Member Found!\n\nID: ${foundMember.memberId}\nName: ${foundMember.firstName} ${foundMember.lastName}\nEmail: ${foundMember.email || 'N/A'}\nStatus: ${foundMember.status}\nTotal Contributions: ${foundMember.totalContributions?.toFixed(2) || '0.00'}`);
        } else {
            alert(`Member ID "${memberId}" not found.`);
        }
        
    } catch (error) {
        console.error('Error in quick lookup:', error);
        alert(`Error looking up Member ID "${memberId}": ${error.message}`);
    }
}

// Enhanced search functionality
async searchMembers(query) {
    try {
        if (!query || query.trim().length < 1) {
            // If empty query, reload all members
            await this.loadMembersData();
            return;
        }
        
        console.log(`🔍 Searching members for: "${query}"`);
        
        const searchResult = await API.get(`/members/search/${encodeURIComponent(query.trim())}`);
        
        if (searchResult.members) {
            this.renderMembersTable(searchResult.members);
            
            // Update search results info
            const searchInfo = document.getElementById('search-results-info');
            if (searchInfo) {
                searchInfo.textContent = `Found ${searchResult.count} member(s) matching "${query}"`;
                searchInfo.style.display = 'block';
            }
        }
        
    } catch (error) {
        console.error('Error searching members:', error);
        alert(`Search failed: ${error.message}`);
    }
}

// Digital Member ID Card Functions
async viewDigitalCard(memberId) {
    // Close action menu immediately to prevent multiple clicks
    document.querySelectorAll('.action-menu.show').forEach(menu => {
        menu.classList.remove('show');
    });
    
    try {
        console.log(`🆔 Opening digital card for member: ${memberId}`);
        
        // Open digital card in new window using public route
        const cardUrl = `${API_BASE_URL}/member-cards/public/${memberId}`;
        const cardWindow = window.open(cardUrl, '_blank', 'width=500,height=700,scrollbars=yes,resizable=yes');
        
        if (!cardWindow) {
            alert('Please allow popups to view the digital member card');
        }
        
    } catch (error) {
        console.error('Error opening digital card:', error);
        alert(`Failed to open digital card: ${error.message}`);
    }
}

async emailDigitalCard(memberId, buttonElement = null) {
    // Close action menu immediately to prevent multiple clicks
    document.querySelectorAll('.action-menu.show').forEach(menu => {
        menu.classList.remove('show');
    });
    
    try {
        console.log(`📧 Emailing digital card for member: ${memberId}`);
        
        // Show loading state
        if (buttonElement) {
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }
        
        const response = await API.post(`/member-cards/${memberId}/email`);
        
        if (response.success) {
            alert(`Digital member card emailed successfully to ${response.email}`);
        } else {
            alert(`Failed to email digital card: ${response.message || 'Unknown error'}`);
        }
        
    } catch (error) {
        console.error('Error emailing digital card:', error);
        alert(`Failed to email digital card: ${error.message}`);
    } finally {
        // Reset button state
        if (buttonElement) {
            buttonElement.disabled = false;
            buttonElement.innerHTML = '<i class="fas fa-envelope"></i> Email Card';
        }
    }
}

// Bulk email all digital cards
async bulkEmailDigitalCards() {
    try {
        console.log('📧 Starting bulk email of digital cards...');
        
        // Show confirmation dialog
        const confirmed = confirm(`This will email digital member cards to all active members with email addresses. Continue?`);
        if (!confirmed) return;
        
        // Show progress
        const progressDiv = document.createElement('div');
        progressDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000;">
                <div style="text-align: center;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <div>Sending digital cards...</div>
                    <div id="bulk-progress" style="margin-top: 10px; font-size: 14px; color: #666;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(progressDiv);
        
        const response = await API.post('/member-cards/bulk/email');
        
        document.body.removeChild(progressDiv);
        
        if (response.success) {
            alert(`Bulk email completed!\n\nSent: ${response.sent}\nFailed: ${response.failed}\nTotal: ${response.total}`);
        } else {
            alert(`Bulk email failed: ${response.message || 'Unknown error'}`);
        }
        
    } catch (error) {
        console.error('Error in bulk email:', error);
        alert(`Bulk email failed: ${error.message}`);
        
        // Remove progress dialog if it exists
        const progressDiv = document.querySelector('[style*="position: fixed"]');
        if (progressDiv) {
            document.body.removeChild(progressDiv);
        }
    }
}

// Add search event listeners - moved inside class
setupSearchListeners() {
    console.log('🔍 Setting up search listeners...');
    
    const searchInput = document.getElementById('member-search');
    const quickLookupBtns = document.querySelectorAll('.quick-lookup-btn');
    
    if (searchInput) {
        // Real-time search as user types
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                this.searchMembers(query);
            } else if (query.length === 0) {
                // Clear search and show all members
                this.loadMembersData();
                const searchInfo = document.getElementById('search-results-info');
                if (searchInfo) {
                    searchInfo.style.display = 'none';
                }
            }
        });
        
        // Handle Enter key for search
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                if (query) {
                    this.searchMembers(query);
                }
            }
        });
        
        console.log('✅ Search input listeners attached');
    }
    
    // Quick lookup buttons
    quickLookupBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const memberId = e.target.dataset.memberId || e.target.closest('.quick-lookup-btn').dataset.memberId;
            if (memberId) {
                this.quickLookup(memberId);
            }
        });
    });
}

showError(message) {
    const errorDiv = document.getElementById('import-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    this.showProgress(100, 'Import completed with errors');
}

downloadTemplate() {
    const csvContent = 'First Name,Last Name,Email,Phone,Address,City,State,Postal Code,Status,Date of Birth,Membership Date,Notes\n' +
                      'John,Doe,john.doe@email.com,555-0123,"123 Main St","Anytown","ST","12345","active","1990-01-15","2023-01-01","Sample member"\n' +
                      'Jane,Smith,jane.smith@email.com,555-0124,"456 Oak Ave","Somewhere","ST","12346","active","1985-05-20","2023-02-15","Another sample"';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'member_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Modal control methods
openImportModal() {
    const modal = document.getElementById('csv-import-modal');
    if (modal) {
        modal.style.display = 'block';
        this.resetImport(); // Reset form when opening
    }
}

closeImportModal() {
    const modal = document.getElementById('csv-import-modal');
    if (modal) {
        modal.style.display = 'none';
        this.resetImport(); // Reset form when closing
    }
}

    // ======================
    // 🔍 PENDING MEMBERS FUNCTIONALITY
    // ======================

    async loadPendingMembers() {
        try {
            console.log('📋 Loading pending members...');
            
            // Check if user is authenticated using authSystem
            if (!window.authSystem || !window.authSystem.isLoggedIn()) {
                console.log('ℹ️ User not authenticated - skipping pending members load');
                this.pendingMembers = [];
                return;
            }
            
            const authToken = window.authSystem.getToken();
            
            const data = await handleDevModeApiCall(
                fetch(`${API_BASE_URL}/members/pending`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }),
                { members: [] } // Mock empty pending members
            );
            
            this.pendingMembers = data.members || [];
            console.log(`✅ Loaded ${this.pendingMembers.length} pending members`);
            this.renderPendingMembersTable();
            
        } catch (error) {
            console.error('❌ Error loading pending members:', error);
            this.pendingMembers = [];
            this.renderPendingMembersTable();
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        if (tabName === 'pending') {
            document.getElementById('pending-members-content').classList.add('active');
            
            // Check if user is authenticated before loading pending members
            if (window.authSystem && window.authSystem.isLoggedIn()) {
                this.loadPendingMembers(); // Refresh pending members when tab is opened
            } else {
                // Show authentication required message
                this.pendingMembers = [];
                this.renderPendingMembersTable();
            }
        } else {
            document.getElementById('all-members-content').classList.add('active');
            if (tabName === 'active') {
                this.currentStatusFilter = 'active';
            } else {
                this.currentStatusFilter = '';
            }
            this.applyFilters();
        }
    }

    updateTabCounts() {
        // Update member counts
        const allCount = this.allMembers.filter(m => m.status !== 'pending').length; // Exclude pending from "All Members"
        const activeCount = this.allMembers.filter(m => m.status === 'active').length;
        const pendingCount = this.pendingMembers ? this.pendingMembers.length : 0;

        document.getElementById('all-count').textContent = allCount;
        document.getElementById('active-count').textContent = activeCount;
        document.getElementById('pending-count').textContent = pendingCount;
    }

    renderPendingMembersTable() {
        const tableBody = document.querySelector('#pending-members-table tbody');
        if (!tableBody) return;

        // Check if user has access to pending members
        if (!window.authSystem || !window.authSystem.isLoggedIn()) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center" style="padding: 2rem; color: #666;">
                        <i class="fas fa-lock" style="font-size: 2rem; margin-bottom: 1rem; color: #ffc107;"></i>
                        <div><strong>Authentication Required</strong></div>
                        <div>Please log in to view pending member registrations.</div>
                    </td>
                </tr>
            `;
            return;
        }

        if (!this.pendingMembers || this.pendingMembers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center" style="padding: 2rem; color: #666;">
                        <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 1rem; color: #28a745;"></i>
                        <div>No pending members! All registrations have been processed.</div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.pendingMembers.map(member => {
            const daysWaiting = member.daysSinceRegistration || 0;
            const urgencyClass = daysWaiting > 7 ? 'urgent' : daysWaiting > 3 ? 'warning' : '';
            
            return `
                <tr>
                    <td>
                        <input type="checkbox" class="pending-member-checkbox" value="${member._id}">
                    </td>
                    <td>${member.displayId}</td>
                    <td>
                        <strong>${member.firstName} ${member.lastName || ''}</strong>
                        <div style="font-size: 0.8rem; color: #666;">
                            Registered: ${new Date(member.createdAt).toLocaleDateString()}
                        </div>
                    </td>
                    <td>
                        ${member.email ? `<div><i class="fas fa-envelope"></i> ${member.email}</div>` : ''}
                        ${member.phone ? `<div><i class="fas fa-phone"></i> ${member.phone}</div>` : ''}
                    </td>
                    <td>
                        <span class="days-waiting ${urgencyClass}">${daysWaiting} days</span>
                    </td>
                    <td>
                        <span class="pending-status ${member.verificationStatus}">
                            ${member.verificationStatus}
                        </span>
                    </td>
                    <td>
                        <div class="verification-actions-cell">
                            <button class="btn btn-success btn-sm" onclick="membersPage.approveMember('${member._id}')" title="Approve">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-warning btn-sm" onclick="membersPage.contactMember('${member._id}')" title="Mark as Contacted">
                                <i class="fas fa-phone"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="membersPage.rejectMember('${member._id}')" title="Reject">
                                <i class="fas fa-times"></i>
                            </button>
                            <button class="btn btn-info btn-sm" onclick="membersPage.viewPendingMember('${member._id}')" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async approveMember(memberId) {
        if (!confirm('Are you sure you want to approve this member? They will become an active member of the church.')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/members/${memberId}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.authSystem.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    notes: 'Approved via admin interface'
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Member approved:', result.member.displayId);
                
                // Refresh data
                await this.loadPendingMembers();
                await this.loadMembersData();
                this.updateTabCounts();
                
                alert('Member approved successfully!');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to approve member');
            }
        } catch (error) {
            console.error('❌ Error approving member:', error);
            alert(`Error approving member: ${error.message}`);
        }
    }

    async rejectMember(memberId) {
        const reason = prompt('Please provide a reason for rejection (optional):');
        if (reason === null) return; // User cancelled

        try {
            const response = await fetch(`${API_BASE_URL}/members/${memberId}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.authSystem.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reason: reason || 'No reason provided'
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('🚫 Member rejected:', result.member.displayId);
                
                // Refresh data
                await this.loadPendingMembers();
                this.updateTabCounts();
                
                alert('Member rejected');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to reject member');
            }
        } catch (error) {
            console.error('❌ Error rejecting member:', error);
            alert(`Error rejecting member: ${error.message}`);
        }
    }

    async contactMember(memberId) {
        try {
            const response = await fetch(`${API_BASE_URL}/members/${memberId}/verification`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${window.authSystem.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    verificationStatus: 'contacted',
                    verificationNotes: 'Member contacted by church staff'
                })
            });

            if (response.ok) {
                console.log('📞 Member marked as contacted');
                await this.loadPendingMembers();
                alert('Member marked as contacted');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update contact status');
            }
        } catch (error) {
            console.error('❌ Error updating contact status:', error);
            alert(`Error updating contact status: ${error.message}`);
        }
    }

    updateBulkActionButtons() {
        const selectedCheckboxes = document.querySelectorAll('.pending-member-checkbox:checked');
        const bulkApproveBtn = document.getElementById('bulk-approve-btn');
        const bulkRejectBtn = document.getElementById('bulk-reject-btn');
        
        if (bulkApproveBtn && bulkRejectBtn) {
            const hasSelected = selectedCheckboxes.length > 0;
            bulkApproveBtn.disabled = !hasSelected;
            bulkRejectBtn.disabled = !hasSelected;
        }
    }

}

// Initialize when called by the DashboardApp
window.loadMembers = function () {
    console.log('🚀 Loading Members page...');
    window.membersPage = new MembersPage();
};

})();
