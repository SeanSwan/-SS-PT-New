/**
 * API Connectivity Fixer
 * 
 * This utility monitors network requests and reports API connectivity issues.
 * SwanStudios no longer swaps failed backend calls for simulated data.
 */

import { logger } from '@/utils/logger';

let connectionErrors = 0;
const MAX_ERRORS_BEFORE_WARNING = 3;
const API_UNAVAILABLE_NOTICE_ID = 'swan-api-unavailable-notice';

/**
 * Initialize the API connection monitoring
 * This adds global error handlers to detect network issues
 */
export const initializeApiMonitoring = () => {
  logger.log('[API Monitor] Initializing API connectivity monitoring without simulated-data fallback');

  // Monitor fetch errors globally
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      
      // Reset error count on successful connection
      if (response.ok) {
        connectionErrors = 0;
      }
      
      return response;
    } catch (error) {
      // Track connection errors
      if (error.message?.includes('NetworkError') || 
          error.message?.includes('Failed to fetch') || 
          error.message?.includes('ERR_CONNECTION_REFUSED') ||
          error.message?.includes('ECONNREFUSED')) {
        
        connectionErrors++;
        logger.warn(`[API Monitor] Connection error detected (${connectionErrors}/${MAX_ERRORS_BEFORE_WARNING}): ${error.message}`);
        
        if (connectionErrors >= MAX_ERRORS_BEFORE_WARNING) {
          logger.warn('[API Monitor] Too many connection errors; backend data remains unavailable until the API recovers');
          showApiUnavailableNotification();
        }
      }
      
      throw error;
    }
  };

  // Monitor XMLHttpRequest errors
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(...args) {
    this.addEventListener('error', () => {
      connectionErrors++;
      logger.warn(`[API Monitor] XHR error detected (${connectionErrors}/${MAX_ERRORS_BEFORE_WARNING})`);
      
      if (connectionErrors >= MAX_ERRORS_BEFORE_WARNING) {
        logger.warn('[API Monitor] Too many XHR errors; backend data remains unavailable until the API recovers');
        showApiUnavailableNotification();
      }
    });

    return originalXHROpen.apply(this, args as Parameters<XMLHttpRequest['open']>);
  };
};

/**
 * Show a notification to the user about API unavailability.
 */
function showApiUnavailableNotification() {
  try {
    if (document.getElementById(API_UNAVAILABLE_NOTICE_ID)) return;

    const notification = document.createElement('div');
    notification.id = API_UNAVAILABLE_NOTICE_ID;
    notification.setAttribute('role', 'status');
    notification.setAttribute('aria-live', 'polite');
    notification.style.position = 'fixed';
    notification.style.right = 'max(12px, env(safe-area-inset-right))';
    notification.style.bottom = 'max(12px, env(safe-area-inset-bottom))';
    notification.style.left = 'max(12px, env(safe-area-inset-left))';
    notification.style.display = 'grid';
    notification.style.gridTemplateColumns = 'minmax(0, 1fr) 44px';
    notification.style.gap = '10px';
    notification.style.alignItems = 'center';
    notification.style.margin = '0 auto';
    notification.style.padding = '12px';
    notification.style.color = 'var(--text-primary, #E0ECF4)';
    notification.style.background = 'linear-gradient(135deg, var(--bg-elevated, #003080), var(--bg-base, #030712))';
    notification.style.border = '1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 44%, transparent)';
    notification.style.borderRadius = '8px';
    notification.style.boxShadow = '0 16px 40px color-mix(in srgb, var(--bg-base, #030712) 42%, transparent)';
    notification.style.zIndex = '9999';
    notification.style.maxWidth = 'min(360px, calc(100vw - 24px))';
    notification.style.fontFamily = "'Sora', 'Plus Jakarta Sans', sans-serif";

    const copy = document.createElement('div');
    copy.style.minWidth = '0';

    const title = document.createElement('div');
    title.textContent = 'Backend connection issue';
    title.style.fontWeight = '800';
    title.style.fontSize = '0.92rem';
    title.style.lineHeight = '1.2';

    const message = document.createElement('div');
    message.textContent = 'Live data is unavailable until the API recovers.';
    message.style.marginTop = '4px';
    message.style.color = 'color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent)';
    message.style.fontSize = '0.8rem';
    message.style.lineHeight = '1.35';

    const dismissButton = document.createElement('button');
    dismissButton.type = 'button';
    dismissButton.textContent = 'X';
    dismissButton.setAttribute('aria-label', 'Dismiss backend connection notice');
    dismissButton.style.minWidth = '44px';
    dismissButton.style.minHeight = '44px';
    dismissButton.style.color = 'var(--text-primary, #E0ECF4)';
    dismissButton.style.background = 'color-mix(in srgb, var(--accent-gold, #C6A84B) 18%, transparent)';
    dismissButton.style.border = '1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 36%, transparent)';
    dismissButton.style.borderRadius = '8px';
    dismissButton.style.cursor = 'pointer';
    dismissButton.style.font = "800 1rem/1 'Sora', sans-serif";

    const dismiss = () => notification.remove();
    dismissButton.addEventListener('click', dismiss);

    copy.append(title, message);
    notification.append(copy, dismissButton);
    document.body.appendChild(notification);
    
    // Auto dismiss after 15 seconds
    setTimeout(() => {
      dismiss();
    }, 15000);
  } catch (error) {
    logger.warn('[API Monitor] Error showing notification:', error);
  }
}

/**
 * Check whether simulated data mode is active.
 */
export const isMockDataModeEnabled = () => {
  return false;
};

export default {
  initializeApiMonitoring,
  isMockDataModeEnabled
};
