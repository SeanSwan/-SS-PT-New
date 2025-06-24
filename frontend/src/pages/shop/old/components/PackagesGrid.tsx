/**
 * PackagesGrid.tsx - Decomposed Packages Grid Component
 * ================================================================
 * Extracted from monolithic GalaxyThemedStoreFront.tsx
 * 
 * Responsibilities:
 * - Grid layout for packages
 * - Package filtering (fixed vs monthly)
 * - Section titles and animations
 * - Package state management coordination
 * 
 * Performance Optimized:
 * - Memoized to prevent unnecessary re-renders
 * - Stable animation references
 * - Efficient filtering logic
 */

import React, { memo, useRef } from 'react';
import styled from 'styled-components';
import { motion, useAnimation, useInView } from 'framer-motion';
import PackageCard from './PackageCard';

// Galaxy Theme Constants
const GALAXY_COLORS = {
  stellarWhite: '#ffffff',
  cyberCyan: '#00ffff'
};

// Asset paths
const swanIcon = "/Logo.png";

// Package Interface (matching PackageCard)
interface StoreItem {
  id: number;
  name: string;
  description: string;
  packageType: 'fixed' | 'monthly';
  pricePerSession?: number;
  sessions?: number;
  months?: number;
  sessionsPerWeek?: number;
  totalSessions?: number;
  price?: number;
  totalCost?: number;
  displayPrice: number;
  theme?: string;
  isActive: boolean;
  imageUrl: string | null;
  displayOrder?: number;
  includedFeatures?: string | null;
}

// Component Props Interface
interface PackagesGridProps {
  packages: StoreItem[];
  canViewPrices: boolean;
  canPurchase: boolean;
  revealPrices: { [key: string]: boolean };
  isAddingToCart: number | null;
  onTogglePrice: (packageId: number) => void;
  onAddToCart: (pkg: StoreItem) => void;
}

// Keyframe animations
const starSparkle = `
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
`;

// Styled Components
const SectionContainer = styled.section`
  padding: 5rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 10;
  
  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }
  
  @media (max-width: 480px) {
    padding: 2.5rem 0.75rem;
  }
`;

const PackageSection = styled(motion.section)`
  margin-bottom: 5rem;
  
  @media (max-width: 768px) {
    margin-bottom: 3rem;
  }
`;

const SectionTitle = styled(motion.h2)`
  text-align: center;
  margin-bottom: 3rem;
  font-size: 2.8rem;
  font-weight: 300;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding-bottom: 20px;
  color: ${GALAXY_COLORS.stellarWhite};
  width: 100%;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
  
  &:before {
    content: "";
    width: 32px;
    height: 32px;
    background-image: url(${swanIcon});
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    filter: invert(1) sepia(1) saturate(5) hue-rotate(175deg);
    animation: ${starSparkle} 2s ease-in-out infinite;
  }
  
  &:after {
    content: "";
    width: 32px;
    height: 32px;
    background-image: url(${swanIcon});
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    filter: invert(1) sepia(1) saturate(5) hue-rotate(175deg);
    animation: ${starSparkle} 2s ease-in-out infinite 0.5s;
  }
  
  @media (max-width: 768px) {
    font-size: 2.2rem;
    margin-bottom: 2rem;
    
    &:before,
    &:after {
      width: 24px;
      height: 24px;
    }
  }
`;

const GalaxyGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2.5rem;
  margin-bottom: 4rem;
  position: relative;
  z-index: 15;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  @media (min-width: 1024px) { 
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    max-width: 1200px;
    margin: 0 auto 4rem;
    gap: 3rem;
  }
  
  @media (min-width: 1400px) {
    grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
    max-width: 1600px;
  }
`;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.05
    }
  }
};

// Memoized PackagesGrid Component
const PackagesGrid: React.FC<PackagesGridProps> = memo(({
  packages,
  canViewPrices,
  canPurchase,
  revealPrices,
  isAddingToCart,
  onTogglePrice,
  onAddToCart
}) => {
  // Refs for intersection observer
  const fixedPackagesSectionRef = useRef<HTMLDivElement>(null);
  const monthlyPackagesSectionRef = useRef<HTMLDivElement>(null);

  // Animation controls
  const fixedPackagesControls = useAnimation();
  const monthlyPackagesControls = useAnimation();

  // Intersection observers
  const isFixedPackagesInView = useInView(fixedPackagesSectionRef, { once: true, amount: 0.1 });
  const isMonthlyPackagesInView = useInView(monthlyPackagesSectionRef, { once: true, amount: 0.1 });

  // Trigger animations when in view
  React.useEffect(() => {
    if (isFixedPackagesInView) {
      fixedPackagesControls.start("visible");
    }
  }, [isFixedPackagesInView, fixedPackagesControls]);

  React.useEffect(() => {
    if (isMonthlyPackagesInView) {
      monthlyPackagesControls.start("visible");
    }
  }, [isMonthlyPackagesInView, monthlyPackagesControls]);

  // Filter packages by type
  const fixedPackages = React.useMemo(() => 
    packages.filter(pkg => pkg.packageType === 'fixed'), 
    [packages]
  );
  
  const monthlyPackages = React.useMemo(() => 
    packages.filter(pkg => pkg.packageType === 'monthly'), 
    [packages]
  );

  // Render package cards
  const renderPackageCards = React.useCallback((packageList: StoreItem[]) => {
    return packageList.map(pkg => (
      <PackageCard
        key={pkg.id}
        package={pkg}
        canViewPrices={canViewPrices}
        canPurchase={canPurchase}
        isPriceRevealed={revealPrices[pkg.id] || false}
        isAdding={isAddingToCart === pkg.id}
        onTogglePrice={onTogglePrice}
        onAddToCart={onAddToCart}
      />
    ));
  }, [canViewPrices, canPurchase, revealPrices, isAddingToCart, onTogglePrice, onAddToCart]);

  return (
    <SectionContainer>
      {/* Fixed Packages Section */}
      {fixedPackages.length > 0 && (
        <PackageSection 
          id="packages-section" 
          ref={fixedPackagesSectionRef}
          initial="hidden"
          animate={fixedPackagesControls}
          variants={containerVariants}
        >
          <SectionTitle 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            variants={itemVariants}
          >
            Premium Training Packages
          </SectionTitle>
          <GalaxyGrid 
            initial="hidden"
            animate={fixedPackagesControls}
            variants={gridVariants} 
            aria-label="Session packages"
          >
            {renderPackageCards(fixedPackages)}
          </GalaxyGrid>
        </PackageSection>
      )}

      {/* Monthly Packages Section */}
      {monthlyPackages.length > 0 && (
        <PackageSection 
          ref={monthlyPackagesSectionRef}
          style={fixedPackages.length > 0 ? { marginTop: '0rem' } : {}}
          initial="hidden"
          animate={monthlyPackagesControls}
          variants={containerVariants}
        >
          <SectionTitle 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            variants={itemVariants}
          >
            Long-Term Excellence Programs
          </SectionTitle>
          <GalaxyGrid 
            initial="hidden"
            animate={monthlyPackagesControls}
            variants={gridVariants} 
            aria-label="Monthly packages"
          >
            {renderPackageCards(monthlyPackages)}
          </GalaxyGrid>
        </PackageSection>
      )}
    </SectionContainer>
  );
});

PackagesGrid.displayName = 'PackagesGrid';

export default PackagesGrid;