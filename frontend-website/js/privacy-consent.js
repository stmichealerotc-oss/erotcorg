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
        consentBanner.style.display = 'block';
      }, 1000);
    }
  }

  window.acceptPrivacyConsent = function() {
    localStorage.setItem('privacyConsent', 'accepted');
    localStorage.setItem('privacyConsentDate', new Date().toISOString());
    document.getElementById('privacy-consent-banner').style.display = 'none';
    
    // Enable analytics if user accepts
    if (typeof gtag !== 'undefined') {
      gtag('consent', 'update', {
        'analytics_storage': 'granted'
      });
    }
  };

  window.declinePrivacyConsent = function() {
    localStorage.setItem('privacyConsent', 'declined');
    localStorage.setItem('privacyConsentDate', new Date().toISOString());
    document.getElementById('privacy-consent-banner').style.display = 'none';
    
    // Disable analytics if user declines
    if (typeof gtag !== 'undefined') {
      gtag('consent', 'update', {
        'analytics_storage': 'denied'
      });
    }
  };

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkPrivacyConsent);
  } else {
    checkPrivacyConsent();
  }
})();
