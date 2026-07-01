import { normalizePageViewPath, shouldSkipPageViewPath } from './pageViewTrackerRules';

/**
 * Anonymous Page View Tracker
 * ===========================
 * Fires a lightweight POST to /api/dashboard/track-pageview on each page load.
 * No user data sent — just the page path and referrer.
 * Admin dashboard uses this to show real-time "who's on the site" data.
 */

const API_BASE = import.meta.env.VITE_API_BASE || '';
let lastTrackedPath = '';

export function trackPageView(path?: string) {
  const pagePath = normalizePageViewPath(path || window.location.pathname);

  if (!pagePath) return;

  // Don't re-track the same page
  if (pagePath === lastTrackedPath) return;

  // Skip admin dashboard and login-only auth pages; signup/register are acquisition visits.
  if (shouldSkipPageViewPath(pagePath)) return;

  lastTrackedPath = pagePath;

  try {
    const url = API_BASE
      ? `${API_BASE}/api/dashboard/track-pageview`
      : '/api/dashboard/track-pageview';

    // Use sendBeacon for non-blocking fire-and-forget
    const payload = JSON.stringify({
      page: pagePath,
      referrer: document.referrer || null,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
    } else {
      // Fallback for older browsers
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Silent fail — analytics should never break the app
  }
}

// Auto-track on import + listen for SPA route changes
trackPageView();

// Listen for popstate (back/forward) and pushState/replaceState
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function (...args) {
  originalPushState.apply(this, args);
  setTimeout(() => trackPageView(), 0);
};

history.replaceState = function (...args) {
  originalReplaceState.apply(this, args);
  setTimeout(() => trackPageView(), 0);
};

window.addEventListener('popstate', () => {
  setTimeout(() => trackPageView(), 0);
});
