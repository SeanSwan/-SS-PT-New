// Quick StoreFront Navigation Helper
console.log('🧭 StoreFront Navigation Helper');
console.log('Current URL:', window.location.href);

// Check if we're on the right page
const currentPath = window.location.pathname;
const isStorefront = currentPath.includes('storefront') || currentPath.includes('shop');

console.log('Current path:', currentPath);
console.log('Is on storefront page:', isStorefront);

if (!isStorefront) {
  console.log('❌ You are NOT on the StoreFront page!');
  console.log('Trying to navigate to StoreFront...');
  
  // Try multiple possible URLs
  const possibleUrls = [
    window.location.origin + '/storefront',
    window.location.origin + '/shop',
    window.location.origin + '/packages'
  ];
  
  console.log('Attempting navigation to:', possibleUrls[0]);
  window.location.href = possibleUrls[0];
} else {
  console.log('✅ You are on the StoreFront page');
  console.log('Now run the enhanced debugging script...');
  
  // Quick check for any elements with "session" or "package" in text
  const relevantElements = Array.from(document.querySelectorAll('*')).filter(el => {
    const text = el.textContent.toLowerCase();
    return text.includes('session') || text.includes('package') || text.includes('training');
  });
  
  console.log(`Found ${relevantElements.length} elements with relevant text`);
  
  // Show the first few
  relevantElements.slice(0, 5).forEach((el, index) => {
    console.log(`${index + 1}. ${el.tagName}: "${el.textContent.slice(0, 50)}..."`);
  });
}