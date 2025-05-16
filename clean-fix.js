// Clean Fix - Remove Debug Styling and Apply Proper Z-Index
console.log('🧹 Cleaning up debug styling and applying proper fix...');

// Remove all the ugly red debug borders
const allElements = document.querySelectorAll('*');
allElements.forEach(el => {
  // Remove debug borders
  if (el.style.border && el.style.border.includes('red')) {
    el.style.removeProperty('border');
  }
  
  // Remove debug background colors
  if (el.style.backgroundColor && el.style.backgroundColor.includes('rgba(255, 0, 0')) {
    el.style.removeProperty('background-color');
  }
});

// Apply clean, proper z-index fixes only where needed
const packageCards = Array.from(document.querySelectorAll('div')).filter(div => {
  const text = div.textContent;
  return text && (
    text.includes('Session') || 
    text.includes('Month') || 
    text.includes('Add to Cart')
  ) && div.offsetWidth > 200 && div.offsetHeight > 200;
});

console.log(`Applying clean fixes to ${packageCards.length} package cards...`);

packageCards.forEach((card, index) => {
  // Apply clean, minimal fixes
  card.style.setProperty('position', 'relative', 'important');
  card.style.setProperty('z-index', '100', 'important'); // Much lower than debug version
  card.style.setProperty('opacity', '1', 'important');
  card.style.setProperty('visibility', 'visible', 'important');
  
  console.log(`Fixed card ${index + 1}`);
});

// Apply fixes to container sections
const sections = document.querySelectorAll('section, div[class*="Section"]');
sections.forEach(section => {
  if (section.offsetHeight > 500) { // Only large sections
    section.style.setProperty('position', 'relative', 'important');
    section.style.setProperty('z-index', '10', 'important');
    section.style.setProperty('opacity', '1', 'important');
    section.style.setProperty('visibility', 'visible', 'important');
  }
});

console.log('✅ Clean fix applied!');
console.log('🎊 Your training packages should now be visible and properly styled!');

// Scroll to packages section smoothly
const packagesSection = document.querySelector('section');
if (packagesSection) {
  packagesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  console.log('📍 Scrolled to packages section');
}