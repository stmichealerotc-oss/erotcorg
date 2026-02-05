// script.js - Main site functionality
document.addEventListener('DOMContentLoaded', function() {
  initializeNavigation();
  initializeBooks();
});

// Navigation functionality
function initializeNavigation() {
  // Mobile Navigation Toggle
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // Page Navigation with Event Delegation
  navLinks.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-page]');
    if (link) {
      e.preventDefault();
      const pageId = link.dataset.page;
      showPage(pageId);
    }
  });

  // Footer links navigation
  document.addEventListener('click', (e) => {
    const footerLink = e.target.closest('a[data-page]');
    if (footerLink) {
      e.preventDefault();
      const pageId = footerLink.dataset.page;
      showPage(pageId);
    }
  });

  // Tewahdo Haymanot Dropdown functionality
  setupDropdownMenus();

  // Load last viewed page
  const lastPage = localStorage.getItem('lastPage') || 'home';
  showPage(lastPage);
}

// Setup dropdown menus for Tewahdo Haymanot
function setupDropdownMenus() {
  // Main dropdown toggle
  const dropdownToggle = document.querySelector('.nav-dropdown .dropdown-toggle');
  const dropdownMenu = document.querySelector('.dropdown-menu');
  
  if (dropdownToggle && dropdownMenu) {
    // Desktop and mobile click handler
    dropdownToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('Dropdown toggle clicked'); // Debug log
      
      // Check if mobile or desktop
      const isMobile = window.innerWidth < 768;
      
      // Remove any existing backdrop
      const existingBackdrop = document.querySelector('.dropdown-backdrop');
      if (existingBackdrop) {
        existingBackdrop.remove();
      }
      
      // Close all other dropdowns first
      document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        if (menu !== dropdownMenu) {
          menu.classList.remove('show');
        }
      });
      document.querySelectorAll('.dropdown-submenu-content.show').forEach(submenu => {
        submenu.classList.remove('show');
      });
      
      // Toggle current dropdown
      const isShowing = dropdownMenu.classList.contains('show');
      dropdownMenu.classList.toggle('show');
      
      if (isMobile) {
        // Mobile: Push content down, no overlay
        if (!isShowing) {
          dropdownMenu.classList.add('mobile-dropdown');
        } else {
          dropdownMenu.classList.remove('mobile-dropdown');
        }
      } else {
        // Desktop: Overlay with backdrop
        if (!isShowing) {
          // Create backdrop
          const backdrop = document.createElement('div');
          backdrop.className = 'dropdown-backdrop';
          backdrop.addEventListener('click', (e) => {
            // Only close if clicking directly on backdrop, not on dropdown content
            if (e.target === backdrop) {
              dropdownMenu.classList.remove('show');
              backdrop.remove();
              // Remove page overlay
              document.body.classList.remove('dropdown-active');
            }
          });
          document.body.appendChild(backdrop);
          
          // Add page overlay effect
          document.body.classList.add('dropdown-active');
        } else {
          // Remove page overlay when closing
          document.body.classList.remove('dropdown-active');
        }
      }
      
      console.log('Dropdown menu show class:', dropdownMenu.classList.contains('show')); // Debug log
    });
  }

  // Submenu toggles - works for both desktop and mobile
  document.querySelectorAll('.dropdown-submenu .dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      console.log('Submenu item clicked:', e.target); // Debug log
      const submenu = item.nextElementSibling;
      if (submenu && submenu.classList.contains('dropdown-submenu-content')) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Toggling submenu:', submenu); // Debug log
        
        // Close other submenus
        document.querySelectorAll('.dropdown-submenu-content.show').forEach(menu => {
          if (menu !== submenu) {
            menu.classList.remove('show');
          }
        });
        
        // Toggle current submenu
        submenu.classList.toggle('show');
        console.log('Submenu show class:', submenu.classList.contains('show')); // Debug log
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    // Don't close if clicking on dropdown items or submenus
    if (!e.target.closest('.nav-dropdown') && !e.target.closest('.dropdown-menu')) {
      document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        menu.classList.remove('show');
        menu.classList.remove('mobile-dropdown'); // Remove mobile class too
      });
      document.querySelectorAll('.dropdown-submenu-content.show').forEach(submenu => {
        submenu.classList.remove('show');
      });
      
      // Remove backdrop and page overlay
      const backdrop = document.querySelector('.dropdown-backdrop');
      if (backdrop) {
        backdrop.remove();
      }
      document.body.classList.remove('dropdown-active');
    }
  });

  // Mobile-specific nav toggle
  document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
    toggle.addEventListener('click', e => {
      if (window.innerWidth < 768) {
        e.preventDefault();
        const menu = toggle.nextElementSibling;
        if (menu) {
          menu.classList.toggle('active');
        }
      }
    });
  });

  document.querySelectorAll('.sub-dropdown-toggle').forEach(toggle => {
    toggle.addEventListener('click', e => {
      if (window.innerWidth < 768) {
        e.preventDefault();
        const submenu = toggle.nextElementSibling;
        if (submenu) {
          submenu.classList.toggle('active');
        }
      }
    });
  });
}

function showPage(pageId) {
  // Hide all sections
  document.querySelectorAll('section').forEach(section =>
    section.classList.remove('active')
  );

  // Show the requested section
  const targetSection = document.getElementById(pageId);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Update active-link class in nav
  document.querySelectorAll('.nav-links a').forEach(a =>
    a.classList.remove('active-link')
  );

  const activeLink = document.querySelector(`.nav-links a[data-page="${pageId}"]`);
  if (activeLink) {
    activeLink.classList.add('active-link');
  }

  // Save last visited page
  localStorage.setItem('lastPage', pageId);

  // Close mobile menu on selection
  if (window.innerWidth < 768) {
    document.querySelector('.nav-links').classList.remove('active');
  }

  // Load specific page content
  if (pageId === 'kids-program') {
    initializeKidsProgram();
  } else if (pageId === 'articles') {
    initializeArticles();
  }
}

function initializeKidsProgram() {
  const kidsProgram = new KidsProgram();
  kidsProgram.init();
}

function initializeArticles() {
  if (window.articleSystem) {
    window.articleSystem.renderArticles();
    // Show articles list, hide individual article view
    const articlesList = document.getElementById('articles-container');
    const articleView = document.getElementById('article-view');
    const filtersContainer = document.querySelector('.article-filters');
    
    if (articlesList) articlesList.style.display = 'grid';
    if (articleView) articleView.style.display = 'none';
    if (filtersContainer) filtersContainer.style.display = 'flex';
  }
}

// Books functionality
function initializeBooks() {
  loadBooksIndex();
}

function loadBooksIndex() {
  const container = document.getElementById('book-categories');
  if (!container) return;

  const categories = [
    {
      name: "Liturgy",
      books: [
        { name: "Kidase (Divine Liturgy)", id: "kidase" },
        { name: "Mazmur (Psalms)", id: "mazmur" },
        { name: "Wedase Maryam (Praises of Mary)", id: "wedase_maryam" }
      ]
    },
    {
      name: "Prayers",
      books: [
        { name: "Morning Prayers", id: "morning_prayers" },
        { name: "Evening Prayers", id: "evening_prayers" },
        { name: "Prayers for Feasts", id: "feast_prayers" }
      ]
    },
    {
      name: "Hymns",
      books: [
        { name: "Zema (Chants)", id: "zema" },
        { name: "Mewasit (Hymns for Departed)", id: "mewasit" },
        { name: "Me'eraf (Common Hymns)", id: "meeraf" }
      ]
    }
  ];
  
  container.innerHTML = categories.map(category => `
    <div class="book-category">
      <h3 onclick="toggleBookCategory(this)">
        ${category.name} <i class="fas fa-chevron-down"></i>
      </h3>
      <div class="book-list">
        ${category.books.map(book => `
          <div class="book-item" onclick="showBookContent('${book.id}', '${book.name}')">
            ${book.name}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function toggleBookCategory(element) {
  const content = element.nextElementSibling;
  content.classList.toggle('active');
  const icon = element.querySelector('i');
  icon.classList.toggle('fa-chevron-down');
  icon.classList.toggle('fa-chevron-up');
}

function showBookContent(bookId, bookName) {
  alert(`Loading: ${bookName}\nBook ID: ${bookId}\n\nIn a full implementation, this would load the actual book content.`);
}

// Make functions globally available
window.showPage = showPage;
window.toggleBookCategory = toggleBookCategory;
window.showBookContent = showBookContent;
window.initializeKidsProgram = initializeKidsProgram;