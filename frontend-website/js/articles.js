class ArticleSystem {
    constructor() {
        this.articles = [];
        this.currentCategory = 'all';
        this.cache = new Map();
        this.init();
    }

    async init() {
        await this.loadArticleIndex();
        this.setupEventListeners();
        this.loadRecentArticlesOnHome();
    }

    async loadArticleIndex() {
        try {
            const response = await fetch('data/articles/articles-index.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            this.articles = await response.json();
        } catch (error) {
            console.error('Error loading articles index:', error);
            this.articles = [];
        }
    }

    async loadArticle(articleId) {
        const cacheKey = `article-${articleId}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Find article in index to get its path
            const articleInfo = this.articles.find(a => a.id === articleId);
            if (!articleInfo) {
                throw new Error('Article not found in index');
            }

            const response = await fetch(`data/articles/${articleInfo.category}/${articleId}.json`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const article = await response.json();
            this.cache.set(cacheKey, article);
            return article;
        } catch (error) {
            console.error(`Error loading article ${articleId}:`, error);
            return null;
        }
    }

    setupEventListeners() {
        // Filter buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                this.handleCategoryFilter(e.target);
            }
        });

        // Article cards
        document.addEventListener('click', (e) => {
            const articleCard = e.target.closest('.article-card');
            if (articleCard) {
                const articleId = articleCard.dataset.articleId;
                this.showArticle(articleId);
            }
        });

        // Back to articles button
        document.addEventListener('click', (e) => {
            if (e.target.closest('.back-to-articles')) {
                this.showArticlesList();
            }
        });

        // View all articles link
        document.addEventListener('click', (e) => {
            if (e.target.closest('.view-all-link')) {
                e.preventDefault();
                // This will be handled by the main navigation system
                window.showPage('articles');
            }
        });

        // Related article buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.related-article-btn')) {
                const button = e.target.closest('.related-article-btn');
                const articleId = button.dataset.articleId;
                this.showArticle(articleId);
            }
        });
    }

    handleCategoryFilter(button) {
        // Update active filter
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        this.currentCategory = button.dataset.category;
        this.renderArticles();
    }

    loadRecentArticlesOnHome() {
        // Load recent articles on home page
        const recentContainer = document.getElementById('recent-articles');
        if (recentContainer) {
            this.renderRecentArticles(recentContainer, 2); // Show 2 recent articles
        }
    }

    renderRecentArticles(container, limit = 2) {
        if (!this.articles || this.articles.length === 0) {
            container.innerHTML = '<p class="no-articles">No articles available at the moment.</p>';
            return;
        }

        // Sort by date and take the most recent
        const recentArticles = this.articles
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);

        container.innerHTML = recentArticles.map(article => this.renderArticleCard(article)).join('');
    }

    renderArticles() {
        const container = document.getElementById('articles-container');
        if (!container) return;

        let filteredArticles = this.articles;
        
        if (this.currentCategory !== 'all') {
            filteredArticles = this.articles.filter(article => 
                article.category === this.currentCategory
            );
        }

        if (filteredArticles.length === 0) {
            container.innerHTML = '<p class="no-articles">No articles found in this category.</p>';
            return;
        }

        // Sort by date (newest first)
        filteredArticles.sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = filteredArticles.map(article => this.renderArticleCard(article)).join('');
    }

    renderArticleCard(article) {
        const categoryColors = {
            'qa': '#17a2b8',
            'church-history': '#8e44ad',
            'liturgy': '#2980b9',
            'community': '#27ae60',
            'theology': '#e74c3c',
            'announcements': '#f39c12'
        };

        const categoryColor = categoryColors[article.category] || '#2c5e1a';

        return `
            <div class="article-card" data-article-id="${article.id}">
                <div class="article-image" style="background: linear-gradient(135deg, ${categoryColor}, ${categoryColor}aa);">
                    <i class="fas ${this.getCategoryIcon(article.category)}"></i>
                </div>
                <div class="article-content">
                    <div class="article-meta">
                        <span class="article-category" style="background: ${categoryColor};">
                            ${this.formatCategory(article.category)}
                        </span>
                        <span class="article-date">${this.formatDate(article.date)}</span>
                    </div>
                    <h3 class="article-title">${article.title}</h3>
                    <p class="article-excerpt">${article.excerpt}</p>
                    <div class="article-footer">
                        <span class="reading-time">
                            <i class="fas fa-clock"></i> ${article.reading_time}
                        </span>
                        <span class="read-more">Read More <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>
            </div>
        `;
    }

    getCategoryIcon(category) {
        const icons = {
            'qa': 'fa-question-circle',
            'church-history': 'fa-history',
            'liturgy': 'fa-church',
            'community': 'fa-users',
            'theology': 'fa-cross',
            'announcements': 'fa-bullhorn'
        };
        return icons[category] || 'fa-newspaper';
    }

    formatCategory(category) {
        const names = {
            'qa': 'Q&A',
            'church-history': 'Church History',
            'liturgy': 'Liturgy & Worship',
            'community': 'Community',
            'theology': 'Theology',
            'announcements': 'Announcements'
        };
        return names[category] || category;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-AU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    async showArticle(articleId) {
        const article = await this.loadArticle(articleId);
        if (!article) {
            alert('Sorry, this article could not be loaded.');
            return;
        }

        const articlesList = document.getElementById('articles-container');
        const articleView = document.getElementById('article-view');
        const articleContent = document.getElementById('article-content');

        if (articlesList) articlesList.style.display = 'none';
        if (articleView) articleView.style.display = 'block';

        if (articleContent) {
            articleContent.innerHTML = this.renderFullArticle(article);
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showArticlesList() {
        const articlesList = document.getElementById('articles-container');
        const articleView = document.getElementById('article-view');
        const filtersContainer = document.querySelector('.article-filters');

        if (articlesList) articlesList.style.display = 'grid';
        if (articleView) articleView.style.display = 'none';
        if (filtersContainer) filtersContainer.style.display = 'flex';

        this.renderArticles();
    }

    renderFullArticle(article) {
        let html = `
            <div class="article-header">
                <h1 class="article-full-title">${article.title}</h1>
                ${article.subtitle ? `<p class="article-subtitle">${article.subtitle}</p>` : ''}
                <div class="article-full-meta">
                    <span><i class="fas fa-user"></i> ${article.author}</span>
                    <span><i class="fas fa-calendar"></i> ${this.formatDate(article.date)}</span>
                    <span><i class="fas fa-clock"></i> ${article.reading_time}</span>
                    <span><i class="fas fa-tag"></i> ${this.formatCategory(article.category)}</span>
                </div>
            </div>
        `;

        if (article.featured_image) {
            html += `<img src="${article.featured_image}" alt="${article.title}" style="width: 100%; border-radius: 8px; margin-bottom: 2rem;">`;
        }

        article.sections.forEach(section => {
            html += '<div class="article-section">';
            
            if (section.title) {
                html += `<h2>${section.title}</h2>`;
            }

            if (section.content) {
                section.content.forEach(paragraph => {
                    html += `<p>${this.formatText(paragraph)}</p>`;
                });
            }

            if (section.image) {
                html += `<img src="${section.image}" alt="${section.title || 'Article image'}" style="width: 100%; border-radius: 8px; margin: 1rem 0;">`;
            }

            if (section.quote) {
                html += `<blockquote style="border-left: 4px solid var(--primary); padding-left: 1rem; font-style: italic; margin: 1.5rem 0;">${section.quote}</blockquote>`;
            }

            html += '</div>';
        });

        // Add references section if available
        if (article.references && article.references.length > 0) {
            html += `
                <div class="article-references">
                    <h3>References</h3>
                    <ol class="references-list">
                        ${article.references.map(ref => `
                            <li id="ref-${ref.number}">
                                ${ref.citation}
                            </li>
                        `).join('')}
                    </ol>
                </div>
            `;
        }

        // Add series information if available
        if (article.series) {
            html += `
                <div class="article-series">
                    <h4><i class="fas fa-book-open"></i> ${article.series.title}</h4>
                    <p>Part ${article.series.part} of ${article.series.total_parts}</p>
                </div>
            `;
        }

        // Add related articles if available
        if (article.related_articles && article.related_articles.length > 0) {
            html += `
                <div class="article-related">
                    <h4><i class="fas fa-link"></i> Related Articles</h4>
                    <div class="related-articles-list">
                        ${article.related_articles.map(articleId => `
                            <button class="related-article-btn" data-article-id="${articleId}">
                                <i class="fas fa-arrow-right"></i> ${this.getArticleTitle(articleId)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        return html;
    }

    getArticleTitle(articleId) {
        const article = this.articles.find(a => a.id === articleId);
        return article ? article.title : 'Related Article';
    }

    formatText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/(\w)(\d+)(?=\s|$|\.|\,)/g, '$1<sup class="footnote-ref">$2</sup>'); // Footnotes after words
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.articleSystem = new ArticleSystem();
});