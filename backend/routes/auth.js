const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/Users');
const { authenticateToken } = require('../middleware/auth');

// STEP 4: Login rate limiter to prevent brute force attacks
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
        success: false,
        error: 'Too many login attempts from this IP. Please try again in 15 minutes.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Don't count successful logins
});

// Generate JWT Token
const generateToken = (userId, role) => {
    return jwt.sign(
        { userId, role },
        process.env.JWT_SECRET,
        { 
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
            issuer: 'stmichael-church',
            audience: 'admin-panel'
        }
    );
};

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    try {
        // SAFER DEV BYPASS: Only works if explicitly enabled (never set in production)
        if (process.env.ALLOW_DEV_BYPASS === 'true' && 
            username === 'admin' && password === 'dev123') {
            console.log('🔓 DEV BYPASS ENABLED: Bypassing login authentication for dev user');
            console.warn('⚠️  WARNING: ALLOW_DEV_BYPASS should NEVER be set in production!');
            
            // Create a mock user for development
            const mockUser = {
                id: 'dev-admin-id',
                username: 'admin',
                role: 'super-admin',
                name: 'Development Admin',
                email: 'admin@stmichael.church',
                permissions: ['read', 'write', 'delete', 'manage-users', 'super-admin'],
                lastLogin: new Date(),
                isFirstLogin: false,
                accountStatus: 'active',
                emailVerified: true,
                requiresEmailVerification: false,
                isActive: true
            };
            
            // Generate a mock token
            const token = generateToken('dev-admin-id', 'super-admin');
            
            return res.json({ 
                success: true, 
                user: mockUser,
                token: token,
                expiresIn: process.env.JWT_EXPIRES_IN || '24h',
                requiresPasswordChange: false,
                requiresEmailVerification: false
            });
        }

        // Find user and include password for comparison
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid username or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Check if account is active
        if (!user.isActive || user.accountStatus === 'suspended') {
            return res.status(401).json({ 
                success: false,
                error: 'Account is deactivated. Please contact administrator.',
                code: 'ACCOUNT_DEACTIVATED'
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid username or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Check if this is first login with one-time password
        if (user.isFirstLogin && user.oneTimePasswordExpiry && user.oneTimePasswordExpiry < new Date()) {
            return res.status(401).json({
                success: false,
                error: 'One-time password has expired. Please contact administrator.',
                code: 'OTP_EXPIRED'
            });
        }

        // Generate JWT token
        const token = generateToken(user._id, user.role);

        // Update last login, last activity, and account status
        user.lastLogin = new Date();
        user.lastActivityTime = new Date(); // Set activity time on login
        if (user.accountStatus === 'pending') {
            user.accountStatus = 'active';
        }
        
        // Check if email verification is required
        let requiresEmailVerification = false;
        if (user.requiresEmailVerification && !user.emailVerified) {
            requiresEmailVerification = true;
            
            // Generate and send verification code automatically
            const emailService = require('../utils/emailService');
            const verificationCode = emailService.generateVerificationCode();
            const verificationExpiry = new Date();
            verificationExpiry.setMinutes(verificationExpiry.getMinutes() + 15); // 15 minutes
            
            user.emailVerificationToken = verificationCode;
            user.emailVerificationExpiry = verificationExpiry;
            
            // Send verification code email
            const verificationEmailSent = await emailService.sendEmailVerificationCode(user, verificationCode);
            console.log(`📧 Login verification email sent to ${user.email}: ${verificationEmailSent}`);
        }
        
        await user.save();

        // Prepare user data (exclude sensitive fields)
        const userData = {
            id: user._id,
            username: user.username,
            role: user.role,
            name: user.name,
            email: user.email,
            permissions: user.permissions,
            lastLogin: user.lastLogin,
            isFirstLogin: user.isFirstLogin,
            accountStatus: user.accountStatus,
            emailVerified: user.emailVerified,
            requiresEmailVerification: user.requiresEmailVerification
        };

        res.json({ 
            success: true, 
            user: userData,
            token: token,
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
            requiresPasswordChange: user.isFirstLogin,
            requiresEmailVerification: requiresEmailVerification
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ 
            success: false,
            error: 'Server error during login',
            code: 'SERVER_ERROR'
        });
    }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // Update user's last activity
        await User.findByIdAndUpdate(req.user._id, { 
            lastActivity: new Date() 
        });

        res.json({ 
            success: true, 
            message: 'Logged out successfully' 
        });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ 
            success: false,
            error: 'Server error during logout',
            code: 'SERVER_ERROR'
        });
    }
});

// GET /api/auth/verify - Verify token and get user info
router.get('/verify', authenticateToken, async (req, res) => {
    try {
        const userData = {
            id: req.user._id,
            username: req.user.username,
            role: req.user.role,
            name: req.user.name,
            email: req.user.email,
            permissions: req.user.permissions,
            lastLogin: req.user.lastLogin
        };

        res.json({ 
            success: true, 
            user: userData,
            authenticated: true
        });
    } catch (err) {
        console.error("Token verification error:", err);
        res.status(500).json({ 
            success: false,
            error: 'Server error during token verification',
            code: 'SERVER_ERROR'
        });
    }
});

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh', authenticateToken, async (req, res) => {
    try {
        // Generate new token
        const newToken = generateToken(req.user._id, req.user.role);

        res.json({ 
            success: true, 
            token: newToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        });
    } catch (err) {
        console.error("Token refresh error:", err);
        res.status(500).json({ 
            success: false,
            error: 'Server error during token refresh',
            code: 'SERVER_ERROR'
        });
    }
});

// POST /api/auth/change-password - Change password (authenticated users)
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required'
            });
        }
        
        // Enhanced password validation
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: passwordValidation.message,
                requirements: passwordValidation.requirements
            });
        }
        
        const user = await User.findById(req.user._id);
        
        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12); // Increased salt rounds
        
        // Update password and clear first login flag
        user.password = hashedPassword;
        user.isFirstLogin = false;
        user.oneTimePassword = undefined;
        user.oneTimePasswordExpiry = undefined;
        user.passwordChangedAt = new Date();
        await user.save();
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during password change'
        });
    }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }
        
        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            // Don't reveal if email exists or not for security
            return res.json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }
        
        // Check if account is active
        if (!user.isActive || user.accountStatus === 'suspended') {
            return res.json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }
        
        // Generate reset token
        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date();
        resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour
        
        // STEP 2: Hash the reset token before storing in database
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        // Update user with HASHED reset token
        user.resetToken = hashedToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save();
        
        // Send reset email with UNHASHED token (user needs this)
        const emailService = require('../utils/emailService');
        const emailSent = await emailService.sendPasswordResetEmail(user, resetToken);
        
        console.log(`Password reset requested for: ${email}, Email sent: ${emailSent}`);
        
        res.json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.'
        });
        
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during password reset request'
        });
    }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
    try {
        console.log('🔑 Password reset request received');
        console.log('🔑 Request body:', { token: req.body.token ? 'present' : 'missing', newPassword: req.body.newPassword ? 'present' : 'missing' });
        
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            console.log('❌ Missing token or password');
            return res.status(400).json({
                success: false,
                error: 'Reset token and new password are required'
            });
        }
        
        console.log('🔑 Validating password strength...');
        // Enhanced password validation
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            console.log('❌ Password validation failed:', passwordValidation.message);
            return res.status(400).json({
                success: false,
                error: passwordValidation.message,
                requirements: passwordValidation.requirements
            });
        }
        
        console.log('🔑 Looking for user with reset token...');
        // STEP 2: Hash the incoming token to compare with stored hash
        const crypto = require('crypto');
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        // Find user with valid HASHED reset token
        const user = await User.findOne({
            resetToken: hashedToken,
            resetTokenExpiry: { $gt: new Date() }
        });
        
        if (!user) {
            console.log('❌ No user found with valid reset token');
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired reset token'
            });
        }
        
        console.log('✅ User found:', user.email);
        console.log('🔑 Hashing new password...');
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12); // Increased salt rounds
        
        console.log('🔑 Updating user password...');
        // Update password and clear reset token
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        user.isFirstLogin = false;
        user.passwordChangedAt = new Date();
        await user.save();
        
        console.log('✅ Password reset completed successfully for:', user.email);
        
        res.json({
            success: true,
            message: 'Password reset successfully'
        });
        
    } catch (error) {
        console.error('❌ Reset password error:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Server error during password reset',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Helper function to validate password strength
function validatePasswordStrength(password) {
    const requirements = {
        minLength: 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumbers: /\d/.test(password),
        hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const errors = [];
    
    if (password.length < requirements.minLength) {
        errors.push(`Password must be at least ${requirements.minLength} characters long`);
    }
    
    if (!requirements.hasUppercase) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!requirements.hasLowercase) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!requirements.hasNumbers) {
        errors.push('Password must contain at least one number');
    }
    
    const isValid = errors.length === 0;
    
    return {
        isValid,
        message: isValid ? 'Password meets all requirements' : errors.join('. '),
        requirements,
        errors
    };
}

// POST /api/auth/test-email - Test email functionality (development only)
router.post('/test-email', async (req, res) => {
    try {
        // Only allow in development or for super-admin
        if (process.env.NODE_ENV === 'production') {
            // Check if user is authenticated and is super-admin
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required for email testing in production'
                });
            }
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'church-management-secret-key');
            const user = await User.findById(decoded.userId);
            
            if (!user || user.role !== 'super-admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Only super-admin can test email functionality'
                });
            }
        }
        
        const { email } = req.body;
        const testEmail = email || 'debesay304@gmail.com';
        
        const emailService = require('../utils/emailService');
        const result = await emailService.sendTestEmail(testEmail);
        
        res.json({
            success: result.success,
            message: result.success ? 'Test email sent successfully' : 'Test email failed',
            details: result
        });
        
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during email test',
            details: error.message
        });
    }
});

// POST /api/auth/send-verification-code - Send email verification code
router.post('/send-verification-code', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        if (user.emailVerified) {
            return res.status(400).json({
                success: false,
                error: 'Email is already verified'
            });
        }
        
        // Generate verification code
        const emailService = require('../utils/emailService');
        const verificationCode = emailService.generateVerificationCode();
        const verificationExpiry = new Date();
        verificationExpiry.setMinutes(verificationExpiry.getMinutes() + 15); // 15 minutes
        
        // Update user with verification code
        user.emailVerificationToken = verificationCode;
        user.emailVerificationExpiry = verificationExpiry;
        await user.save();
        
        // Send verification email
        const emailSent = await emailService.sendEmailVerificationCode(user, verificationCode);
        
        if (emailSent) {
            res.json({
                success: true,
                message: 'Verification code sent to your email address'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to send verification email'
            });
        }
        
    } catch (error) {
        console.error('Send verification code error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during verification code sending'
        });
    }
});

// POST /api/auth/verify-email - Verify email with code
router.post('/verify-email', authenticateToken, async (req, res) => {
    try {
        const { verificationCode } = req.body;
        
        if (!verificationCode) {
            return res.status(400).json({
                success: false,
                error: 'Verification code is required'
            });
        }
        
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        if (user.emailVerified) {
            return res.status(400).json({
                success: false,
                error: 'Email is already verified'
            });
        }
        
        // Check verification code and expiry
        if (!user.emailVerificationToken || 
            user.emailVerificationToken !== verificationCode ||
            !user.emailVerificationExpiry ||
            user.emailVerificationExpiry < new Date()) {
            
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired verification code'
            });
        }
        
        // Mark email as verified
        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpiry = undefined;
        user.requiresEmailVerification = false;
        user.accountStatus = 'active';
        await user.save();
        
        res.json({
            success: true,
            message: 'Email verified successfully'
        });
        
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during email verification'
        });
    }
});

// POST /api/auth/check-session - Check if session is still valid
router.post('/check-session', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found',
                requiresLogin: true
            });
        }
        
        // Get current time and last activity
        const now = new Date();
        const lastActivity = user.lastActivityTime || user.lastLogin || now;
        const sessionTimeout = user.sessionTimeout || 3600000; // 1 hour default
        
        // Calculate time since last activity
        const timeSinceActivity = now - lastActivity;
        
        // Only check timeout if there's a valid lastActivity and it's been more than the timeout
        // Don't fail if lastActivity is very recent (within last 5 seconds) - this handles immediate post-login checks
        if (lastActivity && timeSinceActivity > sessionTimeout && timeSinceActivity > 5000) {
            console.log(`⏰ Session expired for user ${user.username}: ${timeSinceActivity}ms since last activity`);
            return res.status(401).json({
                success: false,
                error: 'Session expired due to inactivity',
                requiresLogin: true
            });
        }
        
        // Update last activity time
        user.lastActivityTime = now;
        await user.save();
        
        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                name: user.name,
                email: user.email,
                emailVerified: user.emailVerified,
                requiresEmailVerification: user.requiresEmailVerification,
                lastActivity: user.lastActivityTime
            }
        });
        
    } catch (error) {
        console.error('Session check error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during session check'
        });
    }
});

module.exports = router;
