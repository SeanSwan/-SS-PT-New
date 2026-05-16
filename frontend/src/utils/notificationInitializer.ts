/**
 * Notification Initializer
 * Utility to initialize notifications when a user logs in or the app loads
 */
import { store } from '../store';
import { fetchNotifications } from '../store/slices/notificationSlice';
import { logger } from '@/utils/logger';

/**
 * Initialize notifications for a logged-in user
 * This fetches initial notifications and sets up any polling or event listeners
 */
export const initializeNotifications = () => {
  // Track connection failures
  let connectionFailures = 0;
  const MAX_RETRY_COUNT = 3;

  // Function to fetch notifications with error handling and retry logic
  const fetchNotificationsWithRetry = async () => {
    try {
      const result = await store.dispatch(fetchNotifications());
      if (fetchNotifications.rejected.match(result)) {
        throw new Error(String(result.payload || result.error.message || 'Notification fetch failed'));
      }
      connectionFailures = 0;
    } catch (error) {
      connectionFailures++;
      logger.warn(`[Notifications] Connection attempt ${connectionFailures} failed:`, error);
      
      if (connectionFailures >= MAX_RETRY_COUNT) {
        logger.warn('[Notifications] Notification polling paused until the next interval because the API is unavailable');
      }
    }
  };

  // Initial fetch of notifications
  fetchNotificationsWithRetry();
  
  // Set up periodic polling for new notifications
  // This is a fallback in case real-time events are not available
  const POLL_INTERVAL = 60000; // 1 minute
  
  const intervalId = setInterval(() => {
    const { user } = store.getState().auth || {};
    
    // Only poll if user is logged in
    if (user) {
      fetchNotificationsWithRetry();
    } else {
      // If user logged out, clear the interval
      clearInterval(intervalId);
    }
  }, POLL_INTERVAL);
  
  // Return a cleanup function
  return () => {
    clearInterval(intervalId);
  };
};

/**
 * Connect to real-time notification events
 * This should be implemented if you have WebSockets or another real-time mechanism
 */
export const connectToNotificationEvents = () => {
  // This would connect to WebSockets or another real-time event source
  // For now, we're just using polling, but this could be enhanced later
  
  // Return a disconnect function
  return () => {
    // Disconnect from WebSockets or other event sources
  };
};

/**
 * Combined notification setup
 * Sets up both initialization and real-time connections
 */
export const setupNotifications = () => {
  const cleanupInit = initializeNotifications();
  const cleanupEvents = connectToNotificationEvents();
  
  // Return a combined cleanup function
  return () => {
    cleanupInit();
    cleanupEvents();
  };
};
