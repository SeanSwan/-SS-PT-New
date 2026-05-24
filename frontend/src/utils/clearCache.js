/**
 * Cache Clearing Utility
 * =====================
 *
 * Provides development-only console helpers for clearing browser caches,
 * service workers, and cached video elements.
 */
import { logger } from '@/utils/logger';

export const clearAllCaches = async () => {
  try {
    if (typeof caches === 'undefined') {
      return false;
    }

    const cacheNames = await caches.keys();
    const deletePromises = cacheNames.map((cacheName) => caches.delete(cacheName));
    await Promise.all(deletePromises);

    logger.log('All caches cleared');
    return true;
  } catch (error) {
    console.error('Error clearing caches:', error);
    return false;
  }
};

export const unregisterServiceWorkers = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const unregisterPromises = registrations.map((registration) => registration.unregister());
      await Promise.all(unregisterPromises);

      logger.log('All service workers unregistered');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error unregistering service workers:', error);
    return false;
  }
};

export const forceReload = () => {
  window.location.reload();
};

export const clearVideoCache = async () => {
  try {
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach((video) => {
      if (video.src) {
        video.load();
      }
    });

    logger.log('Video cache cleared');
    return true;
  } catch (error) {
    console.error('Error clearing video cache:', error);
    return false;
  }
};

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.emergencyCacheClear = async () => {
    logger.log('Emergency cache clearing initiated...');

    await clearAllCaches();
    await unregisterServiceWorkers();
    await clearVideoCache();

    logger.log('Emergency cache clear complete. Reloading page...');
    setTimeout(() => forceReload(), 1000);
  };

  logger.log('Cache clearing utility loaded. Run emergencyCacheClear() in dev console if needed.');
}
