const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Get all articles with metadata
router.get('/', async (req, res) => {
  try {
    const articlesDir = path.join(__dirname, '../../frontend-website/data/articles');
    const categories = await fs.readdir(articlesDir);
    
    const articles = [];
    
    for (const category of categories) {
      const categoryPath = path.join(articlesDir, category);
      const stat = await fs.stat(categoryPath);
      
      if (stat.isDirectory()) {
        const files = await fs.readdir(categoryPath);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(categoryPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const article = JSON.parse(content);
            
            articles.push({
              id: article.id,
              title: article.title,
              subtitle: article.subtitle,
              author: article.author,
              date: article.date,
              category: article.category,
              readTime: article.readTime,
              slug: article.id,
              url: `/articles/${article.id}`
            });
          }
        }
      }
    }
    
    // Sort by date (newest first)
    articles.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({ articles });
  } catch (error) {
    console.error('Error loading articles:', error);
    res.status(500).json({ error: 'Failed to load articles' });
  }
});

// Get single article by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const articlesDir = path.join(__dirname, '../../frontend-website/data/articles');
    const categories = await fs.readdir(articlesDir);
    
    for (const category of categories) {
      const categoryPath = path.join(articlesDir, category);
      const stat = await fs.stat(categoryPath);
      
      if (stat.isDirectory()) {
        const filePath = path.join(categoryPath, `${slug}.json`);
        
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const article = JSON.parse(content);
          
          // Generate Article schema
          const schema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": article.title,
            "description": article.subtitle,
            "author": {
              "@type": "Person",
              "name": article.author
            },
            "datePublished": article.date,
            "dateModified": article.date,
            "publisher": {
              "@type": "Organization",
              "name": "Saint Michael Eritrean Orthodox Tewahdo Church",
              "logo": {
                "@type": "ImageObject",
                "url": "https://erotc.org/logo.png"
              }
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://erotc.org/articles/${slug}`
            },
            "articleSection": article.category,
            "keywords": article.tags ? article.tags.join(', ') : article.category
          };
          
          res.json({
            article,
            schema,
            url: `/articles/${slug}`,
            canonicalUrl: `https://erotc.org/articles/${slug}`
          });
          return;
        } catch (err) {
          // File not found in this category, continue
          continue;
        }
      }
    }
    
    res.status(404).json({ error: 'Article not found' });
  } catch (error) {
    console.error('Error loading article:', error);
    res.status(500).json({ error: 'Failed to load article' });
  }
});

module.exports = router;
