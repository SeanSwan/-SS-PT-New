// Enhanced StoreFront Debugging Script - Run this in browser console
console.log('🔍 Enhanced StoreFront Debugging Script');
console.log('=====================================');

// Check current page
console.log('Current URL:', window.location.href);
console.log('Current path:', window.location.pathname);

// Check if we're on the storefront page
const isStorefrontPage = window.location.pathname.includes('storefront') || 
                        window.location.pathname.includes('shop') ||
                        document.title.toLowerCase().includes('storefront');

console.log('Is on StoreFront page:', isStorefrontPage);

// Look for ANY storefront-related elements with broader selectors
const allPossibleCards = document.querySelectorAll(`
  [class*="Card"], [class*="card"],
  [class*="Package"], [class*="package"],
  [class*="Item"], [class*="item"],
  [data-testid*="package"], [data-testid*="card"],
  .package-card, .training-package,
  div[class*="sc-"], div[class*="styled"]
`);

console.log(`\nFound ${allPossibleCards.length} potential card elements`);

// Look for grids and containers
const allContainers = document.querySelectorAll(`
  [class*="Grid"], [class*="grid"],
  [class*="Container"], [class*="container"],
  [class*="Section"], [class*="section"],
  section, .section,
  div[class*="sc-"]
`);

console.log(`Found ${allContainers.length} potential container elements`);

// Check for React components in the DOM
const reactElements = document.querySelectorAll('[data-reactroot], #root *');
console.log(`Found ${reactElements.length} React elements`);

// Check for styled-components
const styledComponents = document.querySelectorAll('[class*="sc-"]');
console.log(`Found ${styledComponents.length} styled-components`);

// Look for specific text content
const elementsWithSessionText = Array.from(document.querySelectorAll('*')).filter(
  el => el.textContent && el.textContent.includes('Session')
);
console.log(`Found ${elementsWithSessionText.length} elements containing "Session"`);

const elementsWithPriceText = Array.from(document.querySelectorAll('*')).filter(
  el => el.textContent && el.textContent.match(/\$\d+/)
);
console.log(`Found ${elementsWithPriceText.length} elements containing prices`);

// Check for API calls in network tab
console.log('\nChecking for API calls...');
performance.getEntriesByType('resource').forEach(entry => {
  if (entry.name.includes('/api/storefront')) {
    console.log('Found storefront API call:', entry.name);
  }
});

// Check React state (if accessible)
try {
  const rootElement = document.getElementById('root');
  if (rootElement && rootElement._reactInternalFiber) {
    console.log('React instance found');
  }
} catch (e) {
  console.log('Could not access React internals');
}

// Show first 10 elements with "Session" text
if (elementsWithSessionText.length > 0) {
  console.log('\nElements with "Session" text:');
  elementsWithSessionText.slice(0, 10).forEach((el, index) => {
    console.log(`${index + 1}. Tag: ${el.tagName}, Class: ${el.className}, Text: "${el.textContent.slice(0, 100)}..."`);
    
    // Add debug styling
    el.style.border = '3px solid green';
    el.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
  });
}

// Check console for errors or warnings
const errors = performance.getEntriesByType('navigation');
console.log('Navigation entries:', errors);

// Check for loading states
const loadingElements = document.querySelectorAll('[class*="loading"], [class*="Loading"], .loading');
console.log(`Found ${loadingElements.length} loading indicators`);

// Try to navigate to storefront if not there
if (!isStorefrontPage) {
  console.log('\n🚀 Not on StoreFront page. Let\'s try to navigate...');
  
  // Look for storefront links
  const storefrontLinks = document.querySelectorAll(`
    a[href*="storefront"], a[href*="shop"], a[href*="packages"],
    button:contains("View Packages"), button:contains("Shop"), 
    [class*="shop"], [class*="store"]
  `);
  
  console.log(`Found ${storefrontLinks.length} potential storefront links`);
  
  if (storefrontLinks.length > 0) {
    console.log('Attempting to click storefront link...');
    storefrontLinks[0].click();
    
    // Wait and re-run check
    setTimeout(() => {
      console.log('After navigation - re-running check...');
      location.reload();
    }, 2000);
  } else {
    console.log('Trying direct navigation to /storefront...');
    window.location.href = window.location.origin + '/storefront';
  }
} else {
  // If we're on the storefront page but no packages found
  console.log('\n🔄 On StoreFront page but no packages detected.');
  console.log('Checking for loading states or errors...');
  
  // Check for error messages
  const errorElements = document.querySelectorAll(`
    [class*="error"], [class*="Error"],
    .error, .Error,
    [class*="failed"], [class*="Failed"]
  `);
  
  console.log(`Found ${errorElements.length} error elements`);
  errorElements.forEach((el, index) => {
    console.log(`Error ${index + 1}:`, el.textContent);
  });
  
  // Force refresh data
  console.log('\n🔄 Attempting to force refresh...');
  window.location.reload();
}

// Final recommendation
console.log('\n💡 Recommendations:');
console.log('1. Make sure the backend is running on port 10000');
console.log('2. Check browser Network tab for failed API calls');
console.log('3. Ensure you\'re logged in as a client to view packages');
console.log('4. Try hard refresh (Ctrl+F5) to clear cache');

console.log('\n✅ Enhanced debugging complete!');