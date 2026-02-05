// Configuration for different environments
class Config {
    static getApiBaseUrl() {
        const hostname = window.location.hostname;
        
        // Only log in development
        if (this.isDevelopment()) {
            console.log('🔧 Debug - Current hostname:', hostname);
        }
        
        // Development environment (localhost)
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            if (this.isDevelopment()) {
                console.log('🔧 Debug - Using st-michael-church backend on port 3001');
            }
            return 'http://localhost:3001/api';
        }
        
        // Production environment - Azure Static Web Apps
        if (hostname.includes('azurestaticapps.net') || hostname.includes('lemon-rock-09193a31e')) {
            // Azure Static Web Apps - point to your Azure App Service backend
            return 'https://crotc.azurewebsites.net/api';
        }
        
        // Production environment - Render (both frontend and backend working)
        if (hostname === 'church-management-vjfw.onrender.com') {
            // Both frontend and backend on same Render domain
            return '/api';
        }
        
        // Legacy Netlify frontend (reached limit) - redirect to Render
        if (hostname === 'churchmanagement.erotc.org' || 
            hostname === 'admin-erotc.netlify.app') {
            console.warn('⚠️ Netlify frontend has reached its limit. Redirecting to Render...');
            // Redirect to working Render frontend
            window.location.href = 'https://church-management-vjfw.onrender.com';
            return 'https://church-management-vjfw.onrender.com/api';
        }
        
        // Default fallback
        return '/api';
    }
    
    static isDevelopment() {
        const hostname = window.location.hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1';
    }
    
    static isProduction() {
        const hostname = window.location.hostname;
        // Only Render should be considered production now
        return hostname === 'church-management-vjfw.onrender.com';
    }
    
    static getEnvironment() {
        if (this.isDevelopment()) return 'development';
        if (this.isProduction()) return 'production';
        return 'unknown';
    }
    
    // Check if current frontend service is available
    static isNetlifyLimitReached() {
        const hostname = window.location.hostname;
        return hostname === 'admin-erotc.netlify.app' || hostname === 'churchmanagement.erotc.org';
    }
    
    // Show Netlify limit notice and redirect to Render
    static showNetlifyLimitNotice() {
        // Don't show if already shown or if we're on Render
        if (document.getElementById('netlify-limit-notice') || 
            window.location.hostname === 'church-management-vjfw.onrender.com') {
            return;
        }
        
        const notice = document.createElement('div');
        notice.id = 'netlify-limit-notice';
        notice.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            ">
                <div style="
                    background: white;
                    border-radius: 15px;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                    overflow: hidden;
                ">
                    <div style="
                        background: linear-gradient(135deg, #f59e0b, #d97706);
                        color: white;
                        padding: 25px;
                        text-align: center;
                    ">
                        <h2 style="margin: 0; font-size: 1.5em;">
                            ⚠️ Service Moved
                        </h2>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Netlify has reached its bandwidth limit</p>
                    </div>
                    
                    <div style="padding: 30px; text-align: center;">
                        <p style="color: #4a5568; margin-bottom: 25px; line-height: 1.6;">
                            The Church Management System has been moved to a new location. 
                            You'll be automatically redirected to the working service.
                        </p>
                        
                        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                            <p style="margin: 0; color: #1e40af; font-weight: 600;">
                                🚀 New URL: <br>
                                <a href="https://church-management-vjfw.onrender.com" style="color: #2563eb; text-decoration: none; font-family: monospace;">
                                    https://church-management-vjfw.onrender.com
                                </a>
                            </p>
                        </div>
                        
                        <div style="display: flex; gap: 15px; justify-content: center; margin-top: 25px;">
                            <button onclick="window.location.href='https://church-management-vjfw.onrender.com'" style="
                                background: linear-gradient(135deg, #3b82f6, #2563eb);
                                color: white;
                                border: none;
                                padding: 12px 25px;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: 600;
                                font-size: 1em;
                            ">Go to New Site</button>
                            
                            <button onclick="this.closest('div').parentElement.parentElement.remove()" style="
                                background: #f3f4f6;
                                color: #4b5563;
                                border: 1px solid #d1d5db;
                                padding: 12px 25px;
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 1em;
                            ">Stay Here</button>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 0.9em; margin-top: 20px;">
                            Redirecting automatically in <span id="countdown">10</span> seconds...
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notice);
        
        // Countdown and auto-redirect
        let countdown = 10;
        const countdownElement = notice.querySelector('#countdown');
        const timer = setInterval(() => {
            countdown--;
            if (countdownElement) {
                countdownElement.textContent = countdown;
            }
            
            if (countdown <= 0) {
                clearInterval(timer);
                window.location.href = 'https://church-management-vjfw.onrender.com';
            }
        }, 1000);
    }
    
    // Get the correct production URL
    static getProductionUrl() {
        return 'https://church-management-vjfw.onrender.com';
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

// Check if we're on Netlify and show redirect notice
document.addEventListener('DOMContentLoaded', () => {
    if (Config.isNetlifyLimitReached()) {
        Config.showNetlifyLimitNotice();
    }
});