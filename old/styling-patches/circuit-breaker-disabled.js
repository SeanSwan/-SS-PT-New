/**
 * Circuit Breaker for React Hooks Errors
 * 
 * This script detects and breaks infinite render loops and hooks errors
 * by taking drastic measures to ensure stable rendering.
 */

// CIRCUIT BREAKER DISABLED TO PREVENT INFINITE LOOPS
// This file has been disabled as it was causing the very loops it was trying to prevent
console.log('[CIRCUIT-BREAKER] DISABLED - Loop prevention active');

// EARLY EXIT USING IIFE TO PREVENT EXECUTION
(function() {
  console.log('[CIRCUIT-BREAKER] Emergency disable mode active');
  return; // Exit immediately
})();

// ALL CODE BELOW IS DISABLED
if (false) {
(function() {
  // DISABLED CODE BLOCK
  // return;
  // Count renders to detect loops
  let renderCount = 0;
  let lastResetTime = Date.now();
  const MAX_RENDERS_PER_SECOND = 20;
  let loopDetected = false;
  
  // Mark this as loaded immediately
  window.CIRCUIT_BREAKER_LOADED = true;
  
  // Store original React methods
  if (typeof window !== 'undefined') {
    // Save these flags to localStorage immediately in development mode
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('bypass_admin_verification', 'true');
      localStorage.setItem('use_emergency_admin_route', 'true');
      localStorage.setItem('admin_emergency_mode', 'true');
      localStorage.setItem('skip_hooks_verification', 'true');
      localStorage.setItem('circuit_breaker_active', 'true');
    }
    
    // Create a global router config
    window.__swanstudio_router = window.__swanstudio_router || {};
    window.__swanstudio_router.useEmergencyAdminRoute = true;
    window.__swanstudio_router.bypassAllChecks = true;
    
    // Create a global circuit breaker
    window.__circuit_breaker = {
      renderCount: 0,
      loopDetected: false,
      resetTime: Date.now(),
      
      // Method to verify if too many renders are happening
      checkRenderCycle: function() {
        this.renderCount++;
        const now = Date.now();
        
        // Reset counter after 1 second
        if (now - this.resetTime > 1000) {
          this.renderCount = 1;
          this.resetTime = now;
        }
        
        // Check if we're in a loop
        if (this.renderCount > MAX_RENDERS_PER_SECOND && !this.loopDetected) {
          console.error('[CIRCUIT-BREAKER] LOOP DETECTED! Breaking render cycle.');
          this.loopDetected = true;
          this.breakRenderCycle();
        }
      },
      
      // Method to break a render cycle
      breakRenderCycle: function() {
        console.log('[CIRCUIT-BREAKER] Taking emergency measures to break render loop');
        
        // Set all emergency flags
        localStorage.setItem('bypass_admin_verification', 'true');
        localStorage.setItem('use_emergency_admin_route', 'true');
        localStorage.setItem('admin_emergency_mode', 'true');
        localStorage.setItem('emergency_fallback_mode', 'true');
        localStorage.setItem('skip_hooks_verification', 'true');
        localStorage.setItem('hooks_recovery_active', 'true');
        localStorage.setItem('breaking_hooks_loop', 'true');
        
        // Add a special attribute to the body so CSS can detect emergency mode
        document.body.setAttribute('data-emergency-mode', 'true');
        
        // Try to disable problematic code paths
        window.__swanstudio_router = window.__swanstudio_router || {};
        window.__swanstudio_router.useEmergencyAdminRoute = true;
        window.__swanstudio_router.bypassAllChecks = true;
        window.__swanstudio_router.useFallbackAdminRoute = true;
      },
      
      // Method to check if emergency mode is active
      isEmergencyMode: function() {
        return localStorage.getItem('emergency_fallback_mode') === 'true' || 
               this.loopDetected;
      }
    };
    
    // Monkey patch React's setState to detect infinite loops
    if (typeof window.React !== 'undefined' && window.React.Component) {
      const originalSetState = window.React.Component.prototype.setState;
      
      if (originalSetState) {
        window.React.Component.prototype.setState = function() {
          // Check for infinite loops
          window.__circuit_breaker.checkRenderCycle();
          
          // Call original setState
          return originalSetState.apply(this, arguments);
        };
        
        console.log('[CIRCUIT-BREAKER] Successfully patched React.Component.prototype.setState');
      }
    }
    
    // Add global error handler to detect hooks errors
    window.addEventListener('error', function(event) {
      const errorMsg = event.message || '';
      const errorStack = event.error?.stack || '';
      
      // Check if it's a hooks error
      if (errorMsg.includes('Rendered fewer hooks than expected') || 
          errorMsg.includes('React Hook') ||
          errorStack.includes('admin-route.tsx')) {
        
        console.error('[CIRCUIT-BREAKER] Detected React hooks error:', errorMsg);
        
        // Take immediate action
        window.__circuit_breaker.loopDetected = true;
        window.__circuit_breaker.breakRenderCycle();
        
        // Force page reload with special parameters if needed
        const currentUrl = new URL(window.location.href);
        if (!currentUrl.searchParams.has('emergency_mode')) {
          currentUrl.searchParams.set('emergency_mode', 'true');
          window.location.href = currentUrl.toString();
          
          // Prevent default error handling
          event.preventDefault();
          return false;
        }
      }
    });
    
    console.log('[CIRCUIT-BREAKER] Hooks error circuit breaker initialized');
  }
});
} // End of disabled code block
