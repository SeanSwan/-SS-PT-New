/**
 * Cache Clearing Utility
 * =====================
 *
 * Provides functions to clear browser caches and fix service worker issues
 */
import { logger } from '@/utils/logger';

export const clearAllCaches = async () => {
  try {
    // Clear all caches
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames.map(cacheName => caches.delete(cacheName));
    await Promise.all(deletePromises);
    
    logger.log('✅ All caches cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing caches:', error);
    return false;
  }
};

export const unregisterServiceWorkers = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const unregisterPromises = registrations.map(registration => registration.unregister());
      await Promise.all(unregisterPromises);
      
      logger.log('✅ All service workers unregistered');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error unregistering service workers:', error);
    return false;
  }
};

export const forceReload = () => {
  // Force a hard reload to clear any cached resources
  if (window.location.reload) {
    window.location.reload(true);
  } else {
    window.location.href = window.location.href;
  }
};

export const clearVideoCache = async () => {
  try {
    // Clear any cached video elements
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
      if (video.src) {
        video.load(); // Force reload of video
      }
    });
    
    logger.log('✅ Video cache cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing video cache:', error);
    return false;
  }
};

// Emergency cache clearing function for dev console
window.emergencyCacheClear = async () => {
  logger.log('🚨 Emergency cache clearing initiated...');
  
  await clearAllCaches();
  await unregisterServiceWorkers();
  await clearVideoCache();
  
  logger.log('🎉 Emergency cache clear complete! Reloading page...');
  setTimeout(() => forceReload(), 1000);
};

logger.log('💡 Cache clearing utility loaded. Run emergencyCacheClear() in dev console if needed.');
