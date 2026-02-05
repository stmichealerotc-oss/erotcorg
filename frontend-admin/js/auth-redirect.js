/**
 * Lightweight Authentication Redirect Handler
 * Handles redirects without loading the full application
 */

(function() {
    'use strict';
    
    // Check if we're on a page that should skip auth checks
    const currentPath = window.location.pathname;
    const skipAuthPages = [
        'forgot-password.html',
        'reset-password.html',
        'test.html',
        'debug.html'
    ];
    
    if (skipAuthPages.some(page => currentPath.includes(page))) {
        return; // Skip auth redirect for these pages
    }
    
    // Check if we're in development mode
    function isDevelopmentMode() {
        const hostname = window.location.hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1';
    }
    
    // Quick token check without full auth system
    function hasValidToken() {
        try {
            // In development mode, check for bypass flag first
            if (isDevelopmentMode() && localStorage.getItem('devAuthBypass') === 'true') {
                console.log('🔓 Auth-redirect: Development bypass detected');
                return true;
            }
            
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            if (!token) return false;
            
            // In development mode, if we have any token, consider it valid
            if (isDevelopmentMode() && token.startsWith('dev-token-')) {
                console.log('🔓 Auth-redirect: Development token detected');
                return true;
            }
            
            // Basic token format check (not full validation)
            const parts = token.split('.');
            if (parts.length !== 3) return false;
            
            // Check if token is expired (basic check)
            try {
                const payload = JSON.parse(atob(parts[1]));
                const now = Math.floor(Date.now() / 1000);
                return payload.exp > now;
            } catch (e) {
                return false;
            }
        } catch (e) {
            return false;
        }
    }
    
    const isOnLoginPage = currentPath.includes('login.html') || currentPath.endsWith('/login.html');
    const hasToken = hasValidToken();
    
    console.log('🔄 Auth-redirect check:', { isOnLoginPage, hasToken, isDev: isDevelopmentMode() });
    
    // Handle redirects
    if (isOnLoginPage && hasToken) {
        // On login page but already logged in - redirect to dashboard
        console.log('🔄 Already logged in, redirecting to dashboard');
        window.location.replace('index.html');
    } else if (!isOnLoginPage && !hasToken) {
        // Not on login page and not logged in - redirect to login
        console.log('🔄 Not logged in, redirecting to login');
        window.location.replace('login.html');
    }
    
    // If we reach here, we're on the correct page for our auth state
    // The full auth system will be loaded by the respective pages
})();