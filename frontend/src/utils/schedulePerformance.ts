/**
 * Schedule Performance Isolation Harness
 * =======================================
 * DEV-ONLY performance debugging and optimization toggles.
 *
 * Usage:
 * 1. Set toggles in localStorage: localStorage.setItem('PERF_DISABLE_ANIMATIONS', 'true')
 * 2. Or import and use directly: if (schedulePerf.DISABLE_ANIMATIONS) { ... }
 *
 * Toggle Reference:
 * - DISABLE_SESSION_RENDER: Render simple placeholders instead of full session cards
 * - DISABLE_SESSION_BADGES: Remove badges/gradients/shadows from cards
 * - DISABLE_ANIMATIONS: Disable framer-motion / CSS transitions
 * - DISABLE_DRAG_DROP: Disable drag-drop functionality
 * - DISABLE_CONFLICT_CHECK: Disable conflict detection during drag
 * - LIMIT_SESSIONS: Limit rendered sessions to first N items
 * - MOBILE_LITE_MODE: Enable all mobile optimizations at once
 */

const isDev = import.meta.env?.DEV ?? process.env.NODE_ENV === 'development';

// Read toggle from localStorage (DEV only)
const getToggle = (key: string, defaultValue: boolean = false): boolean => {
  if (!isDev) return defaultValue;
  if (typeof window === 'undefined') return defaultValue;

  const stored = localStorage.getItem(`PERF_${key}`);
  if (stored === null) return defaultValue;
  return stored === 'true';
};

// Read number from localStorage (DEV only)
const getNumber = (key: string, defaultValue: number): number => {
  if (!isDev) return defaultValue;
  if (typeof window === 'undefined') return defaultValue;

  const stored = localStorage.getItem(`PERF_${key}`);
  if (stored === null) return defaultValue;
  const num = parseInt(stored, 10);
  return isNaN(num) ? defaultValue : num;
};

// Detect if we're on mobile
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

// Performance toggles object
export const schedulePerf = {
  // Core render toggles
  get DISABLE_SESSION_RENDER() { return getToggle('DISABLE_SESSION_RENDER'); },
  get DISABLE_SESSION_BADGES() { return getToggle('DISABLE_SESSION_BADGES') || this.MOBILE_LITE_MODE; },
  get DISABLE_ANIMATIONS() { return getToggle('DISABLE_ANIMATIONS') || this.MOBILE_LITE_MODE; },
  // Drag-drop and conflict check disabled on mobile by default (heavy event listeners)
  get DISABLE_DRAG_DROP() { return getToggle('DISABLE_DRAG_DROP') || this.MOBILE_LITE_MODE; },
  get DISABLE_CONFLICT_CHECK() { return getToggle('DISABLE_CONFLICT_CHECK') || this.MOBILE_LITE_MODE; },
  get DISABLE_BACKDROP_FILTER() { return getToggle('DISABLE_BACKDROP_FILTER') || this.MOBILE_LITE_MODE; },

  // Session limiting
  get LIMIT_SESSIONS() { return getNumber('LIMIT_SESSIONS', 0); }, // 0 = no limit

  // Mobile lite mode - enables all mobile optimizations automatically on mobile
  // This cascades to: DISABLE_SESSION_BADGES, DISABLE_ANIMATIONS, DISABLE_DRAG_DROP,
  // DISABLE_CONFLICT_CHECK, DISABLE_BACKDROP_FILTER
  get MOBILE_LITE_MODE() {
    const forceOn = getToggle('MOBILE_LITE_MODE');
    const autoOn = getToggle('AUTO_MOBILE_LITE', true); // Default ON for mobile
    return forceOn || (autoOn && isMobileDevice());
  },

  // Check if dev mode
  get IS_DEV() { return isDev; },

  // Check if mobile
  get IS_MOBILE() { return isMobileDevice(); },
};

// Performance marks and measures (DEV only)
export const perfMark = {
  start: (name: string) => {
    if (!isDev) return;
    try {
      performance.mark(`${name}_start`);
    } catch (e) { /* ignore */ }
  },

  end: (name: string) => {
    if (!isDev) return;
    try {
      performance.mark(`${name}_end`);
      performance.measure(name, `${name}_start`, `${name}_end`);
      const measure = performance.getEntriesByName(name).pop();
      if (measure) {
        console.log(`[PERF] ${name}: ${measure.duration.toFixed(2)}ms`);
      }
    } catch (e) { /* ignore */ }
  },
};

// Render count tracker (DEV only)
const renderCounts: Record<string, number> = {};
let lastLogTime = 0;

export const trackRender = (componentName: string) => {
  if (!isDev) return;

  renderCounts[componentName] = (renderCounts[componentName] || 0) + 1;

  // Log every 3 seconds
  const now = Date.now();
  if (now - lastLogTime > 3000) {
    lastLogTime = now;
    console.log('[PERF] Render counts:', { ...renderCounts });
  }
};

// Reset render counts
export const resetRenderCounts = () => {
  Object.keys(renderCounts).forEach(key => delete renderCounts[key]);
  lastLogTime = 0;
};

// Scroll event tracker (DEV only)
let scrollEventCount = 0;
let scrollLogInterval: ReturnType<typeof setInterval> | null = null;

export const trackScrollEvent = () => {
  if (!isDev) return;

  scrollEventCount++;

  if (!scrollLogInterval) {
    scrollLogInterval = setInterval(() => {
      if (scrollEventCount > 0) {
        console.log(`[PERF] Scroll events in last 3s: ${scrollEventCount}`);
        scrollEventCount = 0;
      }
    }, 3000);
  }
};

// Helper to log all toggle states
export const logPerfToggles = () => {
  if (!isDev) return;

  console.log('[PERF] Current toggle states:', {
    DISABLE_SESSION_RENDER: schedulePerf.DISABLE_SESSION_RENDER,
    DISABLE_SESSION_BADGES: schedulePerf.DISABLE_SESSION_BADGES,
    DISABLE_ANIMATIONS: schedulePerf.DISABLE_ANIMATIONS,
    DISABLE_DRAG_DROP: schedulePerf.DISABLE_DRAG_DROP,
    DISABLE_CONFLICT_CHECK: schedulePerf.DISABLE_CONFLICT_CHECK,
    DISABLE_BACKDROP_FILTER: schedulePerf.DISABLE_BACKDROP_FILTER,
    LIMIT_SESSIONS: schedulePerf.LIMIT_SESSIONS,
    MOBILE_LITE_MODE: schedulePerf.MOBILE_LITE_MODE,
    IS_MOBILE: schedulePerf.IS_MOBILE,
  });
};

// Helper to set a toggle
export const setPerfToggle = (key: string, value: boolean | number) => {
  if (!isDev) return;
  localStorage.setItem(`PERF_${key}`, String(value));
  console.log(`[PERF] Set ${key} = ${value}`);
};

// Helper to reset all toggles
export const resetPerfToggles = () => {
  if (!isDev) return;
  const keys = [
    'DISABLE_SESSION_RENDER',
    'DISABLE_SESSION_BADGES',
    'DISABLE_ANIMATIONS',
    'DISABLE_DRAG_DROP',
    'DISABLE_CONFLICT_CHECK',
    'DISABLE_BACKDROP_FILTER',
    'LIMIT_SESSIONS',
    'MOBILE_LITE_MODE',
    'AUTO_MOBILE_LITE',
  ];
  keys.forEach(key => localStorage.removeItem(`PERF_${key}`));
  console.log('[PERF] All toggles reset');
};

// Export for console access in dev
if (isDev && typeof window !== 'undefined') {
  (window as any).schedulePerf = schedulePerf;
  (window as any).setPerfToggle = setPerfToggle;
  (window as any).resetPerfToggles = resetPerfToggles;
  (window as any).logPerfToggles = logPerfToggles;

  console.log('[PERF] Schedule performance harness loaded. Use window.logPerfToggles() to see current state.');
}

export default schedulePerf;
