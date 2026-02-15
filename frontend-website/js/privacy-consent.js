// Privacy Consent Banner Management
(function() {
  'use strict';

  // Check if user has already made a privacy consent choice
  function checkPrivacyConsent() {
    const consent = localStorage.getItem('privacyConsent');
    const consentBanner = document.getElementById('privacy-consent-banner');
    
    if (!consent && consentBanner) {
      // Show banner after 1 second delay
      setTimeout(() => {
        consentBanner.classList.add('show');
      }, 1000);
    }
  }

  function acceptPrivacyConsent() {
    localStorage.setItem('privacyConsent', 'accepted');
    localStorage.setItem('privacyConsentDate', new Date().toISOString());
    const banner = document.getElementById('privacy-consent-banner');
    if (banner) banner.classList.remove('show');
    
    // Enable analytics if user accepts
    if (typeof gtag !== 'undefined') {
      gtag('consent', 'update', {
        'analytics_storage': 'granted'
      });
    }
  }

  function declinePrivacyConsent() {
    localStorage.setItem('privacyConsent', 'declined');
    localStorage.setItem('privacyConsentDate', new Date().toISOString());
    const banner = document.getElementById('privacy-consent-banner');
    if (banner) banner.classList.remove('show');
    
    // Disable analytics if user declines
    if (typeof gtag !== 'undefined') {
      gtag('consent', 'update', {
        'analytics_storage': 'denied'
      });
    }
  }

  // Attach event listeners to buttons
  function attachEventListeners() {
    const acceptBtn = document.getElementById('accept-privacy-btn');
    const declineBtn = document.getElementById('decline-privacy-btn');
    
    if (acceptBtn) {
      acceptBtn.addEventListener('click', acceptPrivacyConsent);
    }
    
    if (declineBtn) {
      declineBtn.addEventListener('click', declinePrivacyConsent);
    }
  }

  // Initialize on page load
  function init() {
    checkPrivacyConsent();
    attachEventListeners();
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
