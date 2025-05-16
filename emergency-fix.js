// EMERGENCY VISIBILITY FIX - Run this immediately
console.log('🚨 EMERGENCY VISIBILITY FIX');

// Nuclear option - force everything to be visible
const allDivs = document.querySelectorAll('div');
const allSections = document.querySelectorAll('section');

// Apply to all divs that might be package cards
allDivs.forEach(div => {
  if (div.offsetWidth > 200 && div.offsetHeight > 200) {
    div.style.setProperty('z-index', '999999', 'important');
    div.style.setProperty('position', 'relative', 'important');
    div.style.setProperty('opacity', '1', 'important');
    div.style.setProperty('visibility', 'visible', 'important');
    div.style.setProperty('display', 'flex', 'important');
    div.style.setProperty('border', '2px solid red', 'important');
  }
});

// Force sections to be visible
allSections.forEach(section => {
  section.style.setProperty('z-index', '999998', 'important');
  section.style.setProperty('position', 'relative', 'important');
  section.style.setProperty('opacity', '1', 'important');
  section.style.setProperty('visibility', 'visible', 'important');
  section.style.setProperty('display', 'block', 'important');
});

// Remove any potential overlays
const overlays = document.querySelectorAll('.MuiBackdrop-root, [class*="backdrop"], [class*="overlay"]');
overlays.forEach(overlay => {
  overlay.style.display = 'none';
});

console.log('🔴 Look for RED BORDERS - those are your packages!');
console.log('If you see red bordered boxes, the packages are there but were hidden.');

// Also try to scroll to packages section
const packageSection = document.querySelector('[id*="package"], [class*="package"]');
if (packageSection) {
  packageSection.scrollIntoView({ behavior: 'smooth' });
  console.log('📍 Scrolled to packages section');
}