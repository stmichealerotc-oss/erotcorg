// Authentication System for Church Management
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.sessionCheckInterval = null;
        this.inactivityTimer = null;
        this.lastActivityTime = Date.now();
        this.sessionTimeout = 3600000; // 1 hour in milliseconds
        this.sessionTimeoutPaused = false; // Flag to pause session timeout during email verification
        this.init();
    }

    async init() {
        console.log('🔐 AuthSystem initializing...');
        console.log('🔐 Development mode:', Config.isDevelopment());
        console.log('🔐 Dev bypass flag:', localStorage.getItem('devAuthBypass'));
        
        // Check if user is logged in on page load
        await this.checkAuthStatus();
        
        console.log('🔐 Auth status checked. Logged in:', this.isLoggedIn());
        console.log('🔐 Current user:', this.currentUser);
        console.log('🔐 Current path:', window.location.pathname);
        
        if (window.location.pathname.includes('login.html') || window.location.pathname.endsWith('/login.html')) {
            console.log('🔐 On login page - setting up login form');
            // Skip redirect logic - handled by auth-redirect.js
            this.setupLoginForm();
        } else if (window.location.pathname.includes('forgot-password.html') || window.location.pathname.endsWith('/forgot-password.html')) {
            console.log('🔐 On forgot password page - skipping auth check');
            // Skip redirect for forgot password page
        } else if (window.location.pathname.includes('reset-password.html') || window.location.pathname.endsWith('/reset-password.html')) {
            console.log('🔐 On reset password page - skipping auth check');
            // Skip redirect for reset password page
        } else if (window.location.pathname.includes('test.html') || window.location.pathname.includes('debug.html')) {
            console.log('🔐 On test/debug page - skipping redirect');
            // Skip redirect for test pages
        } else {
            console.log('🔐 On main application - setting up UI');
            // We're on the main application and auth-redirect.js has already handled redirects
            if (this.isLoggedIn()) {
                console.log('🔐 Logged in, setting up UI');
                
                // Check if email verification is required BEFORE setting up UI
                if (this.currentUser && this.currentUser.requiresEmailVerification && !this.currentUser.emailVerified) {
                    console.log('🔐 Email verification required, showing modal');
                    this.showEmailVerificationModal();
                    return; // Don't proceed with normal setup
                }
                
                this.setupLogout();
                this.updateUIForUser();
                this.startSessionMonitoring();
                this.setupActivityTracking();
                
                // Trigger app initialization after auth is complete
                console.log('🔐 Triggering app initialization...');
                this.triggerAppInit();
            }
        }
    }

    triggerAppInit() {
        // Dispatch a custom event to signal that auth is ready
        const event = new CustomEvent('authReady', { 
            detail: { 
                isLoggedIn: this.isLoggedIn(),
                user: this.currentUser 
            } 
        });
        window.dispatchEvent(event);
    }

    async checkAuthStatus() {
        console.log('🔐 Checking auth status...');
        
        // Development bypass - check if we're in development mode
        if (Config.isDevelopment()) {
            console.log('🔐 Development mode detected - checking for bypass');
            const devBypass = localStorage.getItem('devAuthBypass');
            if (devBypass === 'true') {
                console.log('🔐 Development auth bypass enabled');
                this.currentUser = {
                    id: 'dev-admin',
                    name: 'Development Admin',
                    email: 'admin@stmichael.church',
                    username: 'admin',
                    role: 'super-admin',
                    permissions: ['all'],
                    isActive: true,
                    emailVerified: true,
                    requiresEmailVerification: false
                };
                this.token = 'dev-token-' + Date.now();
                console.log('🔐 Development user set:', this.currentUser.name);
                return true;
            }
        }
        
        // Try to get token from storage
        this.token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        
        console.log('🔐 Token found:', !!this.token);
        
        if (this.token) {
            try {
                console.log('🔐 Verifying token with server...');
                // Verify token with server
                const response = await fetch(`${Config.getApiBaseUrl()}/auth/verify`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    credentials: 'include' // Important for CORS
                });

                console.log('🔐 Server response status:', response.status);

                if (response.ok) {
                    const data = await response.json();
                    this.currentUser = data.user;
                    console.log('🔐 Token verified, user:', this.currentUser.name);
                    return true;
                } else {
                    console.log('🔐 Token invalid, clearing auth');
                    // Token is invalid, clear it
                    this.clearAuth();
                    return false;
                }
            } catch (error) {
                console.error('🔐 Auth verification error:', error);
                this.clearAuth();
                return false;
            }
        }
        
        console.log('🔐 No token found');
        return false;
    }

    setupLoginForm() {
        const loginForm = document.getElementById('login-form');
        const errorMessage = document.getElementById('error-message');
        const successMessage = document.getElementById('success-message');
        const firstLoginNotice = document.getElementById('first-login-notice');

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const rememberMe = document.getElementById('remember-me').checked;

                // Hide messages
                errorMessage.style.display = 'none';
                successMessage.style.display = 'none';
                firstLoginNotice.style.display = 'none';

                // Show loading state
                const loginBtn = loginForm.querySelector('.login-btn');
                loginBtn.classList.add('loading');
                loginBtn.disabled = true;

                try {
                    const result = await this.login(username, password, rememberMe);
                    
                    if (result.success) {
                        this.showLoginSuccess();
                        
                        // Check if email verification is required
                        if (result.requiresEmailVerification) {
                            // Store login state but show verification modal
                            setTimeout(() => {
                                this.showEmailVerificationModal();
                            }, 1000);
                        } else if (result.requiresPasswordChange) {
                            // Show first login notice if needed
                            firstLoginNotice.style.display = 'block';
                            setTimeout(() => {
                                window.location.href = 'index.html';
                            }, 2000);
                        } else {
                            setTimeout(() => {
                                window.location.href = 'index.html';
                            }, 1000);
                        }
                    } else {
                        this.showLoginError(result.error || 'Invalid username or password');
                        this.shakeLoginForm();
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    this.showLoginError('Login failed. Please try again.');
                    this.shakeLoginForm();
                } finally {
                    loginBtn.classList.remove('loading');
                    loginBtn.disabled = false;
                }
            });
        }
    }

    async login(username, password, rememberMe = false) {
        try {
            console.log('🔐 Attempting login for:', username);
            
            // Development bypass
            if (Config.isDevelopment() && username === 'admin' && password === 'dev123') {
                console.log('🔐 Development bypass login successful');
                
                this.currentUser = {
                    id: 'dev-admin',
                    name: 'Development Admin',
                    email: 'admin@stmichael.church',
                    username: 'admin',
                    role: 'super-admin',
                    permissions: ['all'],
                    isActive: true,
                    emailVerified: true,
                    requiresEmailVerification: false
                };
                this.token = 'dev-token-' + Date.now();
                
                // Store bypass flag
                localStorage.setItem('devAuthBypass', 'true');
                
                return {
                    success: true,
                    user: this.currentUser,
                    requiresEmailVerification: false,
                    requiresPasswordChange: false
                };
            }
            
            const apiUrl = Config.getApiBaseUrl();
            console.log('🔐 Using API URL:', apiUrl);
            
            const response = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include', // Important for CORS and cookies
                body: JSON.stringify({ username, password })
            });

            console.log('🔐 Login response status:', response.status);
            
            const data = await response.json();
            console.log('🔐 Login response data:', data);

            if (response.ok && data.success) {
                this.currentUser = data.user;
                this.token = data.token;

                console.log('🔐 Login successful, storing token...');
                
                // Store token and user data with error handling
                try {
                    const storage = rememberMe ? localStorage : sessionStorage;
                    storage.setItem('authToken', this.token);
                    storage.setItem('currentUser', JSON.stringify(this.currentUser));
                    
                    if (rememberMe) {
                        localStorage.setItem('rememberMe', 'true');
                    }
                    
                    console.log('🔐 Token stored successfully');
                } catch (storageError) {
                    console.error('🔐 Storage error:', storageError);
                    // Still return success as login was successful
                }

                return {
                    success: true,
                    requiresPasswordChange: data.requiresPasswordChange || false,
                    requiresEmailVerification: data.requiresEmailVerification || false,
                    user: data.user
                };
            } else {
                console.error("🔐 Login failed:", data.error);
                return {
                    success: false,
                    error: data.error || 'Login failed',
                    code: data.code
                };
            }
        } catch (err) {
            console.error("🔐 Login error:", err);
            return {
                success: false,
                error: 'Network error. Please try again.',
                code: 'NETWORK_ERROR'
            };
        }
    }

    async logout() {
        try {
            // Call logout endpoint if we have a token
            if (this.token) {
                await fetch(`${Config.getApiBaseUrl()}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            // Resume session timeout if it was paused (cleanup)
            if (this.sessionTimeoutPaused) {
                this.sessionTimeoutPaused = false;
            }
            
            // Clear session monitoring
            this.clearSessionMonitoring();
            
            // Clear local data regardless of API call success
            this.clearAuth();
            window.location.href = 'login.html';
        }
    }

    clearAuth() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('devAuthBypass'); // Clear development bypass flag
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');
    }

    isLoggedIn() {
        return this.currentUser !== null && this.token !== null;
    }

    getToken() {
        return this.token;
    }

    getUserRole() {
        return this.currentUser ? this.currentUser.role : null;
    }

    hasPermission(permission) {
        if (!this.currentUser) return false;
        return this.currentUser.permissions.includes('all') || 
               this.currentUser.permissions.includes(permission);
    }

    // Check if user has any of the specified roles
    hasRole(...roles) {
        if (!this.currentUser) return false;
        return roles.includes(this.currentUser.role);
    }

    // Check if user is visitor (read-only)
    isVisitor() {
        return this.currentUser && this.currentUser.role === 'visitor';
    }

    // Check if user has write access (not a visitor)
    hasWriteAccess() {
        return this.currentUser && this.currentUser.role !== 'visitor';
    }

    setupLogout() {
        // Add logout functionality to all pages
        const userInfo = document.querySelector('.user-info');
        if (userInfo && this.currentUser) {
            const logoutBtn = document.createElement('div');
            logoutBtn.className = 'logout-container';
            logoutBtn.innerHTML = `
                <div class="user-dropdown">
                    <button class="user-menu-btn" aria-label="User menu">
                        <i class="fas fa-user-circle"></i>
                        <span>${this.currentUser.name}</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="user-dropdown-menu">
                        <div class="user-info-display">
                            <strong>${this.currentUser.name}</strong>
                            <small>${this.currentUser.role.replace('-', ' ')}</small>
                        </div>
                        <button class="logout-btn">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            `;
            
            userInfo.appendChild(logoutBtn);
            
            // Add logout event listener
            const logoutButton = logoutBtn.querySelector('.logout-btn');
            const userMenuBtn = logoutBtn.querySelector('.user-menu-btn');
            const dropdownMenu = logoutBtn.querySelector('.user-dropdown-menu');
            const userDropdown = logoutBtn.querySelector('.user-dropdown');
            
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdownMenu.classList.contains('show');
                
                // Close all other dropdowns first
                document.querySelectorAll('.user-dropdown-menu.show').forEach(menu => {
                    menu.classList.remove('show');
                });
                document.querySelectorAll('.user-dropdown.show').forEach(dropdown => {
                    dropdown.classList.remove('show');
                });
                
                // Toggle current dropdown
                if (!isOpen) {
                    dropdownMenu.classList.add('show');
                    userDropdown.classList.add('show');
                }
            });
            
            logoutButton.addEventListener('click', () => {
                this.logout();
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!logoutBtn.contains(e.target)) {
                    dropdownMenu.classList.remove('show');
                    userDropdown.classList.remove('show');
                }
            });
            
            // Close dropdown on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    dropdownMenu.classList.remove('show');
                    userDropdown.classList.remove('show');
                }
            });
            
            // Improve mobile touch experience
            if ('ontouchstart' in window) {
                userMenuBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    userMenuBtn.click();
                });
            }
        }
    }

    updateUIForUser() {
        // Hide/show elements based on user permissions
        const role = this.getUserRole();
        console.log('🔐 Updating UI for user role:', role);
        
        // Wait for DOM to be ready
        const updateNavigation = () => {
            // Hide navigation items based on role restrictions
            const navItems = {
                'members': ['super-admin', 'admin', 'chairperson', 'secretary', 'community-coordinator', 'member', 'visitor'],
                'accounting': ['super-admin', 'admin', 'accountant', 'visitor'],
                'inventory': ['super-admin', 'admin', 'accountant', 'holder-of-goods', 'visitor'],
                'reports': ['super-admin', 'admin', 'chairperson', 'secretary', 'accountant', 'visitor'],
                'taskmanagement': ['super-admin', 'admin', 'chairperson', 'secretary', 'community-coordinator', 'member', 'visitor'],
                'user-management': ['super-admin'] // Only super-admin can access user management
            };

            Object.entries(navItems).forEach(([page, allowedRoles]) => {
                const navLink = document.querySelector(`a[href="#${page}"]`);
                if (navLink) {
                    if (!allowedRoles.includes(role)) {
                        console.log(`🔐 Hiding navigation item: ${page} (role: ${role} not in ${allowedRoles})`);
                        navLink.parentElement.style.display = 'none';
                    } else {
                        console.log(`🔐 Showing navigation item: ${page} (role: ${role} allowed)`);
                        navLink.parentElement.style.display = 'block';
                    }
                } else {
                    console.log(`🔐 Navigation item not found: ${page}`);
                }
            });
        };

        // If DOM is ready, update immediately, otherwise wait
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', updateNavigation);
        } else {
            updateNavigation();
        }
    }

    // Method to make authenticated API requests
    async makeAuthenticatedRequest(url, options = {}) {
        if (!this.token) {
            throw new Error('No authentication token available');
        }

        // Skip actual API requests in development mode with bypass
        if (Config.isDevelopment() && localStorage.getItem('devAuthBypass') === 'true') {
            console.log('🔐 Skipping authenticated request in development mode:', url);
            // Return a mock successful response
            return {
                ok: true,
                status: 200,
                json: async () => ({ success: true, message: 'Development bypass' })
            };
        }

        const authOptions = {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        };

        try {
            const response = await fetch(url, authOptions);
            
            // Handle token expiration
            if (response.status === 401) {
                try {
                    const data = await response.json();
                    if (data.code === 'TOKEN_EXPIRED' || data.code === 'INVALID_TOKEN') {
                        this.clearAuth();
                        window.location.href = 'login.html';
                        return response; // Return the response even though body is consumed
                    }
                } catch (jsonError) {
                    // If we can't parse JSON, still handle the 401
                    console.warn('Could not parse 401 response JSON:', jsonError);
                    this.clearAuth();
                    window.location.href = 'login.html';
                    return response;
                }
            }

            return response;
        } catch (error) {
            console.error('Authenticated request error:', error);
            throw error;
        }
    }

    showLoginSuccess() {
        const loginBtn = document.querySelector('.login-btn');
        const successMessage = document.getElementById('success-message');
        const successText = document.getElementById('success-text');
        
        if (successMessage && successText) {
            successText.textContent = 'Login successful! Redirecting...';
            successMessage.style.display = 'block';
        }
        
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-check"></i> Login Successful!';
            loginBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            loginBtn.disabled = true;
        }
    }

    showLoginError(message) {
        const errorMessage = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');
        
        if (errorMessage && errorText) {
            errorText.textContent = message;
            errorMessage.style.display = 'block';
        }
    }

    shakeLoginForm() {
        const loginCard = document.querySelector('.login-card');
        if (loginCard) {
            loginCard.classList.add('shake');
            setTimeout(() => {
                loginCard.classList.remove('shake');
            }, 600);
        }
    }

    // Session monitoring and auto-logout functionality
    startSessionMonitoring() {
        console.log('🔐 Starting session monitoring...');
        
        // Skip session monitoring entirely in development mode with bypass
        if (Config.isDevelopment() && localStorage.getItem('devAuthBypass') === 'true') {
            console.log('🔐 Skipping session monitoring in development mode');
            return;
        }
        
        // Check session every 5 minutes
        this.sessionCheckInterval = setInterval(async () => {
            await this.checkSessionStatus();
        }, 5 * 60 * 1000); // 5 minutes
        
        // Don't do initial session check immediately - wait 1 minute after login
        // This prevents the "Session Expired" modal from appearing right after login
        setTimeout(() => {
            this.checkSessionStatus();
        }, 60 * 1000); // Wait 1 minute before first check
    }

    async checkSessionStatus() {
        // Skip session check in development mode with bypass
        if (Config.isDevelopment() && localStorage.getItem('devAuthBypass') === 'true') {
            console.log('🔐 Skipping session check in development mode');
            return;
        }
        
        try {
            const response = await this.makeAuthenticatedRequest(`${Config.getApiBaseUrl()}/auth/check-session`, {
                method: 'POST'
            });

            if (!response.ok) {
                // Don't try to read response.json() here since makeAuthenticatedRequest
                // may have already consumed the response body for 401 errors
                console.log('🔐 Session check failed, status:', response.status);
                if (response.status === 401) {
                    console.log('🔐 Session expired, logging out...');
                    this.handleSessionExpiry();
                }
            }
        } catch (error) {
            console.error('🔐 Session check error:', error);
        }
    }

    setupActivityTracking() {
        console.log('🔐 Setting up activity tracking...');
        
        // Skip activity tracking in development mode with bypass
        if (Config.isDevelopment() && localStorage.getItem('devAuthBypass') === 'true') {
            console.log('🔐 Skipping activity tracking in development mode');
            return;
        }
        
        // Track user activity
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        const updateActivity = () => {
            this.lastActivityTime = Date.now();
            this.resetInactivityTimer();
        };

        activityEvents.forEach(event => {
            document.addEventListener(event, updateActivity, true);
        });

        // Start inactivity timer (unless paused for email verification)
        if (!this.sessionTimeoutPaused) {
            this.resetInactivityTimer();
        }
    }

    pauseSessionTimeout() {
        console.log('🔐 Pausing session timeout for email verification...');
        this.sessionTimeoutPaused = true;
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
    }

    resumeSessionTimeout() {
        console.log('🔐 Resuming session timeout after email verification...');
        this.sessionTimeoutPaused = false;
        this.resetInactivityTimer();
        this.startSessionMonitoring();
    }

    resetInactivityTimer() {
        // Don't set timer if session timeout is paused
        if (this.sessionTimeoutPaused) {
            return;
        }

        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }

        // Set timer for 1 hour of inactivity
        this.inactivityTimer = setTimeout(() => {
            this.handleInactivityTimeout();
        }, this.sessionTimeout);
    }

    handleInactivityTimeout() {
        console.log('🔐 User inactive for 1 hour, logging out...');
        this.showInactivityWarning();
    }

    handleSessionExpiry() {
        this.clearSessionMonitoring();
        this.showSessionExpiredModal();
    }

    clearSessionMonitoring() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
    }

    showInactivityWarning() {
        const modal = this.createModal('Inactivity Warning', `
            <div class="modal-content">
                <div class="warning-icon">⚠️</div>
                <h3>Session Timeout</h3>
                <p>You have been inactive for 1 hour. For security reasons, you will be logged out automatically.</p>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="authSystem.extendSession()">Stay Logged In</button>
                    <button class="btn btn-secondary" onclick="authSystem.logout()">Logout Now</button>
                </div>
            </div>
        `);
        
        // Auto logout after 2 minutes if no action
        setTimeout(() => {
            if (document.body.contains(modal)) {
                this.logout();
            }
        }, 2 * 60 * 1000);
    }

    showSessionExpiredModal() {
        this.createModal('Session Expired', `
            <div class="modal-content">
                <div class="error-icon">🔒</div>
                <h3>Session Expired</h3>
                <p>Your session has expired for security reasons. Please log in again to continue.</p>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="authSystem.logout()">Login Again</button>
                </div>
            </div>
        `);
    }

    async extendSession() {
        try {
            const response = await this.makeAuthenticatedRequest(`${Config.getApiBaseUrl()}/auth/refresh`, {
                method: 'POST'
            });

            if (!response) {
                // Request was handled by makeAuthenticatedRequest (e.g., redirect to login)
                return;
            }

            if (response.ok) {
                let data = {};
                try {
                    data = await response.json();
                } catch (jsonError) {
                    console.warn('Could not parse refresh response JSON:', jsonError);
                    return;
                }
                
                this.token = data.token;
                
                // Update stored token
                const storage = localStorage.getItem('rememberMe') ? localStorage : sessionStorage;
                storage.setItem('authToken', this.token);
                
                // Reset activity tracking
                this.lastActivityTime = Date.now();
                this.resetInactivityTimer();
                
                // Close any open modals
                this.closeModals();
                
                console.log('🔐 Session extended successfully');
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('🔐 Session extension error:', error);
            this.logout();
        }
    }

    // Email verification functionality
    showEmailVerificationModal() {
        // Pause session timeout during email verification
        this.pauseSessionTimeout();
        
        const modal = this.createModal('Email Verification Required', `
            <div class="modal-content">
                <div class="info-icon">✉️</div>
                <h3>Verify Your Email</h3>
                <p>For security reasons, you must verify your email address before accessing the system.</p>
                <p><strong>Email:</strong> ${this.currentUser.email}</p>
                <p class="verification-notice">A 6-digit verification code has been sent to your email address.</p>
                <p class="timeout-notice" style="color: #666; font-size: 0.9rem; font-style: italic;">
                    ⏸️ Session timeout is paused while you verify your email.
                </p>
                <p class="expiry-notice" style="color: #e53e3e; font-size: 0.85rem; font-weight: 600; margin-top: 10px;">
                    ⏰ Verification code expires in 15 minutes
                </p>
                
                <div class="verification-form">
                    <div class="form-group">
                        <label for="verification-code">Enter 6-digit verification code:</label>
                        <input type="text" id="verification-code" maxlength="6" placeholder="000000" class="verification-input" autocomplete="off">
                        <div class="verification-error" id="verification-error"></div>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn btn-primary" onclick="authSystem.verifyEmail()">Verify Email</button>
                        <button class="btn btn-secondary" onclick="authSystem.sendVerificationCode()">Resend Code</button>
                    </div>
                    
                    <div class="verification-status" id="verification-status"></div>
                    
                    <div class="logout-option">
                        <p style="margin: 10px 0 5px 0; font-size: 0.9rem; color: #666;">
                            Can't verify right now?
                        </p>
                        <button class="btn btn-link" onclick="authSystem.logout()">Logout and Try Later</button>
                    </div>
                </div>
            </div>
        `, true); // Allow closing now
        
        // Auto-focus the verification input
        setTimeout(() => {
            const input = document.getElementById('verification-code');
            if (input) {
                input.focus();
                // Allow Enter key to submit
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.verifyEmail();
                    }
                });
            }
        }, 100);
        
        // Add close button handler
        const closeBtn = modal.querySelector('.auth-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to close? You will need to verify your email to access the system.')) {
                    this.closeModals();
                    this.logout();
                }
            });
        }
    }

    async sendVerificationCode() {
        try {
            const statusDiv = document.getElementById('verification-status');
            const errorDiv = document.getElementById('verification-error');
            
            // Clear previous messages
            if (errorDiv) errorDiv.textContent = '';
            if (statusDiv) statusDiv.innerHTML = '<div class="loading">📤 Sending verification code...</div>';

            const response = await this.makeAuthenticatedRequest(`${Config.getApiBaseUrl()}/auth/send-verification-code`, {
                method: 'POST'
            });

            if (!response) {
                // Request was handled by makeAuthenticatedRequest (e.g., redirect to login)
                return;
            }

            let data = {};
            try {
                data = await response.json();
            } catch (jsonError) {
                console.warn('Could not parse response JSON:', jsonError);
                data = { error: 'Invalid response format' };
            }

            if (response.ok && data.success) {
                if (statusDiv) {
                    statusDiv.innerHTML = '<div class="success">✅ Verification code sent! Check your email (expires in 15 minutes)</div>';
                }
                // Clear the input for new code
                const input = document.getElementById('verification-code');
                if (input) {
                    input.value = '';
                    input.focus();
                }
            } else {
                if (statusDiv) {
                    statusDiv.innerHTML = `<div class="error">❌ ${data.error || 'Failed to send verification code'}</div>`;
                }
            }
        } catch (error) {
            console.error('🔐 Send verification code error:', error);
            const statusDiv = document.getElementById('verification-status');
            if (statusDiv) {
                statusDiv.innerHTML = '<div class="error">❌ Network error. Please check your connection and try again.</div>';
            }
        }
    }

    async verifyEmail() {
        try {
            const codeInput = document.getElementById('verification-code');
            const errorDiv = document.getElementById('verification-error');
            const statusDiv = document.getElementById('verification-status');
            
            const verificationCode = codeInput.value.trim();
            
            // Validate input
            if (!verificationCode) {
                errorDiv.textContent = 'Please enter the verification code';
                codeInput.focus();
                return;
            }
            
            if (verificationCode.length !== 6) {
                errorDiv.textContent = 'Verification code must be 6 digits';
                codeInput.focus();
                return;
            }
            
            if (!/^\d{6}$/.test(verificationCode)) {
                errorDiv.textContent = 'Verification code must contain only numbers';
                codeInput.focus();
                return;
            }

            // Clear previous messages
            errorDiv.textContent = '';
            statusDiv.innerHTML = '<div class="loading">🔄 Verifying email...</div>';
            
            // Disable button during verification
            const verifyBtn = document.querySelector('.btn-primary');
            if (verifyBtn) {
                verifyBtn.disabled = true;
                verifyBtn.textContent = 'Verifying...';
            }

            const response = await this.makeAuthenticatedRequest(`${Config.getApiBaseUrl()}/auth/verify-email`, {
                method: 'POST',
                body: JSON.stringify({ verificationCode })
            });

            if (!response) {
                // Request was handled by makeAuthenticatedRequest (e.g., redirect to login)
                if (verifyBtn) {
                    verifyBtn.disabled = false;
                    verifyBtn.textContent = 'Verify Email';
                }
                return;
            }

            let data = {};
            try {
                data = await response.json();
            } catch (jsonError) {
                console.warn('Could not parse response JSON:', jsonError);
                data = { error: 'Invalid response format' };
            }

            if (response.ok && data.success) {
                statusDiv.innerHTML = '<div class="success">✅ Email verified successfully! Redirecting to dashboard...</div>';
                
                // Resume session timeout now that email is verified
                this.resumeSessionTimeout();
                
                // Update current user
                this.currentUser.emailVerified = true;
                this.currentUser.requiresEmailVerification = false;
                
                // Update stored user data
                const storage = localStorage.getItem('rememberMe') ? localStorage : sessionStorage;
                storage.setItem('currentUser', JSON.stringify(this.currentUser));
                
                // Close modal and redirect to dashboard after success
                setTimeout(() => {
                    this.closeModals();
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                // Handle specific error cases
                const errorMessage = data.error || 'Invalid verification code';
                
                if (errorMessage.includes('expired')) {
                    errorDiv.textContent = '⏰ Verification code has expired. Please request a new code.';
                    statusDiv.innerHTML = '<div class="error">❌ Code expired. Click "Resend Code" to get a new one.</div>';
                } else if (errorMessage.includes('Invalid')) {
                    errorDiv.textContent = '❌ Invalid verification code. Please check and try again.';
                    statusDiv.innerHTML = '';
                } else {
                    errorDiv.textContent = errorMessage;
                    statusDiv.innerHTML = '';
                }
                
                // Re-enable button
                if (verifyBtn) {
                    verifyBtn.disabled = false;
                    verifyBtn.textContent = 'Verify Email';
                }
                
                // Clear input for retry
                codeInput.value = '';
                codeInput.focus();
            }
        } catch (error) {
            console.error('🔐 Email verification error:', error);
            const errorDiv = document.getElementById('verification-error');
            const statusDiv = document.getElementById('verification-status');
            
            if (errorDiv) {
                errorDiv.textContent = 'Network error. Please check your connection and try again.';
            }
            if (statusDiv) {
                statusDiv.innerHTML = '';
            }
            
            // Re-enable button
            const verifyBtn = document.querySelector('.btn-primary');
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.textContent = 'Verify Email';
            }
        }
    }

    // Modal utility functions
    createModal(title, content, allowClose = true) {
        // Remove existing modals
        this.closeModals();

        const modal = document.createElement('div');
        modal.className = 'auth-modal-overlay';
        modal.innerHTML = `
            <div class="auth-modal">
                <div class="auth-modal-header">
                    <h2>${title}</h2>
                    ${allowClose ? '<button class="auth-modal-close" onclick="authSystem.closeModals()">&times;</button>' : ''}
                </div>
                <div class="auth-modal-body">
                    ${content}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        
        // Add modal styles if not already present
        if (!document.getElementById('auth-modal-styles')) {
            const styles = document.createElement('style');
            styles.id = 'auth-modal-styles';
            styles.textContent = `
                .auth-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 99999;
                    backdrop-filter: blur(5px);
                    overflow-y: auto;
                    padding: 20px;
                }
                
                .auth-modal {
                    background: white;
                    border-radius: 12px;
                    max-width: 500px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    animation: modalSlideIn 0.3s ease-out;
                    margin: auto;
                    position: relative;
                }
                
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-50px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                .auth-modal-header {
                    padding: 20px 25px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    border-radius: 12px 12px 0 0;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                
                .auth-modal-header h2 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 600;
                }
                
                .auth-modal-close {
                    background: none;
                    border: none;
                    font-size: 28px;
                    color: white;
                    cursor: pointer;
                    padding: 0;
                    width: 35px;
                    height: 35px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.2s;
                    line-height: 1;
                }
                
                .auth-modal-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: scale(1.1);
                }
                
                .auth-modal-close:active {
                    transform: scale(0.95);
                }
                
                .auth-modal-body {
                    padding: 25px;
                }
                
                .modal-content {
                    text-align: center;
                }
                
                .warning-icon, .error-icon, .info-icon {
                    font-size: 48px;
                    margin-bottom: 15px;
                    display: block;
                }
                
                .modal-content h3 {
                    margin: 0 0 15px 0;
                    color: #2d3748;
                    font-size: 24px;
                }
                
                .modal-content p {
                    color: #4a5568;
                    line-height: 1.6;
                    margin-bottom: 15px;
                }
                
                .modal-actions {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    margin-top: 25px;
                    flex-wrap: wrap;
                }
                
                .verification-form {
                    text-align: left;
                    margin-top: 20px;
                }
                
                .form-group {
                    margin-bottom: 20px;
                }
                
                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #2d3748;
                }
                
                .verification-input {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 18px;
                    text-align: center;
                    letter-spacing: 4px;
                    font-family: 'Courier New', monospace;
                    transition: all 0.2s;
                }
                
                .verification-input:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }
                
                .verification-error {
                    color: #e53e3e;
                    font-size: 14px;
                    margin-top: 8px;
                    font-weight: 500;
                    min-height: 20px;
                }
                
                .verification-status {
                    margin-top: 15px;
                    text-align: center;
                    min-height: 30px;
                }
                
                .verification-status .loading {
                    color: #667eea;
                    font-style: italic;
                    font-weight: 500;
                }
                
                .verification-status .success {
                    color: #38a169;
                    font-weight: 600;
                }
                
                .verification-status .error {
                    color: #e53e3e;
                    font-weight: 600;
                }
                
                .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-decoration: none;
                    display: inline-block;
                    font-size: 14px;
                }
                
                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .btn-primary {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                }
                
                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }
                
                .btn-primary:active:not(:disabled) {
                    transform: translateY(0);
                }
                
                .btn-secondary {
                    background: #e2e8f0;
                    color: #4a5568;
                }
                
                .btn-secondary:hover:not(:disabled) {
                    background: #cbd5e0;
                }
                
                .btn-link {
                    background: none;
                    color: #667eea;
                    text-decoration: underline;
                    border: none;
                    padding: 5px 10px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .btn-link:hover {
                    color: #5a67d8;
                }
                
                .logout-option {
                    margin-top: 25px;
                    text-align: center;
                    padding-top: 20px;
                    border-top: 1px solid #e2e8f0;
                }
                
                .verification-notice {
                    background: #e6fffa;
                    color: #234e52;
                    padding: 12px;
                    border-radius: 6px;
                    font-size: 14px;
                    margin: 15px 0;
                    border-left: 4px solid #38b2ac;
                }
                
                .expiry-notice {
                    background: #fff5f5;
                    color: #c53030;
                    padding: 10px;
                    border-radius: 6px;
                    font-size: 13px;
                    margin: 10px 0;
                    border-left: 4px solid #fc8181;
                }
                
                /* Mobile responsiveness */
                @media (max-width: 600px) {
                    .auth-modal {
                        max-width: 95%;
                        margin: 10px;
                    }
                    
                    .auth-modal-header {
                        padding: 15px 20px;
                    }
                    
                    .auth-modal-header h2 {
                        font-size: 18px;
                    }
                    
                    .auth-modal-body {
                        padding: 20px;
                    }
                    
                    .modal-actions {
                        flex-direction: column;
                    }
                    
                    .btn {
                        width: 100%;
                    }
                }
            `;
            document.head.appendChild(styles);
        }

        return modal;
    }

    closeModals() {
        const modals = document.querySelectorAll('.auth-modal-overlay');
        modals.forEach(modal => modal.remove());
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

// Initialize authentication system
const auth = new AuthSystem();

// Make auth available globally
window.authSystem = auth;