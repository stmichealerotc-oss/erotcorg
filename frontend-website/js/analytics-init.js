// Google Analytics Initialization with Consent Mode
(function() {
  'use strict';

  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  
  // Set default consent to denied
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied'
  });
  
  gtag('js', new Date());
  gtag('config', 'AW-17909191769');
  
  // Add GA4 if measurement ID is provided
  if (window.GA4_MEASUREMENT_ID) {
    gtag('config', window.GA4_MEASUREMENT_ID);
  }
  
  // Check if user has previously consented
  const consent = localStorage.getItem('privacyConsent');
  if (consent === 'accepted') {
    gtag('consent', 'update', {
      'analytics_storage': 'granted'
    });
  }
})();
