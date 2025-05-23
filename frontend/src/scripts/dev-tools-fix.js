/**
 * Special script to handle browser developer tools overlay
 * This specifically targets the orange/green bar that appears at the top in Chrome DevTools
 */

(function() {
  // Function to run when DOM is loaded
  function handleDeveloperTools() {
    // Function to find and remove developer tools elements
    function findAndRemoveDevTools() {
      // Target the specific bar elements that might appear at the top
      const possibleDevToolsElements = [
        // Chrome DevTools Elements
        document.querySelector('div[id^="__debug-"]'),
        document.querySelector('div[class^="__debug-"]'),
        document.querySelector('div[class*="devtools-"]'),
        document.querySelector('div[id*="devtools-"]'),
        // The green/orange bar specifically
        document.querySelector('div[style*="background-color:#bada55"]'),
        document.querySelector('div[style*="background-color:#fa6800"]')
      ].filter(Boolean); // Remove null values
      
      // Remove the elements if found
      possibleDevToolsElements.forEach(element => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
      
      // Force set margin/padding on body and html
      document.documentElement.style.margin = '0';
      document.documentElement.style.padding = '0';
      document.documentElement.style.borderTop = '0';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.borderTop = '0';
    }
    
    // Run immediately and then periodically check
    findAndRemoveDevTools();
    setInterval(findAndRemoveDevTools, 500);
    
    // Also run when the window resizes (dev tools appearance can trigger resize)
    window.addEventListener('resize', findAndRemoveDevTools);
  }
  
  // Run when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleDeveloperTools);
  } else {
    handleDeveloperTools();
  }
})();
