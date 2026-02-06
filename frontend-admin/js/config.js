// Configuration for different environments - Azure First
class Config {
    static getApiBaseUrl() {
        const hostname = window.location.hostname;
        
        // Only log in development
        if (this.isDevelopment()) {
            console.log('🔧 Debug - Current hostname:', hostname);
        }
        
        // 1. Development environment (localhost)
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            if (this.isDevelopment()) {
                console.log('🔧 Debug - Using local backend on port 3001');
            }
            return 'http://localhost:3001/api';
        }
        
        // 2. Production - Azure Static Web Apps (front-admin)
        // This targets your Azure Frontend and points it to your Azure Backend
        if (hostname.includes('azurestaticapps.net') || hostname.includes('cms.erotc.org')) {
            return 'https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api';
        }
        
        // 3. Fallback (If frontend and backend are on the same domain)
        return '/api';
    }
    
    static isDevelopment() {
        const hostname = window.location.hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1';
    }
    
    // Simplified Production check for Azure
    static isProduction() {
        const hostname = window.location.hostname;
        return hostname.includes('azurestaticapps.net') || hostname.includes('azurewebsites.net');
    }
    
    static getEnvironment() {
        if (this.isDevelopment()) return 'development';
        if (this.isProduction()) return 'production';
        return 'unknown';
    }
    
    // Optimized for production - minimal logging
    static log(message, level = 'info') {
        // Only show logs in development
        if (this.isDevelopment()) {
            if (level === 'error') {
                console.error(message);
            } else {
                console.log(message);
            }
        }
    }
}

// Make Config globally available
window.Config = Config;
