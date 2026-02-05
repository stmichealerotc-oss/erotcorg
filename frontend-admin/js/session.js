// Session Management for Church Management System
class SessionManager {
    constructor() {
        this.timeoutDuration = 30 * 60 * 1000; // 30 minutes
        this.warningTime = 5 * 60 * 1000; // 5 minutes warning
        this.timeoutTimer = null;
        this.warningTimer = null;
        this.init();
    }

    init() {
        if (authSystem.isLoggedIn()) {
            this.startSessionTimer();
            this.setupActivityListeners();
        }
    }

    startSessionTimer() {
        this.resetSessionTimer();
        
        this.warningTimer = setTimeout(() => {
            this.showTimeoutWarning();
        }, this.timeoutDuration - this.warningTime);

        this.timeoutTimer = setTimeout(() => {
            this.logoutDueToInactivity();
        }, this.timeoutDuration);
    }

    resetSessionTimer() {
        if (this.warningTimer) clearTimeout(this.warningTimer);
        if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
    }

    setupActivityListeners() {
        // Reset timer on user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, () => {
                this.resetSessionTimer();
                this.startSessionTimer();
            });
        });
    }

    showTimeoutWarning() {
        const warningModal = document.createElement('div');
        warningModal.className = 'session-timeout-warning';
        warningModal.innerHTML = `
            <div class="warning-content">
                <h3><i class="fas fa-exclamation-triangle"></i> Session Timeout Warning</h3>
                <p>Your session will expire in 5 minutes due to inactivity.</p>
                <p>Would you like to continue your session?</p>
                <div class="session-timeout-actions">
                    <button class="btn btn-primary" id="continue-session">Continue Session</button>
                    <button class="btn btn-secondary" id="logout-now">Logout Now</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(warningModal);
        
        document.getElementById('continue-session').addEventListener('click', () => {
            this.resetSessionTimer();
            this.startSessionTimer();
            warningModal.remove();
        });
        
        document.getElementById('logout-now').addEventListener('click', () => {
            authSystem.logout();
        });
    }

    logoutDueToInactivity() {
        // Create a more prominent logout notification
        const logoutModal = document.createElement('div');
        logoutModal.className = 'session-timeout-warning';
        logoutModal.innerHTML = `
            <div class="warning-content">
                <h3><i class="fas fa-clock"></i> Session Expired</h3>
                <p>Your session has expired due to inactivity.</p>
                <p>You will be redirected to the login page.</p>
                <div class="session-timeout-actions">
                    <button class="btn btn-primary" id="redirect-login">OK</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(logoutModal);
        
        document.getElementById('redirect-login').addEventListener('click', () => {
            authSystem.logout();
        });
        
        // Auto-redirect after 5 seconds
        setTimeout(() => {
            authSystem.logout();
        }, 5000);
    }

    extendSession() {
        this.resetSessionTimer();
        this.startSessionTimer();
    }
}

// Initialize session manager
const sessionManager = new SessionManager();

// Make available globally
window.sessionManager = sessionManager;