const express = require('express');
const router = express.Router();
const LiturgicalBook = require('../models/LiturgicalBook');
const LiturgicalBlock = require('../models/LiturgicalBlock');
const VolunteerAssignment = require('../models/VolunteerAssignment');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// ── BOOKS ──────────────────────────────────────────────────────────────────

router.get('/books', async (req, res) => {
  try {
    const { type, status, category } = req.query;
    const filter = { tradition: 'eritrean-orthodox' };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (category) filter.category = category;
    const books = await LiturgicalBook.find(filter).select('-__v');
    res.json({ success: true, count: books.length, data: books });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching books', error: error.message });
  }
});

router.get('/books/:bookId', async (req, res) => {
  try {
    const book = await LiturgicalBook.findById(req.params.bookId).select('-__v');
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    res.json({ success: true, data: book });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching book', error: error.message });
  }
});

router.get('/books/:bookId/blocks', async (req, res) => {
  try {
    const { sectionId, subtitle, type, role } = req.query;
    const filter = { bookId: req.params.bookId };
    if (sectionId) filter.sectionId = sectionId;
    if (subtitle) filter.subtitle = subtitle;
    if (type) filter.type = type;
    if (role) filter.role = role;
    const blocks = await LiturgicalBlock.find(filter).sort({ sectionId: 1, order: 1 }).select('-__v');
    res.json({ success: true, count: blocks.length, data: blocks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching blocks', error: error.message });
  }
});

router.get('/books/:bookId/sections', async (req, res) => {
  try {
    const sections = await LiturgicalBlock.distinct('sectionId', { bookId: req.params.bookId });
    res.json({ success: true, count: sections.length, data: sections });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching sections', error: error.message });
  }
});

// GET /api/orthodox-library/books/:bookId/structure - sections + subtitles tree
router.get('/books/:bookId/structure', async (req, res) => {
  try {
    const blocks = await LiturgicalBlock.find(
      { bookId: req.params.bookId },
      { sectionId: 1, subtitle: 1, order: 1 }
    );

    // Build tree: { sectionId: { subtitle: { min, max } } }
    const tree = {};
    for (const b of blocks) {
      const sec = b.sectionId;
      const sub = b.subtitle || '';
      if (!tree[sec]) tree[sec] = {};
      if (!tree[sec][sub]) tree[sec][sub] = { min: b.order, max: b.order };
      else {
        tree[sec][sub].min = Math.min(tree[sec][sub].min, b.order);
        tree[sec][sub].max = Math.max(tree[sec][sub].max, b.order);
      }
    }

    const sections = Object.keys(tree).map(sec => ({
      sectionId: sec,
      subtitles: Object.entries(tree[sec]).map(([name, range]) => ({
        name,
        startVerse: range.min,
        endVerse:   range.max,
        verseCount: range.max - range.min + 1
      }))
    }));

    res.json({ success: true, data: sections });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching structure', error: error.message });
  }
});

// PUT /api/orthodox-library/books/:bookId/languages - Update book languages
router.put('/books/:bookId/languages', async (req, res) => {
  try {
    const { languages } = req.body;
    if (!Array.isArray(languages)) {
      return res.status(400).json({ success: false, message: 'languages must be an array' });
    }
    const book = await LiturgicalBook.findByIdAndUpdate(
      req.params.bookId,
      { languages, updatedAt: new Date() },
      { new: true }
    );
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    res.json({ success: true, data: book });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating languages', error: error.message });
  }
});

// ── BLOCKS ─────────────────────────────────────────────────────────────────

// Bulk submit - no auth (volunteers)
router.post('/blocks/bulk', async (req, res) => {
  try {
    const { blocks } = req.body;
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return res.status(400).json({ success: false, message: 'Blocks array is required' });
    }
    const result = await LiturgicalBlock.insertMany(blocks);
    res.status(201).json({ success: true, count: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error bulk creating blocks', error: error.message });
  }
});

// Single block - admin only
router.post('/blocks', authenticateToken, authorizeRoles('admin', 'super-admin'), async (req, res) => {
  try {
    const block = new LiturgicalBlock({ ...req.body });
    await block.save();
    res.status(201).json({ success: true, data: block });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating block', error: error.message });
  }
});

router.put('/blocks/:blockId', authenticateToken, authorizeRoles('admin', 'super-admin'), async (req, res) => {
  try {
    const block = await LiturgicalBlock.findOneAndUpdate(
      { blockId: req.params.blockId },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!block) return res.status(404).json({ success: false, message: 'Block not found' });
    res.json({ success: true, data: block });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating block', error: error.message });
  }
});

router.delete('/blocks/:blockId', authenticateToken, authorizeRoles('admin', 'super-admin'), async (req, res) => {
  try {
    const block = await LiturgicalBlock.findOneAndDelete({ blockId: req.params.blockId });
    if (!block) return res.status(404).json({ success: false, message: 'Block not found' });
    res.json({ success: true, message: 'Block deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting block', error: error.message });
  }
});

// ── ASSIGNMENTS ────────────────────────────────────────────────────────────

// GET all assignments (admin - filter by status/bookId/category/volunteer)
router.get('/assignments', async (req, res) => {
  try {
    const { status, volunteerEmail, bookId, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (volunteerEmail) filter.volunteerEmail = volunteerEmail;
    if (bookId) filter.bookId = bookId;
    if (category) filter.category = category;
    const assignments = await VolunteerAssignment.find(filter).sort({ createdAt: -1 }).select('-__v');
    res.json({ success: true, count: assignments.length, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET volunteer's own tasks
router.get('/assignments/my/:email', async (req, res) => {
  try {
    const assignments = await VolunteerAssignment.find({
      volunteerEmail: req.params.email,
      status: { $in: ['assigned', 'in-progress', 'completed', 'verified'] }
    }).sort({ assignedAt: -1 }).select('-__v');
    res.json({ success: true, count: assignments.length, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET task board for a book
router.get('/assignments/book/:bookId/progress', async (req, res) => {
  try {
    const assignments = await VolunteerAssignment.find({ bookId: req.params.bookId })
      .sort({ sectionId: 1, startOrder: 1 });
    const summary = {
      total:      assignments.length,
      unassigned: assignments.filter(a => a.status === 'unassigned').length,
      assigned:   assignments.filter(a => a.status === 'assigned').length,
      inProgress: assignments.filter(a => a.status === 'in-progress').length,
      completed:  assignments.filter(a => a.status === 'completed').length,
      verified:   assignments.filter(a => a.status === 'verified').length,
    };
    res.json({ success: true, summary, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create single task (volunteer optional)
router.post('/assignments', async (req, res) => {
  try {
    const { bookId, bookTitle, category, sectionId, startOrder, endOrder, language,
            volunteerEmail, volunteerName, notes } = req.body;
    if (!bookId || !bookTitle || !sectionId || !startOrder || !endOrder) {
      return res.status(400).json({ success: false, message: 'bookId, bookTitle, sectionId, startOrder, endOrder required' });
    }
    const totalBlocks = endOrder - startOrder + 1;
    const hasVolunteer = !!(volunteerEmail && volunteerName);
    const assignment = new VolunteerAssignment({
      assignmentId: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      bookId, bookTitle,
      category: category || 'other',
      sectionId, startOrder, endOrder,
      language: language || 'all',
      volunteerEmail: hasVolunteer ? volunteerEmail : null,
      volunteerName:  hasVolunteer ? volunteerName  : null,
      status: hasVolunteer ? 'assigned' : 'unassigned',
      assignedAt: hasVolunteer ? new Date() : null,
      progress: { completedBlocks: 0, totalBlocks },
      notes
    });
    await assignment.save();
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST bulk create tasks (splits a section into N equal tasks)
router.post('/assignments/bulk', async (req, res) => {
  try {
    const { bookId, bookTitle, category, sectionId, language, totalVerses, taskCount, notes } = req.body;
    if (!bookId || !bookTitle || !sectionId || !totalVerses || !taskCount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const versesPerTask = Math.ceil(totalVerses / taskCount);
    const tasks = [];
    for (let i = 0; i < taskCount; i++) {
      const startOrder = i * versesPerTask + 1;
      const endOrder = Math.min((i + 1) * versesPerTask, totalVerses);
      tasks.push({
        assignmentId: `task-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
        bookId, bookTitle,
        category: category || 'other',
        sectionId, startOrder, endOrder,
        language: language || 'all',
        volunteerEmail: null, volunteerName: null,
        status: 'unassigned',
        progress: { completedBlocks: 0, totalBlocks: endOrder - startOrder + 1 },
        notes
      });
    }
    const result = await VolunteerAssignment.insertMany(tasks);
    res.status(201).json({ success: true, count: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT assign volunteer to existing task
router.put('/assignments/:assignmentId/assign', async (req, res) => {
  try {
    const { volunteerEmail, volunteerName } = req.body;
    if (!volunteerEmail || !volunteerName) {
      return res.status(400).json({ success: false, message: 'volunteerEmail and volunteerName required' });
    }
    const assignment = await VolunteerAssignment.findOneAndUpdate(
      { assignmentId: req.params.assignmentId },
      { volunteerEmail, volunteerName, status: 'assigned', assignedAt: new Date(), updatedAt: new Date() },
      { new: true }
    );
    if (!assignment) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update status and progress
router.put('/assignments/:assignmentId/status', async (req, res) => {
  try {
    const { status, completedBlocks } = req.body;
    const update = { status, updatedAt: new Date() };
    if (status === 'in-progress') update.startedAt = new Date();
    if (status === 'completed') update.completedAt = new Date();
    if (completedBlocks !== undefined) update['progress.completedBlocks'] = completedBlocks;
    const assignment = await VolunteerAssignment.findOneAndUpdate(
      { assignmentId: req.params.assignmentId },
      update,
      { new: true }
    );
    if (!assignment) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE task
router.delete('/assignments/:assignmentId', async (req, res) => {
  try {
    const assignment = await VolunteerAssignment.findOneAndDelete({ assignmentId: req.params.assignmentId });
    if (!assignment) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
