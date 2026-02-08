class KidsProgram {
    constructor() {
        this.currentProgram = null;
        this.currentWeek = 1;
        this.currentStep = 0;
        this.currentMonth = new Date().getMonth() + 1;
        this.currentYear = new Date().getFullYear();
        this.speechRecognition = null;
        this.currentQuiz = null;
        this.quizAnswers = [];
        
        // ✅ Dynamic API base URL for local dev and production
        this.API_BASE = this.getApiBaseUrl();
    }

    getApiBaseUrl() {
        const hostname = window.location.hostname;
        
        // Local development - point to st-michael-church backend
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3001';
        }
        
        // Production - use same origin (Azure backend)
        return window.location.origin;
    }

 async loadProgram(year, month) {
    const container = document.getElementById('kids-program-content');
    container.innerHTML = this.getLoadingState();

    try {
        const apiUrl = `${this.API_BASE}/api/kids-program/${year}/${month}`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            mode: 'cors',
            credentials: 'omit'
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('PROGRAM_NOT_FOUND');
            }
            if (response.status === 0) {
                throw new Error('CORS_BLOCKED');
            }
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data) {
            throw new Error('INVALID_DATA');
        }

        // Check the data structure and assign the correct data
        if (data.success && data.data) {
            this.currentProgram = data.data;
        } else {
            this.currentProgram = data; // Fallback if no data property
        }

        this.updateMonthDisplay(this.currentProgram.monthName || 'Unknown', this.currentProgram.year || year);
        this.renderWeekContent(1);
        
    } catch (error) {
        this.showError(error.message || 'NETWORK_ERROR');
    }
}
    // Update all other API calls to include CORS settings
    async startQuiz() {
        try {
            const weekData = this.currentProgram.weeks.find(w => w.week === this.currentWeek);
            if (!weekData) return;

            const response = await fetch(`${this.API_BASE}/api/kids-program/${this.currentYear}/${this.currentMonth}/week/${this.currentWeek}/quiz`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load quiz');
            }

            const data = await response.json();
            if (data.success) {
                this.currentQuiz = data.data;
                this.quizAnswers = [];
                this.renderQuizQuestions();
            } else {
                throw new Error('Quiz data not available');
            }
        } catch (error) {
            this.showQuizError('Failed to load quiz. Please try again.');
        }
    }

    async submitQuiz() {
        try {
            const weekData = this.currentProgram.weeks.find(w => w.week === this.currentWeek);
            if (!weekData || !this.currentQuiz) return;

            this.collectQuizAnswers();

            if (this.quizAnswers.length !== this.currentQuiz.questions.length) {
                alert('Please answer all questions before submitting.');
                return;
            }

            const response = await fetch(`${this.API_BASE}/api/kids-program/${this.currentYear}/${this.currentMonth}/week/${this.currentWeek}/quiz/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: 'cors',
                credentials: 'omit',
                body: JSON.stringify({
                    answers: this.quizAnswers,
                    timeSpent: this.calculateTimeSpent()
                })
            });

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    errorMessage = response.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            
            if (data.success) {
                this.showQuizResults(data.data);
            } else {
                throw new Error(data.message || 'Quiz submission failed');
            }
        } catch (error) {
            this.showQuizError(`Failed to submit quiz: ${error.message}`);
        }
    }

    // Update error handling for CORS
    showError(errorType) {
        const container = document.getElementById('kids-program-content');
        const messages = {
            'PROGRAM_NOT_FOUND': `
                <div class="empty-state">
                    <div class="empty-icon">📅</div>
                    <h3>No Program Found</h3>
                    <p>There's no program available for ${this.currentMonth}/${this.currentYear} yet.</p>
                </div>
            `,
            'NETWORK_ERROR': `
                <div class="empty-state">
                    <div class="empty-icon">🔌</div>
                    <h3>Connection Error</h3>
                    <p>Please check your internet connection and try again.</p>
                </div>
            `,
            'CORS_BLOCKED': `
                <div class="empty-state">
                    <div class="empty-icon">🌐</div>
                    <h3>Cross-Origin Issue</h3>
                    <p>Unable to connect to the server due to browser security restrictions.</p>
                    <p>Please ensure the backend server allows requests from this domain.</p>
                </div>
            `,
            'INVALID_DATA': `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>Invalid Data Format</h3>
                    <p>The program data format is not recognized.</p>
                </div>
            `,
            'NO_DATA': `
                <div class="empty-state">
                    <div class="empty-icon">📄</div>
                    <h3>No Program Data</h3>
                    <p>Unable to load program data.</p>
                </div>
            `
        };
        
        container.innerHTML = messages[errorType] || messages['NETWORK_ERROR'];
    }



    async init() {
        await this.loadProgram(this.currentYear, this.currentMonth);
        this.setupEventListeners();
    }

    updateMonthDisplay(monthName, year) {
        const displayElement = document.getElementById('current-month-display');
        if (displayElement) {
            displayElement.textContent = `${monthName} ${year}`;
        }
    }

    renderWeekContent(weekNumber) {
        if (!this.currentProgram || !this.currentProgram.weeks) {
            this.showError('NO_DATA');
            return;
        }

        this.currentWeek = weekNumber;
        this.currentStep = 0;
        
        const weekData = this.currentProgram.weeks.find(w => w.week === weekNumber);
        const container = document.getElementById('kids-program-content');
        
        if (!weekData) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        container.innerHTML = this.getLessonHTML(weekData);
        this.showStep(0);
        
        setTimeout(() => {
            this.setupAudioPlayers();
            this.setupLiturgyPractice();
        }, 100);
    }

    getLessonHTML(weekData) {
        const totalSteps = this.getTotalSteps(weekData);
        
        return `
            <div class="lesson-container">
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
                    </div>
                    <div class="progress-text" id="progress-text">Step 1 of ${totalSteps}</div>
                </div>

                ${this.getThemeStep(weekData, 0, totalSteps)}
                ${this.getMemoryVerseStep(weekData, 1, totalSteps)}
                ${this.getBibleStudyStep(weekData, 2, totalSteps)}
                ${this.getPrayerStep(weekData, 3, totalSteps)}
                ${this.getMezmurStep(weekData, 4, totalSteps)}
                ${this.getLiturgyStep(weekData, 5, totalSteps)}
                ${this.getLearningObjectivesStep(weekData, 6, totalSteps)}
                ${this.getQuizStep(weekData, 7, totalSteps)}
            </div>
        `;
    }

    getThemeStep(weekData, stepIndex, totalSteps) {
        return `
            <div class="lesson-step theme-step" data-step="${stepIndex}">
                <div class="step-header">
                    <div class="step-icon">🌄</div>
                    <h2 class="step-title">This Week's Theme</h2>
                    <p class="step-subtitle">What we're learning about</p>
                </div>
                
                <div class="content-card theme-card">
                    <div class="card-header">
                        <div class="card-icon">💡</div>
                        <h3 class="card-title">Theme</h3>
                    </div>
                    <div class="card-content">
                        <p style="font-size: 1.3rem; font-weight: bold; color: var(--primary); text-align: center;">
                            ${this.escapeHtml(weekData.theme || 'No theme available')}
                        </p>
                    </div>
                </div>
                
                ${this.getNavigationHTML(stepIndex, totalSteps)}
            </div>
        `;
    }

    getMemoryVerseStep(weekData, stepIndex, totalSteps) {
        return `
            <div class="lesson-step memory-verse-step" data-step="${stepIndex}">
                <div class="step-header">
                    <div class="step-icon">📖</div>
                    <h2 class="step-title">Memory Verse</h2>
                    <p class="step-subtitle">Let's memorize God's Word</p>
                </div>
                
                <div class="content-card memory-verse-card">
                    <div class="card-header">
                        <div class="card-icon">⭐</div>
                        <h3 class="card-title">Bible Verse to Remember</h3>
                    </div>
                    <div class="card-content">
                        <div class="verse-text">${this.escapeHtml(weekData.memoryVerse || 'No memory verse available')}</div>
                    </div>
                </div>
                
                ${this.getNavigationHTML(stepIndex, totalSteps)}
            </div>
        `;
    }

    getBibleStudyStep(weekData, stepIndex, totalSteps) {
    if (!weekData.bibleStudy || weekData.bibleStudy.length === 0) {
        return this.getEmptyStep(stepIndex, totalSteps, 'Bible Study', 'No Bible study content available for this week');
    }
    
    // Generate HTML for ALL Bible studies
    const studiesHTML = weekData.bibleStudy.map((study, index) => {
        return `
            <div class="bible-study-item" style="margin-bottom: ${index < weekData.bibleStudy.length - 1 ? '2.5rem' : '0'}; padding-bottom: ${index < weekData.bibleStudy.length - 1 ? '2rem' : '0'}; border-bottom: ${index < weekData.bibleStudy.length - 1 ? '1px solid #e0e0e0' : 'none'};">
                <div class="card-header" style="margin-bottom: 1.5rem;">
                    <div class="card-icon">📖</div>
                    <h3 class="card-title">${this.escapeHtml(study.topic || 'Bible Study')}</h3>
                    ${study.passage ? `<span style="background: #fff3e0; color: #e65100; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.85rem; font-weight: 600;">${this.escapeHtml(study.passage)}</span>` : ''}
                </div>

                <!-- Key Verse -->
                ${study.keyVerse ? `
                    <div class="key-verse-section" style="background: #fff9e6; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #ffd700;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #e65100;">📌 Key Verse</h4>
                        <p style="margin: 0; font-style: italic; font-weight: 600;">${this.escapeHtml(study.keyVerse)}</p>
                    </div>
                ` : ''}

                <!-- Study Notes -->
                ${study.studyNotes ? `
                    <div class="study-notes-section" style="margin-bottom: 1.5rem;">
                        <h4 style="color: var(--primary); margin-bottom: 0.8rem;">📝 Study Notes</h4>
                        <div class="study-content">
                            ${study.studyNotes.split('\n').map(para => `<p>${this.escapeHtml(para)}</p>`).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Reflection Questions -->
                ${study.reflectionQuestions ? `
                    <div class="reflection-section" style="background: #e8f5e8; padding: 1.2rem; border-radius: 8px; margin-bottom: 1.5rem;">
                        <h4 style="margin: 0 0 0.8rem 0; color: #2e7d32;">💭 Reflection Questions</h4>
                        <div class="reflection-content">
                            ${study.reflectionQuestions.split('\n').map(para => `<p style="margin: 0.5rem 0;">${this.escapeHtml(para)}</p>`).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- FAQ Discussion -->
                ${study.faqDiscussion ? `
                    <div class="faq-section" style="background: #e3f2fd; padding: 1.2rem; border-radius: 8px; margin-bottom: 1.5rem;">
                        <h4 style="margin: 0 0 0.8rem 0; color: #1565c0;">❓ Frequently Asked Questions</h4>
                        <div class="faq-content">
                            ${study.faqDiscussion.split('\n').map(para => `<p style="margin: 0.5rem 0;">${this.escapeHtml(para)}</p>`).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Activity -->
                ${study.activity ? `
                    <div class="activity-section" style="background: #fff3e0; padding: 1.2rem; border-radius: 8px; margin-bottom: 1.5rem;">
                        <h4 style="margin: 0 0 0.8rem 0; color: #e65100;">🎨 Activity</h4>
                        <p style="margin: 0;">${this.escapeHtml(study.activity)}</p>
                    </div>
                ` : ''}

                <!-- AI Enhancements -->
                ${study.aiEnhancements ? `
                    <div style="background: #f3e5f5; padding: 1.2rem; border-radius: 8px;">
                        <h4 style="margin: 0 0 0.8rem 0; color: #7b1fa2;">🎯 Learning Helps</h4>
                        ${study.aiEnhancements.discussionPrompts ? `
                            <div style="margin-bottom: 1rem;">
                                <strong>Discussion Prompts:</strong>
                                ${study.aiEnhancements.discussionPrompts.ages_3_5 && study.aiEnhancements.discussionPrompts.ages_3_5.length > 0 ? `
                                    <div style="margin: 0.5rem 0;">
                                        <em>Ages 3-5:</em>
                                        <ul style="margin: 0.3rem 0 0 1rem;">
                                            ${study.aiEnhancements.discussionPrompts.ages_3_5.map(prompt => `<li>${this.escapeHtml(prompt)}</li>`).join('')}
                                        </ul>
                                    </div>
                                ` : ''}
                                ${study.aiEnhancements.discussionPrompts.ages_6_8 && study.aiEnhancements.discussionPrompts.ages_6_8.length > 0 ? `
                                    <div style="margin: 0.5rem 0;">
                                        <em>Ages 6-8:</em>
                                        <ul style="margin: 0.3rem 0 0 1rem;">
                                            ${study.aiEnhancements.discussionPrompts.ages_6_8.map(prompt => `<li>${this.escapeHtml(prompt)}</li>`).join('')}
                                        </ul>
                                    </div>
                                ` : ''}
                                ${study.aiEnhancements.discussionPrompts.ages_9_12 && study.aiEnhancements.discussionPrompts.ages_9_12.length > 0 ? `
                                    <div style="margin: 0.5rem 0;">
                                        <em>Ages 9-12:</em>
                                        <ul style="margin: 0.3rem 0 0 1rem;">
                                            ${study.aiEnhancements.discussionPrompts.ages_9_12.map(prompt => `<li>${this.escapeHtml(prompt)}</li>`).join('')}
                                        </ul>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                        ${study.aiEnhancements.activities && study.aiEnhancements.activities.length > 0 ? `
                            <div style="margin-bottom: 1rem;">
                                <strong>Additional Activities:</strong>
                                <ul style="margin: 0.5rem 0 0 1rem;">
                                    ${study.aiEnhancements.activities.map(activity => `<li>${this.escapeHtml(activity)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${study.aiEnhancements.learningObjectives && study.aiEnhancements.learningObjectives.length > 0 ? `
                            <div>
                                <strong>Learning Objectives:</strong>
                                <ul style="margin: 0.5rem 0 0 1rem;">
                                    ${study.aiEnhancements.learningObjectives.map(objective => `<li>${this.escapeHtml(objective)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    return `
        <div class="lesson-step bible-study-step" data-step="${stepIndex}">
            <div class="step-header">
                <div class="step-icon">📚</div>
                <h2 class="step-title">Bible Study</h2>
                <p class="step-subtitle">${weekData.bibleStudy.length} Study${weekData.bibleStudy.length !== 1 ? 's' : ''} for this week</p>
            </div>
            
            <div class="content-card bible-story-card">
                <div class="card-content">
                    ${studiesHTML}
                </div>
            </div>
            
            ${this.getNavigationHTML(stepIndex, totalSteps)}
        </div>
    `;
}
   getPrayerStep(weekData, stepIndex, totalSteps) {
    if (!weekData.prayer || weekData.prayer.length === 0) {
        return this.getEmptyStep(stepIndex, totalSteps, 'Prayer', 'No prayer content available for this week');
    }
    
    // Generate HTML for ALL prayers
    const prayersHTML = weekData.prayer.map((prayer, index) => {
        return `
            <div class="prayer-item" style="margin-bottom: ${index < weekData.prayer.length - 1 ? '2.5rem' : '0'}; padding-bottom: ${index < weekData.prayer.length - 1 ? '2rem' : '0'}; border-bottom: ${index < weekData.prayer.length - 1 ? '1px solid #e0e0e0' : 'none'};">
                <div class="card-header" style="margin-bottom: 1.5rem;">
                    <div class="card-icon">📝</div>
                    <h3 class="card-title">${this.escapeHtml(prayer.title || 'Prayer')}</h3>
                    ${prayer.type ? `<span class="prayer-type" style="background: #e3f2fd; color: #1565c0; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.85rem; font-weight: 600;">${this.escapeHtml(prayer.type)}</span>` : ''}
                    ${prayer.language ? `<span style="background: #fff3e0; color: #e65100; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.85rem; font-weight: 600;">${this.escapeHtml(prayer.language)}</span>` : ''}
                </div>
                
                <!-- Prayer Content -->
                <div style="font-size: 1.1rem; line-height: 1.7; margin-bottom: 1.5rem;">
                    ${prayer.content ? prayer.content.split('\n').map(para => `<p>${this.escapeHtml(para)}</p>`).join('') : '<p>No prayer content available.</p>'}
                </div>

                <!-- Prayer Meaning -->
                ${prayer.meaning ? `
                    <div style="background: #f3e5f5; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #7b1fa2;">💫 What This Prayer Means</h4>
                        <p style="margin: 0;">${this.escapeHtml(prayer.meaning)}</p>
                    </div>
                ` : ''}

                <!-- AI Enhancements -->
                ${prayer.aiEnhancements ? `
                    <div style="background: #e8f5e8; padding: 1.2rem; border-radius: 8px;">
                        <h4 style="margin: 0 0 0.8rem 0; color: #2e7d32;">💡 Reflection Helps</h4>
                        ${prayer.aiEnhancements.reflectionQuestions && prayer.aiEnhancements.reflectionQuestions.length > 0 ? `
                            <div style="margin-bottom: 1rem;">
                                <strong>Reflection Questions:</strong>
                                <ul style="margin: 0.5rem 0 0 1rem;">
                                    ${prayer.aiEnhancements.reflectionQuestions.map(question => `<li>${this.escapeHtml(question)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${prayer.aiEnhancements.relatedVerses && prayer.aiEnhancements.relatedVerses.length > 0 ? `
                            <div>
                                <strong>Related Bible Verses:</strong>
                                <ul style="margin: 0.5rem 0 0 1rem;">
                                    ${prayer.aiEnhancements.relatedVerses.map(verse => `<li>${this.escapeHtml(verse)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    return `
        <div class="lesson-step prayer-step" data-step="${stepIndex}">
            <div class="step-header">
                <div class="step-icon">🙏</div>
                <h2 class="step-title">Prayer Time</h2>
                <p class="step-subtitle">Let's pray together</p>
            </div>
            
            <div class="content-card">
                <div class="card-content">
                    ${prayersHTML}
                </div>
            </div>
            
            ${this.getNavigationHTML(stepIndex, totalSteps)}
        </div>
    `;
}

   getMezmurStep(weekData, stepIndex, totalSteps) {
    if (!weekData.mezmur || weekData.mezmur.length === 0) {
        return this.getEmptyStep(stepIndex, totalSteps, 'Mezmur', 'No mezmur content available for this week');
    }
    
    // Generate HTML for ALL mezmurs in the array
    const mezmursHTML = weekData.mezmur.map((mezmur, index) => {
        const audioHTML = mezmur.audio ? `
            <div class="audio-player-container" style="margin-top: 1.5rem;">
                <p style="font-weight: bold; margin-bottom: 0.8rem; color: var(--primary);">🎵 Listen to the song:</p>
                <audio controls style="width: 100%; border-radius: 25px;" data-audio-src="${mezmur.audio}">
                    <source src="${mezmur.audio}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
            </div>
        ` : '<p style="color: #666; font-style: italic; margin-top: 1rem;">No audio available for this mezmur.</p>';
        
        return `
            <div class="mezmur-item" style="margin-bottom: 2.5rem; padding-bottom: 2rem; border-bottom: ${index < weekData.mezmur.length - 1 ? '1px solid #e0e0e0' : 'none'};">
                <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 1rem;">
                    <h3 style="margin: 0; color: var(--primary); flex: 1;">${this.escapeHtml(mezmur.title || 'Mezmur')}</h3>
                    ${mezmur.difficulty ? `<span style="background: #e3f2fd; color: #1565c0; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.85rem; font-weight: 600;">${this.escapeHtml(mezmur.difficulty)}</span>` : ''}
                </div>
                
                <!-- Description -->
                ${mezmur.description ? `
                    <div style="margin-bottom: 1.5rem;">
                        <h4 style="color: var(--primary); margin-bottom: 0.5rem;">📋 About this song</h4>
                        <p>${this.escapeHtml(mezmur.description)}</p>
                    </div>
                ` : ''}

                <!-- Lyrics -->
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: var(--primary); margin-bottom: 0.8rem;">🎼 Lyrics</h4>
                    <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; border-left: 4px solid var(--accent);">
                        <pre style="white-space: pre-wrap; font-family: inherit; margin: 0; line-height: 1.6; font-size: 1.1rem;">${this.escapeHtml(mezmur.lyrics || 'No lyrics available')}</pre>
                    </div>
                </div>

                <!-- Meaning -->
                ${mezmur.meaning ? `
                    <div style="background: #e8f5e8; padding: 1.2rem; border-radius: 8px; margin-bottom: 1.5rem;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #2e7d32;">💫 What This Song Means</h4>
                        <p style="margin: 0;">${this.escapeHtml(mezmur.meaning)}</p>
                    </div>
                ` : ''}

                <!-- AI Enhancements -->
                ${mezmur.aiEnhancements ? `
                    <div style="background: #fff3e0; padding: 1.2rem; border-radius: 8px; margin-bottom: 1.5rem;">
                        <h4 style="margin: 0 0 0.8rem 0; color: #e65100;">🎯 Learning Helps</h4>
                        ${mezmur.aiEnhancements.teachingPoints && mezmur.aiEnhancements.teachingPoints.length > 0 ? `
                            <div style="margin-bottom: 1rem;">
                                <strong>Teaching Points:</strong>
                                <ul style="margin: 0.5rem 0 0 1rem;">
                                    ${mezmur.aiEnhancements.teachingPoints.map(point => `<li>${this.escapeHtml(point)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${mezmur.aiEnhancements.movementSuggestions && mezmur.aiEnhancements.movementSuggestions.length > 0 ? `
                            <div style="margin-bottom: 1rem;">
                                <strong>Movement Suggestions:</strong>
                                <ul style="margin: 0.5rem 0 0 1rem;">
                                    ${mezmur.aiEnhancements.movementSuggestions.map(movement => `<li>${this.escapeHtml(movement)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${mezmur.aiEnhancements.memoryAids && mezmur.aiEnhancements.memoryAids.length > 0 ? `
                            <div>
                                <strong>Memory Aids:</strong>
                                <ul style="margin: 0.5rem 0 0 1rem;">
                                    ${mezmur.aiEnhancements.memoryAids.map(aid => `<li>${this.escapeHtml(aid)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                ${audioHTML}
            </div>
        `;
    }).join('');

    return `
        <div class="lesson-step mezmur-step" data-step="${stepIndex}">
            <div class="step-header">
                <div class="step-icon">🎵</div>
                <h2 class="step-title">Mezmur of the Week</h2>
                <p class="step-subtitle">Let's sing praises to God</p>
            </div>
            
            <div class="content-card">
                <div class="card-header">
                    <div class="card-icon">🎶</div>
                    <h3 class="card-title">${weekData.mezmur.length} Song${weekData.mezmur.length !== 1 ? 's' : ''} to Learn</h3>
                </div>
                <div class="card-content">
                    ${mezmursHTML}
                </div>
            </div>
            
            ${this.getNavigationHTML(stepIndex, totalSteps)}
        </div>
    `;
}

   getLiturgyStep(weekData, stepIndex, totalSteps) {
    if (!weekData.divineLiturgy || weekData.divineLiturgy.length === 0) {
        return this.getEmptyStep(stepIndex, totalSteps, 'Liturgy Practice', 'No liturgy practice content available for this week');
    }
    
    // Generate HTML for ALL liturgy responses
    const liturgiesHTML = weekData.divineLiturgy.map((liturgy, index) => {
        const audioHTML = liturgy.audio ? `
            <div class="audio-player-container" style="margin-top: 1.5rem;">
                <p style="font-weight: bold; margin-bottom: 0.8rem; color: var(--primary);">🔊 Listen to the pronunciation:</p>
                <audio controls style="width: 100%; border-radius: 25px;" data-audio-src="${liturgy.audio}">
                    <source src="${liturgy.audio}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
            </div>
        ` : '';
        
        return `
            <div class="liturgy-item" style="margin-bottom: ${index < weekData.divineLiturgy.length - 1 ? '2.5rem' : '0'}; padding-bottom: ${index < weekData.divineLiturgy.length - 1 ? '2rem' : '0'}; border-bottom: ${index < weekData.divineLiturgy.length - 1 ? '1px solid #e0e0e0' : 'none'};">
                <div class="card-header" style="margin-bottom: 1.5rem;">
                    <div class="card-icon">💬</div>
                    <h3 class="card-title">${this.escapeHtml(liturgy.part || 'Liturgy Part')}</h3>
                    ${liturgy.when ? `<span class="liturgy-timing" style="background: #fff3e0; color: #e65100; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.85rem; font-weight: 600;">${this.escapeHtml(liturgy.when)}</span>` : ''}
                    ${liturgy.language ? `<span style="background: #e3f2fd; color: #1565c0; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.85rem; font-weight: 600;">${this.escapeHtml(liturgy.language)}</span>` : ''}
                </div>
                
                <!-- Response -->
                <div style="background: #e3f2fd; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <p style="margin: 0 0 0.8rem 0; font-weight: bold; color: #1565c0;">📢 Response to Practice:</p>
                    <p class="expected-response" style="font-size: 1.4rem; font-weight: bold; color: var(--primary); text-align: center; margin: 0;">
                        "${this.escapeHtml(liturgy.response || 'No response available')}"
                    </p>
                </div>

                <!-- Meaning -->
                ${liturgy.meaning ? `
                    <div style="background: #fff3e0; padding: 1.2rem; border-radius: 8px; margin-bottom: 1.5rem;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #e65100;">💡 What It Means</h4>
                        <p style="margin: 0;">${this.escapeHtml(liturgy.meaning)}</p>
                    </div>
                ` : ''}

                <!-- Practice Area -->
                <div style="background: #f5f5f5; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <p style="margin: 0 0 1rem 0; font-weight: bold; color: var(--dark);">🎯 Your Turn to Practice:</p>
                    
                    <input type="text" class="user-response-input" 
                           placeholder="Type or say the response..." 
                           style="width:100%;padding:1rem;margin-bottom:1rem;border:2px solid var(--primary);border-radius:8px;font-size:1.1rem;"
                           data-expected="${this.escapeHtml(liturgy.response)}">
                    
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        <button class="nav-btn check-response-btn" style="background: var(--success);">
                            <i class="fas fa-check"></i> Check Response
                        </button>
                        <button class="nav-btn speak-response-btn" style="background: var(--info);">
                            <i class="fas fa-microphone"></i> Speak Response
                        </button>
                    </div>
                    
                    <div class="response-feedback" style="margin-top: 1rem; padding: 1rem; border-radius: 6px; display: none;"></div>
                </div>

                <!-- AI Enhancements -->
                ${liturgy.aiEnhancements ? `
                    <div style="background: #e8f5e8; padding: 1.2rem; border-radius: 8px; margin-bottom: 1.5rem;">
                        <h4 style="margin: 0 0 0.8rem 0; color: #2e7d32;">🎓 Learning Tips</h4>
                        ${liturgy.aiEnhancements.emphasisPoints && liturgy.aiEnhancements.emphasisPoints.length > 0 ? `
                            <div style="margin-bottom: 1rem;">
                                <strong>Key Points:</strong>
                                <ul style="margin: 0.5rem 0 0 1rem;">
                                    ${liturgy.aiEnhancements.emphasisPoints.map(point => `<li>${this.escapeHtml(point)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${liturgy.aiEnhancements.commonMistakes && liturgy.aiEnhancements.commonMistakes.length > 0 ? `
                            <div style="margin-bottom: 1rem;">
                                <strong>Avoid These Mistakes:</strong>
                                <ul style="margin: 0.5rem 0 0 1rem;">
                                    ${liturgy.aiEnhancements.commonMistakes.map(mistake => `<li>${this.escapeHtml(mistake)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${liturgy.aiEnhancements.practiceExercises && liturgy.aiEnhancements.practiceExercises.length > 0 ? `
                            <div>
                                <strong>Practice Exercises:</strong>
                                <ul style="margin: 0.5rem 0 0 1rem;">
                                    ${liturgy.aiEnhancements.practiceExercises.map(exercise => `<li>${this.escapeHtml(exercise)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                ${audioHTML}
            </div>
        `;
    }).join('');

    return `
        <div class="lesson-step liturgy-step" data-step="${stepIndex}">
            <div class="step-header">
                <div class="step-icon">⛪</div>
                <h2 class="step-title">Church Response Practice</h2>
                <p class="step-subtitle">Learn the responses we use in church</p>
            </div>

            <div class="content-card">
                <div class="card-content">
                    ${liturgiesHTML}
                </div>
            </div>
            
            ${this.getNavigationHTML(stepIndex, totalSteps)}
        </div>
    `;
}
    getLearningObjectivesStep(weekData, stepIndex, totalSteps) {
        const hasObjectives = weekData.learningObjectives && weekData.learningObjectives.length > 0;
        
        const objectivesHTML = hasObjectives ? 
            weekData.learningObjectives.map((obj, index) => `
                <li style="padding: 1rem; margin: 0.5rem 0; background: ${obj.achieved ? '#d4edda' : '#f8f9fa'}; border-radius: 8px; border-left: 4px solid ${obj.achieved ? '#28a745' : 'var(--primary)'};">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span style="font-size: 1.2rem;">${obj.achieved ? '✅' : '📝'}</span>
                        <span style="flex: 1;">${this.escapeHtml(obj.objective)}</span>
                    </div>
                </li>
            `).join('') : 
            `<li style="padding: 1rem; margin: 0.5rem 0; background: #f8f9fa; border-radius: 8px; border-left: 4px solid var(--primary); text-align: center; color: #666;">
                <i class="fas fa-info-circle"></i> No specific learning objectives defined for this week.
            </li>`;

        return `
            <div class="lesson-step objectives-step" data-step="${stepIndex}">
                <div class="step-header">
                    <div class="step-icon">🎯</div>
                    <h2 class="step-title">Learning Objectives</h2>
                    <p class="step-subtitle">What we aim to learn this week</p>
                </div>
                
                <div class="content-card">
                    <div class="card-header">
                        <div class="card-icon">📋</div>
                        <h3 class="card-title">This Week's Goals</h3>
                    </div>
                    <div class="card-content">
                        <ul style="list-style: none; padding: 0;">
                            ${objectivesHTML}
                        </ul>
                    </div>
                </div>
                
                ${this.getNavigationHTML(stepIndex, totalSteps)}
            </div>
        `;
    }7

    getQuizStep(weekData, stepIndex, totalSteps) {
        const hasQuiz = weekData.practiceQuiz && weekData.practiceQuiz.questions && weekData.practiceQuiz.questions.length > 0;
        
        return `
            <div class="lesson-step quiz-step" data-step="${stepIndex}">
                <div class="step-header">
                    <div class="step-icon">🧠</div>
                    <h2 class="step-title">Practice Quiz</h2>
                    <p class="step-subtitle">Test what you've learned this week</p>
                </div>
                
                <div class="content-card quiz-card">
                    <div class="card-header">
                        <div class="card-icon">📝</div>
                        <h3 class="card-title">${hasQuiz ? weekData.practiceQuiz.title || 'Weekly Review' : 'Weekly Review'}</h3>
                    </div>
                    <div class="card-content">
                        <div id="quiz-content">
                            ${hasQuiz ? `
                                <div style="text-align: center; padding: 1rem;">
                                    <i class="fas fa-brain" style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem;"></i>
                                    <p style="font-size: 1.1rem; margin-bottom: 1rem;">
                                        <strong>${weekData.practiceQuiz.questions.length} Questions</strong><br>
                                        Time Limit: ${weekData.practiceQuiz.timeLimit || 10} minutes<br>
                                        Passing Score: ${weekData.practiceQuiz.passingScore || 70}%
                                    </p>
                                    <button class="nav-btn start-quiz-btn" style="background: var(--primary); color: white; padding: 1rem 2rem; font-size: 1.1rem;">
                                        <i class="fas fa-play"></i> Start Quiz
                                    </button>
                                </div>
                            ` : `
                                <div style="text-align: center; padding: 2rem;">
                                    <i class="fas fa-brain" style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem;"></i>
                                    <p style="font-size: 1.1rem; margin-bottom: 2rem;">Ready to test your knowledge from this week's lesson?</p>
                                    <button class="nav-btn start-quiz-btn" style="background: var(--primary); color: white; padding: 1rem 2rem; font-size: 1.1rem;">
                                        <i class="fas fa-play"></i> Start Quiz
                                    </button>
                                    <p style="margin-top: 1rem; color: #666; font-size: 0.9rem;">
                                        <i class="fas fa-info-circle"></i> Quiz will be generated from this week's content
                                    </p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
                
                ${this.getNavigationHTML(stepIndex, totalSteps)}
            </div>
        `;
    }

    getNavigationHTML(currentStep, totalSteps) {
        const hasPrev = currentStep > 0;
        const hasNext = currentStep < totalSteps - 1;
        
        return `
            <div class="step-navigation">
                <button class="nav-btn prev" ${hasPrev ? `data-prev="${currentStep - 1}"` : 'disabled'}>
                    <i class="fas fa-chevron-left"></i> Previous
                </button>
                <span class="step-indicator">${currentStep + 1} of ${totalSteps}</span>
                <button class="nav-btn next" ${hasNext ? `data-next="${currentStep + 1}"` : 'disabled'}>
                    ${hasNext ? 'Continue <i class="fas fa-chevron-right"></i>' : 'Complete! <i class="fas fa-star"></i>'}
                </button>
            </div>
        `;
    }

    getEmptyStep(stepIndex, totalSteps, title, message) {
        return `
            <div class="lesson-step empty-step" data-step="${stepIndex}">
                <div class="step-header">
                    <div class="step-icon">📝</div>
                    <h2 class="step-title">${title}</h2>
                    <p class="step-subtitle">Content Not Available</p>
                </div>
                
                <div class="content-card">
                    <div class="card-content">
                        <div style="text-align: center; padding: 2rem; color: #666;">
                            <i class="fas fa-info-circle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                            <p>${message}</p>
                        </div>
                    </div>
                </div>
                
                ${this.getNavigationHTML(stepIndex, totalSteps)}
            </div>
        `;
    }

    getTotalSteps(weekData) {
        return 8;
    }

    // ============ QUIZ METHODS ============

  
    renderQuizQuestions() {
        const quizContent = document.getElementById('quiz-content');
        if (!quizContent || !this.currentQuiz) return;

        const questionsHTML = this.currentQuiz.questions.map((question, index) => `
            <div class="quiz-question" data-question-id="${question._id}">
                <div class="question-header">
                    <span class="question-number">Question ${index + 1}</span>
                    <span class="question-points">${question.points || 1} point${question.points !== 1 ? 's' : ''}</span>
                </div>
                <h4 class="question-text">${this.escapeHtml(question.question)}</h4>
                
                ${question.type === 'multiple_choice' || question.type === 'true_false' ? `
                    <div class="quiz-options">
                        ${question.options.map((option, optIndex) => `
                            <label class="quiz-option">
                                <input type="radio" name="question-${question._id}" value="${this.escapeHtml(option.text)}">
                                <span class="option-text">${this.escapeHtml(option.text)}</span>
                            </label>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${question.type === 'short_answer' ? `
                    <div class="short-answer-container">
                        <textarea class="short-answer-input" 
                                  placeholder="Type your answer here..." 
                                  rows="3"
                                  data-question-id="${question._id}"></textarea>
                    </div>
                ` : ''}
                
                <div class="question-feedback" style="display: none;"></div>
            </div>
        `).join('');

        quizContent.innerHTML = `
            <div class="quiz-header">
                <h4>${this.currentQuiz.weekTheme} - Week ${this.currentQuiz.weekNumber}</h4>
                <div class="quiz-meta">
                    <span><i class="fas fa-clock"></i> ${this.currentQuiz.timeLimit} min</span>
                    <span><i class="fas fa-star"></i> ${this.currentQuiz.totalPoints} points</span>
                    <span><i class="fas fa-question"></i> ${this.currentQuiz.totalQuestions} questions</span>
                </div>
            </div>
            
            <div class="quiz-questions">
                ${questionsHTML}
            </div>
            
            <div class="quiz-actions">
                <button class="nav-btn submit-quiz-btn" style="background: var(--success);">
                    <i class="fas fa-paper-plane"></i> Submit Quiz
                </button>
            </div>
        `;
    }

    selectQuizOption(selectedOption) {
        const radio = selectedOption.querySelector('input[type="radio"]');
        if (radio) {
            radio.checked = true;
            
            const questionElement = selectedOption.closest('.quiz-question');
            const questionId = questionElement.dataset.questionId;
            
            questionElement.querySelectorAll('.quiz-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            selectedOption.classList.add('selected');
            
            this.quizAnswers = this.quizAnswers.filter(a => a.questionId !== questionId);
            this.quizAnswers.push({
                questionId: questionId,
                answer: radio.value
            });
        }
    }

  

    collectQuizAnswers() {
        document.querySelectorAll('.quiz-option input:checked').forEach(radio => {
            const questionElement = radio.closest('.quiz-question');
            const questionId = questionElement.dataset.questionId;
            
            this.quizAnswers = this.quizAnswers.filter(a => a.questionId !== questionId);
            this.quizAnswers.push({
                questionId: questionId,
                answer: radio.value
            });
        });

        document.querySelectorAll('.short-answer-input').forEach(textarea => {
            const questionId = textarea.dataset.questionId;
            const answer = textarea.value.trim();
            
            if (answer) {
                this.quizAnswers = this.quizAnswers.filter(a => a.questionId !== questionId);
                this.quizAnswers.push({
                    questionId: questionId,
                    answer: answer
                });
            }
        });
    }

    showQuizResults(results) {
        const quizContent = document.getElementById('quiz-content');
        if (!quizContent) return;

        const resultsHTML = `
            <div class="quiz-results">
                <div class="results-header ${results.performance.color}">
                    <i class="fas ${results.performance.icon}" style="font-size: 4rem; margin-bottom: 1rem;"></i>
                    <h3>${results.performance.level}</h3>
                    <p>${results.performance.message}</p>
                </div>
                
                <div class="results-stats">
                    <div class="stat">
                        <span class="stat-value">${results.score}/${results.totalPossible}</span>
                        <span class="stat-label">Score</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${results.percentage}%</span>
                        <span class="stat-label">Percentage</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${Math.round(results.timeSpent / 60)}m</span>
                        <span class="stat-label">Time</span>
                    </div>
                </div>
                
                <div class="results-breakdown">
                    <h4>Question Breakdown</h4>
                    ${results.results.map((result, index) => `
                        <div class="result-item ${result.isCorrect ? 'correct' : 'incorrect'}">
                            <div class="result-icon">
                                ${result.isCorrect ? '✅' : '❌'}
                            </div>
                            <div class="result-content">
                                <p class="result-question">${this.escapeHtml(result.question)}</p>
                                <p class="result-answer">
                                    <strong>Your answer:</strong> ${this.escapeHtml(result.userAnswer)}
                                    ${!result.isCorrect ? `<br><strong>Correct answer:</strong> ${this.escapeHtml(result.correctAnswer)}` : ''}
                                </p>
                                ${result.explanation ? `<p class="result-explanation"><strong>Explanation:</strong> ${this.escapeHtml(result.explanation)}</p>` : ''}
                            </div>
                            <div class="result-points">
                                ${result.points}/${result.maxPoints}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="quiz-actions">
                    <button class="nav-btn retry-quiz-btn" style="background: var(--primary);">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            </div>
        `;

        quizContent.innerHTML = resultsHTML;
    }

    showQuizError(message) {
        const quizContent = document.getElementById('quiz-content');
        if (quizContent) {
            quizContent.innerHTML = `
                <div class="quiz-error">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f44336; margin-bottom: 1rem;"></i>
                    <h4>Quiz Error</h4>
                    <p>${message}</p>
                    <button class="nav-btn retry-quiz-btn" style="background: var(--primary); margin-top: 1rem;">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    }

    calculateTimeSpent() {
        return 300;
    }

    // ============ UTILITY METHODS ============

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupAudioPlayers() {
        const audioPlayers = document.querySelectorAll('audio[data-audio-src]');
        
        audioPlayers.forEach((audio) => {
            const audioSrc = audio.getAttribute('data-audio-src');
            
            audio.addEventListener('error', (e) => {
                this.showAudioFallback(audio);
            });
            
            this.checkAudioSource(audio, audioSrc).then(accessible => {
                if (!accessible) {
                    this.showAudioFallback(audio);
                }
            });
        });
    }

    async checkAudioSource(audioElement, src) {
        return new Promise((resolve) => {
            if (!src || src === 'null' || src === 'undefined') {
                resolve(false);
                return;
            }

            if (src.includes('localhost')) {
                resolve(true);
                return;
            }

            const audio = new Audio();
            audio.src = src;
            
            audio.addEventListener('canplaythrough', () => {
                resolve(true);
            });
            
            audio.addEventListener('error', (e) => {
                resolve(false);
            });
            
            setTimeout(() => {
                resolve(false);
            }, 3000);
        });
    }

    showAudioFallback(audioElement) {
        const container = audioElement.closest('.audio-player-container');
        if (container) {
            const fallback = container.querySelector('.audio-fallback');
            if (fallback) {
                fallback.style.color = '#f44336';
                fallback.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Audio file not available or cannot be loaded';
            }
        }
    }

    setupLiturgyPractice() {
        const checkBtn = document.querySelector('.check-response-btn');
        const speakBtn = document.querySelector('.speak-response-btn');
        const userInput = document.querySelector('.user-response-input');
        const feedback = document.querySelector('.response-feedback');
        const expectedResponseEl = document.querySelector('.expected-response');
        
        if (!checkBtn || !userInput || !expectedResponseEl) {
            return;
        }

        const expectedResponse = expectedResponseEl.textContent.replace(/"/g, '').trim();
        
        const newCheckBtn = checkBtn.cloneNode(true);
        const newSpeakBtn = speakBtn?.cloneNode(true);
        checkBtn.parentNode.replaceChild(newCheckBtn, checkBtn);
        if (speakBtn) {
            speakBtn.parentNode.replaceChild(newSpeakBtn, speakBtn);
        }

        newCheckBtn.addEventListener('click', () => {
            const userResponse = userInput.value.trim();
            
            if (!userResponse) {
                this.showFeedback('Please type or say the response first.', 'warning', feedback);
                return;
            }
            
            const normalizedUser = userResponse.toLowerCase();
            const normalizedExpected = expectedResponse.toLowerCase();
            
            if (normalizedUser === normalizedExpected) {
                this.showFeedback('🎉 Excellent! Your response is correct!', 'success', feedback);
            } else {
                this.showFeedback('Almost! Try again. Remember: ' + expectedResponse, 'error', feedback);
            }
        });
        
        if (newSpeakBtn) {
            newSpeakBtn.addEventListener('click', () => {
                if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                    this.startSpeechRecognition(userInput, feedback);
                } else {
                    this.showFeedback('Speech recognition is not supported in your browser.', 'warning', feedback);
                }
            });
        }
    }

    startSpeechRecognition(userInput, feedback) {
        if (this.speechRecognition) {
            this.speechRecognition.stop();
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.speechRecognition = new SpeechRecognition();
        
        this.speechRecognition.continuous = false;
        this.speechRecognition.interimResults = false;
        this.speechRecognition.lang = 'en-US';
        
        this.speechRecognition.start();
        
        this.speechRecognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript;
            userInput.value = speechResult;
            this.showFeedback('Response captured! Click "Check Response" to verify.', 'info', feedback);
        };
        
        this.speechRecognition.onerror = (event) => {
            if (event.error === 'not-allowed') {
                this.showFeedback('Microphone access denied. Please allow microphone access and try again.', 'error', feedback);
            } else {
                this.showFeedback('Error capturing speech: ' + event.error, 'error', feedback);
            }
        };
    }

    showFeedback(message, type, feedbackElement) {
        if (!feedbackElement) return;
        
        feedbackElement.textContent = message;
        feedbackElement.style.display = 'block';
        feedbackElement.style.background = type === 'success' ? '#d4edda' : 
                                          type === 'error' ? '#f8d7da' : 
                                          type === 'warning' ? '#fff3cd' : '#cce7ff';
        feedbackElement.style.border = type === 'success' ? '1px solid #c3e6cb' : 
                                      type === 'error' ? '1px solid #f5c6cb' : 
                                      type === 'warning' ? '1px solid #ffeaa7' : '1px solid #b3d9ff';
        feedbackElement.style.color = type === 'success' ? '#155724' : 
                                     type === 'error' ? '#721c24' : 
                                     type === 'warning' ? '#856404' : '#004085';
    }

    showStep(stepIndex) {
        const allSteps = document.querySelectorAll('.lesson-step');
        
        allSteps.forEach(step => {
            step.classList.remove('active');
        });
        
        const currentStep = document.querySelector(`.lesson-step[data-step="${stepIndex}"]`);
        if (currentStep) {
            currentStep.classList.add('active');
            this.currentStep = stepIndex;
            this.updateProgress();
            
            setTimeout(() => {
                this.setupAudioPlayers();
                if (currentStep.classList.contains('liturgy-step')) {
                    this.setupLiturgyPractice();
                }
            }, 100);
        } else {
            if (allSteps.length > 0) {
                this.showStep(parseInt(allSteps[0].dataset.step));
            }
        }
    }

    updateProgress() {
        const weekData = this.currentProgram.weeks.find(w => w.week === this.currentWeek);
        if (!weekData) return;
        
        const totalSteps = this.getTotalSteps(weekData);
        const progress = ((this.currentStep + 1) / totalSteps) * 100;
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `Step ${this.currentStep + 1} of ${totalSteps}`;
    }

    setupEventListeners() {
        document.querySelector('.prev-month')?.addEventListener('click', () => {
            this.currentMonth--;
            if (this.currentMonth < 1) {
                this.currentMonth = 12;
                this.currentYear--;
            }
            this.loadProgram(this.currentYear, this.currentMonth);
        });

        document.querySelector('.next-month')?.addEventListener('click', () => {
            this.currentMonth++;
            if (this.currentMonth > 12) {
                this.currentMonth = 1;
                this.currentYear++;
            }
            this.loadProgram(this.currentYear, this.currentMonth);
        });

        document.querySelectorAll('.week-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.currentProgram || !this.currentProgram.weeks) return;
                
                const weekNumber = parseInt(btn.dataset.week);
                
                document.querySelectorAll('.week-nav-btn').forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                
                this.renderWeekContent(weekNumber);
            });
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-btn')) {
                const btn = e.target;
                
                if (btn.classList.contains('next') && !btn.disabled) {
                    const nextStep = parseInt(btn.dataset.next);
                    this.showStep(nextStep);
                } else if (btn.classList.contains('prev') && !btn.disabled) {
                    const prevStep = parseInt(btn.dataset.prev);
                    this.showStep(prevStep);
                }
            }

            if (e.target.classList.contains('start-quiz-btn')) {
                this.startQuiz();
            } else if (e.target.classList.contains('submit-quiz-btn')) {
                this.submitQuiz();
            } else if (e.target.classList.contains('retry-quiz-btn')) {
                this.startQuiz();
            } else if (e.target.classList.contains('quiz-option')) {
                this.selectQuizOption(e.target);
            }
        });
    }

    getLoadingState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">⏳</div>
                <h3>Loading Program...</h3>
                <p>Please wait while we load the kids program.</p>
            </div>
        `;
    }

    getEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <h3>Coming Soon!</h3>
                <p>The lesson for this week is being prepared.</p>
                <p>Check back later or try another week.</p>
            </div>
        `;
    }

}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.kidsProgram = new KidsProgram();
    window.kidsProgram.init();
});