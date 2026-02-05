const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Transaction = require('../models/Transaction');
const User = require('../models/Users');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Apply authentication to all signature routes
router.use(authenticateToken);

// Only admin, accountant, treasurer, and super-admin can manage signatures
router.use(authorizeRoles('super-admin', 'admin', 'accountant', 'secretary'));

// Ensure signatures directory exists
const signaturesDir = path.join(__dirname, '../uploads/signatures');
if (!fs.existsSync(signaturesDir)) {
    fs.mkdirSync(signaturesDir, { recursive: true });
}

// Configure multer for signature image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, signaturesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `signature-${uniqueSuffix}${extension}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed for signatures'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// POST /api/signatures/digital-approval/:transactionId - Add digital approval signature
router.post('/digital-approval/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { signatureTitle } = req.body;
        
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Get current user info
        const user = await User.findById(req.user._id);
        
        // Map user roles to appropriate signature titles
        const roleToSignatureTitle = {
            'super-admin': 'Administrator',
            'admin': 'Administrator', 
            'chairperson': 'Chairperson',
            'secretary': 'Secretary',
            'accountant': 'Accountant',
            'holder-of-goods': 'Treasurer',
            'community-coordinator': 'Community Coordinator'
        };
        
        // Use provided signature title or map from user role
        const defaultSignatureTitle = roleToSignatureTitle[user.role] || user.role;
        const finalSignatureTitle = signatureTitle || defaultSignatureTitle;
        
        // Create new signature object with only the fields we want
        const newSignature = {
            approvedBy: {
                userId: user._id,
                name: user.name,
                role: user.role,
                timestamp: new Date()
            },
            method: 'digital_approval',
            signatureTitle: finalSignatureTitle,
            signatureDate: new Date(),
            isRequired: true
        };

        // If there's an existing signature image, preserve it and update method
        if (transaction.receiptSignature && transaction.receiptSignature.signatureImage) {
            newSignature.signatureImage = transaction.receiptSignature.signatureImage;
            newSignature.method = 'both';
            // Keep the existing signature title if it exists, otherwise use the new one
            if (transaction.receiptSignature.signatureTitle) {
                newSignature.signatureTitle = transaction.receiptSignature.signatureTitle;
            }
        }

        // Use updateOne to avoid validation issues with nested objects
        await Transaction.updateOne(
            { _id: transactionId },
            { $set: { receiptSignature: newSignature } }
        );

        // Reload the transaction to get the updated data
        const updatedTransaction = await Transaction.findById(transactionId);

        console.log(`✅ Digital approval added by ${user.name || 'Unknown User'} (${user.role}) for transaction ${transactionId}`);

        res.json({
            success: true,
            message: 'Digital approval signature added successfully',
            signature: updatedTransaction.receiptSignature
        });

    } catch (error) {
        console.error('Error adding digital approval:', error);
        res.status(500).json({ error: 'Failed to add digital approval signature' });
    }
});

// POST /api/signatures/upload/:transactionId - Upload signature image
router.post('/upload/:transactionId', upload.single('signature'), async (req, res) => {
    console.log(`📤 Signature upload request received for transaction: ${req.params.transactionId}`);
    console.log(`📁 File received:`, req.file ? 'YES' : 'NO');
    console.log(`📝 Signature title:`, req.body.signatureTitle);
    
    try {
        const { transactionId } = req.params;
        const { signatureTitle } = req.body;
        
        if (!req.file) {
            console.log('❌ No file uploaded');
            return res.status(400).json({ error: 'No signature image uploaded' });
        }

        console.log(`📁 File details:`, {
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            console.log('❌ Transaction not found');
            // Clean up uploaded file if transaction not found
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Delete old signature image if exists
        if (transaction.receiptSignature?.signatureImage?.filename) {
            const oldImagePath = path.join(signaturesDir, transaction.receiptSignature.signatureImage.filename);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Create new signature object with only the fields we want
        const newSignature = {
            signatureImage: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                uploadedAt: new Date(),
                uploadedBy: req.user._id
            },
            method: 'signature_image',
            signatureTitle: signatureTitle || 'Authorized Signature',
            signatureDate: new Date(),
            isRequired: true
        };

        // If there's an existing approval, preserve it and update method
        if (transaction.receiptSignature && transaction.receiptSignature.approvedBy) {
            newSignature.approvedBy = transaction.receiptSignature.approvedBy;
            newSignature.method = 'both';
            // Keep the existing signature title if it exists, otherwise use the new one
            if (transaction.receiptSignature.signatureTitle) {
                newSignature.signatureTitle = transaction.receiptSignature.signatureTitle;
            }
        }

        // Use updateOne to avoid validation issues with nested objects
        await Transaction.updateOne(
            { _id: transactionId },
            { $set: { receiptSignature: newSignature } }
        );

        // Reload the transaction to get the updated data
        const updatedTransaction = await Transaction.findById(transactionId);

        console.log(`✅ Signature image uploaded for transaction ${transactionId} by ${req.user.name || 'Unknown User'} (${req.user.email || req.user._id})`);

        res.json({
            success: true,
            message: 'Signature image uploaded successfully',
            signature: updatedTransaction.receiptSignature
        });

    } catch (error) {
        console.error('Error uploading signature:', error);
        
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ error: 'Failed to upload signature image' });
    }
});

// GET /api/signatures/image/:filename - Serve signature images
router.get('/image/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        
        // Check if filename is valid
        if (!filename || filename === 'undefined' || filename === 'null') {
            return res.status(400).json({ error: 'Invalid filename provided' });
        }
        
        const imagePath = path.join(signaturesDir, filename);
        
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({ error: 'Signature image not found' });
        }

        // Set appropriate headers
        res.setHeader('Content-Type', 'image/png'); // Default to PNG, could be improved to detect actual type
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        
        // Send the image file
        res.sendFile(imagePath);

    } catch (error) {
        console.error('Error serving signature image:', error);
        res.status(500).json({ error: 'Failed to serve signature image' });
    }
});

// DELETE /api/signatures/:transactionId - Remove signature from transaction
router.delete('/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Delete signature image file if exists
        if (transaction.receiptSignature?.signatureImage?.filename) {
            const imagePath = path.join(signaturesDir, transaction.receiptSignature.signatureImage.filename);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Remove signature from transaction
        transaction.receiptSignature = undefined;
        await transaction.save();

        console.log(`✅ Signature removed from transaction ${transactionId} by ${req.user.name || 'Unknown User'}`);

        res.json({
            success: true,
            message: 'Signature removed successfully'
        });

    } catch (error) {
        console.error('Error removing signature:', error);
        res.status(500).json({ error: 'Failed to remove signature' });
    }
});

// GET /api/signatures/:transactionId - Get signature info for transaction
router.get('/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        const transaction = await Transaction.findById(transactionId)
            .populate('receiptSignature.approvedBy.userId', 'name role')
            .populate('receiptSignature.signatureImage.uploadedBy', 'name');
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json({
            success: true,
            signature: transaction.receiptSignature || null,
            hasSignature: !!transaction.receiptSignature
        });

    } catch (error) {
        console.error('Error getting signature info:', error);
        res.status(500).json({ error: 'Failed to get signature information' });
    }
});

module.exports = router;