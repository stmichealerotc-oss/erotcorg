require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const databaseService = require('./config/database');
const Users = require('./models/Users');
const bcrypt = require('bcryptjs');

// Import routes
const authRoutes = require('./routes/auth');
const kidsProgram2Routes = require('./routes/kidsProgram');
// CMS routes
const membersRoutes = require('./routes/members');
const accountingRoutes = require('./routes/accounting');
const inventoryRoutes = require('./routes/inventory');
const reportsRoutes = require('./routes/reports');
const taskRoutes = require('./routes/tasks');
const promiseRoutes = require('./routes/promises');
const memberContributionsRoutes = require('./routes/memberContributions');
const userManagementRoutes = require('./routes/userManagement');
const signaturesRoutes = require('./routes/signatures');
const memberCardsRoutes = require('./routes/memberCards');

// Initialize express
const app = express();
const PORT = process.env.PORT || 3001;
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Connect to MongoDB
databaseService.connect();

// CORS configuration
const allowedOrigins = [
'https://erotc.org',
'https://www.erotc.org',
'https://cms.erotc.org',
'https://erotc.netlify.app',
'https://churchmanagement.erotc.org',
'https://admin-erotc.netlify.app',
'https://church-management-vjfw.onrender.com',
'https://my-church.onrender.com',
// Azure Static Web Apps domains
'https://zealous-desert-0db98b100.6.azurestaticapps.net',
'https://lemon-rock-09193a31e.azurestaticapps.net',
'https://lemon-rock-09193a31e-1.azurestaticapps.net',
'https://lemon-rock-09193a31e-2.azurestaticapps.net',
'https://lemon-rock-09193a31e-3.azurestaticapps.net',
'https://lemon-rock-09193a31e-4.azurestaticapps.net',
'https://lemon-rock-09193a31e-5.azurestaticapps.net'
];

console.log('🔄 Allowed CORS origins (explicit):', allowedOrigins);

app.use(cors({
origin: function(origin, callback) {
if (!origin) return callback(null, true);

if (isDevelopment && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
return callback(null, true);
}

if (allowedOrigins.includes(origin)) {
return callback(null, true);
}

console.log('❌ CORS blocked for origin:', origin);
callback(new Error('CORS policy does not allow access from origin: ' + origin), false);
},
credentials: true,
methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Security middleware
app.use(helmet({
contentSecurityPolicy: isProduction ? {
directives: {
defaultSrc: ["'self'"],
styleSrc: ["'self'", "'unsafe-inline'"],
scriptSrc: ["'self'", "'unsafe-inline'"],
imgSrc: ["'self'", "data:", "https:"],
connectSrc: ["'self'"],
}
} : false,
}));

// Trust proxy
app.set('trust proxy', 1);

// Rate limiting - more lenient in development
const limiter = rateLimit({
windowMs: 15 * 60 * 1000,
max: isDevelopment ? 1000 : 100, // Higher limit for development
standardHeaders: true,
legacyHeaders: false,
skip: (req) => {
// Skip rate limiting for health checks and development
return req.path === '/api/health' || (isDevelopment && req.ip === '::1');
},
message: {
status: 429,
error: 'Too many requests, please try again later.'
}
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Check if directories exist first
const websitePath = path.join(__dirname, '../frontend-website');
const adminPath = path.join(__dirname, '../frontend-admin');
const kidsAdminPath = path.join(__dirname, '../../church-website/frontend/kids-admin');

console.log('📁 Checking static file directories:');
console.log(`   Website exists: ${fs.existsSync(websitePath)} - ${websitePath}`);
console.log(`   Admin exists: ${fs.existsSync(adminPath)} - ${adminPath}`);
console.log(`   Kids Admin exists: ${fs.existsSync(kidsAdminPath)} - ${kidsAdminPath}`);

if (!fs.existsSync(websitePath)) {
console.error('❌ ERROR: Website frontend directory not found!');
// Create a simple fallback
if (isDevelopment) {
fs.mkdirSync(websitePath, { recursive: true });
fs.writeFileSync(path.join(websitePath, 'index.html'), '<h1>Website under construction</h1>');
fs.writeFileSync(path.join(websitePath, '404.html'), '<h1>Page not found</h1>');
}
}

if (!fs.existsSync(adminPath)) {
console.error('❌ ERROR: Admin frontend directory not found!');
if (isDevelopment) {
fs.mkdirSync(adminPath, { recursive: true });
fs.writeFileSync(path.join(adminPath, 'admin.html'), '<h1>Admin Panel</h1>');
}
} else {
// Debug what's actually in the frontend-admin directory
console.log('📁 Contents of admin directory:');
try {
const adminFiles = fs.readdirSync(adminPath);
console.log('   Files:', adminFiles.slice(0, 10)); // Show first 10 files

// Check for common files
const hasIndexHtml = adminFiles.includes('index.html');
const hasAdminHtml = adminFiles.includes('admin.html');
const hasCmsHtml = adminFiles.includes('cms.html');
console.log(`   Has index.html: ${hasIndexHtml}`);
console.log(`   Has admin.html: ${hasAdminHtml}`);
console.log(`   Has cms.html: ${hasCmsHtml}`);

if (hasIndexHtml && hasAdminHtml) {
console.log('✅ Both index.html and admin.html found - using index.html for /admin (Church Management), admin.html available for other uses');
} else if (hasIndexHtml && !hasAdminHtml) {
console.log('✅ Detected SPA structure (index.html present, no admin.html)');
console.log('👉 Will serve index.html for /admin and /cms routes');
}
} catch (err) {
console.error('   Error reading admin directory:', err.message);
}
}

// ================= FRONTEND ROUTE HANDLERS (BEFORE STATIC MIDDLEWARE) =================
// These must come BEFORE static middleware to override default file serving

// Main website
app.get('/', (req, res) => {
    res.sendFile(path.join(websitePath, 'index.html'));
});

// Serve static files FIRST (before any routing)
app.use(express.static(websitePath));

// Add explicit MIME type for CSS files to fix MIME type issues
app.use('/admin', (req, res, next) => {
    if (req.path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
    }
    next();
}, express.static(adminPath)); // Church Management System

app.use('/cms', express.static(kidsAdminPath)); // Kids Program Admin
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Admin panel - serve index.html for Church Management System
app.get('/admin', (req, res) => {
    const indexHtmlPath = path.join(adminPath, 'index.html');
    
    if (fs.existsSync(indexHtmlPath)) {
        console.log('📁 Serving index.html for Church Management System admin');
        res.sendFile(indexHtmlPath);
    } else {
        res.status(404).send('<h1>Admin panel not found</h1><p>index.html does not exist in frontend-admin directory.</p>');
    }
});

app.get('/admin/', (req, res) => {
    res.redirect('/admin');
});

// CMS panel - serve Kids Program Admin
app.get('/cms', (req, res) => {
    const kidsAdminHtmlPath = path.join(kidsAdminPath, 'admin.html');
    
    if (fs.existsSync(kidsAdminHtmlPath)) {
        console.log('📁 Serving admin.html for Kids Program CMS');
        res.sendFile(kidsAdminHtmlPath);
    } else {
        res.status(404).send('<h1>Kids Admin panel not found</h1><p>admin.html does not exist in kids-admin directory.</p>');
    }
});

app.get('/cms/', (req, res) => {
    res.redirect('/cms');
});

// SPA routing support - catch-all for admin routes (serve index.html for Church Management)
// This should come AFTER static file middleware
app.get('/admin/*', (req, res, next) => {
    const requestPath = req.path;
    
    // If it's a request for a static file, let it fall through to 404
    if (requestPath.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|html)$/)) {
        return next();
    }
    
    // Otherwise, serve the index HTML for SPA routing
    const indexHtmlPath = path.join(adminPath, 'index.html');
    
    if (fs.existsSync(indexHtmlPath)) {
        console.log('📁 Serving index.html for Church Management SPA route:', req.path);
        res.sendFile(indexHtmlPath);
    } else {
        res.status(404).send('<h1>Admin panel not found</h1>');
    }
});

// SPA routing support for CMS (Kids Program Admin)
app.get('/cms/*', (req, res, next) => {
    const requestPath = req.path;
    
    // If it's a request for a static file, let it fall through to 404
    if (requestPath.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|html)$/)) {
        return next();
    }
    
    // Otherwise, serve the admin HTML for Kids Program SPA routing
    const kidsAdminHtmlPath = path.join(kidsAdminPath, 'admin.html');
    
    if (fs.existsSync(kidsAdminHtmlPath)) {
        console.log('📁 Serving admin.html for Kids Program SPA route:', req.path);
        res.sendFile(kidsAdminHtmlPath);
    } else {
        res.status(404).send('<h1>Kids Admin panel not found</h1>');
    }
});

// Debugging middleware for development

// Debugging middleware for development
if (isDevelopment) {
app.use((req, res, next) => {
console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip}`);
next();
});

app.use('/admin', (req, res, next) => {
console.log(`📁 Admin request: ${req.originalUrl}`);
next();
});

app.use('/cms', (req, res, next) => {
console.log(`📁 CMS request: ${req.originalUrl}`);
next();
});
}

// ================= PUBLIC API ROUTES =================
app.use('/api/auth', authRoutes);
app.use('/api/kids-program-cms', kidsProgram2Routes);

// ================= PROTECTED CMS API ROUTES =================
// All these routes require authentication (temporarily disabled auth middleware)
app.use('/api/members', membersRoutes);
app.use('/api/member-cards', memberCardsRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/promises', promiseRoutes);
app.use('/api/member-contributions', memberContributionsRoutes);
app.use('/api/user-management', userManagementRoutes);
app.use('/api/signatures', signaturesRoutes);

// Health endpoint
app.get('/api/health', async (req, res) => {
try {
const dbStatus = await databaseService.healthCheck();
res.json({
status: 'ok',
timestamp: new Date().toISOString(),
uptime: process.uptime(),
environment: process.env.NODE_ENV,
db: dbStatus,
version: process.env.npm_package_version || '1.0.0'
});
} catch (error) {
res.status(503).json({ 
status: 'error',
error: 'Health check failed',
details: error.message 
});
}
});

// SECURE ADMIN CREATION ENDPOINT - Only accessible in development
if (isDevelopment) {
app.get('/create-admin', async (req, res) => {
try {
// Only allow from localhost in development
if (!req.ip.includes('127.0.0.1') && !req.ip.includes('::1')) {
return res.status(403).send('Access denied');
}

const existing = await Users.findOne({ email: 'admin@erotc.org' });
if (existing) return res.send('Admin already exists');

const hashedPassword = await bcrypt.hash('admin123', 12);

const admin = new Users({
name: 'Admin User',
email: 'admin@erotc.org',
username: 'admin',
password: hashedPassword,
role: 'super-admin',
isActive: true,
accountStatus: 'active',
emailVerified: true,
permissions: ['read', 'write', 'delete', 'manage-users', 'super-admin']
});

await admin.save();
res.send('Admin created successfully. Credentials: admin / admin123');
} catch (error) {
res.status(500).send('Error creating admin: ' + error.message);
}
});
}

// Admin-only route for development
app.get('/dev-tools', (req, res) => {
if (isDevelopment) {
res.send(`<h1>Development Tools</h1>
<ul>
<li><a href="/create-admin">Create Admin User</a></li>
<li><a href="/api/health">Health Check</a></li>
<li><a href="/admin">Admin Panel</a></li>
<li><a href="/cms">CMS Panel</a></li>
</ul>`);
} else {
res.status(404).send('Not found');
}
});

// 404 handler - check if file exists first
app.use('*', (req, res) => {
if (req.originalUrl.startsWith('/api')) {
return res.status(404).json({ error: 'API endpoint not found' });
}

const notFoundPath = path.join(websitePath, '404.html');
if (fs.existsSync(notFoundPath)) {
res.status(404).sendFile(notFoundPath);
} else {
res.status(404).send('<h1>Page not found</h1>');
}
});

// Error handling middleware
app.use((error, req, res, next) => {
console.error('Server error:', error);

if (error.message.includes('CORS policy')) {
return res.status(403).json({ 
error: 'CORS Error: Request blocked',
details: 'Your domain is not allowed to access this resource'
});
}

res.status(error.status || 500).json({ 
error: isProduction ? 'Internal server error' : error.message,
...(isDevelopment && { stack: error.stack })
});
});

// Graceful shutdown
const server = app.listen(PORT, () => {
console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
console.log(`🌐 Main site: http://localhost:${PORT}`);
console.log(`🔧 Admin panel: http://localhost:${PORT}/admin`);
console.log(`📊 CMS panel: http://localhost:${PORT}/cms`);
if (isDevelopment) {
console.log(`🛠️  Dev tools: http://localhost:${PORT}/dev-tools`);
console.log(`👤 Create admin: http://localhost:${PORT}/create-admin`);
}
console.log('✅ Allowed CORS origins:', allowedOrigins);
});

module.exports = app;