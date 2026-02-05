const express = require('express');
const router = express.Router();
const { authenticateToken, writeAccess, readOnlyAccess } = require('../middleware/auth');

// Sample kids program data structure
const sampleProgram = {
  year: 2026,
  month: 2,
  title: "February 2026 - Orthodox Faith Foundations",
  description: "Learning about Orthodox traditions and values",
  weeks: [
    {
      week: 1,
      title: "Introduction to Orthodox Faith",
      theme: "What is Orthodox Christianity?",
      objectives: [
        "Understand the basics of Orthodox faith",
        "Learn about our church traditions",
        "Explore the importance of prayer"
      ],
      content: {
        story: "The Story of Saint Michael the Archangel",
        lesson: "Orthodox Christianity is one of the oldest forms of Christianity, tracing its roots back to the apostles. Our church follows the teachings and traditions that have been passed down for nearly 2,000 years.",
        activities: [
          "Draw a picture of Saint Michael",
          "Learn the Lord's Prayer in Ge'ez",
          "Practice making the sign of the cross"
        ],
        vocabulary: [
          { word: "Orthodox", definition: "Right belief or right worship" },
          { word: "Tradition", definition: "Customs passed down through generations" },
          { word: "Prayer", definition: "Talking to God" }
        ]
      },
      quiz: {
        questions: [
          {
            question: "What does 'Orthodox' mean?",
            options: ["Right belief", "New teaching", "Old book", "Church building"],
            correct: 0,
            explanation: "Orthodox means 'right belief' or 'right worship' in Greek."
          },
          {
            question: "How old is Orthodox Christianity?",
            options: ["100 years", "500 years", "Nearly 2,000 years", "50 years"],
            correct: 2,
            explanation: "Orthodox Christianity traces its roots back nearly 2,000 years to the apostles."
          }
        ]
      }
    },
    {
      week: 2,
      title: "The Holy Trinity",
      theme: "Father, Son, and Holy Spirit",
      objectives: [
        "Learn about the Trinity",
        "Understand the three persons of God",
        "Practice Trinitarian prayers"
      ],
      content: {
        story: "The Baptism of Jesus",
        lesson: "The Holy Trinity is the central mystery of our faith. God exists as three persons - Father, Son, and Holy Spirit - yet is one God. This is a mystery we accept with faith.",
        activities: [
          "Draw the Trinity symbol",
          "Learn the Trisagion prayer",
          "Act out the Baptism of Jesus"
        ],
        vocabulary: [
          { word: "Trinity", definition: "The three persons of God: Father, Son, Holy Spirit" },
          { word: "Mystery", definition: "Something we believe by faith" },
          { word: "Baptism", definition: "The sacrament of joining the church" }
        ]
      },
      quiz: {
        questions: [
          {
            question: "How many persons are in the Trinity?",
            options: ["One", "Two", "Three", "Four"],
            correct: 2,
            explanation: "The Trinity consists of three persons: Father, Son, and Holy Spirit."
          },
          {
            question: "What happened at Jesus' baptism that showed the Trinity?",
            options: ["Only Jesus was there", "The Father spoke and the Spirit descended", "Nothing special", "Angels appeared"],
            correct: 1,
            explanation: "At Jesus' baptism, the Father spoke from heaven and the Holy Spirit descended like a dove."
          }
        ]
      }
    }
  ]
};

// Get kids program for a specific month/year
router.get('/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    
    console.log(`📚 Kids Program request: ${year}/${month}`);
    
    // For now, return sample data
    // In a real implementation, this would fetch from database
    const program = {
      ...sampleProgram,
      year: parseInt(year),
      month: parseInt(month),
      title: `${getMonthName(month)} ${year} - Orthodox Faith Foundations`
    };
    
    res.json({
      success: true,
      data: program
    });
    
  } catch (error) {
    console.error('❌ Error fetching kids program:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch kids program'
    });
  }
});

// Get specific week data
router.get('/:year/:month/week/:week', async (req, res) => {
  try {
    const { year, month, week } = req.params;
    
    console.log(`📖 Kids Program week request: ${year}/${month}/week/${week}`);
    
    const weekData = sampleProgram.weeks.find(w => w.week === parseInt(week));
    
    if (!weekData) {
      return res.status(404).json({
        success: false,
        error: 'Week not found'
      });
    }
    
    res.json({
      success: true,
      data: weekData
    });
    
  } catch (error) {
    console.error('❌ Error fetching week data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch week data'
    });
  }
});

// Get quiz for a specific week
router.get('/:year/:month/week/:week/quiz', async (req, res) => {
  try {
    const { year, month, week } = req.params;
    const { includeAnswers } = req.query;
    
    console.log(`🧩 Kids Program quiz request: ${year}/${month}/week/${week}`);
    
    const weekData = sampleProgram.weeks.find(w => w.week === parseInt(week));
    
    if (!weekData || !weekData.quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }
    
    let quiz = { ...weekData.quiz };
    
    // Remove correct answers unless specifically requested (for admin)
    if (includeAnswers !== 'true') {
      quiz.questions = quiz.questions.map(q => ({
        question: q.question,
        options: q.options
      }));
    }
    
    res.json({
      success: true,
      data: quiz
    });
    
  } catch (error) {
    console.error('❌ Error fetching quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz'
    });
  }
});

// Submit quiz answers
router.post('/:year/:month/week/:week/quiz/submit', async (req, res) => {
  try {
    const { year, month, week } = req.params;
    const { answers } = req.body;
    
    console.log(`✅ Kids Program quiz submission: ${year}/${month}/week/${week}`);
    
    const weekData = sampleProgram.weeks.find(w => w.week === parseInt(week));
    
    if (!weekData || !weekData.quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }
    
    // Calculate score
    let correct = 0;
    const results = weekData.quiz.questions.map((question, index) => {
      const userAnswer = answers[index];
      const isCorrect = userAnswer === question.correct;
      if (isCorrect) correct++;
      
      return {
        question: question.question,
        userAnswer: userAnswer,
        correctAnswer: question.correct,
        isCorrect: isCorrect,
        explanation: question.explanation
      };
    });
    
    const score = Math.round((correct / weekData.quiz.questions.length) * 100);
    
    res.json({
      success: true,
      data: {
        score: score,
        correct: correct,
        total: weekData.quiz.questions.length,
        results: results,
        message: score >= 70 ? 'Great job! You passed!' : 'Keep studying and try again!'
      }
    });
    
  } catch (error) {
    console.error('❌ Error submitting quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit quiz'
    });
  }
});

// Update program (admin only)
router.put('/:year/:month', authenticateToken, writeAccess, async (req, res) => {
  try {
    const { year, month } = req.params;
    const updateData = req.body;
    
    console.log(`📝 Kids Program update: ${year}/${month}`);
    
    // In a real implementation, this would update the database
    res.json({
      success: true,
      message: 'Program updated successfully',
      data: updateData
    });
    
  } catch (error) {
    console.error('❌ Error updating program:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update program'
    });
  }
});

// Update specific week (admin only)
router.patch('/:year/:month/week/:week', authenticateToken, writeAccess, async (req, res) => {
  try {
    const { year, month, week } = req.params;
    const updateData = req.body;
    
    console.log(`📝 Kids Program week update: ${year}/${month}/week/${week}`);
    
    // In a real implementation, this would update the database
    res.json({
      success: true,
      message: 'Week updated successfully',
      data: updateData
    });
    
  } catch (error) {
    console.error('❌ Error updating week:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update week'
    });
  }
});

// Helper function to get month name
function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[parseInt(month) - 1] || 'Unknown';
}

module.exports = router;