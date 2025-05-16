// Browser console debugging script for StoreFront package visibility
// Copy and paste this into browser developer console when on the StoreFront page

console.log('🔍 StoreFront Package Debugging Script');
console.log('=====================================');

// Find all package-related elements
const packageCards = document.querySelectorAll('[class*="CardContainer"], [class*="package"], [data-testid*="package"]');
const grids = document.querySelectorAll('[class*="Grid"]');
const sections = document.querySelectorAll('[class*="SectionContainer"]');

console.log(`Found ${packageCards.length} package cards`);
console.log(`Found ${grids.length} grids`);
console.log(`Found ${sections.length} sections`);

// Check each package card
packageCards.forEach((card, index) => {
  const styles = window.getComputedStyle(card);
  const rect = card.getBoundingClientRect();
  
  console.log(`\nPackage Card ${index + 1}:`);
  console.log(`  Display: ${styles.display}`);
  console.log(`  Visibility: ${styles.visibility}`);
  console.log(`  Opacity: ${styles.opacity}`);
  console.log(`  Z-Index: ${styles.zIndex}`);
  console.log(`  Position: ${styles.position}`);
  console.log(`  Transform: ${styles.transform}`);
  console.log(`  Width: ${rect.width}px`);
  console.log(`  Height: ${rect.height}px`);
  console.log(`  Top: ${rect.top}px`);
  console.log(`  Left: ${rect.left}px`);
  console.log(`  Is visible: ${rect.width > 0 && rect.height > 0 && styles.opacity !== '0'}`);
  console.log(`  Has content: ${card.textContent.trim().length > 0}`);
  
  // Check for overlapping elements
  const elementAtCenter = document.elementFromPoint(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2
  );
  
  console.log(`  Element at center: ${elementAtCenter?.tagName} (${elementAtCenter?.className})`);
  console.log(`  Is itself at center: ${elementAtCenter === card}`);
});

// Check for potential overlays/backdrops
const overlays = document.querySelectorAll(
  '.MuiBackdrop-root, .MuiModal-backdrop, [class*="backdrop"], [class*="overlay"]'
);

console.log(`\nFound ${overlays.length} potential overlays/backdrops:`);
overlays.forEach((overlay, index) => {
  const styles = window.getComputedStyle(overlay);
  console.log(`  Overlay ${index + 1}: z-index ${styles.zIndex}, display ${styles.display}`);
});

// Check for competing z-index elements
const allElements = document.querySelectorAll('*');
const highZIndexElements = Array.from(allElements).filter(el => {
  const zIndex = parseInt(window.getComputedStyle(el).zIndex);
  return !isNaN(zIndex) && zIndex > 10;
}).sort((a, b) => {
  const aZ = parseInt(window.getComputedStyle(a).zIndex);
  const bZ = parseInt(window.getComputedStyle(b).zIndex);
  return bZ - aZ;
});

console.log(`\nTop 10 elements with highest z-index:`);
highZIndexElements.slice(0, 10).forEach((el, index) => {
  const zIndex = window.getComputedStyle(el).zIndex;
  console.log(`  ${index + 1}. z-index: ${zIndex}, tag: ${el.tagName}, class: ${el.className}`);
});

// Try to fix visibility by forcing styles
console.log('\n🔧 Attempting to fix visibility...');

// Force package cards to be visible
packageCards.forEach((card, index) => {
  card.style.position = 'relative';
  card.style.zIndex = '9999';
  card.style.visibility = 'visible';
  card.style.opacity = '1';
  card.style.display = 'flex';
  card.style.transform = 'translateZ(0)';
  card.style.backfaceVisibility = 'hidden';
  console.log(`  Fixed card ${index + 1}`);
});

// Force grids to be visible
grids.forEach((grid, index) => {
  grid.style.position = 'relative';
  grid.style.zIndex = '9998';
  grid.style.visibility = 'visible';
  grid.style.opacity = '1';
  console.log(`  Fixed grid ${index + 1}`);
});

// Force sections to be visible
sections.forEach((section, index) => {
  section.style.position = 'relative';
  section.style.zIndex = '9997';
  section.style.visibility = 'visible';
  section.style.opacity = '1';
  console.log(`  Fixed section ${index + 1}`);
});

console.log('\n✅ Visibility fixes applied!');
console.log('The packages should now be visible. If not, there may be a different issue.');

// Add visual debugging
console.log('\n🎨 Adding visual debugging...');
packageCards.forEach((card) => {
  card.style.border = '3px solid #ff4444';
  card.style.backgroundColor = 'rgba(255, 68, 68, 0.1)';
});

console.log('Added red borders to package cards for debugging.');
console.log('You should now see red bordered boxes where the packages are located.');