/**
 * Orthodox Library API Routes
 * Endpoints for liturgical books and blocks
 */

const express = require('express');
const router = express.Router();
const LiturgicalBook = require('../models/LiturgicalBook');
const LiturgicalBlock = require('../models/LiturgicalBlock');

// ============ BOOKS ============

/**
 * GET /api/library/books
 * Get all liturgical books (with pagination and filtering)
 */
router.get('/books', async (req, res) => {
  try {
    const { status = 'published', type, featured, page = 1, limit = 20 } = req.query;
    
    // Build filter
    const filter = { status };
    if (type) filter.type = type;
    if (featured === 'true') filter.featured = true;
    
    const skip = (page - 1) * limit;
    
    const books = await LiturgicalBook.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ featured: -1, createdAt: -1 });
    
    const total = await LiturgicalBook.countDocuments(filter);
    
    res.json({
      success: true,
      data: books,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching books:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/library/books/search
 * Search books by title or keywords
 */
router.get('/books/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }
    
    const books = await LiturgicalBook.find(
      { $text: { $search: q }, status: 'published' },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } }).limit(10);
    
    res.json({ success: true, data: books });
  } catch (error) {
    console.error('❌ Error searching books:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/library/books/:bookId
 * Get single book with metadata
 */
router.get('/books/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    
    const book = await LiturgicalBook.findById(bookId);
    
    if (!book) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }
    
    // Increment view count
    book.viewCount = (book.viewCount || 0) + 1;
    await book.save();
    
    res.json({ success: true, data: book });
  } catch (error) {
    console.error('❌ Error fetching book:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/library/books
 * Create new book (admin only)
 */
router.post('/books', async (req, res) => {
  try {
    // TODO: Add authentication middleware to check if user is admin
    
    const bookData = req.body;
    const book = new LiturgicalBook({
      ...bookData,
      createdBy: req.user?.id || 'system',
      status: 'draft'
    });
    
    await book.save();
    res.status(201).json({ success: true, data: book });
  } catch (error) {
    console.error('❌ Error creating book:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/library/books/:bookId
 * Update book (admin only)
 */
router.put('/books/:bookId', async (req, res) => {
  try {
    // TODO: Add authentication middleware
    
    const { bookId } = req.params;
    const updateData = req.body;
    
    const book = await LiturgicalBook.findByIdAndUpdate(
      bookId,
      { ...updateData, updatedAt: new Date(), updatedBy: req.user?.id },
      { new: true, runValidators: true }
    );
    
    if (!book) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }
    
    res.json({ success: true, data: book });
  } catch (error) {
    console.error('❌ Error updating book:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ BLOCKS ============

/**
 * GET /api/library/books/:bookId/blocks
 * Get all blocks for a book (with optional section filter)
 */
router.get('/books/:bookId/blocks', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { section } = req.query;
    
    // Verify book exists
    const book = await LiturgicalBook.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }
    
    // Build filter
    const filter = { bookId };
    if (section) filter.section = section;
    
    const blocks = await LiturgicalBlock.find(filter)
      .sort({ globalOrder: 1 });
    
    res.json({
      success: true,
      data: blocks,
      count: blocks.length
    });
  } catch (error) {
    console.error('❌ Error fetching blocks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/library/books/:bookId/blocks/:blockId
 * Get single block
 */
router.get('/books/:bookId/blocks/:blockId', async (req, res) => {
  try {
    const { bookId, blockId } = req.params;
    
    const block = await LiturgicalBlock.findOne({
      _id: blockId,
      bookId
    });
    
    if (!block) {
      return res.status(404).json({ success: false, error: 'Block not found' });
    }
    
    res.json({ success: true, data: block });
  } catch (error) {
    console.error('❌ Error fetching block:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/library/books/:bookId/blocks
 * Create new block (admin only)
 */
router.post('/books/:bookId/blocks', async (req, res) => {
  try {
    // TODO: Add authentication middleware
    
    const { bookId } = req.params;
    const blockData = req.body;
    
    // Verify book exists
    const book = await LiturgicalBook.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }
    
    const block = new LiturgicalBlock({
      ...blockData,
      bookId,
      createdBy: req.user?.id || 'system'
    });
    
    await block.save();
    
    // Update book block count
    book.blockCount = await LiturgicalBlock.countDocuments({ bookId });
    await book.save();
    
    res.status(201).json({ success: true, data: block });
  } catch (error) {
    console.error('❌ Error creating block:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/library/books/:bookId/blocks/:blockId
 * Update block (admin only)
 */
router.put('/books/:bookId/blocks/:blockId', async (req, res) => {
  try {
    // TODO: Add authentication middleware
    
    const { bookId, blockId } = req.params;
    const updateData = req.body;
    
    const block = await LiturgicalBlock.findOneAndUpdate(
      { _id: blockId, bookId },
      { ...updateData, updatedAt: new Date(), updatedBy: req.user?.id },
      { new: true, runValidators: true }
    );
    
    if (!block) {
      return res.status(404).json({ success: false, error: 'Block not found' });
    }
    
    res.json({ success: true, data: block });
  } catch (error) {
    console.error('❌ Error updating block:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/library/books/:bookId/blocks/:blockId
 * Delete block (admin only)
 */
router.delete('/books/:bookId/blocks/:blockId', async (req, res) => {
  try {
    // TODO: Add authentication middleware
    
    const { bookId, blockId } = req.params;
    
    const block = await LiturgicalBlock.findOneAndDelete({
      _id: blockId,
      bookId
    });
    
    if (!block) {
      return res.status(404).json({ success: false, error: 'Block not found' });
    }
    
    // Update book block count
    const book = await LiturgicalBook.findById(bookId);
    if (book) {
      book.blockCount = await LiturgicalBlock.countDocuments({ bookId });
      await book.save();
    }
    
    res.json({ success: true, message: 'Block deleted' });
  } catch (error) {
    console.error('❌ Error deleting block:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
