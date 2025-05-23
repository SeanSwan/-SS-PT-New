/**
 * API Connectivity Fixer
 * 
 * This utility monitors network requests and automatically enables mock data mode
 * when connection issues are detected.
 */

import { enableMockData, isMockDataEnabled } from './mockDataHelper';

let connectionErrors = 0;
const MAX_ERRORS_BEFORE_MOCK = 3;
let mockModeEnabled = isMockDataEnabled();

/**
 * Initialize the API connection monitoring
 * This adds global error handlers to detect network issues
 */
export const initializeApiMonitoring = () => {
  // Check if we're already in mock data mode
  if (mockModeEnabled) {
    console.log('[API Monitor] Mock data mode already enabled, skipping monitoring');
    return;
  }

  console.log('[API Monitor] Initializing API connectivity monitoring');

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
        console.warn(`[API Monitor] Connection error detected (${connectionErrors}/${MAX_ERRORS_BEFORE_MOCK}): ${error.message}`);
        
        if (connectionErrors >= MAX_ERRORS_BEFORE_MOCK && !mockModeEnabled) {
          console.warn('[API Monitor] Too many connection errors, enabling mock data mode');
          enableMockData();
          mockModeEnabled = true;
          
          // Show UI notification about mock mode
          showMockModeNotification();
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
      console.warn(`[API Monitor] XHR error detected (${connectionErrors}/${MAX_ERRORS_BEFORE_MOCK})`);
      
      if (connectionErrors >= MAX_ERRORS_BEFORE_MOCK && !mockModeEnabled) {
        console.warn('[API Monitor] Too many XHR errors, enabling mock data mode');
        enableMockData();
        mockModeEnabled = true;
        
        // Show UI notification about mock mode
        showMockModeNotification();
      }
    });

    return originalXHROpen.apply(this, args);
  };
};

/**
 * Show a notification to the user about mock data mode
 */
function showMockModeNotification() {
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
        Unable to connect to backend services. The app is now running in mock data mode.
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
    console.warn('[API Monitor] Error showing notification:', error);
  }
}

/**
 * Manually enable mock data mode
 */
export const enableMockDataMode = () => {
  enableMockData();
  mockModeEnabled = true;
  console.log('[API Monitor] Mock data mode manually enabled');
  showMockModeNotification();
};

/**
 * Check if we're in mock data mode
 */
export const isMockDataModeEnabled = () => {
  return mockModeEnabled || isMockDataEnabled();
};

export default {
  initializeApiMonitoring,
  enableMockDataMode,
  isMockDataModeEnabled
};
