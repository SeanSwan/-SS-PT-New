/**
 * Quick Export Test for Cosmic Performance Optimizer
 * ==================================================
 * Verify that exports are working correctly after fixing duplicates
 */

// Test both individual and default imports
import { 
  detectDeviceCapabilities, 
  generatePerformanceProfile, 
  applyPerformanceOptimizations,
  initializeCosmicPerformance 
} from './cosmicPerformanceOptimizer';

import cosmicPerformanceOptimizer from './cosmicPerformanceOptimizer';

export const testCosmicPerformanceExports = () => {
  console.log('🧪 Testing Cosmic Performance Optimizer exports...');
  
  // Test individual exports
  const individualExports = {
    detectDeviceCapabilities: typeof detectDeviceCapabilities,
    generatePerformanceProfile: typeof generatePerformanceProfile,
    applyPerformanceOptimizations: typeof applyPerformanceOptimizations,
    initializeCosmicPerformance: typeof initializeCosmicPerformance
  };
  
  // Test default export
  const defaultExports = {
    detectDeviceCapabilities: typeof cosmicPerformanceOptimizer.detectDeviceCapabilities,
    generatePerformanceProfile: typeof cosmicPerformanceOptimizer.generatePerformanceProfile,
    applyPerformanceOptimizations: typeof cosmicPerformanceOptimizer.applyPerformanceOptimizations,
    initializeCosmicPerformance: typeof cosmicPerformanceOptimizer.initializeCosmicPerformance
  };
  
  console.log('✅ Individual exports:', individualExports);
  console.log('✅ Default exports:', defaultExports);
  
  // Verify all are functions
  const allValid = Object.values(individualExports).every(type => type === 'function') &&
                   Object.values(defaultExports).every(type => type === 'function');
  
  if (allValid) {
    console.log('🎉 All exports are working correctly!');
    return true;
  } else {
    console.error('❌ Some exports are not working correctly');
    return false;
  }
};

export default testCosmicPerformanceExports;