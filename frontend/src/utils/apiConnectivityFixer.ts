/**
 * API Connectivity Fixer
 * 
 * This utility monitors network requests and reports API connectivity issues.
 * SwanStudios no longer swaps failed backend calls for simulated data.
 */

import { logger } from '@/utils/logger';

let connectionErrors = 0;
const MAX_ERRORS_BEFORE_WARNING = 3;

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
    // Create a notification element
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '20px';
    notification.style.backgroundColor = '#f8d7da';
    notification.style.color = '#721c24';
    notification.style.padding = '10px 15px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.style.zIndex = '9999';
    notification.style.maxWidth = '300px';
    notification.style.fontFamily = 'Arial, sans-serif';
    
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">Backend Connection Error</div>
      <div style="font-size: 14px; margin-bottom: 8px;">
        Unable to connect to backend services. Live data is unavailable until the API recovers.
      </div>
      <div style="font-size: 12px; color: #555;">
        (Click to dismiss)
      </div>
    `;
    
    // Add click handler to dismiss
    notification.addEventListener('click', () => {
      document.body.removeChild(notification);
    });
    
    // Add to document
    document.body.appendChild(notification);
    
    // Auto dismiss after 15 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
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
