const KidsProgram = require('../models/KidsProgram');

// Get current month's program
exports.getCurrentProgram = async (req, res) => {
  try {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const monthName = KidsProgram.getMonthName(month);

    let program = await KidsProgram.findOne({ 
      year, 
      month,
      isActive: true 
    }).populate('createdBy lastUpdatedBy', 'name email');

    res.json({ 
      success: true, 
      data: program,
      currentDate: { year, month, monthName }
    });
  } catch (error) {
    console.error('Get current program error:', error);
    res.status(500).json({ error: 'Server error fetching program' });
  }
};

// Get program by year and month
exports.getProgramByDate = async (req, res) => {
  try {
    const { year, month } = req.params;
    const monthName = KidsProgram.getMonthName(parseInt(month));

    const program = await KidsProgram.findOne({ 
      year: parseInt(year), 
      month: parseInt(month),
      isActive: true 
    }).populate('createdBy lastUpdatedBy', 'name email');

    // Get adjacent months for navigation
    const prevMonth = getPreviousMonth(parseInt(month), parseInt(year));
    const nextMonth = getNextMonth(parseInt(month), parseInt(year));

    const navigation = {
      previous: {
        year: prevMonth.year,
        month: prevMonth.month,
        monthName: KidsProgram.getMonthName(prevMonth.month)
      },
      next: {
        year: nextMonth.year,
        month: nextMonth.month,
        monthName: KidsProgram.getMonthName(nextMonth.month)
      },
      current: {
        year: parseInt(year),
        month: parseInt(month),
        monthName
      }
    };

    res.json({ 
      success: true, 
      data: program,
      navigation
    });
  } catch (error) {
    console.error('Get program by date error:', error);
    res.status(500).json({ error: 'Server error fetching program' });
  }
};

// Get available months with programs
exports.getAvailableMonths = async (req, res) => {
  try {
    const programs = await KidsProgram.find({ isActive: true })
      .select('year month monthName')
      .sort({ year: -1, month: -1 });

    res.json({
      success: true,
      data: programs
    });
  } catch (error) {
    console.error('Get available months error:', error);
    res.status(500).json({ error: 'Server error fetching available months' });
  }
};

// Create or update program
exports.saveProgram = async (req, res) => {
  try {
    const { year, month, weeks } = req.body;
    const userId = req.user ? req.user._id : null;
    const monthName = KidsProgram.getMonthName(month);

    // Validate weeks structure
    if (!weeks || !Array.isArray(weeks) || weeks.length === 0) {
      return res.status(400).json({ error: 'Invalid weeks data' });
    }

    // Ensure we have exactly 4 weeks
    if (weeks.length !== 4) {
      return res.status(400).json({ error: 'Program must have exactly 4 weeks' });
    }

    let program = await KidsProgram.findOne({ year, month });

    if (program) {
      // Update existing program
      program.weeks = weeks;
      program.lastUpdatedBy = userId;
    } else {
      // Create new program
      program = new KidsProgram({
        year,
        month,
        monthName,
        weeks,
        createdBy: userId,
        lastUpdatedBy: userId,
      });
    }

    await program.save();
    
    // Populate user data for response
    if (userId) {
      await program.populate('createdBy lastUpdatedBy', 'name email');
    }

    res.json({ 
      success: true, 
      message: 'Program saved successfully',
      data: program 
    });
  } catch (error) {
    console.error('Save program error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Invalid program data' });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Program for this month already exists' });
    }
    
    res.status(500).json({ error: 'Server error saving program' });
  }
};

// Get all programs (admin)
exports.getAllPrograms = async (req, res) => {
  try {
    const programs = await KidsProgram.find()
      .populate('createdBy lastUpdatedBy', 'name email')
      .sort({ year: -1, month: -1 });
    
    res.json({ success: true, data: programs });
  } catch (error) {
    console.error('Error fetching all programs:', error);
    res.status(500).json({ error: 'Server error fetching programs' });
  }
};

// Delete a program by ID (admin)
exports.deleteProgram = async (req, res) => {
  try {
    const { id } = req.params;
    await KidsProgram.findByIdAndDelete(id);
    res.json({ success: true, message: 'Program deleted successfully' });
  } catch (error) {
    console.error('Error deleting program:', error);
    res.status(500).json({ error: 'Server error deleting program' });
  }
};

// Helper functions for month navigation
function getPreviousMonth(month, year) {
  if (month === 1) {
    return { month: 12, year: year - 1 };
  }
  return { month: month - 1, year };
}

function getNextMonth(month, year) {
  if (month === 12) {
    return { month: 1, year: year + 1 };
  }
  return { month: month + 1, year };
}
