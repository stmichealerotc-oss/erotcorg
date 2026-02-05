const jwt = require('jsonwebtoken');
const User = require('../models/Users');

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
    try {
        // TEMPORARY: Bypass authentication in development mode for testing
        if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
            console.log('🔓 DEVELOPMENT: Bypassing authentication for:', req.path);
            // Create a mock user for development
            req.user = {
                _id: 'dev-admin-id',
                name: 'Development Admin',
                email: 'dev@admin.com',
                username: 'dev-admin',
                role: 'super-admin',
                isActive: true,
                permissions: ['read', 'write', 'delete', 'manage-users', 'super-admin']
            };
            return next();
        }

        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        // Debug logging for PDF generation endpoint
        if (req.path.includes('generate-pdf')) {
            console.log('🔍 Auth Debug for PDF generation:');
            console.log('- Auth header:', authHeader ? 'exists' : 'missing');
            console.log('- Token extracted:', token ? 'exists' : 'missing');
            console.log('- Request path:', req.path);
            console.log('- Request method:', req.method);
        }

        if (!token) {
            console.log('❌ No token provided for:', req.path);
            return res.status(401).json({ 
                success: false, 
                error: 'Access denied. No token provided.',
                code: 'NO_TOKEN'
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'church-management-secret-key');
        
        // Get user from database to ensure they still exist and are active
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            console.log('❌ User not found for token:', decoded.userId);
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid token. User not found.',
                code: 'USER_NOT_FOUND'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({ 
                success: false, 
                error: 'Account is deactivated.',
                code: 'ACCOUNT_DEACTIVATED'
            });
        }

        // Add user info to request object
        req.user = user;
        next();
        
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                error: 'Token expired. Please login again.',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid token.',
                code: 'INVALID_TOKEN'
            });
        }

        console.error('Auth middleware error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Server error during authentication.',
            code: 'SERVER_ERROR'
        });
    }
};

// Role-based authorization middleware
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required.',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                error: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`,
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        next();
    };
};

// Permission-based authorization middleware
const authorizePermissions = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required.',
                code: 'AUTH_REQUIRED'
            });
        }

        const userPermissions = req.user.permissions || [];
        const hasPermission = requiredPermissions.some(permission => 
            userPermissions.includes(permission)
        );

        if (!hasPermission) {
            return res.status(403).json({ 
                success: false, 
                error: `Access denied. Required permission: ${requiredPermissions.join(' or ')}`,
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        next();
    };
};

// Admin only middleware
const adminOnly = authorizeRoles('super-admin', 'admin');

// Committee members only
const committeeOnly = authorizeRoles('super-admin', 'admin', 'chairperson', 'secretary', 'accountant', 'holder-of-goods', 'community-coordinator');

// Read-only access (includes visitors)
const readOnlyAccess = authorizeRoles('super-admin', 'admin', 'chairperson', 'secretary', 'accountant', 'holder-of-goods', 'community-coordinator', 'member', 'visitor');

// Write access (excludes visitors)
const writeAccess = authorizeRoles('super-admin', 'admin', 'chairperson', 'secretary', 'accountant', 'holder-of-goods', 'community-coordinator', 'member');

module.exports = {
    authenticateToken,
    authorizeRoles,
    authorizePermissions,
    adminOnly,
    committeeOnly,
    readOnlyAccess,
    writeAccess
};