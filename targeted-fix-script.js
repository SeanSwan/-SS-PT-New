// Targeted StoreFront Fix for /shop/training-packages
console.log('🔍 Targeted StoreFront Fix');
console.log('URL:', window.location.href);

// Wait a moment for elements to load
setTimeout(() => {
  // Look for styled-components with more specific patterns
  const potentialCards = document.querySelectorAll(`
    div[class*="sc-"],
    div[class*="CardContainer"],
    div[class*="card"],
    div[class*="package"],
    div[class*="training"],
    [data-testid*="package"],
    [data-testid*="card"],
    .package-card,
    .training-package
  `);

  console.log(`Found ${potentialCards.length} potential package elements`);

  // Filter elements that might be package cards
  const likelyPackageCards = Array.from(potentialCards).filter(el => {
    const rect = el.getBoundingClientRect();
    const text = el.textContent.toLowerCase();
    
    // Look for cards with substantial content and size
    return rect.width > 200 && rect.height > 200 && 
           (text.includes('session') || text.includes('package') || text.includes('training') || text.includes('month'));
  });

  console.log(`Found ${likelyPackageCards.length} likely package cards`);

  // Force visibility on all potential package elements
  potentialCards.forEach((el, index) => {
    // Get current styles
    const styles = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    
    console.log(`Element ${index + 1}:`);
    console.log(`  Class: ${el.className}`);
    console.log(`  Size: ${rect.width}x${rect.height}`);
    console.log(`  Position: ${rect.top}, ${rect.left}`);
    console.log(`  Z-Index: ${styles.zIndex}`);
    console.log(`  Opacity: ${styles.opacity}`);
    console.log(`  Display: ${styles.display}`);
    console.log(`  Visibility: ${styles.visibility}`);
    
    // Apply extreme visibility fixes
    el.style.setProperty('position', 'relative', 'important');
    el.style.setProperty('z-index', '999999', 'important');
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('visibility', 'visible', 'important');
    el.style.setProperty('display', 'flex', 'important');
    el.style.setProperty('transform', 'translateZ(0)', 'important');
    el.style.setProperty('pointer-events', 'auto', 'important');
    
    // Add debug styling
    el.style.setProperty('border', '3px solid #ff0000', 'important');
    el.style.setProperty('background-color', 'rgba(255, 0, 0, 0.1)', 'important');
  });

  // Also check for any grids or containers
  const containers = document.querySelectorAll(`
    div[class*="Grid"],
    div[class*="Section"],
    section,
    div[class*="Container"]
  `);

  console.log(`Found ${containers.length} container elements`);

  containers.forEach((container, index) => {
    console.log(`Container ${index + 1}: ${container.className}`);
    
    // Force visibility on containers too
    container.style.setProperty('position', 'relative', 'important');
    container.style.setProperty('z-index', '999998', 'important');
    container.style.setProperty('opacity', '1', 'important');
    container.style.setProperty('visibility', 'visible', 'important');
    container.style.setProperty('display', 'block', 'important');
  });

  // Check for any hidden/loading states
  const hiddenElements = document.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"], [style*="opacity: 0"]');
  console.log(`Found ${hiddenElements.length} hidden elements`);
  
  hiddenElements.forEach(el => {
    console.log('Hidden element:', el.className, el.tagName);
    el.style.setProperty('display', 'block', 'important');
    el.style.setProperty('visibility', 'visible', 'important');
    el.style.setProperty('opacity', '1', 'important');
  });

  console.log('\n✅ Applied extreme visibility fixes!');
  console.log('🔴 Look for RED BORDERS - those are your package cards');
  
  // If still no luck, try to find ANY element with session/package text
  const textElements = Array.from(document.querySelectorAll('*')).filter(el => {
    const text = el.textContent;
    return text && (
      text.includes('Session') || 
      text.includes('Package') || 
      text.includes('$') ||
      text.includes('Training')
    );
  });
  
  console.log(`\nFound ${textElements.length} elements with relevant text`);
  textElements.slice(0, 10).forEach((el, index) => {
    console.log(`${index + 1}. ${el.tagName}.${el.className}: "${el.textContent.slice(0, 50)}..."`);
    
    // Mark these too
    el.style.setProperty('border', '2px solid #00ff00', 'important');
  });

}, 1000); // Wait 1 second for page to load

console.log('⏳ Waiting for page to load, then applying fixes...');