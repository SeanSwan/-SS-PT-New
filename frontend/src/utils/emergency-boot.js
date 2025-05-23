/**
 * Emergency Boot Script
 * 
 * This script must be loaded very early in the application lifecycle,
 * ideally before any React code is executed. It sets up emergency flags
 * and configurations to prevent React hooks errors.
 */
console.log('[EMERGENCY-BOOT] Initializing emergency boot script...');

// Execute this immediately in an IIFE
(function() {
  // Always set these flags immediately in development mode
  if (process.env.NODE_ENV === 'development') {
    // Set all bypass flags
    localStorage.setItem('bypass_admin_verification', 'true');
    localStorage.setItem('use_emergency_admin_route', 'true');
    localStorage.setItem('admin_emergency_mode', 'true');
    localStorage.setItem('emergency_boot_executed', 'true');
    
    // We're in development, so we always want to use the emergency admin route
    console.log('[EMERGENCY-BOOT] Development mode detected, enabling all emergency bypasses');
    
    // Set up global variable for coordination
    window.__swanstudio_emergency = {
      enabled: true,
      bypassAdminChecks: true,
      useEmergencyComponents: true,
      boot: {
        timestamp: Date.now(),
        mode: 'development'
      }
    };
  }
})();

// Export a dummy function to make this a valid module
export default function emergencyBoot() {
  console.log('[EMERGENCY-BOOT] Emergency boot function called');
  return true;
}
