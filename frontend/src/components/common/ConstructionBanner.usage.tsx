/**
 * CONSTRUCTION BANNER IMPLEMENTATION GUIDE
 * ========================================
 * 
 * Professional Galaxy Swan themed construction banner for SwanStudios
 * Quick setup guide and usage examples
 */

// ===== BASIC IMPLEMENTATION =====

// 1. Import the banner component
import { ConstructionBanner } from '../components/common';
// OR
import ConstructionBanner from '../components/common/ConstructionBanner';

// 2. Add to your main App.tsx or any layout component
function App() {
  return (
    <div className="App">
      {/* Banner appears at the top of the page */}
      <ConstructionBanner />
      
      {/* Rest of your app components */}
      <Header />
      <main>
        {/* Your page content */}
      </main>
      <Footer />
    </div>
  );
}

// ===== ADVANCED USAGE WITH STATE CONTROL =====

import React, { useState, useEffect } from 'react';
import { ConstructionBanner } from '../components/common';

function App() {
  const [showBanner, setShowBanner] = useState(true);

  // Optional: Hide banner after user closes it (persists in session)
  useEffect(() => {
    const bannerClosed = sessionStorage.getItem('construction-banner-closed');
    if (bannerClosed === 'true') {
      setShowBanner(false);
    }
  }, []);

  const handleCloseBanner = () => {
    setShowBanner(false);
    sessionStorage.setItem('construction-banner-closed', 'true');
  };

  return (
    <div className="App">
      <ConstructionBanner 
        isVisible={showBanner}
        onClose={handleCloseBanner}
        showCloseButton={true}
      />
      
      {/* Add padding-top to account for fixed banner when visible */}
      <div style={{ paddingTop: showBanner ? '70px' : '0' }}>
        <Header />
        <main>
          {/* Your content */}
        </main>
        <Footer />
      </div>
    </div>
  );
}

// ===== CUSTOMIZATION OPTIONS =====

// Custom messages
<ConstructionBanner 
  customMessage="Platform Upgrade in Progress"
  customSubMessage="New features launching soon - contact us for assistance"
/>

// Hide close button (always visible)
<ConstructionBanner 
  showCloseButton={false}
/>

// Control visibility programmatically
<ConstructionBanner 
  isVisible={isUnderConstruction}
  onClose={() => setIsUnderConstruction(false)}
/>

// ===== QUICK START FOR HEADER INTEGRATION =====

// If you want to add it to your existing Header component:
// src/components/Header/Header.tsx

import { ConstructionBanner } from '../common';

const Header = () => {
  return (
    <>
      <ConstructionBanner />
      <YourExistingHeader />
    </>
  );
};

// ===== CSS CONSIDERATIONS =====

// The banner is fixed positioned at the top, so you may want to add
// padding-top to your main content to prevent overlap:

const MainContent = styled.main`
  padding-top: 60px; /* Adjust based on banner height */
  
  @media (max-width: 768px) {
    padding-top: 80px; /* Mobile banner is slightly taller */
  }
`;

// ===== PROPS REFERENCE =====

interface ConstructionBannerProps {
  isVisible?: boolean;           // Show/hide banner (default: true)
  onClose?: () => void;         // Callback when user closes banner
  showCloseButton?: boolean;    // Show X button (default: true)
  customMessage?: string;       // Override main message
  customSubMessage?: string;    // Override sub message
}

// ===== DEFAULT STYLING FEATURES =====

// ✅ Galaxy Swan themed colors and gradients
// ✅ Professional glass morphism effect
// ✅ Responsive design (mobile-friendly)
// ✅ Smooth animations (enter/exit)
// ✅ Subtle glow effect for attention
// ✅ Two action buttons: "Contact Us" and "Schedule Orientation"
// ✅ Both buttons link to "/contact" page
// ✅ Fixed positioning at top of viewport
// ✅ High z-index (1000) to appear above other content
// ✅ Backdrop blur for premium look

// ===== REMOVAL INSTRUCTIONS =====

// When site is complete, simply:
// 1. Set isVisible={false}
// 2. Or remove <ConstructionBanner /> from your components
// 3. Remove any padding-top adjustments made for the banner
// 4. Optional: Delete the component files if no longer needed

export default {};