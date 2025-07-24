/**
 * EMERGENCY BROWSER CACHE CLEARING SCRIPT
 * =====================================
 * Run this to clear all browser cache and reset PWA state
 */

// Clear all service worker registrations
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      console.log('Unregistering service worker:', registration);
      registration.unregister();
    }
  });
}

// Clear all browser caches
if ('caches' in window) {
  caches.keys().then(function(names) {
    for (let name of names) {
      console.log('Deleting cache:', name);
      caches.delete(name);
    }
  });
}

// Clear localStorage and sessionStorage
localStorage.clear();
sessionStorage.clear();

// Clear IndexedDB
if ('indexedDB' in window) {
  indexedDB.deleteDatabase('SwanStudios');
}

console.log('✅ All browser caches cleared!');
console.log('🔄 Please refresh the page now.');

alert('Cache cleared! Please refresh the page now.');
