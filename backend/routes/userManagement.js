const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/Users');
const { authenticateToken, authorizeRoles, readOnlyAccess, writeAccess } = require('../middleware/auth');
const emailService = require('../utils/emailService');

// Apply authentication to all user management routes
router.use(authenticateToken);

// Only super-admin can access user management
router.use(authorizeRoles('super-admin'));

// GET /api/user-management - Get all users (Super Admin only)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role, status } = req.query;
        
        // Build filter
        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        if (role) filter.role = role;
        if (status) filter.accountStatus = status;
        
        // Get users with pagination
        const users = await User.find(filter)
            .select('-password -resetToken -oneTimePassword')
            .populate('createdBy', 'name username')
            .sort({ _id: -1 }) // Use _id instead of createdAt for Cosmos DB
            .limit(parseInt(limit) * parseInt(page))
            .skip((parseInt(page) - 1) * parseInt(limit));
        
        const total = await User.countDocuments(filter);
        
        // Get statistics
        const stats = await User.aggregate([
            {
                $group: {
                    _id: '$accountStatus',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const roleStats = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        res.json({
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            stats: {
                byStatus: stats,
                byRole: roleStats,
                total
            }
        });
        
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch users' 
        });
    }
});

// POST /api/user-management - Create new user (Super Admin only)
router.post('/', async (req, res) => {
    try {
        const { name, email, role, username } = req.body;
        
        // Validation
        if (!name || !email || !role || !username) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, email, role, username'
            });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User with this email or username already exists'
            });
        }
        
        // Generate one-time password
        const oneTimePassword = emailService.generateOneTimePassword();
        const hashedOTP = await bcrypt.hash(oneTimePassword, 10);
        
        // Set OTP expiry (24 hours)
        const otpExpiry = new Date();
        otpExpiry.setHours(otpExpiry.getHours() + 24);
        
        // Create user
        const userData = {
            name,
            email,
            username,
            role,
            password: hashedOTP, // Temporary password
            oneTimePassword: hashedOTP,
            oneTimePasswordExpiry: otpExpiry,
            isFirstLogin: true,
            accountStatus: 'pending',
            emailVerified: false,
            requiresEmailVerification: true,
            createdBy: req.user._id,
            permissions: getPermissionsByRole(role)
        };
        
        const newUser = new User(userData);
        await newUser.save();
        
        // Send welcome email with one-time password only
        const emailSent = await emailService.sendWelcomeEmail(newUser, oneTimePassword);
        
        console.log(`📧 User created: ${email}`);
        console.log(`📧 Welcome email sent: ${emailSent}`);
        console.log(`📧 Email verification will be required after first login`);
        
        // Populate created by info
        await newUser.populate('createdBy', 'name username');
        
        res.status(201).json({
            success: true,
            message: 'User created successfully. Welcome email sent. Email verification will be required after login.',
            user: {
                ...newUser.toObject(),
                password: undefined,
                oneTimePassword: undefined,
                emailVerificationToken: undefined
            },
            emailSent
        });
        
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create user'
        });
    }
});

// PUT /api/user-management/:id - Update user (Super Admin only)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, accountStatus, isActive } = req.body;
        
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Store old role for notification
        const oldRole = user.role;
        
        // Update user
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (role) {
            updateData.role = role;
            updateData.permissions = getPermissionsByRole(role);
        }
        if (accountStatus) updateData.accountStatus = accountStatus;
        if (isActive !== undefined) updateData.isActive = isActive;
        
        const updatedUser = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('createdBy', 'name username');
        
        // Send role change notification if role changed
        if (role && role !== oldRole) {
            await emailService.sendRoleChangeNotification(
                updatedUser,
                oldRole,
                role,
                req.user.name
            );
        }
        
        res.json({
            success: true,
            message: 'User updated successfully',
            user: {
                ...updatedUser.toObject(),
                password: undefined,
                oneTimePassword: undefined
            }
        });
        
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user'
        });
    }
});

// DELETE /api/user-management/:id - Delete user (Super Admin only)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Prevent deleting self
        if (id === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete your own account'
            });
        }
        
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Prevent deleting other super-admins
        if (user.role === 'super-admin') {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete super-admin accounts'
            });
        }
        
        await User.findByIdAndDelete(id);
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        });
    }
});

// POST /api/user-management/:id/reset-password - Send password reset (Super Admin only)
router.post('/:id/reset-password', async (req, res) => {
    try {
        const { id } = req.params;
        
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Generate reset token
        const resetToken = emailService.generateResetToken();
        const resetTokenExpiry = new Date();
        resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour
        
        // Update user with reset token
        user.resetToken = resetToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save();
        
        // Send reset email
        const emailSent = await emailService.sendPasswordResetEmail(user, resetToken);
        
        res.json({
            success: true,
            message: 'Password reset email sent',
            emailSent
        });
        
    } catch (error) {
        console.error('Error sending password reset:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send password reset'
        });
    }
});

// Helper function to get permissions by role
function getPermissionsByRole(role) {
    const rolePermissions = {
        'super-admin': ['all'],
        'admin': ['members', 'accounting', 'inventory', 'reports', 'tasks'],
        'chairperson': ['members', 'reports', 'tasks'],
        'secretary': ['members', 'reports', 'tasks'],
        'accountant': ['accounting', 'reports', 'inventory'],
        'holder-of-goods': ['inventory'],
        'community-coordinator': ['members', 'tasks'],
        'member': ['dashboard']
    };
    
    return rolePermissions[role] || ['dashboard'];
}

module.exports = router;