/**
 * Utility functions for Google Analytics (GA4) tracking.
 */

// Initialize Google Analytics dynamic tag loader
export const initGA = (measurementId) => {
  if (!measurementId) {
    console.warn('[GA4] Measurement ID is missing. Google Analytics is disabled.');
    return;
  }

  // Prevent multiple injections of the script
  if (document.getElementById('ga-gtag-script')) return;

  const script = document.createElement('script');
  script.id = 'ga-gtag-script';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.async = true;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false // We will handle page views manually to support SPA routing
  });
  console.log(`[GA4] Initialized with ID: ${measurementId}`);
};

// Log Page View
export const logPageView = (measurementId, path) => {
  if (!measurementId || !window.gtag) return;
  window.gtag('config', measurementId, {
    page_path: path,
  });
  console.log(`[GA4] Logged pageview: ${path}`);
};

// Log Custom Events
export const logEvent = (action, category, label, value) => {
  if (!window.gtag) return;
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};
