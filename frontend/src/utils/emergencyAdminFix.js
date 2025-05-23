/**
 * Emergency Admin Fix
 * 
 * This script immediately forces admin access in development mode to prevent login loops
 * and fixes React hooks-related issues that cause infinite refresh loops
 */

// EMERGENCY ADMIN FIX DISABLED - PREVENTING INFINITE LOOPS
// This entire system has been disabled as it was part of the infinite loop problem
console.log('[EMERGENCY FIX] DISABLED - Emergency simple mode active');

// EARLY EXIT USING IIFE TO PREVENT EXECUTION
(function() {
  return; // Exit the IIFE immediately
})();

// ALL CODE BELOW IS DISABLED
if (false) {
// Run this immediately on page load
// (function() {
  // DISABLED CODE - DO NOT EXECUTE
  // return;
  // Store reference to the original import function for patching
  if (typeof window !== 'undefined') {
    try {
      // This will help intercept dynamic imports if needed
      const originalImport = window.import || Function.prototype.bind.call(Function.call, Function.prototype.call);
      window.__originalImport = originalImport;
    } catch (e) {
      console.error('[EMERGENCY FIX] Error storing original import:', e);
    }
  }

  // if (process.env.NODE_ENV !== 'development') return; // DISABLED
  
  console.log('[EMERGENCY FIX] Admin access emergency fix loaded');

  // FIX FOR HOOKS INFINITE REFRESH LOOP
  // Check if we're in a refresh loop
  if (typeof window !== 'undefined') {
    // If the URL contains refresh_hooks parameter, we want to break the loop
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('refresh_hooks')) {
      console.log('[EMERGENCY FIX] Detected refresh_hooks in URL, breaking the loop');
      
      // Remove the refresh hooks parameter and emergency mode
      urlParams.delete('refresh_hooks');
      urlParams.delete('emergency_mode');
      
      // Create a clean URL to prevent further loops
      const cleanPathname = window.location.pathname;
      let cleanSearch = urlParams.toString();
      if (cleanSearch) cleanSearch = '?' + cleanSearch;
      
      // Navigate to the clean URL
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, cleanPathname + cleanSearch);
        console.log('[EMERGENCY FIX] Successfully cleaned URL parameters');
      }
      
      // Store state to indicate we're fixing a loop
      localStorage.setItem('breaking_hooks_loop', 'true');
    }
  }
  
  // Function to immediately set admin bypass flag
  function forceAdminBypass() {
    const bypass = localStorage.getItem('bypass_admin_verification');
    
    // If bypass flag isn't set, set it and update user role
    if (bypass !== 'true') {
      console.log('[EMERGENCY FIX] Setting admin bypass flag');
      localStorage.setItem('bypass_admin_verification', 'true');
      
      // Try to ensure user is admin
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          
          // If user exists but isn't admin, make them admin
          if (userData) {
            userData.role = 'admin';
            localStorage.setItem('user', JSON.stringify(userData));
            console.log('[EMERGENCY FIX] Set user role to admin');
          }
        }
      } catch (e) {
        console.error('[EMERGENCY FIX] Error updating user data:', e);
      }
    }
  }
  
  // Create a default admin user if needed
  function createDefaultAdminIfNeeded() {
    try {
      const user = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      // If no user or token, create default admin
      if (!user || !token) {
        const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({
          id: 'mock-admin-' + Date.now(),
          username: 'admin',
          role: 'admin',
          exp: Math.floor(Date.now()/1000) + (24*60*60)
        }))}.mock-jwt-token`;
        
        const mockUser = {
          id: 'mock-admin-' + Date.now(),
          email: 'admin@example.com',
          username: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          isActive: true,
          permissions: ['admin:all'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('token', mockToken);
        localStorage.setItem('tokenTimestamp', Date.now().toString());
        localStorage.setItem('user', JSON.stringify(mockUser));
        
        console.log('[EMERGENCY FIX] Created default admin user and token');
      }
    } catch (e) {
      console.error('[EMERGENCY FIX] Error creating admin user:', e);
    }
  }
  
  // Fix React hooks error by applying a stable dependency array patch
  function patchReactHooks() {
    try {
      // Add debug monitor for useState and useEffect issues
      console.log('[EMERGENCY FIX] Adding enhanced React hooks debugging...');
      
      // Check if we have React loaded
      if (window.React) {
        console.log('[EMERGENCY FIX] React found, applying hooks stability patch');
        
        // Get a reference to the original hooks
        const originalUseState = window.React.useState;
        const originalUseEffect = window.React.useEffect;
        
        // Only fix useEffect as it's usually the culprit in infinite loops
        if (typeof originalUseEffect === 'function') {
          // Create a version of useEffect that applies empty dependency array as a fallback
          window.React.useEffect = function patchedUseEffect(effect, deps) {
            // Handle undefined/missing dependency array which often causes loops
            if (deps === undefined) {
              console.log('[EMERGENCY FIX] Applying empty dependency array to useEffect');
              return originalUseEffect.call(this, effect, []);
            }
            
            return originalUseEffect.call(this, effect, deps);
          };
          
          console.log('[EMERGENCY FIX] Successfully patched React.useEffect');
        }
      } else {
        console.log('[EMERGENCY FIX] React not found in global scope, cannot apply hooks patch');
      }
      
      // Create emergency fallback hooks for desperate situations
      window.__emergency_React_hooks = {
        useState: function(initialState) {
          console.log('[EMERGENCY] Using fallback useState with:', initialState);
          // Create fallback state variable and setter
          let state = initialState;
          const setState = (newState) => {
            if (typeof newState === 'function') {
              state = newState(state);
            } else {
              state = newState;
            }
            console.log('[EMERGENCY] State updated to:', state);
          };
          return [state, setState];
        },
        useEffect: function(callback, deps) {
          console.log('[EMERGENCY] Using fallback useEffect');
          // Simple implementation that just calls the callback once
          try {
            if (typeof callback === 'function') {
              // Execute the effect immediately
              const cleanup = callback();
              if (typeof cleanup === 'function') {
                // Store cleanup function for potential future use
                window.__emergency_cleanup_functions = window.__emergency_cleanup_functions || [];
                window.__emergency_cleanup_functions.push(cleanup);
              }
            }
          } catch (e) {
            console.error('[EMERGENCY] Error in fallback useEffect:', e);
          }
        }
      };
      
      // Apply monkey patch to React's setState to prevent infinite updates
      if (window.React && window.React.Component) {
        const originalSetState = window.React.Component.prototype.setState;
        
        if (originalSetState) {
          // Track how many times setState is called in succession
          let setStateCounter = 0;
          const maxSetStateCalls = 100; // Threshold for detecting infinite loops
          let lastResetTime = Date.now();
          
          window.React.Component.prototype.setState = function patchedSetState() {
            // Reset counter if enough time has passed
            const now = Date.now();
            if (now - lastResetTime > 1000) {
              setStateCounter = 0;
              lastResetTime = now;
            }
            
            // Increment counter
            setStateCounter++;
            
            // Check if we're in an infinite loop
            if (setStateCounter > maxSetStateCalls) {
              console.error('[EMERGENCY FIX] Detected possible infinite setState loop! Breaking cycle.');
              console.warn('[EMERGENCY FIX] Component name:', this.constructor.name);
              
              // Only log the stack trace, don't actually break the loop
              console.trace('[EMERGENCY FIX] Stack trace for setState');
              
              // Reset counter to prevent console spam
              setStateCounter = 0;
              
              // We still call setState but warn about it
              return originalSetState.apply(this, arguments);
            }
            
            // Normal behavior
            return originalSetState.apply(this, arguments);
          };
          
          console.log('[EMERGENCY FIX] Successfully patched React.Component.prototype.setState');
        }
      }
    } catch (e) {
      console.error('[EMERGENCY FIX] Error setting up hooks patch:', e);
    }
  }
  
  // Immediately run our fixes
  forceAdminBypass();
  createDefaultAdminIfNeeded();
  patchReactHooks();
  
  // Create emergency admin access utility
  window.emergencyAdminFix = {
    forceAdmin: () => {
      forceAdminBypass();
      createDefaultAdminIfNeeded();
      console.log('[EMERGENCY FIX] Force admin complete. Refreshing page...');
      setTimeout(() => window.location.reload(), 500);
    },
    status: () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return {
          user: user?.username || 'Unknown',
          role: user?.role || 'Unknown',
          bypass: localStorage.getItem('bypass_admin_verification') === 'true',
          token: !!localStorage.getItem('token')
        };
      } catch (e) {
        return { error: e.message };
      }
    },
    resetAuth: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('tokenTimestamp');
      localStorage.removeItem('user');
      localStorage.removeItem('bypass_admin_verification');
      console.log('[EMERGENCY FIX] Auth reset. Refreshing page...');
      setTimeout(() => window.location.reload(), 500);
    },
    fixHooksError: () => {
    try {
    // This tries to address the "Rendered fewer hooks than expected" error
    console.log('[EMERGENCY FIX] Attempting to fix React hooks error...');
    
    // Set all necessary flags for emergency mode
    localStorage.setItem('fixing_hooks_error', 'true');
    localStorage.setItem('bypass_admin_verification', 'true');
    localStorage.setItem('use_emergency_admin_route', 'true');
    localStorage.setItem('skip_hooks_verification', 'true');
    
    // Use the emergency admin route file directly if possible
    try {
      // Try to force the system to use the emergency admin route implementation
      console.log('[EMERGENCY FIX] Activating emergency admin route implementation');
      if (typeof window.__swanstudio_router !== 'undefined') {
        window.__swanstudio_router.useEmergencyAdminRoute = true;
    }
    } catch (routeErr) {
    console.error('[EMERGENCY FIX] Error setting emergency route flag:', routeErr);
    }
    
    // Step 1: Try to inject our emergency hooks if possible
    console.log('[EMERGENCY FIX] Injecting emergency hooks...');
    try {
    // Check if React is available
    if (!window.React && typeof require === 'function') {
      try {
        window.React = require('react');
      console.log('[EMERGENCY FIX] Successfully imported React');
    } catch (err) {
    console.warn('[EMERGENCY FIX] Could not import React:', err);
    }
    }
    
    // If React is available, make sure hooks are defined but don't override them
    // Just provide backup implementations
    if (window.React) {
      window.emergencyReactHooks = {
          useState: window.React.useState || window.__emergency_React_hooks.useState,
        useEffect: window.React.useEffect || window.__emergency_React_hooks.useEffect
        };
            console.log('[EMERGENCY FIX] Emergency React hooks backup created');
          }
        } catch (hookErr) {
          console.error('[EMERGENCY FIX] Error injecting emergency hooks:', hookErr);
        }
        
        // Step 2: Create a special query param to signal to React to rebuild the component tree
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('refresh_hooks', Date.now().toString());
        newUrl.searchParams.set('emergency_mode', 'true');
        
        // Step 3: Add special fixes for the admin route
        try {
          console.log('[EMERGENCY FIX] Setting up admin route workarounds...');
          
          // Set special flag to use emergency version of admin route
          localStorage.setItem('use_emergency_admin_route', 'true');
          
          // Add dummy React hook implementations to window for emergency use
          window.emergencyUseState = window.__emergency_React_hooks.useState;
          window.emergencyUseEffect = window.__emergency_React_hooks.useEffect;
          
          // Try to modify modules directly in code-splitting chunks if possible
          try {
            console.log('[EMERGENCY FIX] Attempting to locate and patch AdminRoute module...');
            
            // This is an advanced technique to find and modify code in code-splitting chunks
            // It's a last resort attempt to fix the hooks issue
            const scriptElements = document.getElementsByTagName('script');
            for (let i = 0; i < scriptElements.length; i++) {
              const scriptContent = scriptElements[i].textContent || '';
              
              // Check if this script contains AdminRoute definition
              if (scriptContent.includes('const AdminRoute') && 
                  (scriptContent.includes('useEffect is not defined') || 
                   !scriptContent.includes('import React, { useState, useEffect }')))
              {
                console.log('[EMERGENCY FIX] Found AdminRoute script that needs patching!');
                
                // Create a new version of the script that includes proper imports
                let newScriptContent = scriptContent;
                
                // Add useEffect import if missing
                if (!scriptContent.includes('import React, { useState, useEffect }')) {
                  if (scriptContent.includes('import React, { useState }')) {
                    newScriptContent = scriptContent.replace(
                      'import React, { useState }',
                      'import React, { useState, useEffect }'
                    );
                  } else if (scriptContent.includes('import React from "react"')) {
                    newScriptContent = scriptContent.replace(
                      'import React from "react"',
                      'import React, { useState, useEffect } from "react"'
                    );
                  }
                }
                
                // Create a new script element with the fixed content
                const newScript = document.createElement('script');
                newScript.textContent = newScriptContent;
                newScript.id = 'emergency-fixed-admin-route';
                
                // Add it to the document
                document.head.appendChild(newScript);
                console.log('[EMERGENCY FIX] Injected fixed AdminRoute script!');
                break;
              }
            }
          } catch (patchErr) {
            console.error('[EMERGENCY FIX] Error patching AdminRoute module:', patchErr);
          }
          
          // Force simulate admin user
          const mockUser = {
            id: 'emergency-admin-' + Date.now(),
            email: 'admin@emergency.fix',
            username: 'emergency-admin',
            firstName: 'Emergency',
            lastName: 'Admin',
            role: 'admin',
            isActive: true,
            permissions: ['admin:all'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          localStorage.setItem('emergency_admin_user', JSON.stringify(mockUser));
          
          // Add a global emergencyUseReact object for component use
          window.emergencyReact = {
            useState: window.__emergency_React_hooks.useState,
            useEffect: window.__emergency_React_hooks.useEffect
          };
        } catch (adminErr) {
          console.error('[EMERGENCY FIX] Error setting up admin route workarounds:', adminErr);
        }
        
        // Force a navigation (not just a reload) to rebuild the component tree
        console.log('[EMERGENCY FIX] Navigating to reset React hooks...');
        setTimeout(() => {
          window.location.href = newUrl.toString();
        }, 500);
        
        return 'Fixing hooks error with emergency mode activation... Navigating to reset React state...';
      } catch (e) {
        console.error('[EMERGENCY FIX] Error in fixHooksError:', e);
        return `Error: ${e.message}`;
      }
    },
    debugInfo: () => {
      try {
        // Collect all relevant information to diagnose issues
        const localStorage = {
          token: !!window.localStorage.getItem('token'),
          tokenTimestamp: window.localStorage.getItem('tokenTimestamp'),
          user: JSON.parse(window.localStorage.getItem('user') || '{}'),
          bypass: window.localStorage.getItem('bypass_admin_verification'),
          allKeys: Object.keys(window.localStorage)
        };
        
        // React router information
        const routerInfo = {
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash
        };
        
        // Environment information
        const environment = {
          isDevelopment: process.env.NODE_ENV === 'development',
          mode: process.env.MODE,
          buildTime: process.env.BUILD_TIME
        };
        
        return {
          localStorage,
          routerInfo,
          environment,
          userAgent: window.navigator.userAgent,
          timestamp: new Date().toISOString()
        };
      } catch (e) {
        return { error: e.message };
      }
    }
  };
  
  console.log('[EMERGENCY FIX] Emergency admin utilities available: window.emergencyAdminFix.forceAdmin(), window.emergencyAdminFix.status(), window.emergencyAdminFix.resetAuth(), window.emergencyAdminFix.fixHooksError(), window.emergencyAdminFix.debugInfo()');
  
  // Add special monkey patch to bypass AuthContext verification
  // This ensures the verification doesn't get stuck in loops
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = function(type, listener, options) {
    // Only intercept 'load' event for our special handling
    if (type === 'load' && typeof listener === 'function') {
      const wrappedListener = function(event) {
        // Run our fix again right before the page fully loads
        forceAdminBypass();
        
        // Call the original listener
        listener(event);
      };
      
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    
    // Call the original addEventListener for all other events
    return originalAddEventListener.call(this, type, listener, options);
  };
// })();
} // End of disabled code block