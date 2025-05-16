// COMPLETE CLEANUP - Remove ALL Debug Styling
console.log('🧽 Complete cleanup of all debug styling...');

// More thorough removal of debug styles
const allElements = document.querySelectorAll('*');
allElements.forEach(el => {
  // Remove any borders that contain 'red' or specific values
  if (el.style.border) {
    el.style.removeProperty('border');
  }
  if (el.style.borderColor) {
    el.style.removeProperty('border-color');
  }
  if (el.style.borderWidth) {
    el.style.removeProperty('border-width');
  }
  if (el.style.borderStyle) {
    el.style.removeProperty('border-style');
  }
  
  // Remove debug background colors
  if (el.style.backgroundColor && 
      (el.style.backgroundColor.includes('rgba(255, 0, 0') || 
       el.style.backgroundColor.includes('rgba(0, 255, 0'))) {
    el.style.removeProperty('background-color');
  }
  
  // Remove any outline that might look like borders
  if (el.style.outline) {
    el.style.removeProperty('outline');
  }
});

// Reset specific package card styling
const packageCards = document.querySelectorAll('div[class*="sc-"], section div');
packageCards.forEach((card, index) => {
  // If this looks like a package card
  const text = card.textContent;
  if (text && (text.includes('Session') || text.includes('Month')) && 
      card.offsetWidth > 200 && card.offsetHeight > 200) {
    
    console.log(`Resetting card ${index + 1}: ${text.split('\n')[0]}`);
    
    // Remove ALL border-related properties
    card.style.removeProperty('border');
    card.style.removeProperty('border-color');
    card.style.removeProperty('border-width');
    card.style.removeProperty('border-style');
    card.style.removeProperty('outline');
    card.style.removeProperty('background-color');
    
    // Apply minimal necessary fixes only
    card.style.setProperty('position', 'relative', 'important');
    card.style.setProperty('z-index', '20', 'important');
    card.style.setProperty('opacity', '1', 'important');
    card.style.setProperty('visibility', 'visible', 'important');
  }
});

console.log('🎨 Cleanup complete!');
console.log('💡 If you still see red borders, try refreshing the page (F5 or Ctrl+R)');

// Optional: Force a style recalculation
document.body.offsetHeight; // Trigger reflow

console.log('✅ All debug styling removed!');