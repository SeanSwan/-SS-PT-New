// SwanStudios Package Rendering Debug Tool
// Run this in the browser console to diagnose why packages aren't displaying

window.debugPackageRendering = function() {
  console.log('🔍 SWANSTUDIOS PACKAGE RENDERING DIAGNOSIS');
  console.log('==========================================');
  
  // Check if we're on the right page
  const currentPath = window.location.pathname;
  console.log('📍 Current page:', currentPath);
  
  // Look for the main container
  const galaxyContainer = document.querySelector('[class*="GalaxyContainer"]');
  console.log('🌌 Galaxy container found:', !!galaxyContainer);
  
  // Check for package sections
  const packageSections = document.querySelectorAll('[id*="packages"]');
  console.log('📦 Package sections found:', packageSections.length);
  packageSections.forEach((section, i) => {
    console.log(`  Section ${i+1}:`, section.id, section.style.display);
  });
  
  // Check for grid containers
  const grids = document.querySelectorAll('[class*="GalaxyGrid"], [class*="Grid"]');
  console.log('🎯 Grid containers found:', grids.length);
  grids.forEach((grid, i) => {
    console.log(`  Grid ${i+1}:`, {
      children: grid.children.length,
      visible: grid.offsetWidth > 0 && grid.offsetHeight > 0,
      display: getComputedStyle(grid).display,
      opacity: getComputedStyle(grid).opacity
    });
  });
  
  // Check for package cards
  const cards = document.querySelectorAll('[class*="CosmicPackageCard"], [class*="PackageCard"], [class*="Card"]');
  console.log('🃏 Package cards found:', cards.length);
  cards.forEach((card, i) => {
    console.log(`  Card ${i+1}:`, {
      visible: card.offsetWidth > 0 && card.offsetHeight > 0,
      display: getComputedStyle(card).display,
      opacity: getComputedStyle(card).opacity,
      position: getComputedStyle(card).position,
      zIndex: getComputedStyle(card).zIndex
    });
  });
  
  // Check for loading states
  const loadingElements = document.querySelectorAll('[class*="Loading"], [class*="Spinner"]');
  console.log('⏳ Loading elements found:', loadingElements.length);
  
  // Check for error containers
  const errorElements = document.querySelectorAll('[class*="Error"]');
  console.log('❌ Error elements found:', errorElements.length);
  
  // Check React state (if accessible)
  try {
    const reactRoot = document.querySelector('#root');
    if (reactRoot && reactRoot._reactInternalFiber) {
      console.log('⚛️ React state inspection available');
    }
  } catch (e) {
    console.log('⚛️ React state not directly accessible');
  }
  
  // Check for authentication elements
  const authBanner = document.querySelector('[class*="AuthBanner"]');
  console.log('🔐 Auth banner present:', !!authBanner);
  
  // Check specific elements that might hide content
  const contentOverlay = document.querySelector('[class*="ContentOverlay"]');
  console.log('📄 Content overlay found:', !!contentOverlay);
  if (contentOverlay) {
    console.log('   Overlay styles:', {
      display: getComputedStyle(contentOverlay).display,
      opacity: getComputedStyle(contentOverlay).opacity,
      zIndex: getComputedStyle(contentOverlay).zIndex
    });
  }
  
  console.log('\n💡 DIAGNOSTIC RECOMMENDATIONS:');
  
  if (grids.length === 0) {
    console.log('🚨 No grid containers found - packages might not be rendering at all');
  } else if (cards.length === 0) {
    console.log('🚨 Grids found but no cards - check package filtering logic');
  } else if (cards.length > 0) {
    const visibleCards = Array.from(cards).filter(card => 
      card.offsetWidth > 0 && card.offsetHeight > 0
    );
    console.log(`🎯 ${visibleCards.length}/${cards.length} cards are visible`);
    
    if (visibleCards.length === 0) {
      console.log('🚨 Cards exist but are hidden - likely CSS/styling issue');
    }
  }
  
  return {
    grids: grids.length,
    cards: cards.length,
    visibleCards: Array.from(cards).filter(card => 
      card.offsetWidth > 0 && card.offsetHeight > 0
    ).length
  };
};

// Auto-run if we're on the store page
if (window.location.pathname.includes('store') || window.location.pathname.includes('shop')) {
  console.log('🛍️ Store page detected - running automatic diagnosis in 2 seconds...');
  setTimeout(() => {
    window.debugPackageRendering();
  }, 2000);
}

console.log('🔧 Package debug tool loaded. Run debugPackageRendering() in console to diagnose.');
