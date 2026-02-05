class DashboardApp {
   // In your DashboardApp constructor or init method
constructor() {
    this.currentPage = 'dashboard';
    this.currentPageData = {};
    this.init();
}

init() {
    this.setCurrentDate();
    this.setupNavigation();
    this.setupHashChangeListener();
}

// Add hash change listener
setupHashChangeListener() {
    window.addEventListener('hashchange', () => {
        this.handleHashChange();
    });
    
    // Also handle initial hash
    this.handleHashChange();
}

handleHashChange() {
    const hash = window.location.hash.substring(1); // Remove the #
    if (!hash) return;
    
    console.log('🔗 Hash changed:', hash);
    
    // Parse hash (e.g., "memberProfile?memberId=123")
    const [page, query] = hash.split('?');
    const params = new URLSearchParams(query);
    const memberId = params.get('memberId');
    
    if (page && this.isValidPage(page)) {
        const pageData = memberId ? { memberId } : {};
        this.loadPage(page, pageData);
    }
}

isValidPage(page) {
    const validPages = ['dashboard', 'members', 'memberProfile', 'accounting', 'inventory', 'reports', 'taskmanagement', 'userManagement'];
    return validPages.includes(page);
}

    setCurrentDate() {
        // Update current date
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const todayDateEl = document.getElementById('today-date');
        const currentDateEl = document.getElementById('current-date');
        
        if (todayDateEl) {
            todayDateEl.textContent = now.toLocaleDateString('en-US', options);
        }
        if (currentDateEl) {
            currentDateEl.textContent = now.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
        }
    }

    setupNavigation() {
        // Navigation is now handled by MainApp - skip this to prevent conflicts
        if (window.mainApp) {
            return;
        }
        
        // Fallback: only set up navigation if MainApp is not available
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('href').substring(1);
                this.loadPage(page);
                
                // Update active state
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

   async loadPage(page, data = {}) {
    console.log('🎯 loadPage called with:', page);
    
    // ✅ CONSISTENT FILE MAPPING
    const pageFileMap = {
        'dashboard': 'dashboard',
        'members': 'members',
        'memberProfile': 'member-profile',
        'accounting': 'accounting',
        'inventory': 'inventory', 
        'reports': 'generatereport',  // Use the restored generatereport files
        'taskmanagement': 'taskmanagement',
        'userManagement': 'user-management',
        'financailreo2018-2025' : 'financailreo2018-2025'
    };

    // Get the actual file name from mapping
    const fileName = pageFileMap[page] || page;
    console.log('📁 File mapping:', `${page} → ${fileName}`);
    
    // Store page data for access by the page scripts
    this.currentPageData = data;
    
    try {
        console.log('📄 Loading HTML:', `pages/${fileName}.html`);
        // Load HTML using the mapped file name
        const response = await fetch(`pages/${fileName}.html`);
        if (!response.ok) {
            throw new Error(`Failed to load: pages/${fileName}.html`);
        }
        const html = await response.text();
        console.log('📄 HTML loaded, length:', html.length);
        
        const contentArea = document.getElementById('content-area');
        if (contentArea) {
            contentArea.innerHTML = html;
            console.log('📄 HTML inserted into content area');
        } else {
            console.error('❌ Content area not found!');
        }

        console.log('📜 Loading script:', `js/${fileName}.js`);
        // Dynamically load JS using the same file name
        await this.loadScript(`js/${fileName}.js`);

        // Call page-specific init if available
        const functionName = `load${this.capitalize(page.replace(/-/g, ''))}`;
        const loaderFunction = window[functionName];
        if (typeof loaderFunction === 'function') {
            console.log('🚀 Calling loader function:', functionName);
            loaderFunction();
        } else {
            console.log('ℹ️ No loader function found for:', page, '(looking for:', functionName + ')');
        }
        
        console.log('✅ Page loaded successfully:', page);
        
    } catch (error) {
        console.error('❌ Error loading page:', error);
        this.showError(`Failed to load page: ${page}`);
    }
}


    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

async loadScript(src, forceReload = false) {
    const baseSrc = src.split('?')[0]; // ignore query strings for matching

    // If script is already loaded and reload is not forced, skip
    if (this.loadedScripts?.has(baseSrc) && !forceReload) {
        console.log(`⚡ Script already loaded: ${baseSrc}`);
        return;
    }

    // Ensure cache exists
    if (!this.loadedScripts) {
        this.loadedScripts = new Set();
    }

    // Remove any existing <script> with the same base src
    const existingScripts = Array.from(document.scripts).filter(script =>
        script.src.includes(baseSrc)
    );
    existingScripts.forEach(script => {
        script.remove();
        this.loadedScripts.delete(baseSrc);
    });

    // Load the new script
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => {
            this.loadedScripts.add(baseSrc);
            console.log(`✅ Successfully loaded: ${src}`);
            resolve();
        };
        script.onerror = () => {
            console.error(`❌ Failed to load: ${src}`);
            reject(new Error(`Failed to load script: ${src}`));
        };
        document.head.appendChild(script);
    });
}

showError(message) {
    const contentArea = document.getElementById('content-area');
    if (contentArea) {
        contentArea.innerHTML = `
            <div class="error-container">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error Loading Page</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="window.location.reload()">
                    <i class="fas fa-refresh"></i> Reload Page
                </button>
            </div>
        `;
    }
}

}

// API utility functions
class API {
    // Determine the correct API base URL based on environment
    static get baseUrl() {
        // Use the Config class if available
        if (window.Config) {
            return window.Config.getApiBaseUrl();
        }
        
        // Fallback logic if Config is not loaded
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:5000/api';
        }
        
        // Default fallback
        return window.API_BASE_URL || "/api";
    }

    static async request(method, url, data) {
        try {
            // Get auth token from the auth system
            const token = window.authSystem?.getToken();
            
            const headers = {
                "Content-Type": "application/json"
            };
            
            // Add authorization header if token exists
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.baseUrl}${url}`, {
                method,
                headers,
                credentials: "include",
                body: method !== "GET" ? JSON.stringify(data) : undefined
            });

            // Handle authentication errors - but skip in development mode with bypass
            if (response.status === 401) {
                // Check if we're in development mode with bypass
                if (window.Config && window.Config.isDevelopment() && localStorage.getItem('devAuthBypass') === 'true') {
                    console.log('🔓 API: Ignoring 401 in development mode for:', url);
                    // Return a mock successful response for development
                    return {
                        success: true,
                        message: 'Development bypass - API call mocked',
                        data: {}
                    };
                }
                
                const errorData = await response.json();
                if (errorData.code === 'TOKEN_EXPIRED' || errorData.code === 'INVALID_TOKEN') {
                    // Token is invalid, redirect to login
                    if (window.authSystem) {
                        window.authSystem.clearAuth();
                        window.location.href = 'login.html';
                    }
                    return;
                }
            }

            // Handle 500 errors in development mode with mock data
            if (response.status === 500 && window.Config && window.Config.isDevelopment() && localStorage.getItem('devAuthBypass') === 'true') {
                console.log('🔓 API: Mocking 500 error response in development mode for:', url);
                
                // Return appropriate mock data based on the endpoint
                if (url.includes('/accounting')) {
                    return {
                        success: true,
                        data: {
                            transactions: [],
                            totalIncome: 0,
                            totalExpenses: 0,
                            balance: 0
                        }
                    };
                } else if (url.includes('/members')) {
                    return {
                        success: true,
                        data: {
                            members: [],
                            totalMembers: 0,
                            activeMembers: 0
                        }
                    };
                } else if (url.includes('/inventory')) {
                    return {
                        success: true,
                        data: {
                            items: [],
                            totalItems: 0,
                            totalValue: 0
                        }
                    };
                } else {
                    return {
                        success: true,
                        data: {},
                        message: 'Development mock data'
                    };
                }
            }

            // Only check response.ok if we haven't already handled the error above
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API ${method} ${url} Error:`, error);
            throw error; // Re-throw to let calling code handle it
        }
    }

    static get(url) { return this.request("GET", url); }
    static post(url, data) { return this.request("POST", url, data); }
    static put(url, data) { return this.request("PUT", url, data); }
    static delete(url) { return this.request("DELETE", url); }

    // Special method for downloading blobs (PDFs, images, etc.)
    static async downloadBlob(url, data = null, method = "GET") {
        try {
            // Get auth token from the auth system (same as regular API calls)
            const token = window.authSystem?.getToken();
            
            const headers = {
                "Content-Type": "application/json"
            };
            
            // Add authorization header if token exists
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.baseUrl}${url}`, {
                method,
                headers,
                credentials: "include",
                body: method !== "GET" && data ? JSON.stringify(data) : undefined
            });

            // Handle authentication errors - but skip in development mode with bypass
            if (response.status === 401) {
                // Check if we're in development mode with bypass
                if (window.Config && window.Config.isDevelopment() && localStorage.getItem('devAuthBypass') === 'true') {
                    console.log('🔓 API: Ignoring 401 in development mode for blob download:', url);
                    // Return a mock blob for development
                    return new Blob(['Development mode - mock file'], { type: 'text/plain' });
                }
                
                try {
                    const errorData = await response.json();
                    if (errorData.code === 'TOKEN_EXPIRED' || errorData.code === 'INVALID_TOKEN') {
                        // Token is invalid, redirect to login
                        if (window.authSystem) {
                            window.authSystem.clearAuth();
                            window.location.href = 'login.html';
                        }
                        throw new Error('Authentication required. Please log in again.');
                    }
                } catch (parseError) {
                    // If we can't parse the 401 response, still treat it as auth error
                    if (window.authSystem) {
                        window.authSystem.clearAuth();
                        window.location.href = 'login.html';
                    }
                    throw new Error('Authentication required. Please log in again.');
                }
            }

            if (!response.ok) {
                // Read the response once and determine the content type
                const contentType = response.headers.get('content-type');
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                
                try {
                    if (contentType && contentType.includes('application/json')) {
                        // Response is JSON
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    } else {
                        // Response is text/HTML
                        const errorText = await response.text();
                        // Try to extract title from HTML error pages
                        const match = errorText.match(/<title>(.*?)<\/title>/i);
                        if (match) {
                            errorMessage = `Server Error: ${match[1]}`;
                        } else if (errorText.length > 0 && errorText.length < 200) {
                            // If it's a short text response, use it as the error message
                            errorMessage = errorText;
                        }
                    }
                } catch (parseError) {
                    // If we can't parse the error response, use the default message
                    console.warn('Could not parse error response:', parseError);
                }
                
                throw new Error(errorMessage);
            }
            
            return await response.blob();
        } catch (error) {
            console.error(`API ${method} ${url} Blob Error:`, error);
            throw error;
        }
    }
}

// Make API globally available
window.API = API;

// Initialize the app when DOM is loaded, but wait for auth system
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOMContentLoaded - starting app initialization');
    
    // Listen for auth ready event
    window.addEventListener('authReady', (event) => {
        console.log('🎯 Auth ready event received:', event.detail);
        
        if (event.detail.isLoggedIn) {
            console.log('🎯 User is authenticated, initializing DashboardApp...');
            initializeDashboardApp();
        } else {
            console.log('🎯 User not authenticated, skipping DashboardApp initialization');
        }
    });
    
    // Fallback: Also try the old method in case auth is already ready
    setTimeout(() => {
        if (!window.dashboardApp && window.authSystem && window.authSystem.isLoggedIn()) {
            console.log('🎯 Fallback: Initializing DashboardApp...');
            initializeDashboardApp();
        }
    }, 100);
});

// Function to initialize DashboardApp (can be called from main.js)
function initializeDashboardApp() {
    if (!window.dashboardApp) {
        window.dashboardApp = new DashboardApp();
        console.log('🎯 DashboardApp initialized:', !!window.dashboardApp);
    }
}

// Make initialization function globally available
window.initializeDashboardApp = initializeDashboardApp;