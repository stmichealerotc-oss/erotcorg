// Article Loader with SEO and Schema
(function() {
  'use strict';

  const API_BASE = window.API_BASE_URL || 'https://my-church.onrender.com';

  async function loadArticle() {
    // Get slug from URL path
    const pathParts = window.location.pathname.split('/');
    const slug = pathParts[pathParts.length - 1].replace('.html', '');
    
    if (!slug || slug === 'article') {
      showError('No article specified');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/articles/${slug}`);
      
      if (!response.ok) {
        throw new Error('Article not found');
      }

      const data = await response.json();
      renderArticle(data);
      updateSEO(data);
      addStructuredData(data.schema);
      
    } catch (error) {
      console.error('Error loading article:', error);
      showError('Failed to load article');
    }
  }

  function renderArticle(data) {
    const { article } = data;
    const contentDiv = document.getElementById('article-content');
    
    let html = `
      <div class="article-header">
        <h1 class="article-title">${escapeHtml(article.title)}</h1>
        <p class="article-subtitle">${escapeHtml(article.subtitle)}</p>
        <div class="article-meta">
          <span><i class="fas fa-user"></i> ${escapeHtml(article.author)}</span>
          <span><i class="fas fa-calendar"></i> ${formatDate(article.date)}</span>
          <span><i class="fas fa-clock"></i> ${article.readTime}</span>
          <span><i class="fas fa-tag"></i> ${escapeHtml(article.category)}</span>
        </div>
      </div>
      
      <div class="article-content">
    `;
    
    article.sections.forEach(section => {
      html += `
        <div class="article-section">
          <h2>${escapeHtml(section.title)}</h2>
      `;
      
      section.content.forEach(paragraph => {
        // Convert markdown-style bold to HTML
        const formatted = paragraph
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        html += `<p>${formatted}</p>`;
      });
      
      html += `</div>`;
    });
    
    html += `</div>`;
    
    contentDiv.innerHTML = html;
    contentDiv.style.display = 'block';
    document.getElementById('article-loading').style.display = 'none';
  }

  function updateSEO(data) {
    const { article, canonicalUrl } = data;
    
    // Update title
    document.title = `${article.title} - Saint Michael Church`;
    
    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = article.subtitle;
    
    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
    
    // Add Open Graph tags
    updateMetaTag('og:title', article.title);
    updateMetaTag('og:description', article.subtitle);
    updateMetaTag('og:type', 'article');
    updateMetaTag('og:url', canonicalUrl);
    updateMetaTag('article:published_time', article.date);
    updateMetaTag('article:author', article.author);
    updateMetaTag('article:section', article.category);
  }

  function updateMetaTag(property, content) {
    let meta = document.querySelector(`meta[property="${property}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('property', property);
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  function addStructuredData(schema) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  function showError(message) {
    document.getElementById('article-loading').style.display = 'none';
    document.getElementById('article-error').style.display = 'block';
    document.getElementById('article-error').querySelector('p').textContent = message;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  // Load article on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadArticle);
  } else {
    loadArticle();
  }
})();
