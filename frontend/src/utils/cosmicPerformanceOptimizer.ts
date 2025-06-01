/**
 * ✨ COSMIC PERFORMANCE OPTIMIZER ✨
 * ==================================
 * 
 * Intelligent Performance System for Cosmic Elegance
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Device capability detection and optimization
 * - Graceful degradation for weak devices
 * - Enhanced effects for powerful devices
 * - Battery and network-aware optimizations
 * - Swan Galaxy theme performance tuning
 */

export interface DeviceCapabilities {
  performance: 'weak' | 'medium' | 'powerful';
  memory: number | null;
  cores: number | null;
  connectionType: string | null;
  batteryLevel: number | null;
  isCharging: boolean | null;
  preferReducedMotion: boolean;
  supportsBackdropFilter: boolean;
  supportsWebGL: boolean;
  devicePixelRatio: number;
}

export interface PerformanceProfile {
  animations: 'minimal' | 'reduced' | 'full';
  blurEffects: 'none' | 'simple' | 'enhanced';
  particleEffects: boolean;
  shadowComplexity: 'minimal' | 'standard' | 'enhanced';
  transitionDuration: 'fast' | 'normal' | 'smooth';
  imageQuality: 'compressed' | 'standard' | 'high';
}

/**
 * Detect device capabilities and performance profile
 */
export const detectDeviceCapabilities = (): DeviceCapabilities => {
  const capabilities: DeviceCapabilities = {
    performance: 'medium',
    memory: null,
    cores: null,
    connectionType: null,
    batteryLevel: null,
    isCharging: null,
    preferReducedMotion: false,
    supportsBackdropFilter: false,
    supportsWebGL: false,
    devicePixelRatio: 1
  };

  if (typeof window === 'undefined') {
    return capabilities;
  }

  try {
    // Check for reduced motion preference
    capabilities.preferReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Device memory (Chrome/Edge)
    const nav = navigator as any;
    if (nav.deviceMemory) {
      capabilities.memory = nav.deviceMemory;
    }

    // Hardware concurrency
    if (navigator.hardwareConcurrency) {
      capabilities.cores = navigator.hardwareConcurrency;
    }

    // Network connection
    if (nav.connection) {
      capabilities.connectionType = nav.connection.effectiveType || nav.connection.type;
    }

    // Battery API
    if (nav.getBattery) {
      nav.getBattery().then((battery: any) => {
        capabilities.batteryLevel = battery.level;
        capabilities.isCharging = battery.charging;
      }).catch(() => {
        // Battery API not available
      });
    }

    // Device pixel ratio
    capabilities.devicePixelRatio = window.devicePixelRatio || 1;

    // Check for backdrop-filter support
    capabilities.supportsBackdropFilter = CSS.supports('backdrop-filter', 'blur(10px)') || 
                                         CSS.supports('-webkit-backdrop-filter', 'blur(10px)');

    // Check for WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      capabilities.supportsWebGL = !!gl;
    } catch (e) {
      capabilities.supportsWebGL = false;
    }

    // Determine overall performance level
    capabilities.performance = calculatePerformanceLevel(capabilities);

  } catch (error) {
    console.warn('Error detecting device capabilities:', error);
  }

  return capabilities;
};

/**
 * Calculate performance level based on device capabilities
 */
const calculatePerformanceLevel = (capabilities: DeviceCapabilities): 'weak' | 'medium' | 'powerful' => {
  let score = 0;

  // Memory scoring
  if (capabilities.memory) {
    if (capabilities.memory >= 8) score += 3;
    else if (capabilities.memory >= 4) score += 2;
    else if (capabilities.memory >= 2) score += 1;
    else score -= 1;
  }

  // CPU cores scoring
  if (capabilities.cores) {
    if (capabilities.cores >= 8) score += 3;
    else if (capabilities.cores >= 4) score += 2;
    else if (capabilities.cores >= 2) score += 1;
    else score -= 1;
  }

  // Connection scoring
  if (capabilities.connectionType) {
    if (capabilities.connectionType === '4g' || capabilities.connectionType === '5g') score += 2;
    else if (capabilities.connectionType === '3g') score += 1;
    else if (capabilities.connectionType === '2g' || capabilities.connectionType === 'slow-2g') score -= 2;
  }

  // Battery level consideration
  if (capabilities.batteryLevel !== null && capabilities.batteryLevel < 0.2 && !capabilities.isCharging) {
    score -= 2; // Reduce performance when battery is low
  }

  // Feature support
  if (capabilities.supportsBackdropFilter) score += 1;
  if (capabilities.supportsWebGL) score += 1;

  // User preference override
  if (capabilities.preferReducedMotion) {
    return 'weak';
  }

  // Determine final performance level
  if (score >= 6) return 'powerful';
  if (score >= 2) return 'medium';
  return 'weak';
};

/**
 * Generate performance profile based on device capabilities
 */
export const generatePerformanceProfile = (capabilities: DeviceCapabilities): PerformanceProfile => {
  const profile: PerformanceProfile = {
    animations: 'reduced',
    blurEffects: 'simple',
    particleEffects: false,
    shadowComplexity: 'standard',
    transitionDuration: 'normal',
    imageQuality: 'standard'
  };

  switch (capabilities.performance) {
    case 'powerful':
      profile.animations = 'full';
      profile.blurEffects = 'enhanced';
      profile.particleEffects = true;
      profile.shadowComplexity = 'enhanced';
      profile.transitionDuration = 'smooth';
      profile.imageQuality = 'high';
      break;

    case 'medium':
      profile.animations = 'reduced';
      profile.blurEffects = capabilities.supportsBackdropFilter ? 'simple' : 'none';
      profile.particleEffects = false;
      profile.shadowComplexity = 'standard';
      profile.transitionDuration = 'normal';
      profile.imageQuality = 'standard';
      break;

    case 'weak':
      profile.animations = 'minimal';
      profile.blurEffects = 'none';
      profile.particleEffects = false;
      profile.shadowComplexity = 'minimal';
      profile.transitionDuration = 'fast';
      profile.imageQuality = 'compressed';
      break;
  }

  // Override for reduced motion preference
  if (capabilities.preferReducedMotion) {
    profile.animations = 'minimal';
    profile.particleEffects = false;
    profile.transitionDuration = 'fast';
  }

  return profile;
};

/**
 * Apply performance optimizations to the document
 */
export const applyPerformanceOptimizations = (profile: PerformanceProfile): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  
  // Set CSS custom properties based on performance profile
  root.style.setProperty('--performance-level', profile.animations);
  
  // Animation settings
  switch (profile.animations) {
    case 'full':
      root.style.setProperty('--animation-duration', '0.6s');
      root.style.setProperty('--animation-easing', 'cubic-bezier(0.16, 1, 0.3, 1)');
      break;
    case 'reduced':
      root.style.setProperty('--animation-duration', '0.3s');
      root.style.setProperty('--animation-easing', 'ease-out');
      break;
    case 'minimal':
      root.style.setProperty('--animation-duration', '0.1s');
      root.style.setProperty('--animation-easing', 'linear');
      break;
  }

  // Blur effects
  switch (profile.blurEffects) {
    case 'enhanced':
      root.style.setProperty('--blur-strength', '30px');
      root.style.setProperty('--backdrop-saturation', '1.8');
      break;
    case 'simple':
      root.style.setProperty('--blur-strength', '15px');
      root.style.setProperty('--backdrop-saturation', '1.2');
      break;
    case 'none':
      root.style.setProperty('--blur-strength', '0px');
      root.style.setProperty('--backdrop-saturation', '1');
      break;
  }

  // Shadow complexity
  switch (profile.shadowComplexity) {
    case 'enhanced':
      root.style.setProperty('--shadow-cosmic', '0 12px 48px rgba(0, 0, 0, 0.4), 0 0 60px rgba(0, 255, 255, 0.2), 0 0 100px rgba(120, 81, 169, 0.1)');
      break;
    case 'standard':
      root.style.setProperty('--shadow-cosmic', '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px rgba(0, 255, 255, 0.2)');
      break;
    case 'minimal':
      root.style.setProperty('--shadow-cosmic', '0 4px 16px rgba(0, 0, 0, 0.2)');
      break;
  }

  // Add performance class to body
  document.body.classList.remove('perf-weak', 'perf-medium', 'perf-powerful');
  document.body.classList.add(`perf-${profile.animations === 'full' ? 'powerful' : profile.animations === 'reduced' ? 'medium' : 'weak'}`);

  // Disable expensive effects for weak devices
  if (profile.animations === 'minimal') {
    const style = document.createElement('style');
    style.textContent = `
      .cosmic-float,
      .stellar-pulse,
      .galaxy-shimmer,
      .luxury-glow {
        animation: none !important;
      }
      
      .hover-cosmic:hover,
      .hover-luxury:hover {
        transform: none !important;
      }
      
      .glass-cosmic,
      .glass-luxury,
      .glass-minimal {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        background: rgba(40, 40, 80, 0.8) !important;
      }
    `;
    document.head.appendChild(style);
  }
};

/**
 * Monitor performance and adjust dynamically
 */
export const startPerformanceMonitoring = (): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 60;
  let currentProfile: PerformanceProfile | null = null;

  const measureFPS = () => {
    frameCount++;
    const currentTime = performance.now();
    
    if (currentTime >= lastTime + 1000) {
      fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      frameCount = 0;
      lastTime = currentTime;
      
      // Adjust performance if FPS drops too low
      if (fps < 30 && currentProfile && currentProfile.animations !== 'minimal') {
        console.log('Low FPS detected, reducing performance settings');
        const degradedProfile: PerformanceProfile = {
          ...currentProfile,
          animations: currentProfile.animations === 'full' ? 'reduced' : 'minimal',
          blurEffects: currentProfile.blurEffects === 'enhanced' ? 'simple' : 'none',
          particleEffects: false
        };
        applyPerformanceOptimizations(degradedProfile);
        currentProfile = degradedProfile;
      }
    }
    
    requestAnimationFrame(measureFPS);
  };

  // Start monitoring
  const capabilities = detectDeviceCapabilities();
  currentProfile = generatePerformanceProfile(capabilities);
  applyPerformanceOptimizations(currentProfile);
  
  requestAnimationFrame(measureFPS);

  // Listen for visibility changes to pause heavy operations when tab is hidden
  const handleVisibilityChange = () => {
    if (document.hidden) {
      document.body.classList.add('tab-hidden');
    } else {
      document.body.classList.remove('tab-hidden');
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Listen for battery changes
  if ((navigator as any).getBattery) {
    (navigator as any).getBattery().then((battery: any) => {
      const handleBatteryChange = () => {
        if (battery.level < 0.2 && !battery.charging && currentProfile) {
          // Switch to power-saving mode
          const powerSavingProfile: PerformanceProfile = {
            animations: 'minimal',
            blurEffects: 'none',
            particleEffects: false,
            shadowComplexity: 'minimal',
            transitionDuration: 'fast',
            imageQuality: 'compressed'
          };
          applyPerformanceOptimizations(powerSavingProfile);
          currentProfile = powerSavingProfile;
        }
      };

      battery.addEventListener('chargingchange', handleBatteryChange);
      battery.addEventListener('levelchange', handleBatteryChange);
    });
  }

  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};

/**
 * Initialize the cosmic performance system
 */
export const initializeCosmicPerformance = (): (() => void) => {
  console.log('🌟 Initializing Cosmic Performance System...');
  
  const capabilities = detectDeviceCapabilities();
  const profile = generatePerformanceProfile(capabilities);
  
  console.log('📊 Device Capabilities:', capabilities);
  console.log('⚡ Performance Profile:', profile);
  
  applyPerformanceOptimizations(profile);
  
  // Start monitoring (can be disabled for production if needed)
  const cleanup = startPerformanceMonitoring();
  
  console.log('✨ Cosmic Performance System initialized successfully!');
  
  return cleanup;
};

export default {
  detectDeviceCapabilities,
  generatePerformanceProfile,
  applyPerformanceOptimizations,
  startPerformanceMonitoring,
  initializeCosmicPerformance
};