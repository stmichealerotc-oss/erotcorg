/**
 * Main Application Entry Point
 * Optimized for Netlify bandwidth limits
 * Uses dynamic imports to load modules only when needed
 */

class MainApp {
    constructor() {
        this.loadedModules = new Set();
        this.isProduction = !window.location.hostname.includes('localhost');
        this.isInitializing = true; // Add flag to prevent navigation during init
        this.init();
    }

    async init() {
        if (!this.isProduction) {
            console.log('🚀 MainApp initializing in development mode');
        }

        // Load essential modules first
        await this.loadEssentialModules();
        
        // Set up navigation
        this.setupNavigation();
        
        // Set up mobile menu
        this.setupMobileMenu();
        
        // Initialize auth and load initial page
        await this.initializeApp();
    }

    async loadEssentialModules() {
        try {
            // Config is already loaded via script tag
            // Load auth system (critical for all pages)
            if (!window.authSystem) {
                await this.loadModule('auth');
            }
        } catch (error) {
            console.error('Failed to load essential modules:', error);
        }
    }

    async loadModule(moduleName) {
        if (this.loadedModules.has(moduleName)) {
            return; // Already loaded
        }

        try {
            switch (moduleName) {
                case 'auth':
                    // Auth is loaded via script tag, just mark as loaded
                    this.loadedModules.add('auth');
                    break;
                    
                case 'app':
                    await import('./app.js');
                    
                    // Give the module time to fully load and register functions
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Initialize DashboardApp if auth is ready
                    if (window.authSystem && window.authSystem.isLoggedIn()) {
                        if (window.initializeDashboardApp) {
                            window.initializeDashboardApp();
                        }
                    }
                    
                    // Wait for DashboardApp to be available with reduced timeout
                    let attempts = 0;
                    while (!window.dashboardApp && attempts < 20) {
                        await new Promise(resolve => setTimeout(resolve, 25));
                        attempts++;
                        
                        // Try to initialize again if it's still not available
                        if (attempts === 10 && !window.dashboardApp && window.initializeDashboardApp) {
                            window.initializeDashboardApp();
                        }
                    }
                    break;
                    
                case 'dashboard':
                    await import('./dashboard.js');
                    break;
                    
                case 'members':
                    await import('./members.js');
                    break;
                    
                case 'member-profile':
                    await import('./member-profile.js');
                    break;
                    
                case 'accounting':
                    await import('./accounting.js');
                    break;
                    
                case 'inventory':
                    await import('./inventory.js');
                    break;
                    
                case 'reports':
                    await import('./generatereport.js');
                    // Load Chart.js only when reports module is needed
                    if (!window.Chart) {
                        await this.loadChartJS();
                    }
                    break;
                    
                case 'taskmanagement':
                    await import('./taskmanagement.js');
                    break;
                    
                case 'user-management':
                    await import('./user-management.js');
                    break;
                    
                case 'generatereport':
                    await import('./generatereport.js');
                    // Load Chart.js for report generation
                    if (!window.Chart) {
                        await this.loadChartJS();
                    }
                    break;
                    
                default:
                    console.warn(`Unknown module: ${moduleName}`);
                    return;
            }
            
            this.loadedModules.add(moduleName);
            
        } catch (error) {
            console.error(`Failed to load module ${moduleName}:`, error);
        }
    }

    async loadChartJS() {
        return new Promise((resolve, reject) => {
            if (window.Chart) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupNavigation() {
        // Remove any existing navigation listeners to prevent conflicts
        document.querySelectorAll('.nav-link').forEach(link => {
            // Clone the element to remove all event listeners
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
        });
        
        // Set up new navigation with MainApp control
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                
                const page = link.dataset.page;
                if (!page) return;
                
                // Update active state
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Close mobile menu
                this.closeMobileMenu();
                
                // Load page module and navigate
                await this.navigateToPage(page);
            });
        });
    }

    setupMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        const hamburger = document.getElementById('hamburger-toggle');

        hamburger?.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 768) {
                if (sidebar.classList.contains('active') && 
                    !sidebar.contains(e.target) && 
                    !hamburger.contains(e.target)) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }

    closeMobileMenu() {
        if (window.innerWidth < 768) {
            document.querySelector('.sidebar')?.classList.remove('active');
        }
    }

    async navigateToPage(page) {
        // Don't navigate during initialization
        if (this.isInitializing) {
            return;
        }
        
        try {
            // Load required modules for the page
            await this.loadPageModules(page);
            
            // Ensure DashboardApp is available and properly initialized
            await this.ensureDashboardApp();
            
            // Use the app system to navigate if available
            if (window.dashboardApp && typeof window.dashboardApp.loadPage === 'function') {
                window.dashboardApp.loadPage(page);
            } else {
                // Fallback: try to load the page directly
                await this.fallbackPageLoad(page);
            }
            
        } catch (error) {
            console.error(`Failed to navigate to page ${page}:`, error);
            // Try fallback loading
            await this.fallbackPageLoad(page);
        }
    }
    
    async ensureDashboardApp() {
        // If DashboardApp is already available, return immediately
        if (window.dashboardApp && typeof window.dashboardApp.loadPage === 'function') {
            return;
        }
        
        // Make sure app module is loaded
        if (!this.loadedModules.has('app')) {
            await this.loadModule('app');
        }
        
        // Try to initialize if not already done
        if (!window.dashboardApp && window.initializeDashboardApp) {
            window.initializeDashboardApp();
        }
        
        // Wait for DashboardApp with reduced timeout
        let attempts = 0;
        while (!window.dashboardApp && attempts < 40) {
            await new Promise(resolve => setTimeout(resolve, 25));
            attempts++;
        }
    }
    
    async fallbackPageLoad(page) {
        try {
            // Try to load the HTML directly
            const pageFileMap = {
                'dashboard': 'dashboard',
                'members': 'members',
                'memberProfile': 'member-profile',
                'accounting': 'accounting',
                'inventory': 'inventory', 
                'reports': 'generatereport',  // Fixed: reports should load generatereport.html
                'taskmanagement': 'taskmanagement',
                'userManagement': 'user-management',
                'generatereport': 'generatereport'
            };
            
            const fileName = pageFileMap[page] || page;
            const response = await fetch(`pages/${fileName}.html`);
            
            if (response.ok) {
                const html = await response.text();
                const contentArea = document.getElementById('content-area');
                if (contentArea) {
                    contentArea.innerHTML = html;
                    
                    // Load the page-specific JavaScript module
                    await this.loadModule(page === 'memberProfile' ? 'member-profile' : 
                                        page === 'userManagement' ? 'user-management' : page);
                    
                    // Try to call the page loader function
                    const functionName = `load${page.charAt(0).toUpperCase() + page.slice(1).replace(/-/g, '')}`;
                    if (window[functionName] && typeof window[functionName] === 'function') {
                        window[functionName]();
                    }
                }
            }
        } catch (error) {
            console.error(`Fallback loading failed for ${page}:`, error);
        }
    }

    async loadPageModules(page) {
        // Load app module if not loaded
        if (!this.loadedModules.has('app')) {
            await this.loadModule('app');
        }
        
        // Load page-specific module
        switch (page) {
            case 'dashboard':
                await this.loadModule('dashboard');
                break;
            case 'members':
                await this.loadModule('members');
                break;
            case 'memberProfile':
            case 'member-profile':
                await this.loadModule('member-profile');
                break;
            case 'accounting':
                await this.loadModule('accounting');
                break;
            case 'inventory':
                await this.loadModule('inventory');
                break;
            case 'reports':
                await this.loadModule('generatereport');
                break;
            case 'taskmanagement':
                await this.loadModule('taskmanagement');
                break;
            case 'userManagement':
            case 'user-management':
                await this.loadModule('user-management');
                break;
            case 'generatereport':
                await this.loadModule('generatereport');
                break;
        }
    }

    async initializeApp() {
        // Wait for auth system with reduced timeout
        let attempts = 0;
        while (!window.authSystem && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 50));
            attempts++;
        }

        if (!window.authSystem) {
            console.error('Auth system failed to load');
            return;
        }

        // Load app module and initialize
        await this.loadModule('app');
        
        // Wait for dashboard app to be available with reduced timeout
        attempts = 0;
        while (!window.dashboardApp && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 25));
            attempts++;
        }

        if (window.dashboardApp) {
            // Load initial page (dashboard)
            await this.loadModule('dashboard');
            
            // Re-setup navigation after everything is ready to ensure MainApp controls it
            this.setupNavigation();
            
            // Mark initialization as complete
            this.isInitializing = false;
            
            // Now load the dashboard page
            try {
                // Use DashboardApp to load the dashboard
                window.dashboardApp.loadPage('dashboard');
            } catch (error) {
                console.error('Failed to load dashboard with DashboardApp, using fallback');
                await this.fallbackPageLoad('dashboard');
            }
        } else {
            // Even if dashboard app failed, mark as complete to allow navigation
            this.isInitializing = false;
            
            // Still set up navigation for fallback mode
            this.setupNavigation();
            
            // Load dashboard using fallback method
            await this.fallbackPageLoad('dashboard');
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mainApp = new MainApp();
    });
} else {
    window.mainApp = new MainApp();
}