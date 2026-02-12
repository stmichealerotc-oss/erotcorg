const express = require('express');
const { body, validationResult } = require('express-validator');
const emailService = require('../utils/emailService');
const router = express.Router();

// Contact form validation rules
const contactValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[0-9\s\-\(\)]{0,20}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('subject')
    .isIn(['general', 'services', 'kids-program', 'volunteer', 'donation', 'pastoral', 'events', 'other'])
    .withMessage('Please select a valid subject'),
  
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters'),
  
  body('newsletter')
    .optional()
    .isBoolean()
    .withMessage('Newsletter preference must be true or false')
];

// POST /api/contact - Handle contact form submissions
router.post('/', contactValidation, async (req, res) => {
  try {
    console.log('📧 Contact form submission received:', {
      name: req.body.name,
      email: req.body.email,
      subject: req.body.subject,
      ip: req.ip
    });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name,
      email,
      phone,
      subject,
      message,
      newsletter,
      timestamp
    } = req.body;

    // Create contact submission object
    const contactSubmission = {
      name: name.trim(),
      email: email.toLowerCase(),
      phone: phone ? phone.trim() : '',
      subject,
      message: message.trim(),
      newsletter: newsletter || false,
      timestamp: timestamp || new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'new',
      createdAt: new Date()
    };

    // Log the submission
    const submissionId = generateSubmissionId();
    console.log('✅ Contact submission processed:', {
      submissionId,
      name: contactSubmission.name,
      email: contactSubmission.email,
      subject: contactSubmission.subject
    });

    // Send email notification to church admin
    try {
      await emailService.sendContactFormNotification(contactSubmission, submissionId);
      console.log('✅ Contact form notification email sent to admin');
    } catch (emailError) {
      console.error('❌ Failed to send notification email:', emailError.message);
      // Don't fail the request if email fails - submission is still logged
    }

    // Send auto-reply to user
    try {
      await emailService.sendContactFormAutoReply(contactSubmission);
      console.log('✅ Auto-reply email sent to user');
    } catch (emailError) {
      console.error('❌ Failed to send auto-reply email:', emailError.message);
      // Don't fail the request if email fails
    }

    // TODO: In production, also implement:
    // 1. Save to database (ContactSubmission model)
    // 2. Add to newsletter list if requested

    // Send success response
    res.status(200).json({
      status: 'success',
      message: 'Thank you for your message! We will get back to you within 24 hours.',
      data: {
        submissionId,
        timestamp: contactSubmission.timestamp
      }
    });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Sorry, there was an error processing your message. Please try again or contact us directly.',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Generate unique submission ID
function generateSubmissionId() {
  return 'CONTACT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// GET /api/contact/subjects - Get available contact subjects
router.get('/subjects', (req, res) => {
  const subjects = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'services', label: 'Church Services' },
    { value: 'kids-program', label: 'Kids Sunday School' },
    { value: 'volunteer', label: 'Volunteer Opportunities' },
    { value: 'donation', label: 'Donations & Support' },
    { value: 'pastoral', label: 'Pastoral Care' },
    { value: 'events', label: 'Events & Celebrations' },
    { value: 'other', label: 'Other' }
  ];

  res.json({
    status: 'success',
    data: subjects
  });
});

// GET /api/contact/info - Get contact information
router.get('/info', (req, res) => {
  const contactInfo = {
    organization: 'Saint Michael Eritrean Orthodox Tewahdo Church in Western Australia Inc',
    abn: '80 798 549 161',
    address: {
      street: '60 Osborne Street',
      suburb: 'Joondanna',
      state: 'WA',
      postcode: '6060',
      country: 'Australia'
    },
    phone: '0470 275 305',
    email: 'info@erotc.org',
    website: 'www.erotc.org',
    serviceHours: {
      office: {
        monday: '9:00 AM - 5:00 PM',
        tuesday: '9:00 AM - 5:00 PM',
        wednesday: '9:00 AM - 5:00 PM',
        thursday: '9:00 AM - 5:00 PM',
        friday: '9:00 AM - 5:00 PM',
        saturday: '10:00 AM - 2:00 PM',
        sunday: 'After service (by appointment)'
      },
      services: {
        sunday: '9:00 AM - 12:00 PM',
        kidsSchool: '10:00 AM - 11:30 AM'
      }
    }
  };

  res.json({
    status: 'success',
    data: contactInfo
  });
});

module.exports = router;
