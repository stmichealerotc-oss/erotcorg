const API_BASE = 'http://localhost:3000/api';
let currentUser = null;
let authToken = localStorage.getItem('authToken');
let currentWeek = 1;
let currentProgramData = null;

// Authentication functions
async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      currentUser = data.user;
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Network error during login' };
  }
}

async function checkAuth() {
  if (!authToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      currentUser = data.user;
      return true;
    } else {
      localStorage.removeItem('authToken');
      authToken = null;
      return false;
    }
  } catch (error) {
    console.error('Auth check error:', error);
    localStorage.removeItem('authToken');
    authToken = null;
    return false;
  }
}

function logout() {
  localStorage.removeItem('authToken');
  authToken = null;
  currentUser = null;
  showLoginForm();
}

// API call helper
async function apiCall(endpoint, options = {}) {
  if (!authToken) {
    throw new Error('Not authenticated');
  }

  // Ensure headers include Content-Type and Authorization,
  // and merge with any additional headers passed in options
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Try to parse JSON only if possible, or handle empty body gracefully
  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = null; // or {}
  }

  if (!response.ok) {
    throw new Error(data?.error || `API request failed with status ${response.status}`);
  }

  return data;
}

// Login UI
function showLoginForm() {
  document.querySelector('main').innerHTML = `
    <div class="login-container">
      <div class="card">
        <h2><i class="fas fa-lock"></i> Admin Login</h2>
        <form id="loginForm">
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" required>
          </div>
          <button type="submit" class="btn-primary">
            <i class="fas fa-sign-in-alt"></i> Login
          </button>
        </form>
        <div id="loginMessage" class="message"></div>
      </div>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('loginMessage');

    const result = await login(email, password);

    if (result.success) {
      messageDiv.className = 'message success';
      messageDiv.textContent = 'Login successful!';
      setTimeout(() => {
        showAdminPanel();
      }, 1000);
    } else {
      messageDiv.className = 'message error';
      messageDiv.textContent = result.error;
    }
  });
}

// Admin Panel UI
function showAdminPanel() {
  document.querySelector('main').innerHTML = `
    <div class="admin-header">
      <div class="user-info">
        Welcome, <strong>${currentUser.name}</strong> (${currentUser.role})
        <button onclick="logout()" class="btn-secondary">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </div>

    <div id="admin-content">
      <!-- Content will be loaded here -->
    </div>
  `;

  showAdminSection('dashboard');
}

// Navigation between sections
function showAdminSection(sectionId) {
  // Update navigation links
  document.querySelectorAll('.nav-links a[data-section]').forEach(link => {
    link.classList.remove('active-link');
  });
  document.querySelector(`.nav-links a[data-section="${sectionId}"]`).classList.add('active-link');

  // Show the correct section
  let content = '';
  
  switch(sectionId) {
    case 'dashboard':
      content = showDashboard();
      break;
    case 'kids-program':
      content = showKidsProgram();
      break;
    default:
      content = showDashboard();
  }
  
  document.getElementById('admin-content').innerHTML = content;
}

// Dashboard Section
function showDashboard() {
  return `
    <div class="grid-3">
      <div class="card">
        <h3><i class="fas fa-child"></i> Kids Program</h3>
        <p>Manage weekly kids program content including mezmur, prayers, Bible study, and liturgy responses.</p>
        <button class="btn-primary manage-program-btn">Manage Program</button>
      </div>
      <div class="card">
        <h3><i class="fas fa-calendar"></i> Calendar</h3>
        <p>Manage church calendar and events.</p>
        <button class="btn-secondary">Coming Soon</button>
      </div>
      <div class="card">
        <h3><i class="fas fa-book"></i> Books</h3>
        <p>Manage church books and resources.</p>
        <button class="btn-secondary">Coming Soon</button>
      </div>
    </div>

    <div class="card" style="margin-top: 2rem;">
      <h3>Recent Activity</h3>
      <div id="recentActivity">
        <p class="note">No recent activity to display.</p>
      </div>
    </div>
  `;
}

// Kids Program Management
function showKidsProgram() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  return `
    <div class="card">
      <h2>Kids Program Management</h2>
      <div class="program-header">
        <div class="date-selector">
          <label for="programMonth">Month:</label>
          <select id="programMonth">
            ${Array.from({length: 12}, (_, i) => {
              const monthNum = i + 1;
              const monthName = new Date(2000, i).toLocaleString('default', { month: 'long' });
              const selected = monthNum === currentMonth ? 'selected' : '';
              return `<option value="${monthNum}" ${selected}>${monthName}</option>`;
            }).join('')}
          </select>
        </div>
        <div class="date-selector">
          <label for="programYear">Year:</label>
          <input type="number" id="programYear" value="${currentYear}" min="2020" max="2030">
        </div>
        <button id="loadProgramBtn" class="btn-primary">
          <i class="fas fa-sync"></i> Load Program
        </button>
        <button id="newProgramBtn" class="btn-secondary">
          <i class="fas fa-plus"></i> New Program
        </button>
      </div>
    </div>

    <div class="card">
      <h3>Select Week to Edit</h3>
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
          <label for="week-theme">Theme:</label>
          <input type="text" id="week-theme" name="theme" required>
        </div>
        <div class="form-group">
          <label for="week-memory-verse">Memory Verse:</label>
          <textarea id="week-memory-verse" name="memoryVerse" rows="3" required></textarea>
        </div>
      </div>

      <!-- Mezmur Section -->
      <div class="card">
        <h3><i class="fas fa-music"></i> Mezmur (Hymns)</h3>
        <div id="mezmur-container"></div>
        <button type="button" id="btn-add-mezmur" class="btn-secondary">
          <i class="fas fa-plus"></i> Add Mezmur
        </button>
      </div>

      <!-- Prayer Section -->
      <div class="card">
        <h3><i class="fas fa-pray"></i> Prayer</h3>
        <div id="prayer-container"></div>
        <button type="button" id="btn-add-prayer" class="btn-secondary">
          <i class="fas fa-plus"></i> Add Prayer
        </button>
      </div>

      <!-- Bible Study Section -->
      <div class="card">
        <h3><i class="fas fa-bible"></i> Bible Study</h3>
        <div id="bible-study-container"></div>
        <button type="button" id="btn-add-bible" class="btn-secondary">
          <i class="fas fa-plus"></i> Add Bible Study
        </button>
      </div>

      <!-- Divine Liturgy Section -->
      <div class="card">
        <h3><i class="fas fa-church"></i> Divine Liturgy Responses</h3>
        <div id="liturgy-container"></div>
        <button type="button" id="btn-add-liturgy" class="btn-secondary">
          <i class="fas fa-plus"></i> Add Liturgy Response
        </button>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn-primary">
          <i class="fas fa-save"></i> Save Changes
        </button>
        <button type="button" id="btn-reload-week" class="btn-secondary">
          <i class="fas fa-sync"></i> Reload Data
        </button>
      </div>
    </form>

    <div id="admin-message" class="message"></div>
  `;
}

// Dynamic field functions
function addMezmurField() {
  const container = document.getElementById('mezmur-container');
  const index = container.children.length;

  const field = document.createElement('div');
  field.className = 'dynamic-field';
  field.innerHTML = `
    <div class="field-header">
      <h4>Mezmur ${index + 1}</h4>
      <button type="button" class="btn-danger remove-field">
        <i class="fas fa-times"></i> Remove
      </button>
    </div>
    <div class="form-group">
      <label>Title:</label>
      <input type="text" name="mezmur[${index}][title]" placeholder="Enter mezmur title" required>
    </div>
    <div class="form-group">
      <label>Description:</label>
      <input type="text" name="mezmur[${index}][description]" placeholder="Enter description">
    </div>
    <div class="form-group">
      <label>Lyrics:</label>
      <textarea name="mezmur[${index}][lyrics]" rows="4" placeholder="Enter lyrics" required></textarea>
    </div>
    <div class="form-group">
      <label>Audio URL (optional):</label>
      <input type="url" name="mezmur[${index}][audio]" placeholder="https://example.com/audio.mp3">
    </div>
  `;
  container.appendChild(field);
}

function parseDynamicFields(sectionName) {
  const container = document.getElementById(`${sectionName}-container`);
  const fields = container.querySelectorAll('.dynamic-field');
  const items = [];

  fields.forEach(field => {
    const item = {};
    const inputs = field.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
      const match = input.name.match(/\[(\d+)\]\[(.*?)\]/);
      if (match) {
        const [, , key] = match;
        const value = input.value.trim();
        if (value) item[key] = value;
      }
    });

    // Only add non-empty items (basic check)
    if (Object.keys(item).length > 0) {
      items.push(item);
    }
  });

  return items;
}


function addPrayerField() {
  const container = document.getElementById('prayer-container');
  const index = container.children.length;

  const field = document.createElement('div');
  field.className = 'dynamic-field';
  field.innerHTML = `
    <div class="field-header">
      <h4>Prayer ${index + 1}</h4>
      <button type="button" class="btn-danger remove-field">
        <i class="fas fa-times"></i> Remove
      </button>
    </div>
    <div class="form-group">
      <label>Title:</label>
      <input type="text" name="prayer[${index}][title]" placeholder="Enter prayer title" required>
    </div>
    <div class="form-group">
      <label>Type:</label>
      <input type="text" name="prayer[${index}][type]" placeholder="e.g., Morning Prayer" required>
    </div>
    <div class="form-group">
      <label>Content:</label>
      <textarea name="prayer[${index}][content]" rows="4" placeholder="Enter prayer content" required></textarea>
    </div>
    <div class="form-group">
      <label>Instructions (optional):</label>
      <textarea name="prayer[${index}][instructions]" rows="2" placeholder="Enter instructions"></textarea>
    </div>
  `;
  container.appendChild(field);
}

function addBibleStudyField() {
  const container = document.getElementById('bible-study-container');
  const index = container.children.length;

  const field = document.createElement('div');
  field.className = 'dynamic-field';
  field.innerHTML = `
    <div class="field-header">
      <h4>Bible Study ${index + 1}</h4>
      <button type="button" class="btn-danger remove-field">
        <i class="fas fa-times"></i> Remove
      </button>
    </div>
    <div class="form-group">
      <label>Passage:</label>
      <input type="text" name="bibleStudy[${index}][passage]" placeholder="e.g., John 3:16" required>
    </div>
    <div class="form-group">
      <label>Topic:</label>
      <input type="text" name="bibleStudy[${index}][topic]" placeholder="Enter study topic" required>
    </div>
    <div class="form-group">
      <label>Key Verse:</label>
      <input type="text" name="bibleStudy[${index}][keyVerse]" placeholder="Enter key verse" required>
    </div>
    <div class="form-group">
      <label>Study Notes:</label>
      <textarea name="bibleStudy[${index}][studyNotes]" rows="4" placeholder="Enter study notes" required></textarea>
    </div>
    <div class="form-group">
      <label>Activity (optional):</label>
      <input type="text" name="bibleStudy[${index}][activity]" placeholder="Enter activity">
    </div>
  `;
  container.appendChild(field);
}

function addLiturgyField() {
  const container = document.getElementById('liturgy-container');
  const index = container.children.length;

  const field = document.createElement('div');
  field.className = 'dynamic-field';
  field.innerHTML = `
    <div class="field-header">
      <h4>Liturgy Response ${index + 1}</h4>
      <button type="button" class="btn-danger remove-field">
        <i class="fas fa-times"></i> Remove
      </button>
    </div>
    <div class="form-group">
      <label>Part:</label>
      <input type="text" name="divineLiturgy[${index}][part]" placeholder="e.g., Holy, Holy, Holy" required>
    </div>
    <div class="form-group">
      <label>When:</label>
      <input type="text" name="divineLiturgy[${index}][when]" placeholder="e.g., During the Anaphora" required>
    </div>
    <div class="form-group">
      <label>Response:</label>
      <textarea name="divineLiturgy[${index}][response]" rows="3" placeholder="Enter response" required></textarea>
    </div>
    <div class="form-group">
      <label>Meaning (optional):</label>
      <input type="text" name="divineLiturgy[${index}][meaning]" placeholder="Enter meaning">
    </div>
    <div class="form-group">
      <label>Audio URL (optional):</label>
      <input type="url" name="divineLiturgy[${index}][audio]" placeholder="https://example.com/audio.mp3">
    </div>
  `;
  container.appendChild(field);
}

// Load program data
async function loadProgramData() {
  const year = parseInt(document.getElementById('programYear').value);
  const month = parseInt(document.getElementById('programMonth').value);
  
  try {
    const data = await apiCall(`/kids-program/${year}/${month}`);
    currentProgramData = data.data;
    loadCurrentWeekData();
    showMessage('Program loaded successfully!', 'success');
  } catch (error) {
    showMessage('No program found for this month. Create a new one.', 'info');
    clearForm();
  }
}

function loadCurrentWeekData() {
  if (!currentProgramData || !currentProgramData.weeks) return;
  
  const weekData = currentProgramData.weeks.find(w => w.week === currentWeek);
  if (!weekData) return;

  // Load basic info
  document.getElementById('week-theme').value = weekData.theme || '';
  document.getElementById('week-memory-verse').value = weekData.memoryVerse || '';

  // Load sections
  loadSectionData('mezmur', weekData.mezmur);
  loadSectionData('prayer', weekData.prayer);
  loadSectionData('bibleStudy', weekData.bibleStudy);
  loadSectionData('divineLiturgy', weekData.divineLiturgy);
}

function loadSectionData(sectionName, data) {
  const container = document.getElementById(`${sectionName}-container`);
  container.innerHTML = '';
  
  data.forEach((item, index) => {
    const field = document.createElement('div');
    field.className = 'dynamic-field';
    
    let fieldsHTML = `
      <div class="field-header">
        <h4>${capitalizeFirst(sectionName)} ${index + 1}</h4>
        <button type="button" class="btn-danger remove-field">
          <i class="fas fa-times"></i> Remove
        </button>
      </div>
    `;

    // Add fields based on section type
    Object.keys(item).forEach(key => {
      if (key !== '_id' && key !== 'order') {
        const label = capitalizeFirst(key);
        const value = item[key] || '';
        const isTextarea = ['lyrics', 'content', 'studyNotes', 'response', 'instructions'].includes(key);
        
        if (isTextarea) {
          fieldsHTML += `
            <div class="form-group">
              <label>${label}:</label>
              <textarea name="${sectionName}[${index}][${key}]" rows="4">${value}</textarea>
            </div>
          `;
        } else if (key === 'questions') {
          // Handle questions array
          fieldsHTML += `
            <div class="form-group">
              <label>${label}:</label>
              <textarea name="${sectionName}[${index}][${key}]" rows="3" placeholder="Enter questions separated by new lines">${Array.isArray(value) ? value.join('\n') : value}</textarea>
            </div>
          `;
        } else {
          fieldsHTML += `
            <div class="form-group">
              <label>${label}:</label>
              <input type="text" name="${sectionName}[${index}][${key}]" value="${value}">
            </div>
          `;
        }
      }
    });

    field.innerHTML = fieldsHTML;
    container.appendChild(field);
  });
}

function capitalizeFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function clearForm() {
  const themeInput = document.getElementById('week-theme');
  const memoryVerseInput = document.getElementById('week-memory-verse');
  if (themeInput) themeInput.value = '';
  if (memoryVerseInput) memoryVerseInput.value = '';

  const containers = {
    mezmur: 'mezmur-container',
    prayer: 'prayer-container',
    bibleStudy: 'bible-study-container',
    divineLiturgy: 'liturgy-container'
  };

  Object.values(containers).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
}

// Save program
async function saveProgram(e) {
  e.preventDefault();
  
  const year = parseInt(document.getElementById('programYear').value);
  const month = parseInt(document.getElementById('programMonth').value);
  
  const formData = new FormData(document.getElementById('kids-program-form'));
  const weekData = {
    week: currentWeek,
    theme: document.getElementById('week-theme').value,
    memoryVerse: document.getElementById('week-memory-verse').value,
    mezmur: [],
    prayer: [],
    bibleStudy: [],
    divineLiturgy: []
  };

  // Process form data (simplified - you'll need to expand this)
  // This is a basic implementation - you'll need to handle the form data properly
  
  try {
    let programData;
    if (currentProgramData) {
      // Update existing program
      const updatedWeeks = currentProgramData.weeks.map(w => 
        w.week === currentWeek ? weekData : w
      );
      programData = { ...currentProgramData, weeks: updatedWeeks };
    } else {
      // Create new program
      programData = {
        year,
        month,
        weeks: [weekData, 
          { week: 2, theme: '', memoryVerse: '', mezmur: [], prayer: [], bibleStudy: [], divineLiturgy: [] },
          { week: 3, theme: '', memoryVerse: '', mezmur: [], prayer: [], bibleStudy: [], divineLiturgy: [] },
          { week: 4, theme: '', memoryVerse: '', mezmur: [], prayer: [], bibleStudy: [], divineLiturgy: [] }
        ]
      };
    }

    const response = await apiCall('/kids-program', {
      method: 'POST',
      body: JSON.stringify(programData),
    });

    showMessage('Program saved successfully!', 'success');
    currentProgramData = response.data;
  } catch (error) {
    showMessage('Error saving program: ' + error.message, 'error');
  }
}

function showMessage(text, type) {
  let messageDiv = document.getElementById('admin-message');
  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.id = 'admin-message';
    document.getElementById('kids-program-form').parentNode.appendChild(messageDiv);
  }
  
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

// Event Listeners
function setupEventListeners() {
  // Navigation
  document.querySelector('.nav-links').addEventListener('click', function(e) {
    const link = e.target.closest('a[data-section]');
    if (link) {
      e.preventDefault();
      showAdminSection(link.dataset.section);
    }
  });

  // Week selection
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('week-btn')) {
      document.querySelectorAll('.week-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      currentWeek = parseInt(e.target.dataset.week);
      loadCurrentWeekData();
    }
  });

  // Dynamic field buttons
  document.addEventListener('click', function(e) {
    if (e.target.id === 'btn-add-mezmur' || e.target.closest('#btn-add-mezmur')) {
      addMezmurField();
    } else if (e.target.id === 'btn-add-prayer' || e.target.closest('#btn-add-prayer')) {
      addPrayerField();
    } else if (e.target.id === 'btn-add-bible' || e.target.closest('#btn-add-bible')) {
      addBibleStudyField();
    } else if (e.target.id === 'btn-add-liturgy' || e.target.closest('#btn-add-liturgy')) {
      addLiturgyField();
    } else if (e.target.classList.contains('remove-field')) {
      e.target.closest('.dynamic-field').remove();
    }
  });

  // Program management buttons
  document.addEventListener('click', function(e) {
    if (e.target.id === 'loadProgramBtn' || e.target.closest('#loadProgramBtn')) {
      loadProgramData();
    } else if (e.target.id === 'newProgramBtn' || e.target.closest('#newProgramBtn')) {
      currentProgramData = null;
      clearForm();
      showMessage('New program started. Fill in the details and save.', 'info');
    } else if (e.target.id === 'btn-reload-week' || e.target.closest('#btn-reload-week')) {
      loadCurrentWeekData();
    } else if (e.target.classList.contains('manage-program-btn')) {
      showAdminSection('kids-program');
    }
  });

  // Form submission
  document.addEventListener('submit', function(e) {
    if (e.target.id === 'kids-program-form') {
      saveProgram(e);
    }
  });
}

// Initialize admin
async function initializeAdmin() {
  const isAuthenticated = await checkAuth();
  
  if (isAuthenticated) {
    showAdminPanel();
    setupEventListeners();
  } else {
    showLoginForm();
  }
}

// Start the admin application
window.addEventListener('load', initializeAdmin);