const express = require('express');
const router = express.Router();
const VolunteerProfile = require('../models/VolunteerProfile');

// POST /api/volunteers/register - Self-registration (no auth needed)
router.post('/register', async (req, res) => {
  try {
    const { email } = req.body;

    // Upsert - allow re-registration to update profile
    const existing = await VolunteerProfile.findOne({ email });
    if (existing) {
      Object.assign(existing, req.body);
      existing.updatedAt = new Date();
      await existing.save();
      return res.json({ success: true, message: 'Profile updated', data: existing });
    }

    const profile = new VolunteerProfile(req.body);
    await profile.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful! An admin will review and assign tasks.',
      data: profile
    });
  } catch (error) {
    console.error('Volunteer registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/volunteers/profile/:email - Get own profile
router.get('/profile/:email', async (req, res) => {
  try {
    const profile = await VolunteerProfile.findOne({ email: req.params.email });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/volunteers - Get all volunteers (admin)
router.get('/', async (req, res) => {
  try {
    const { status, expertise, language } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (expertise) filter.expertise = expertise;
    if (language) filter.languages = language;

    const profiles = await VolunteerProfile.find(filter).sort({ registeredAt: -1 });
    res.json({ success: true, count: profiles.length, data: profiles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/volunteers/:email/status - Admin updates status
router.put('/:email/status', async (req, res) => {
  try {
    const profile = await VolunteerProfile.findOneAndUpdate(
      { email: req.params.email },
      { status: req.body.status, updatedAt: new Date() },
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/volunteers/:email/stats - Update stats after task completion
router.put('/:email/stats', async (req, res) => {
  try {
    const { tasksCompleted, blocksEntered } = req.body;
    const profile = await VolunteerProfile.findOne({ email: req.params.email });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    if (tasksCompleted) profile.stats.tasksCompleted += tasksCompleted;
    if (blocksEntered) profile.stats.blocksEntered += blocksEntered;
    profile.updatedAt = new Date();
    await profile.save();

    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
