/**
 * viewportFix.js
 * =============
 * 
 * Fixes common viewport-related issues, including:
 * 1. The "100vh" problem on mobile devices (especially iOS Safari)
 * 2. Prevents content shifts during page load
 * 3. Optimizes for landscape/portrait transitions
 */

// Store cached viewport dimensions
let cachedViewportWidth = window.innerWidth;
let cachedViewportHeight = window.innerHeight;

/**
 * Sets CSS custom properties for viewport dimensions
 * This fixes the iOS Safari 100vh issue where the browser UI
 * is included in viewport calculations
 */
const updateViewportProperties = () => {
  // Get real viewport dimensions
  const vh = window.innerHeight * 0.01;
  const vw = window.innerWidth * 0.01;
  
  // Set CSS custom properties that can be used instead of vh/vw
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  document.documentElement.style.setProperty('--vw', `${vw}px`);
  
  // Set boolean flags for orientation changes
  const isLandscape = window.innerWidth > window.innerHeight;
  document.documentElement.style.setProperty('--is-landscape', isLandscape ? '1' : '0');
  
  // Set device-specific viewport classes
  const root = document.documentElement;
  
  // Clear existing classes
  root.classList.remove('xs-viewport', 'sm-viewport', 'md-viewport', 'lg-viewport', 'xl-viewport');
  
  // Add appropriate viewport class
  if (window.innerWidth < 576) {
    root.classList.add('xs-viewport');
  } else if (window.innerWidth >= 576 && window.innerWidth < 768) {
    root.classList.add('sm-viewport');
  } else if (window.innerWidth >= 768 && window.innerWidth < 1024) {
    root.classList.add('md-viewport');
  } else if (window.innerWidth >= 1024 && window.innerWidth < 1280) {
    root.classList.add('lg-viewport');
  } else {
    root.classList.add('xl-viewport');
  }
  
  // Check if we're on a mobile/touch device
  const isTouchDevice = ('ontouchstart' in window) || 
                       (navigator.maxTouchPoints > 0) || 
                       (navigator.msMaxTouchPoints > 0);
  
  if (isTouchDevice) {
    root.classList.add('touch-device');
  } else {
    root.classList.remove('touch-device');
  }
  
  // Detect if this is likely a mobile browser
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    root.classList.add('mobile-browser');
  } else {
    root.classList.remove('mobile-browser');
  }
  
  // Detect specific browsers for targeted fixes
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
    root.classList.add('ios-browser');
  } else {
    root.classList.remove('ios-browser');
  }
  
  // Detect reduced motion preference 
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    root.classList.add('reduced-motion');
  } else {
    root.classList.remove('reduced-motion');
  }
};

/**
 * Prevents layout shifts during device rotation
 * by handling orientation changes smoothly
 */
const handleOrientationChange = () => {
  // If this is an orientation change (width and height swap)
  if (
    (cachedViewportWidth === window.innerHeight && 
     cachedViewportHeight === window.innerWidth) ||
    Math.abs(cachedViewportWidth - window.innerWidth) > 100 ||
    Math.abs(cachedViewportHeight - window.innerHeight) > 100
  ) {
    // Add transition blocker during orientation change
    document.documentElement.classList.add('orientation-change');
    
    // Update viewport properties
    updateViewportProperties();
    
    // Remove transition blocker after rotation completes
    setTimeout(() => {
      document.documentElement.classList.remove('orientation-change');
    }, 300);
  } else {
    // Just update properties for normal resize
    updateViewportProperties();
  }
  
  // Update cached values
  cachedViewportWidth = window.innerWidth;
  cachedViewportHeight = window.innerHeight;
};

/**
 * Initialize all viewport fixes
 */
export const initViewportFixes = () => {
  // Update viewport properties immediately
  updateViewportProperties();
  
  // Re-calculate on resize and orientation change
  window.addEventListener('resize', handleOrientationChange, { passive: true });
  window.addEventListener('orientationchange', () => {
    // Delay execution slightly to ensure values are updated
    setTimeout(handleOrientationChange, 50);
  }, { passive: true });
  
  // Special handling for iOS devices where the browser UI can appear/disappear
  let lastScrollPosition = 0;
  
  document.addEventListener('scroll', () => {
    const currentScrollPosition = window.scrollY;
    
    // If scrolling more than a threshold, we may have UI elements appearing/disappearing
    if (Math.abs(currentScrollPosition - lastScrollPosition) > 50) {
      updateViewportProperties();
      lastScrollPosition = currentScrollPosition;
    }
  }, { passive: true });
  
  // Additional fix to handle page load complete
  window.addEventListener('load', updateViewportProperties);
  
  // Fix for when fonts load and might affect layout
  if ('fonts' in document) {
    document.fonts.ready.then(updateViewportProperties);
  }
  
  // Add special CSS to prevent content shifts during transitions
  const style = document.createElement('style');
  style.innerHTML = `
    .orientation-change * {
      transition: none !important;
    }
    
    @media (max-width: 767px) {
      /* Use the custom vh property instead of vh for full-height elements */
      .full-height {
        height: calc(var(--vh, 1vh) * 100);
      }
      
      /* Fix for fixed position elements on iOS */
      .ios-browser .fixed-bottom {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 1030;
      }
    }
  `;
  document.head.appendChild(style);
};

export default initViewportFixes;