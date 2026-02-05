// ============================================================================
// 1. AUTHENTICATION & API - COMPLETE FIXED VERSION
// ============================================================================

const API_BASE = '/api'; // Relative path that works with CSP
let currentUser = null;
let authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
let currentWeek = 1;
let currentProgramData = null;

// ✅ FIXED
async function apiCall(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`;
  
  const currentToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  try {
    console.log(`API Call: ${options.method || 'GET'} ${url}`, options.body);
    
    const response = await fetch(url, { 
      ...options, 
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined // ✅ only stringifies once
    });

    if (response.status === 401) {
      logout();
      throw new Error('Authentication failed. Please login again.');
    }

    const responseText = await response.text();
    console.log('API Response:', response.status, responseText);

    if (!response.ok) {
      let errorMessage = responseText || `Request failed with status ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {}
      throw new Error(errorMessage);
    }

    return responseText ? JSON.parse(responseText) : { success: true };
  } catch (error) {
    console.error('API call failed:', error);
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please ensure backend is running and accessible.');
    }
    
    throw error;
  }
}

async function login(email, password) {
  try {
    showMessage('Connecting to server...', 'info');
    
    // ✅ Pass plain object, not string
    const response = await apiCall('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    if (response && response.success) {
      const authToken = response.token;
      localStorage.setItem('authToken', authToken);
      currentUser = response.user;
      
      showMessage('Login successful!', 'success');
      return { success: true, user: response.user };
    } else {
      const errorMsg = response?.error || 'Invalid credentials';
      showMessage(errorMsg, 'error');
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    console.error('Login error:', error);
    const errorMsg = error.message || 'Connection failed. Please ensure the backend server is running.';
    showMessage(errorMsg, 'error');
    return { success: false, error: errorMsg };
  }
}


async function checkAuth() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.log('No auth token found');
    return false;
  }

  try {
    const response = await apiCall('/auth/profile');
    if (response && response.success) {
      currentUser = response.user;
      console.log('User authenticated:', currentUser.name);
      return true;
    }
    console.log('Auth check failed - invalid response');
    return false;
  } catch (error) {
    console.error('Auth check failed:', error);
    return false;
  }
}

function logout() {
  localStorage.removeItem('authToken');
  sessionStorage.removeItem('authToken');
  authToken = null;
  currentUser = null;
  showLoginForm();
  showMessage('Logged out successfully', 'info');
}

// Utility function to show messages
function showMessage(text, type) {
  // Create or find message container
  let messageDiv = document.getElementById('admin-message');
  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.id = 'admin-message';
    messageDiv.className = 'message';
    document.querySelector('main').prepend(messageDiv);
  }
  
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}
// ============================================================================
// 2. UI MANAGEMENT
// ============================================================================

function showLoginForm() {
  document.querySelector('main').innerHTML = `
    <div class="login-container">
      <div class="card">
        <h2><i class="fas fa-lock"></i> Admin Login</h2>
        <form id="loginForm">
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" value="admin@church.org" required>
          </div>
          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" value="admin123" required>
          </div>
          <button type="submit" class="btn-primary">
            <i class="fas fa-sign-in-alt"></i> Login
          </button>
        </form>
        <div id="loginMessage" class="message"></div>
      </div>
    </div>
  `;

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const messageDiv = document.getElementById('loginMessage');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
  messageDiv.className = 'message info';
  messageDiv.textContent = 'Logging in...';

  const result = await login(email, password);

  if (result.success) {
    messageDiv.className = 'message success';
    messageDiv.textContent = 'Login successful!';
    setTimeout(() => showAdminPanel(), 1000);
  } else {
    messageDiv.className = 'message error';
    messageDiv.textContent = result.error;
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
  }
}

function showAdminPanel() {
  document.querySelector('main').innerHTML = `
    <div class="admin-header">
      <div class="user-info">
        Welcome, <strong>${currentUser?.name || 'User'}</strong>
        <button id="logoutBtn" class="btn-secondary">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </div>
    
    <nav class="admin-nav">
      <div class="nav-links">
        <a href="#" data-section="dashboard" class="nav-link active">Dashboard</a>
        <a href="#" data-section="kids-program" class="nav-link">Kids Program</a>
      </div>
    </nav>
    
    <div id="admin-content"></div>
  `;

  setupNavigation();
  showAdminSection('dashboard');
}

function setupNavigation() {
  document.addEventListener('click', (e) => {
    if (e.target.matches('.nav-link') || e.target.closest('.nav-link')) {
      e.preventDefault();
      const link = e.target.matches('.nav-link') ? e.target : e.target.closest('.nav-link');
      const section = link.dataset.section;
      if (section) {
        showAdminSection(section);
      }
    }
    
    if (e.target.id === 'logoutBtn' || e.target.closest('#logoutBtn')) {
      logout();
    }
  });
}

function showAdminSection(sectionId) {
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.dataset.section === sectionId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  let content = '';
  if (sectionId === 'kids-program') {
    content = showKidsProgram();
  } else {
    content = showDashboard();
  }
  
  const adminContent = document.getElementById('admin-content');
  if (adminContent) {
    adminContent.innerHTML = content;
    setupContentListeners(sectionId);
  }
}

function showDashboard() {
  return `
    <div class="card">
      <h2>Admin Dashboard</h2>
      <div class="grid-2">
        <div class="card">
          <h3><i class="fas fa-child"></i> Kids Program</h3>
          <p>Manage weekly kids program with audio support.</p>
          <button class="btn-primary" id="goToProgram">Manage Program</button>
        </div>
        <div class="card">
          <h3><i class="fas fa-music"></i> Audio Features</h3>
          <p>Add audio to mezmur and liturgy responses.</p>
        </div>
      </div>
    </div>
  `;
}

function showKidsProgram() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  return `
    <div class="card">
      <h2>Kids Program Management</h2>
      <div class="program-controls">
        <select id="programMonth">
          ${Array.from({length: 12}, (_, i) => {
            const monthNum = i + 1;
            const monthName = new Date(2000, i).toLocaleString('default', { month: 'long' });
            const selected = monthNum === currentMonth ? 'selected' : '';
            return `<option value="${monthNum}" ${selected}>${monthName}</option>`;
          }).join('')}
        </select>
        <input type="number" id="programYear" value="${currentYear}" min="2020" max="2030">
        <button id="loadProgramBtn" class="btn-primary">Load Program</button>
        <button id="newProgramBtn" class="btn-secondary">New Program</button>
      </div>
    </div>

    <div class="card">
      <h3>Select Week</h3>
      <div class="week-selector">
        <button class="week-btn active" data-week="1">Week 1</button>
        <button class="week-btn" data-week="2">Week 2</button>
        <button class="week-btn" data-week="3">Week 3</button>
        <button class="week-btn" data-week="4">Week 4</button>
      </div>
    </div>

    <form id="kids-program-form">
      <div class="card">
        <h3>Basic Information</h3>
        <div class="form-group">
          <label>Theme:</label>
          <input type="text" id="week-theme" required>
        </div>
        <div class="form-group">
          <label>Memory Verse:</label>
          <textarea id="week-memory-verse" rows="3" required></textarea>
        </div>
      </div>

      <div class="card">
        <h3><i class="fas fa-music"></i> Mezmur</h3>
        <div id="mezmur-container"></div>
        <button type="button" id="addMezmurBtn" class="btn-secondary">Add Mezmur</button>
      </div>

      <div class="card">
        <h3><i class="fas fa-pray"></i> Prayer</h3>
        <div id="prayer-container"></div>
        <button type="button" id="addPrayerBtn" class="btn-secondary">Add Prayer</button>
      </div>

      <div class="card">
        <h3><i class="fas fa-bible"></i> Bible Study</h3>
        <div id="bible-study-container"></div>
        <button type="button" id="addBibleBtn" class="btn-secondary">Add Bible Study</button>
      </div>

      <div class="card">
        <h3><i class="fas fa-church"></i> Liturgy Responses</h3>
        <div id="liturgy-container"></div>
        <button type="button" id="addLiturgyBtn" class="btn-secondary">Add Liturgy</button>
      </div>

      <!-- NEW: Quiz Management Section -->
      <div class="card">
        <h3><i class="fas fa-brain"></i> Practice Quiz</h3>
        <div class="quiz-settings">
          <div class="form-group">
            <label>Quiz Title:</label>
            <input type="text" id="quiz-title" placeholder="Weekly Review Quiz">
          </div>
          <div class="form-group">
            <label>Time Limit (minutes):</label>
            <input type="number" id="quiz-time-limit" value="10" min="5" max="60">
          </div>
          <div class="form-group">
            <label>Passing Score (%):</label>
            <input type="number" id="quiz-passing-score" value="70" min="50" max="100">
          </div>
        </div>
        
        <div id="quiz-questions-container"></div>
        <button type="button" id="addQuestionBtn" class="btn-secondary">
          <i class="fas fa-plus"></i> Add Question
        </button>
        
        <div class="quiz-actions" style="margin-top: 1rem;">
          <button type="button" id="generateQuizBtn" class="btn-secondary">
            <i class="fas fa-magic"></i> Generate Quiz from Content
          </button>
          <button type="button" id="previewQuizBtn" class="btn-secondary">
            <i class="fas fa-eye"></i> Preview Quiz
          </button>
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn-primary">Save Changes</button>
        <button type="button" id="reloadDataBtn" class="btn-secondary">Reload Data</button>
        <button type="button" id="previewBtn" class="btn-secondary">Preview</button>
      </div>
    </form>

    <div id="message" class="message"></div>
  `;
}

// ============================================================================
// 3. DYNAMIC FIELDS - SIMPLIFIED TO MATCH SCHEMA
// ============================================================================

// Update the addMezmurField function
function addMezmurField(data = {}) {
  const container = document.getElementById('mezmur-container');
  if (!container) return;
  
  const index = container.children.length;

  const field = document.createElement('div');
  field.className = 'field-group';
  field.innerHTML = `
    <div class="field-header">
      <h4>Mezmur ${index + 1}</h4>
      <button type="button" class="btn-remove">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="form-group">
      <label>Title:</label>
      <input type="text" name="mezmur-title-${index}" value="${data.title || ''}" required>
    </div>
    <div class="form-group">
      <label>Description:</label>
      <input type="text" name="mezmur-desc-${index}" value="${data.description || ''}">
    </div>
    <div class="form-group">
      <label>Lyrics:</label>
      <textarea name="mezmur-lyrics-${index}" rows="4" required>${data.lyrics || ''}</textarea>
    </div>
    <div class="form-group">
      <label>Meaning:</label>
      <textarea name="mezmur-meaning-${index}" rows="3">${data.meaning || ''}</textarea>
    </div>
    <div class="form-group">
      <label>Audio URL:</label>
      <input type="url" name="mezmur-audio-${index}" value="${data.audio || ''}">
    </div>
  `;
  container.appendChild(field);
}

// Similarly update other field creation functions to use consistent naming patterns

function addPrayerField(data = {}) {
  const container = document.getElementById('prayer-container');
  if (!container) return;
  
  const index = container.children.length;

  const field = document.createElement('div');
  field.className = 'field-group';
  field.innerHTML = `
    <div class="field-header">
      <h4>Prayer ${index + 1}</h4>
      <button type="button" class="btn-remove">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="form-group">
      <label>Title:</label>
      <input type="text" name="prayer-title-${index}" value="${data.title || ''}" required>
    </div>
    <div class="form-group">
      <label>Type:</label>
      <select name="prayer-type-${index}" required>
        <option value="">Select Type</option>
        <option value="morning" ${data.type === 'morning' ? 'selected' : ''}>Morning Prayer</option>
        <option value="evening" ${data.type === 'evening' ? 'selected' : ''}>Evening Prayer</option>
        <option value="thanksgiving" ${data.type === 'thanksgiving' ? 'selected' : ''}>Thanksgiving</option>
        <option value="supplication" ${data.type === 'supplication' ? 'selected' : ''}>Supplication</option>
        <option value="intercession" ${data.type === 'intercession' ? 'selected' : ''}>Intercession</option>
      </select>
    </div>
    <div class="form-group">
      <label>Content:</label>
      <textarea name="prayer-content-${index}" rows="4" required>${data.content || ''}</textarea>
    </div>
    <div class="form-group">
      <label>Meaning:</label>
      <textarea name="prayer-meaning-${index}" rows="3" placeholder="Explain the purpose and meaning">${data.meaning || ''}</textarea>
    </div>
  `;
  container.appendChild(field);
}

function addBibleStudyField(data = {}) {
  const container = document.getElementById('bible-study-container');
  if (!container) return;
  
  const index = container.children.length;

  const field = document.createElement('div');
  field.className = 'field-group';
  field.innerHTML = `
    <div class="field-header">
      <h4>Bible Study ${index + 1}</h4>
      <button type="button" class="btn-remove">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="form-group">
      <label>Passage:</label>
      <input type="text" name="bible-passage-${index}" value="${data.passage || ''}" placeholder="e.g., Genesis 1:1-25" required>
    </div>
    <div class="form-group">
      <label>Topic:</label>
      <input type="text" name="bible-topic-${index}" value="${data.topic || ''}" placeholder="e.g., God Creates the World" required>
    </div>
    <div class="form-group">
      <label>Key Verse:</label>
      <input type="text" name="bible-verse-${index}" value="${data.keyVerse || ''}" placeholder="e.g., Genesis 1:1" required>
    </div>
    <div class="form-group">
      <label>Study Notes:</label>
      <textarea name="bible-notes-${index}" rows="4" required placeholder="Detailed explanation of the passage">${data.studyNotes || ''}</textarea>
    </div>
    <div class="form-group">
      <label>Reflection Questions:</label>
      <textarea name="bible-reflection-${index}" rows="3" placeholder="Thought-provoking questions for discussion">${data.reflectionQuestions || ''}</textarea>
    </div>
    <div class="form-group">
      <label>Activity:</label>
      <textarea name="bible-activity-${index}" rows="3" placeholder="Interactive activity related to the study">${data.activity || ''}</textarea>
    </div>
    <div class="form-group">
      <label>FAQ/Discussion:</label>
      <textarea name="bible-faq-${index}" rows="3" placeholder="Frequently asked questions and answers">${data.faqDiscussion || ''}</textarea>
    </div>
  `;
  container.appendChild(field);
}
function addLiturgyField(data = {}) {
  const container = document.getElementById('liturgy-container');
  if (!container) return;
  
  const index = container.children.length;

  const field = document.createElement('div');
  field.className = 'field-group';
  field.innerHTML = `
    <div class="field-header">
      <h4>Liturgy Response ${index + 1}</h4>
      <button type="button" class="btn-remove">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="form-group">
      <label>Part:</label>
      <input type="text" name="liturgy-part-${index}" value="${data.part || ''}" placeholder="e.g., Holy, Holy, Holy" required>
    </div>
    <div class="form-group">
      <label>When:</label>
      <input type="text" name="liturgy-when-${index}" value="${data.when || ''}" placeholder="e.g., During the Anaphora" required>
    </div>
    <div class="form-group">
      <label>Response:</label>
      <textarea name="liturgy-response-${index}" rows="3" required>${data.response || ''}</textarea>
    </div>
    <div class="form-group">
      <label>Meaning:</label>
      <textarea name="liturgy-meaning-${index}" rows="3" placeholder="Explain the liturgical significance">${data.meaning || ''}</textarea>
    </div>
    <div class="form-group">
      <label>Audio URL:</label>
      <input type="url" name="liturgy-audio-${index}" value="${data.audio || ''}" placeholder="https://example.com/audio.mp3">
    </div>
  `;
  container.appendChild(field);
}
function addQuizQuestionField(data = {}) {
  const container = document.getElementById('quiz-questions-container');
  if (!container) return;
  
  const index = container.children.length;
  const questionId = data._id || generateId();

  const field = document.createElement('div');
  field.className = 'field-group quiz-question';
  field.dataset.questionId = questionId;
  field.innerHTML = `
    <div class="field-header">
      <h4>Question ${index + 1}</h4>
      <div class="question-controls">
        <select class="question-type" name="question-type-${index}">
          <option value="multiple_choice" ${data.type === 'multiple_choice' ? 'selected' : ''}>Multiple Choice</option>
          <option value="true_false" ${data.type === 'true_false' ? 'selected' : ''}>True/False</option>
          <option value="short_answer" ${data.type === 'short_answer' ? 'selected' : ''}>Short Answer</option>
        </select>
        <select class="question-difficulty" name="question-difficulty-${index}">
          <option value="easy" ${data.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
          <option value="medium" ${data.difficulty === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="hard" ${data.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
        </select>
        <select class="question-age-group" name="question-age-group-${index}">
          <option value="3-5" ${data.ageGroup === '3-5' ? 'selected' : ''}>Ages 3-5</option>
          <option value="6-8" ${data.ageGroup === '6-8' ? 'selected' : ''}>Ages 6-8</option>
          <option value="9-12" ${data.ageGroup === '9-12' ? 'selected' : ''}>Ages 9-12</option>
        </select>
        <input type="number" class="question-points" name="question-points-${index}" 
               value="${data.points || 1}" min="1" max="5" placeholder="Points">
        <button type="button" class="btn-remove">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    
    <div class="form-group">
      <label>Question Text:</label>
      <textarea name="question-text-${index}" rows="3" required placeholder="Enter the question text">${data.question || ''}</textarea>
    </div>
    
    <div class="question-options" style="${data.type === 'short_answer' ? 'display: none;' : ''}">
      <div class="options-header">
        <label>Options:</label>
        <small>Select the correct answer with the radio button</small>
      </div>
      <div class="options-container" id="options-container-${index}">
        ${renderQuestionOptions(data, index)}
      </div>
      <button type="button" class="btn-secondary add-option-btn" data-index="${index}">
        <i class="fas fa-plus"></i> Add Option
      </button>
    </div>
    
    <div class="form-group">
      <label>Explanation (shown after answering):</label>
      <textarea name="question-explanation-${index}" rows="2" 
                placeholder="Explain why the correct answer is right">${data.explanation || ''}</textarea>
    </div>
  `;
  
  container.appendChild(field);
  
  // Add event listeners for this question
  setupQuestionEventListeners(field, index);
}

function renderQuestionOptions(data, index) {
  if (!data.options || data.options.length === 0) {
    // Default options for new questions
    return `
      <div class="option-row">
        <input type="radio" name="correct-option-${index}" value="0" checked>
        <input type="text" name="option-text-${index}-0" placeholder="Correct answer" required>
        <input type="text" name="option-explanation-${index}-0" placeholder="Why this is correct">
      </div>
      <div class="option-row">
        <input type="radio" name="correct-option-${index}" value="1">
        <input type="text" name="option-text-${index}-1" placeholder="Incorrect option" required>
        <input type="text" name="option-explanation-${index}-1" placeholder="Why this is wrong">
      </div>
      <div class="option-row">
        <input type="radio" name="correct-option-${index}" value="2">
        <input type="text" name="option-text-${index}-2" placeholder="Incorrect option" required>
        <input type="text" name="option-explanation-${index}-2" placeholder="Why this is wrong">
      </div>
    `;
  }
  
  return data.options.map((option, optIndex) => `
    <div class="option-row">
      <input type="radio" name="correct-option-${index}" value="${optIndex}" 
             ${option.isCorrect ? 'checked' : ''}>
      <input type="text" name="option-text-${index}-${optIndex}" 
             value="${option.text || ''}" placeholder="Option text" required>
      <input type="text" name="option-explanation-${index}-${optIndex}" 
             value="${option.explanation || ''}" placeholder="Explanation">
      ${optIndex >= 2 ? '<button type="button" class="btn-remove-option">&times;</button>' : ''}
    </div>
  `).join('');
}

function setupQuestionEventListeners(questionElement, index) {
  // Question type change
  const typeSelect = questionElement.querySelector('.question-type');
  typeSelect.addEventListener('change', function() {
    const optionsContainer = questionElement.querySelector('.question-options');
    if (this.value === 'short_answer') {
      optionsContainer.style.display = 'none';
    } else {
      optionsContainer.style.display = 'block';
    }
  });
  
  // Add option button
  const addOptionBtn = questionElement.querySelector('.add-option-btn');
  addOptionBtn.addEventListener('click', function() {
    addQuestionOption(questionElement, index);
  });
  
  // Remove option buttons
  questionElement.addEventListener('click', function(e) {
    if (e.target.matches('.btn-remove-option')) {
      e.target.closest('.option-row').remove();
    }
  });
}

function addQuestionOption(questionElement, questionIndex) {
  const optionsContainer = questionElement.querySelector('.options-container');
  const optionIndex = optionsContainer.children.length;
  
  const optionRow = document.createElement('div');
  optionRow.className = 'option-row';
  optionRow.innerHTML = `
    <input type="radio" name="correct-option-${questionIndex}" value="${optionIndex}">
    <input type="text" name="option-text-${questionIndex}-${optionIndex}" placeholder="Option text" required>
    <input type="text" name="option-explanation-${questionIndex}-${optionIndex}" placeholder="Explanation (optional)">
    <button type="button" class="btn-remove-option">&times;</button>
  `;
  
  optionsContainer.appendChild(optionRow);
}

// ============================================================================
// 4. DATA HANDLING - SIMPLIFIED
// ============================================================================

async function loadProgramData() {
  const year = document.getElementById('programYear')?.value;
  const month = document.getElementById('programMonth')?.value;
  
  if (!year || !month) {
    showMessage('Please select year and month', 'error');
    return;
  }
  
  try {
    const data = await apiCall(`/kids-program/${year}/${month}`);
    currentProgramData = data.data;
    loadCurrentWeekData();
    showMessage('Program loaded!', 'success');
  } catch (error) {
    showMessage('No program found. Create a new one.', 'info');
    clearForm();
  }
}

function loadCurrentWeekData() {
  if (!currentProgramData?.weeks) return;
  
  const weekData = currentProgramData.weeks.find(w => w.week === currentWeek);
  if (!weekData) {
    clearForm();
    return;
  }

  // Load basic info
  document.getElementById('week-theme').value = weekData.theme || '';
  document.getElementById('week-memory-verse').value = weekData.memoryVerse || '';

  // Load sections
  loadSectionData('mezmur', weekData.mezmur);
  loadSectionData('prayer', weekData.prayer);
  loadSectionData('bible-study', weekData.bibleStudy);
  loadSectionData('liturgy', weekData.divineLiturgy);
  
  // Load quiz data
  loadQuizData(weekData.practiceQuiz);
}

function loadQuizData(quizData) {
  if (!quizData) {
    // Set default quiz values
    document.getElementById('quiz-title').value = 'Weekly Review Quiz';
    document.getElementById('quiz-time-limit').value = 10;
    document.getElementById('quiz-passing-score').value = 70;
    document.getElementById('quiz-questions-container').innerHTML = '';
    return;
  }

  // Load quiz settings
  document.getElementById('quiz-title').value = quizData.title || 'Weekly Review Quiz';
  document.getElementById('quiz-time-limit').value = quizData.timeLimit || 10;
  document.getElementById('quiz-passing-score').value = quizData.passingScore || 70;

  // Load questions
  const container = document.getElementById('quiz-questions-container');
  container.innerHTML = '';
  
  if (quizData.questions && quizData.questions.length > 0) {
    quizData.questions.forEach(question => {
      addQuizQuestionField(question);
    });
  }
}
function loadSectionData(section, data) {
  const container = document.getElementById(`${section}-container`);
  if (!container) return;

  container.innerHTML = '';

  if (Array.isArray(data) && data.length > 0) {
    data.forEach((item) => {
      if (section === 'mezmur') {
        addMezmurField(item);
      } else if (section === 'prayer') {
        addPrayerField(item);
      } else if (section === 'bible-study') {
        addBibleStudyField(item);
      } else if (section === 'liturgy') {
        addLiturgyField(item);
      }
    });
  }
}

async function saveProgram(e) {
  e.preventDefault();
  e.stopPropagation();
  
  console.log('=== SAVE PROGRAM START ===');
  
  const year = document.getElementById('programYear')?.value;
  const month = document.getElementById('programMonth')?.value;
  
  if (!year || !month) {
    showMessage('Please select year and month', 'error');
    return;
  }
  
  try {
    const weekData = parseFormData();
    console.log('Week data to save:', weekData);

    // Basic validation
    if (!weekData.theme?.trim()) {
      showMessage('Theme is required', 'error');
      return;
    }

    if (!weekData.memoryVerse?.trim()) {
      showMessage('Memory Verse is required', 'error');
      return;
    }

    showMessage('Saving program...', 'info');

    // Prepare the data for API - FIXED: Use exact structure expected by backend
    const saveData = {
      theme: weekData.theme,
      memoryVerse: weekData.memoryVerse,
      mezmur: weekData.mezmur || [],
      prayer: weekData.prayer || [],
      bibleStudy: weekData.bibleStudy || [],
      divineLiturgy: weekData.divineLiturgy || [],
      practiceQuiz: weekData.practiceQuiz || {
        title: 'Weekly Review Quiz',
        questions: [],
        timeLimit: 10,
        passingScore: 70,
        totalPoints: 0
      },
      // Add any other fields that might be required
      learningObjectives: weekData.learningObjectives || [],
      keyTakeaways: weekData.keyTakeaways || []
    };

    console.log('Sending to API:', saveData);

    // Use PATCH - it exists in your backend
    const response = await apiCall(`/kids-program/${year}/${month}/week/${currentWeek}`, {
      method: 'PATCH', // This should work - your backend has this route
      body: saveData
    });

    console.log('Save response:', response);

    if (response && response.success) {
      showMessage('Program saved successfully!', 'success');
      currentProgramData = response.data;
      
      // Reload the data to ensure sync
      setTimeout(() => loadProgramData(), 1000);
    } else {
      throw new Error(response?.message || 'Save failed - no success response');
    }

  } catch (error) {
    console.error('Save error:', error);
    
    // Enhanced error handling
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      showMessage('Save failed: API endpoint not found. The PATCH route might have validation issues.', 'error');
    } else if (error.message.includes('Validation failed')) {
      showMessage('Save failed: Data validation error. Check that all fields are correctly filled.', 'error');
    } else {
      showMessage('Save failed: ' + error.message, 'error');
    }
  }
  
  console.log('=== SAVE PROGRAM END ===');
}

// Add this temporary debug route to your admin.js
async function debugSave() {
  const year = document.getElementById('programYear')?.value;
  const month = document.getElementById('programMonth')?.value;
  const weekData = parseFormData();
  
  const saveData = {
    theme: weekData.theme,
    memoryVerse: weekData.memoryVerse,
    mezmur: weekData.mezmur,
    prayer: weekData.prayer,
    bibleStudy: weekData.bibleStudy,
    divineLiturgy: weekData.divineLiturgy,
    practiceQuiz: weekData.practiceQuiz
  };

  console.log('=== DEBUG SAVE ===');
  console.log('URL:', `/api/kids-program/${year}/${month}/week/${currentWeek}`);
  console.log('Data:', saveData);

  try {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`/api/kids-program/${year}/${month}/week/${currentWeek}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(saveData)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const text = await response.text();
    console.log('Response text:', text);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    
    const data = JSON.parse(text);
    console.log('Parsed response:', data);
    
    return data;
  } catch (error) {
    console.error('Debug save error:', error);
    throw error;
  }
}
// Alternative save function using the PUT route
async function saveProgramWithPut(e) {
  e.preventDefault();
  
  const year = document.getElementById('programYear')?.value;
  const month = document.getElementById('programMonth')?.value;
  
  try {
    const weekData = parseFormData();
    showMessage('Saving program...', 'info');

    // Use the PUT route that updates the entire program
    const response = await apiCall(`/kids-program/${year}/${month}`, {
      method: 'PUT',
      body: {
        // Update only the current week
        weeks: [{
          week: currentWeek,
          theme: weekData.theme,
          memoryVerse: weekData.memoryVerse,
          mezmur: weekData.mezmur,
          prayer: weekData.prayer,
          bibleStudy: weekData.bibleStudy,
          divineLiturgy: weekData.divineLiturgy,
          practiceQuiz: weekData.practiceQuiz
        }]
      }
    });

    if (response && response.success) {
      showMessage('Program saved successfully!', 'success');
      currentProgramData = response.data;
    } else {
      throw new Error('Save failed');
    }
    
  } catch (error) {
    console.error('Save error:', error);
    showMessage('Save failed: ' + error.message, 'error');
  }
}
// Test this in browser console: debugSave().then(console.log).catch(console.error)
// ============================================================================
// CRITICAL MISSING FUNCTION - Add this to admin.js
// ============================================================================

function parseQuizQuestions() {
  const questions = [];
  const questionElements = document.querySelectorAll('.quiz-question');
  
  questionElements.forEach((questionEl, index) => {
    const questionId = questionEl.dataset.questionId || generateId();
    const type = questionEl.querySelector(`[name="question-type-${index}"]`)?.value || 'multiple_choice';
    const difficulty = questionEl.querySelector(`[name="question-difficulty-${index}"]`)?.value || 'medium';
    const ageGroup = questionEl.querySelector(`[name="question-age-group-${index}"]`)?.value || '6-8';
    const points = parseInt(questionEl.querySelector(`[name="question-points-${index}"]`)?.value) || 1;
    const questionText = questionEl.querySelector(`[name="question-text-${index}"]`)?.value || '';
    const explanation = questionEl.querySelector(`[name="question-explanation-${index}"]`)?.value || '';
    
    if (!questionText.trim()) return; // Skip empty questions
    
    const question = {
      _id: questionId,
      question: questionText,
      type: type,
      difficulty: difficulty,
      ageGroup: ageGroup,
      points: points,
      explanation: explanation
    };
    
    // Parse options for multiple choice and true/false questions
    if (type !== 'short_answer') {
      question.options = parseQuestionOptions(questionEl, index);
      
      // Set correctAnswer for multiple choice
      if (type === 'multiple_choice' || type === 'true_false') {
        const correctOption = question.options.find(opt => opt.isCorrect);
        if (correctOption) {
          question.correctAnswer = correctOption.text;
        }
      }
    } else {
      // For short answer, we might want to set a sample correct answer
      question.correctAnswer = "Answers may vary";
    }
    
    questions.push(question);
  });
  
  return questions;
}

function parseQuestionOptions(questionEl, questionIndex) {
  const options = [];
  const optionInputs = questionEl.querySelectorAll(`[name^="option-text-${questionIndex}-"]`);
  
  optionInputs.forEach((optInput, optIndex) => {
    const optionText = optInput.value.trim();
    if (!optionText) return;
    
    // Find the correct option radio button
    const correctRadio = questionEl.querySelector(`[name="correct-option-${questionIndex}"][value="${optIndex}"]`);
    const isCorrect = correctRadio ? correctRadio.checked : false;
    
    // Find explanation
    const explanationInput = questionEl.querySelector(`[name="option-explanation-${questionIndex}-${optIndex}"]`);
    const explanation = explanationInput ? explanationInput.value : '';
    
    options.push({
      text: optionText,
      isCorrect: isCorrect,
      explanation: explanation
    });
  });
  
  return options;
}

function parseSection(sectionName) {
  const elements = [];
  const container = document.getElementById(`${sectionName}-container`);
  
  if (!container) return elements;

  const fieldGroups = container.querySelectorAll('.field-group');
  
  fieldGroups.forEach((fieldGroup, index) => {
    const element = {};
    const inputs = fieldGroup.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      if (input.name && input.name.startsWith(`${sectionName}-`)) {
        const fieldName = input.name.replace(`${sectionName}-`, '').split('-')[0];
        element[fieldName] = input.value;
      }
    });

    // Add specific field mappings for each section
    if (sectionName === 'mezmur') {
      element.title = fieldGroup.querySelector(`[name="mezmur-title-${index}"]`)?.value || '';
      element.description = fieldGroup.querySelector(`[name="mezmur-desc-${index}"]`)?.value || '';
      element.lyrics = fieldGroup.querySelector(`[name="mezmur-lyrics-${index}"]`)?.value || '';
      element.meaning = fieldGroup.querySelector(`[name="mezmur-meaning-${index}"]`)?.value || '';
      element.audio = fieldGroup.querySelector(`[name="mezmur-audio-${index}"]`)?.value || '';
    } else if (sectionName === 'prayer') {
      element.title = fieldGroup.querySelector(`[name="prayer-title-${index}"]`)?.value || '';
      element.type = fieldGroup.querySelector(`[name="prayer-type-${index}"]`)?.value || '';
      element.content = fieldGroup.querySelector(`[name="prayer-content-${index}"]`)?.value || '';
      element.meaning = fieldGroup.querySelector(`[name="prayer-meaning-${index}"]`)?.value || '';
} else if (sectionName === 'bible-study') {
  element.passage = fieldGroup.querySelector(`[name="bible-passage-${index}"]`)?.value || '';
  element.topic = fieldGroup.querySelector(`[name="bible-topic-${index}"]`)?.value || '';
  element.keyVerse = fieldGroup.querySelector(`[name="bible-verse-${index}"]`)?.value || '';
  element.studyNotes = fieldGroup.querySelector(`[name="bible-notes-${index}"]`)?.value || '';
  // CORRECTED FIELD NAMES:
  element.reflectionQuestions = fieldGroup.querySelector(`[name="bible-reflection-${index}"]`)?.value || '';
  element.activity = fieldGroup.querySelector(`[name="bible-activity-${index}"]`)?.value || '';
  element.faqDiscussion = fieldGroup.querySelector(`[name="bible-faq-${index}"]`)?.value || '';
} else if (sectionName === 'liturgy') {
      element.part = fieldGroup.querySelector(`[name="liturgy-part-${index}"]`)?.value || '';
      element.when = fieldGroup.querySelector(`[name="liturgy-when-${index}"]`)?.value || '';
      element.response = fieldGroup.querySelector(`[name="liturgy-response-${index}"]`)?.value || '';
      element.meaning = fieldGroup.querySelector(`[name="liturgy-meaning-${index}"]`)?.value || '';
      element.audio = fieldGroup.querySelector(`[name="liturgy-audio-${index}"]`)?.value || '';
    }

    if (Object.keys(element).length > 0) {
      elements.push(element);
    }
  });

  return elements;
}

function parseFormData() {
  console.log('=== PARSING FORM DATA ===');
  
  // Basic info
  const theme = document.getElementById('week-theme')?.value || '';
  const memoryVerse = document.getElementById('week-memory-verse')?.value || '';

  // Quiz settings
  const quizTitle = document.getElementById('quiz-title')?.value || 'Weekly Review Quiz';
  const quizTimeLimit = parseInt(document.getElementById('quiz-time-limit')?.value) || 10;
  const quizPassingScore = parseInt(document.getElementById('quiz-passing-score')?.value) || 70;

  // Parse quiz questions
  const questions = parseQuizQuestions();
  
  // Parse other sections
  const mezmur = parseSection('mezmur');
  const prayer = parseSection('prayer');
  const bibleStudy = parseSection('bible-study');
  const divineLiturgy = parseSection('liturgy');

  const result = {
    theme,
    memoryVerse,
    mezmur,
    prayer,
    bibleStudy,
    divineLiturgy,
    practiceQuiz: {
      title: quizTitle,
      timeLimit: quizTimeLimit,
      passingScore: quizPassingScore,
      questions: questions,
      totalPoints: questions.reduce((sum, q) => sum + (q.points || 1), 0)
    },
    learningObjectives: [],
    keyTakeaways: []
  };

  console.log('Parsed form data:', result);
  return result;
}

function generateId() {
  return 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
function clearForm() {
  document.getElementById('week-theme').value = '';
  document.getElementById('week-memory-verse').value = '';
  
  ['mezmur', 'prayer', 'bible-study', 'liturgy'].forEach(section => {
    const container = document.getElementById(`${section}-container`);
    if (container) container.innerHTML = '';
  });
}

function showPreview() {
  const weekData = parseFormData();
  const previewContent = generatePreviewHTML(weekData);
  
  // Create preview modal
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Week ${currentWeek} Preview</h3>
        <button class="close-modal">&times;</button>
      </div>
      <div class="modal-body">
        ${previewContent}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close modal handlers
  modal.querySelector('.close-modal').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

function generatePreviewHTML(weekData) {
  return `
    <div class="preview-content">
      <div class="preview-section">
        <h4>Theme</h4>
        <p>${weekData.theme}</p>
      </div>
      
      <div class="preview-section">
        <h4>Memory Verse</h4>
        <p>${weekData.memoryVerse}</p>
      </div>
      
      ${weekData.mezmur.length > 0 ? `
        <div class="preview-section">
          <h4>Mezmur (${weekData.mezmur.length})</h4>
          ${weekData.mezmur.map(mezmur => `
            <div class="preview-item">
              <strong>${mezmur.title}</strong>
              ${mezmur.description ? `<p>${mezmur.description}</p>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      ${weekData.prayer.length > 0 ? `
        <div class="preview-section">
          <h4>Prayers (${weekData.prayer.length})</h4>
          ${weekData.prayer.map(prayer => `
            <div class="preview-item">
              <strong>${prayer.title}</strong> - ${prayer.type}
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      ${weekData.bibleStudy.length > 0 ? `
        <div class="preview-section">
          <h4>Bible Studies (${weekData.bibleStudy.length})</h4>
          ${weekData.bibleStudy.map(study => `
            <div class="preview-item">
              <strong>${study.topic}</strong>
              <p>${study.passage}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      ${weekData.divineLiturgy.length > 0 ? `
        <div class="preview-section">
          <h4>Liturgy Responses (${weekData.divineLiturgy.length})</h4>
          ${weekData.divineLiturgy.map(liturgy => `
            <div class="preview-item">
              <strong>${liturgy.part}</strong>
              <p>${liturgy.when}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function showMessage(text, type) {
  const messageDiv = document.getElementById('message');
  if (!messageDiv) return;
  
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 3000);
}
async function generateQuizFromContent() {
  const year = document.getElementById('programYear').value;
  const month = document.getElementById('programMonth').value;
  
  if (!year || !month) {
    showMessage('Please select year and month first', 'error');
    return;
  }

  try {
    showMessage('Generating quiz questions from content...', 'info');
    
    const response = await apiCall(`/kids-program/${year}/${month}/week/${currentWeek}/quiz?includeAnswers=true`);
    
    if (response.success && response.data.questions) {
      // Clear existing questions
      document.getElementById('quiz-questions-container').innerHTML = '';
      
      // Add generated questions
      response.data.questions.forEach(question => {
        addQuizQuestionField(question);
      });
      
      showMessage(`Generated ${response.data.questions.length} quiz questions!`, 'success');
    } else {
      showMessage('No questions could be generated', 'warning');
    }
  } catch (error) {
    console.error('Quiz generation error:', error);
    showMessage('Failed to generate quiz: ' + error.message, 'error');
  }
}

function previewQuiz() {
  const quizData = parseFormData().practiceQuiz;
  
  if (!quizData.questions || quizData.questions.length === 0) {
    showMessage('No questions to preview', 'warning');
    return;
  }

  const previewContent = generateQuizPreviewHTML(quizData);
  
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 800px;">
      <div class="modal-header">
        <h3>Quiz Preview: ${quizData.title}</h3>
        <button class="close-modal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="quiz-preview-info">
          <p><strong>Time Limit:</strong> ${quizData.timeLimit} minutes</p>
          <p><strong>Passing Score:</strong> ${quizData.passingScore}%</p>
          <p><strong>Total Questions:</strong> ${quizData.questions.length}</p>
          <p><strong>Total Points:</strong> ${quizData.totalPoints}</p>
        </div>
        ${previewContent}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function generateQuizPreviewHTML(quizData) {
  return `
    <div class="quiz-preview">
      ${quizData.questions.map((question, index) => `
        <div class="preview-question">
          <div class="question-header">
            <span class="question-number">Q${index + 1}</span>
            <span class="question-meta">
              ${question.points}pt • ${question.difficulty} • ${question.ageGroup}
            </span>
          </div>
          <p class="question-text">${question.question}</p>
          
          ${question.type !== 'short_answer' ? `
            <div class="preview-options">
              ${question.options.map((option, optIndex) => `
                <div class="preview-option ${option.isCorrect ? 'correct' : ''}">
                  <span class="option-marker">${String.fromCharCode(65 + optIndex)}</span>
                  <span class="option-text">${option.text}</span>
                  ${option.isCorrect ? '<span class="correct-badge">✓ Correct</span>' : ''}
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="short-answer-preview">
              <em>Short answer question - students will type their response</em>
            </div>
          `}
          
          ${question.explanation ? `
            <div class="explanation-preview">
              <strong>Explanation:</strong> ${question.explanation}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
}
// ============================================================================
// 5. EVENT LISTENERS & INITIALIZATION
// ============================================================================

function setupContentListeners(sectionId) {
  if (sectionId === 'kids-program') {
    // Week selection
    document.addEventListener('click', (e) => {
      if (e.target.matches('.week-btn')) {
        document.querySelectorAll('.week-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentWeek = parseInt(e.target.dataset.week);
        loadCurrentWeekData();
      }
    });
    // Initialize with default fields
   setTimeout(() => {
      if (document.getElementById('mezmur-container').children.length === 0) {
        addMezmurField();
      }
      if (document.getElementById('prayer-container').children.length === 0) {
        addPrayerField();
      }
      if (document.getElementById('bible-study-container').children.length === 0) {
        addBibleStudyField();
      }
      if (document.getElementById('liturgy-container').children.length === 0) {
        addLiturgyField();
      }
      if (document.getElementById('quiz-questions-container').children.length === 0) {
        addQuizQuestionField(); // Add default quiz question
      }
    }, 100);

    // Add field buttons
    document.getElementById('addMezmurBtn')?.addEventListener('click', () => addMezmurField());
    document.getElementById('addPrayerBtn')?.addEventListener('click', () => addPrayerField());
    document.getElementById('addBibleBtn')?.addEventListener('click', () => addBibleStudyField());
    document.getElementById('addLiturgyBtn')?.addEventListener('click', () => addLiturgyField());

    // Program controls
    document.getElementById('loadProgramBtn')?.addEventListener('click', loadProgramData);
    document.getElementById('newProgramBtn')?.addEventListener('click', () => {
      currentProgramData = null;
      clearForm();
      showMessage('New program started', 'info');
    });
    document.getElementById('reloadDataBtn')?.addEventListener('click', loadCurrentWeekData);
    document.getElementById('previewBtn')?.addEventListener('click', showPreview);

    // Form submission
// Robust form submission with fallback
document.getElementById('kids-program-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const year = document.getElementById('programYear')?.value;
  const month = document.getElementById('programMonth')?.value;
  
  if (!year || !month) {
    showMessage('Please select year and month', 'error');
    return;
  }
  
  try {
    const weekData = parseFormData();
    showMessage('Saving program...', 'info');
    
    // Try PATCH first (preferred method)
    try {
      console.log('Trying PATCH method...');
      const response = await apiCall(`/kids-program/${year}/${month}/week/${currentWeek}`, {
        method: 'PATCH',
        body: weekData
      });
      
      if (response && response.success) {
        showMessage('Program saved successfully!', 'success');
        currentProgramData = response.data;
        return;
      }
    } catch (patchError) {
      console.log('PATCH failed, trying PUT...', patchError.message);
    }
    
    // Fallback to PUT method
    try {
      console.log('Trying PUT method...');
      const response = await apiCall(`/kids-program/${year}/${month}`, {
        method: 'PUT',
        body: {
          weeks: [{
            week: currentWeek,
            ...weekData
          }]
        }
      });
      
      if (response && response.success) {
        showMessage('Program saved successfully (using PUT)!', 'success');
        currentProgramData = response.data;
        return;
      }
    } catch (putError) {
      console.log('PUT also failed:', putError.message);
    }
    
    // If both methods fail
    throw new Error('Both PATCH and PUT methods failed');
    
  } catch (error) {
    console.error('Final save error:', error);
    showMessage('Save failed: ' + error.message, 'error');
  }
});// Quiz management buttons
    document.getElementById('addQuestionBtn')?.addEventListener('click', () => addQuizQuestionField());
    document.getElementById('generateQuizBtn')?.addEventListener('click', generateQuizFromContent);
    document.getElementById('previewQuizBtn')?.addEventListener('click', previewQuiz);
    // Remove field buttons
    document.addEventListener('click', (e) => {
      if (e.target.matches('.btn-remove') || e.target.closest('.btn-remove')) {
        const btn = e.target.matches('.btn-remove') ? e.target : e.target.closest('.btn-remove');
        const fieldGroup = btn.closest('.field-group');
        if (fieldGroup) {
          fieldGroup.remove();
        }
      }
    });
  } else if (sectionId === 'dashboard') {
    document.getElementById('goToProgram')?.addEventListener('click', () => showAdminSection('kids-program'));
  }
}
// Add this function to generate simple IDs
function generateId() {
  // Generate a MongoDB-like ObjectId (24 character hex string)
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const random = Array.from({length: 16}, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return timestamp + random;
}

// Alternative: Use simple numeric IDs for new questions
function generateSimpleId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}
async function initializeAdmin() {
  const isAuthenticated = await checkAuth();
  
  if (isAuthenticated) {
    showAdminPanel();
  } else {
    showLoginForm();
  }
}

// Start the app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAdmin);
} else {
  initializeAdmin();
}