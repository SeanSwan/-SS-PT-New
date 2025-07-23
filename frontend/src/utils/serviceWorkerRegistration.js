/**
 * Service Worker Registration for PWA
 * ===================================
 * 
 * Handles registration and lifecycle management of the service worker
 * for offline functionality and PWA features
 */

// Register service worker with enhanced lifecycle management
export const registerServiceWorker = async () => {
  // Only register in production or when explicitly enabled
  const isProduction = import.meta.env.MODE === 'production';
  const enableSW = import.meta.env.VITE_ENABLE_SERVICE_WORKER === 'true';
  
  if (!('serviceWorker' in navigator) || (!isProduction && !enableSW)) {
    console.log('SW: Service Worker not supported or disabled');
    return null;
  }

  try {
    console.log('SW: Registering service worker...');
    
    // Register the service worker
    const registration = await navigator.serviceWorker.register('/spa-sw.js', {
      scope: '/'
    });
    
    console.log('SW: Service worker registered successfully:', registration.scope);
    
    // Handle service worker updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      if (newWorker) {
        console.log('SW: New service worker found, installing...');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('SW: New service worker installed, update available');
            
            // Show update notification to user
            showUpdateNotification(newWorker);
          }
        });
      }
    });
    
    // Listen for service worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      handleServiceWorkerMessage(event.data);
    });
    
    // Handle service worker errors
    registration.addEventListener('error', (error) => {
      console.error('SW: Service worker error:', error);
    });
    
    return registration;
  } catch (error) {
    console.error('SW: Service worker registration failed:', error);
    return null;
  }
};

// Show update notification to user
const showUpdateNotification = (newWorker) => {
  // Create a simple update notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 320px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
  `;
  
  notification.innerHTML = `
    <div style="margin-bottom: 12px; font-weight: 600;">
      App Update Available
    </div>
    <div style="margin-bottom: 16px; opacity: 0.9; line-height: 1.4;">
      A new version of Swan Studios is available with improved features and performance.
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="update-now" style="
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        padding: 8px 16px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      ">Update Now</button>
      <button id="update-later" style="
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        padding: 8px 16px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      ">Later</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Handle update buttons
  const updateNow = notification.querySelector('#update-now');
  const updateLater = notification.querySelector('#update-later');
  
  updateNow.addEventListener('click', () => {
    console.log('SW: User chose to update now');
    newWorker.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  });
  
  updateLater.addEventListener('click', () => {
    console.log('SW: User chose to update later');
    document.body.removeChild(notification);
  });
  
  // Auto-remove after 30 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 30000);
};

// Handle messages from service worker
const handleServiceWorkerMessage = (data) => {
  const { type, message, data: messageData } = data;
  
  switch (type) {
    case 'SW_ACTIVATED':
      console.log('SW: Service worker activated:', message);
      break;
      
    case 'WORKOUT_SYNCED':
      console.log('SW: Workout synced successfully:', messageData);
      // Dispatch custom event for app to handle
      window.dispatchEvent(new CustomEvent('workoutSynced', {
        detail: messageData
      }));
      break;
      
    case 'CACHE_UPDATED':
      console.log('SW: Cache updated:', messageData);
      break;
      
    default:
      console.log('SW: Unknown message from service worker:', data);
  }
};

// Get offline workout data
export const getOfflineWorkouts = async () => {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    return [];
  }
  
  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data.workouts || []);
    };
    
    navigator.serviceWorker.controller.postMessage(
      { type: 'GET_OFFLINE_WORKOUTS' },
      [messageChannel.port2]
    );
  });
};

// Force sync of offline data
export const forceSyncOfflineData = () => {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'FORCE_SYNC'
    });
  }
};

// Check if app is running as PWA
export const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator).standalone === true;
};

// Check if device is online
export const isOnline = () => {
  return navigator.onLine;
};

// Add network status listeners
export const addNetworkListeners = (onOnline, onOffline) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};

// Request persistent storage for offline data
export const requestPersistentStorage = async () => {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      const persistent = await navigator.storage.persist();
      console.log('SW: Persistent storage granted:', persistent);
      return persistent;
    } catch (error) {
      console.warn('SW: Could not request persistent storage:', error);
      return false;
    }
  }
  return false;
};

// Get storage usage
export const getStorageUsage = async () => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0,
        percentage: estimate.usage && estimate.quota 
          ? Math.round((estimate.usage / estimate.quota) * 100)
          : 0
      };
    } catch (error) {
      console.warn('SW: Could not get storage estimate:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }
  return { used: 0, available: 0, percentage: 0 };
};

// Initialize PWA features
export const initializePWA = async () => {
  console.log('SW: Initializing PWA features...');
  
  // Register service worker
  const registration = await registerServiceWorker();
  
  // Request persistent storage
  await requestPersistentStorage();
  
  // Log storage usage
  const storage = await getStorageUsage();
  console.log('SW: Storage usage:', storage);
  
  // Add to window for debugging
  if (process.env.NODE_ENV === 'development') {
    window.__PWA_DEBUG__ = {
      getOfflineWorkouts,
      forceSyncOfflineData,
      isPWA,
      isOnline,
      getStorageUsage,
      registration
    };
  }
  
  return {
    registration,
    isPWA: isPWA(),
    isOnline: isOnline(),
    storage
  };
};

export default {
  registerServiceWorker,
  getOfflineWorkouts,
  forceSyncOfflineData,
  isPWA,
  isOnline,
  addNetworkListeners,
  requestPersistentStorage,
  getStorageUsage,
  initializePWA
};
