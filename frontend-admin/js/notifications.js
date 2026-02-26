// Notifications Page Module
console.log('📢 Notifications module loaded');

// Page loader function
function loadNotifications() {
    console.log('📢 Loading notifications page...');
    // The HTML is already loaded by app.js, now initialize the page
    initializeNotificationsPage();
}

function initializeNotificationsPage() {
    console.log('📢 Initializing notifications page...');
    
    const API_BASE_URL = window.Config ? window.Config.getApiBaseUrl() : 'https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api';
    console.log('🌐 API URL:', API_BASE_URL);
    
    // Character counters
    function updateCharCounter(inputId, counterId, maxLength) {
        const input = document.getElementById(inputId);
        const counter = document.getElementById(counterId);
        
        if (!input || !counter) {
            console.warn(`⚠️ Element not found: ${inputId} or ${counterId}`);
            return;
        }
        
        input.addEventListener('input', () => {
            const length = input.value.length;
            counter.textContent = `${length} / ${maxLength}`;
            
            if (length > maxLength * 0.9) {
                counter.classList.add('warning');
            } else {
                counter.classList.remove('warning');
            }
            
            if (length >= maxLength) {
                counter.classList.add('error');
            } else {
                counter.classList.remove('error');
            }
        });
    }
    
    updateCharCounter('title', 'titleCounter', 50);
    updateCharCounter('message', 'messageCounter', 200);
    
    // Store members globally for search
    let allMembers = [];
    
    // Load members for checkbox list
    async function loadMembers() {
        try {
            const token = window.authSystem?.getToken() || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/members`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            allMembers = data.list || data.members || [];
            
            const container = document.getElementById('memberCheckboxList');
            if (!container) {
                console.error('❌ Member checkbox container not found');
                return;
            }
            
            if (allMembers.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #999;">No members found</p>';
                return;
            }
            
            // Create checkbox list
            container.innerHTML = allMembers.map(member => {
                const displayName = `${member.firstName} ${member.lastName}`;
                const displayEmail = member.email ? ` (${member.email})` : '';
                return `
                    <div class="member-checkbox-item" data-member-id="${member._id}" data-search-text="${displayName.toLowerCase()} ${member.email ? member.email.toLowerCase() : ''}">
                        <input type="checkbox" id="member_${member._id}" value="${member._id}">
                        <label for="member_${member._id}">${displayName}${displayEmail}</label>
                    </div>
                `;
            }).join('');
            
            // Add change listener to update count
            container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', updateSelectedCount);
            });
            
            updateSelectedCount();
            console.log(`✅ Loaded ${allMembers.length} members`);
        } catch (error) {
            console.error('Failed to load members:', error);
            const container = document.getElementById('memberCheckboxList');
            if (container) {
                container.innerHTML = '<p style="text-align: center; color: #ef4444;">Failed to load members</p>';
            }
        }
    }
    
    // Update selected count
    function updateSelectedCount() {
        const container = document.getElementById('memberCheckboxList');
        const countDisplay = document.getElementById('selectedCount');
        if (!container || !countDisplay) return;
        
        const checkedBoxes = container.querySelectorAll('input[type="checkbox"]:checked');
        const count = checkedBoxes.length;
        countDisplay.textContent = `${count} selected`;
    }
    
    // Search members
    function setupMemberSearch() {
        const searchInput = document.getElementById('memberSearch');
        const container = document.getElementById('memberCheckboxList');
        
        if (!searchInput || !container) return;
        
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            const items = container.querySelectorAll('.member-checkbox-item');
            
            items.forEach(item => {
                const searchText = item.getAttribute('data-search-text');
                if (searchText.includes(searchTerm)) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        });
    }
    
    // Select all / Deselect all
    function setupSelectButtons() {
        const selectAllBtn = document.getElementById('selectAllBtn');
        const deselectAllBtn = document.getElementById('deselectAllBtn');
        const container = document.getElementById('memberCheckboxList');
        
        if (!selectAllBtn || !deselectAllBtn || !container) return;
        
        selectAllBtn.addEventListener('click', () => {
            const visibleCheckboxes = container.querySelectorAll('.member-checkbox-item:not(.hidden) input[type="checkbox"]');
            visibleCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
            updateSelectedCount();
        });
        
        deselectAllBtn.addEventListener('click', () => {
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            updateSelectedCount();
        });
    }

    // Toggle member selection
    const audienceSelect = document.getElementById('audience');
    if (audienceSelect) {
        audienceSelect.addEventListener('change', (e) => {
            const memberGroup = document.getElementById('memberSelectGroup');
            if (memberGroup) {
                memberGroup.style.display = e.target.value === 'specific' ? 'block' : 'none';
                if (e.target.value === 'specific') {
                    console.log('📋 Loading members for selection...');
                    loadMembers().then(() => {
                        setupMemberSearch();
                        setupSelectButtons();
                    });
                }
            }
        });
    }

    // Toggle schedule options
    const scheduleCheckbox = document.getElementById('scheduleForLater');
    if (scheduleCheckbox) {
        scheduleCheckbox.addEventListener('change', (e) => {
            const scheduleGroup = document.getElementById('scheduleGroup');
            if (scheduleGroup) {
                const isChecked = e.target.checked;
                scheduleGroup.style.display = isChecked ? 'block' : 'none';
                console.log(`⏰ Schedule for later: ${isChecked ? 'enabled' : 'disabled'}`);
                
                // Set minimum datetime to now
                if (isChecked) {
                    const scheduledTimeInput = document.getElementById('scheduledTime');
                    if (scheduledTimeInput) {
                        const now = new Date();
                        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                        scheduledTimeInput.min = now.toISOString().slice(0, 16);
                        console.log('⏰ Minimum datetime set to:', scheduledTimeInput.min);
                    }
                }
            }
        });
    }

    // Send notification
    const notificationForm = document.getElementById('notificationForm');
    if (notificationForm) {
        notificationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            console.log('📝 Form submitted - preparing notification...');
            
            const title = document.getElementById('title').value.trim();
            const message = document.getElementById('message').value.trim();
            const type = document.getElementById('type').value;
            const priority = document.getElementById('priority').value;
            const audience = document.getElementById('audience').value;
            const scheduleForLater = document.getElementById('scheduleForLater').checked;
            
            console.log('Form values:', { title, message, type, priority, audience });
            
            if (!title || !message) {
                console.warn('⚠️ Missing required fields');
                alert('Please fill in all required fields');
                return;
            }
            
            const payload = {
                title,
                body: message, // Backend expects 'body' not 'message'
                type,
                priority,
                data: { screen: 'home' }
            };

            // Determine recipients
            if (audience === 'specific') {
                const container = document.getElementById('memberCheckboxList');
                const checkedBoxes = container.querySelectorAll('input[type="checkbox"]:checked');
                const selectedIds = Array.from(checkedBoxes).map(checkbox => checkbox.value);
                
                console.log('Selected members:', selectedIds);
                
                if (selectedIds.length === 0) {
                    console.warn('⚠️ No members selected');
                    alert('Please select at least one member');
                    return;
                }
                
                // Backend expects 'recipients' as array of member IDs
                payload.recipients = selectedIds;
                console.log(`📤 Sending to ${selectedIds.length} specific member(s)`);
            } else if (audience === 'active') {
                payload.recipients = 'active'; // Backend handles 'active' string
                console.log('📤 Sending to all active members');
            } else {
                payload.recipients = 'all'; // Send to all members
                console.log('📤 Sending to all members');
            }

            // Schedule if needed
            if (scheduleForLater) {
                const scheduledTime = document.getElementById('scheduledTime').value;
                if (!scheduledTime) {
                    alert('Please select a date and time for scheduling');
                    return;
                }
                payload.scheduledTime = scheduledTime;
            }

            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = '📤 Sending...';

            console.log('📡 Sending notification to API...');
            console.log('Payload:', JSON.stringify(payload, null, 2));

            try {
                const token = window.authSystem?.getToken() || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                console.log('🔑 Using auth token:', token ? 'Token found' : 'No token!');
                
                const response = await fetch(`${API_BASE_URL}/notifications/send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
                
                console.log('📡 API response status:', response.status);

                const result = await response.json();
                
                console.log('📤 Notification send response:', result);
                
                if (response.ok) {
                    const sentCount = result.sentCount || result.successCount || result.sent || 0;
                    const failedCount = result.failureCount || result.failed || 0;
                    const emailsSent = result.emailsSent || 0;
                    const emailsFailed = result.emailsFailed || 0;
                    
                    console.log('✅ Notification sent successfully!');
                    console.log(`   - Push notifications sent: ${sentCount} members`);
                    console.log(`   - Push notifications failed: ${failedCount} members`);
                    console.log(`   - Emails sent: ${emailsSent} members`);
                    console.log(`   - Emails failed: ${emailsFailed} members`);
                    
                    // Show detailed confirmation dialog
                    let confirmMsg = `✅ Notification Sent Successfully!\n\n` +
                                    `📊 Delivery Summary:\n` +
                                    `   • Push notifications sent: ${sentCount} members\n`;
                    
                    if (failedCount > 0) {
                        confirmMsg += `   • Push notifications failed: ${failedCount} members\n`;
                    }
                    
                    confirmMsg += `   • Emails sent: ${emailsSent} members\n`;
                    
                    if (emailsFailed > 0) {
                        confirmMsg += `   • Emails failed: ${emailsFailed} members\n`;
                    }
                    
                    confirmMsg += `\n📱 Members will receive the notification on their phones and via email.`;
                    
                    alert(confirmMsg);
                    
                    // Reset form
                    document.getElementById('notificationForm').reset();
                    document.getElementById('titleCounter').textContent = '0 / 50';
                    document.getElementById('messageCounter').textContent = '0 / 200';
                    const memberSelectGroup = document.getElementById('memberSelectGroup');
                    if (memberSelectGroup) {
                        memberSelectGroup.style.display = 'none';
                    }
                    
                    // Reload recent notifications
                    loadRecentNotifications();
                } else {
                    console.error('❌ Failed to send notification:', result);
                    alert(`❌ Failed to send notification\n\nError: ${result.message || result.error || 'Unknown error'}`);
                }
            } catch (error) {
                console.error('❌ Network error sending notification:', error);
                alert(`❌ Failed to send notification\n\nNetwork Error: ${error.message}\n\nPlease check your connection and try again.`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '📤 Send Notification';
                console.log('🔄 Form ready for next submission');
            }
        });
    }

    // Load recent notifications
    async function loadRecentNotifications() {
        try {
            const token = window.authSystem?.getToken() || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/notifications/history?limit=10`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load notifications: ${response.status}`);
            }
            
            const data = await response.json();
            const notifications = data.notifications || data; // Handle both response formats
            
            const container = document.getElementById('recentNotifications');
            if (!container) {
                console.error('❌ Recent notifications container not found');
                return;
            }
            
            if (!notifications || notifications.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #999;">No notifications sent yet.</p>';
                return;
            }
            
            container.innerHTML = notifications.map(notif => {
                const date = new Date(notif.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const priorityBadge = notif.priority === 'high' 
                    ? '<span class="badge badge-high">HIGH</span>' 
                    : '<span class="badge badge-normal">NORMAL</span>';
                
                const typeBadge = notif.type === 'urgent' 
                    ? '<span class="badge badge-urgent">URGENT</span>' 
                    : '';
                
                return `
                    <div class="notification-item">
                        <strong>${notif.title} ${priorityBadge} ${typeBadge}</strong>
                        <p>${notif.body || notif.message}</p>
                        <small>
                            ${notif.type} • ${date} • 
                            Sent to: ${notif.sentCount || notif.successCount || notif.totalRecipients || 'N/A'} members
                        </small>
                    </div>
                `;
            }).join('');
            
            console.log(`✅ Loaded ${notifications.length} recent notifications`);
        } catch (error) {
            console.error('Failed to load notifications:', error);
            const container = document.getElementById('recentNotifications');
            if (container) {
                container.innerHTML = '<p style="text-align: center; color: #ef4444;">Failed to load recent notifications. Please check console for details.</p>';
            }
        }
    }

    // Initialize - load recent notifications
    console.log('📋 Loading recent notifications...');
    loadRecentNotifications();
    console.log('✅ Notifications page fully initialized');
}

// Make function globally available
window.loadNotifications = loadNotifications;

console.log('📢 Notifications module ready');

