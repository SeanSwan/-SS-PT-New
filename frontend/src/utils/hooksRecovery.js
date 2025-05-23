/**
 * React Hooks Emergency Recovery System
 * 
 * This script injects special handling for React hooks errors
 * and tries to recover from them during runtime.
 */

// HOOKS RECOVERY DISABLED TO STOP INFINITE LOOPS
// This entire system has been disabled as it was contributing to the loop problem
console.log('[HOOKS-RECOVERY] DISABLED - Emergency mode active');

// EARLY EXIT USING IIFE
(function() {
  return; // Exit immediately
})();

// ALL CODE BELOW IS DISABLED
if (false) {
(function() {
  // DISABLED CODE - DO NOT EXECUTE
  // return;
  console.log('[HOOKS-RECOVERY] Initializing React Hooks Recovery System');
  
  // Check if we're in development mode
  // if (process.env.NODE_ENV !== 'development') {
  //   console.log('[HOOKS-RECOVERY] Only active in development mode');
  //   return; // DISABLED
  // }

  try {
    // Add a global error handler to detect hooks errors
    window.addEventListener('error', function(event) {
      const errorMsg = event.message || '';
      const errorStack = event.error?.stack || '';
      
      // Check if it's a hooks error
      const isHooksError = (
        errorMsg.includes('useEffect is not defined') || 
        errorMsg.includes('useState is not defined') ||
        errorMsg.includes('Rendered fewer hooks than expected') ||
        errorMsg.includes('React Hook') ||
        errorStack.includes('admin-route.tsx')
      );
      
      if (isHooksError) {
        console.error('[HOOKS-RECOVERY] Detected React hooks error:', errorMsg);
        
        // Override with emergency values immediately for common hook errors
        if (errorMsg.includes('Rendered fewer hooks than expected')) {
          console.log('[HOOKS-RECOVERY] Setting immediate admin bypass to prevent further hook errors');
          localStorage.setItem('bypass_admin_verification', 'true');
          localStorage.setItem('use_emergency_admin_route', 'true');
        }
        
        // Try to apply the emergency fix
        if (window.emergencyAdminFix && typeof window.emergencyAdminFix.fixHooksError === 'function') {
          console.log('[HOOKS-RECOVERY] Automatically applying emergency fix...');
          window.emergencyAdminFix.fixHooksError();
          
          // Prevent default error handling
          event.preventDefault();
          return false;
        } else {
          console.log('[HOOKS-RECOVERY] Emergency fix not available, can\'t recover automatically');
        }
      }
    });
    
    // Create a MutationObserver to detect React error boundaries in the DOM
    const observer = new MutationObserver(function(mutations) {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check for error text that might indicate a hooks error
            const errorText = node.textContent || '';
            if (
              (errorText.includes('useEffect is not defined') || 
               errorText.includes('Rendered fewer hooks than expected') ||
               errorText.includes('React Router caught the following error')) &&
              errorText.includes('AdminRoute')
            ) {
              console.log('[HOOKS-RECOVERY] Detected React error boundary with hooks error');
              
              // Apply emergency fix
              if (window.emergencyAdminFix && typeof window.emergencyAdminFix.fixHooksError === 'function') {
                console.log('[HOOKS-RECOVERY] Automatically applying emergency fix...');
                window.emergencyAdminFix.fixHooksError();
                // return; // DISABLED
              }
            }
          }
        }
      }
    });
    
    // Start observing the document for added error nodes
    observer.observe(document.body, { childList: true, subtree: true });
    
    console.log('[HOOKS-RECOVERY] React Hooks Recovery System initialized successfully');
    
    // Expose the system to window for debugging
    window.hooksRecovery = {
      isActive: true,
      forceRecover: function() {
        if (window.emergencyAdminFix && typeof window.emergencyAdminFix.fixHooksError === 'function') {
          return window.emergencyAdminFix.fixHooksError();
        } else {
          return 'Emergency fix not available';
        }
      }
    };
  } catch (error) {
    console.error('[HOOKS-RECOVERY] Failed to initialize:', error);
  }
});
} // End of disabled code block
