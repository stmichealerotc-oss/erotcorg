const express = require('express');
const router = express.Router();
const { authenticateToken, writeAccess, readOnlyAccess } = require('../middleware/auth');
const {
  getCurrentProgram,
  getProgramByDate,
  getAvailableMonths,
  saveProgram,
  getAllPrograms,
  deleteProgram
} = require('../controllers/kidsProgramController');

// Public routes - no authentication required
router.get('/current', getCurrentProgram);
router.get('/:year/:month', getProgramByDate);
router.get('/available', getAvailableMonths);

// Protected routes - authentication required
router.post('/', authenticateToken, writeAccess, saveProgram);
router.put('/', authenticateToken, writeAccess, saveProgram);

// Admin routes - authentication and write access required
router.get('/admin/all', authenticateToken, writeAccess, getAllPrograms);
router.delete('/admin/:id', authenticateToken, writeAccess, deleteProgram)

module.exports = router;