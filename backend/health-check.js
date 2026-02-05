// Simple health check endpoint for debugging deployment issues
// Add this to your server.js file

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        message: 'Church Management Backend is running'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Church Management System API',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            users: '/api/user-management',
            tasks: '/api/tasks',
            members: '/api/members',
            accounting: '/api/accounting',
            reports: '/api/reports'
        }
    });
});

// API root endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Church Management API v1.0',
        status: 'active',
        endpoints: [
            'POST /api/auth/login',
            'GET /api/auth/verify',
            'GET /api/user-management',
            'POST /api/user-management',
            'GET /api/tasks',
            'GET /api/members',
            'GET /api/accounting',
            'GET /api/reports'
        ]
    });
});