/**
 * PackagesGrid.tsx - Decomposed Packages Grid Component
 * ================================================================
 * Extracted from monolithic GalaxyThemedStoreFront.tsx
 *
 * Responsibilities:
 * - Grid layout for packages
 * - Package filtering (fixed vs monthly)
 * - Custom package CTA and wizard integration (Gemini's Enhancement)
 * - Section titles and animations
 * - Package state management coordination
 *
 * Performance Optimized:
 * - Memoized to prevent unnecessary re-renders
 * - Stable animation references
 * - Efficient filtering logic
 *
 * Enhanced by: Gemini (UX/UI Lead) - Custom Package Integration
 */

import React, { memo, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion, useAnimation, useInView } from 'framer-motion';
import PackageCard from './PackageCard';
import CustomPackageCard from './CustomPackageCard';
import CustomPackageBuilder, { CustomPackageData } from './CustomPackageBuilder';
import { CustomPackageErrorBoundary } from './CustomPackageErrorBoundary';

// Galaxy Theme Constants
const GALAXY_COLORS = {
  stellarWhite: '#ffffff',
  cyberCyan: '#00ffff'
};

// Asset paths
const swanIcon = "/Logo.png";

// Package Interface (Enhanced to support custom packages - Roo's requirement)
interface StoreItem {
  id: number;
  name: string;
  description: string;
  packageType: 'fixed' | 'monthly' | 'custom';
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
  // Custom package configuration (only present for packageType === 'custom')
  customPackageConfig?: {
    selectedSessions: number;
    pricePerSession: number;
    volumeDiscount: number;
    discountTier: 'bronze' | 'silver' | 'gold';
    calculatedTotal: number;
    expirationDate?: string;
  };
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
  // 🎯 ENHANCED: Custom Package Wizard State (Gemini's Enhancement)
  const [isCustomWizardOpen, setIsCustomWizardOpen] = useState(false);

  // Refs for intersection observer
  const fixedPackagesSectionRef = useRef<HTMLDivElement>(null);
  const monthlyPackagesSectionRef = useRef<HTMLDivElement>(null);
  const customPackageSectionRef = useRef<HTMLDivElement>(null);

  // Animation controls
  const fixedPackagesControls = useAnimation();
  const monthlyPackagesControls = useAnimation();
  const customPackageControls = useAnimation();

  // Intersection observers
  const isFixedPackagesInView = useInView(fixedPackagesSectionRef, { once: true, amount: 0.1 });
  const isMonthlyPackagesInView = useInView(monthlyPackagesSectionRef, { once: true, amount: 0.1 });
  const isCustomPackageInView = useInView(customPackageSectionRef, { once: true, amount: 0.1 });

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

  React.useEffect(() => {
    if (isCustomPackageInView) {
      customPackageControls.start("visible");
    }
  }, [isCustomPackageInView, customPackageControls]);

  // Filter packages by type
  const fixedPackages = React.useMemo(() => 
    packages.filter(pkg => pkg.packageType === 'fixed'), 
    [packages]
  );
  
  const monthlyPackages = React.useMemo(() => 
    packages.filter(pkg => pkg.packageType === 'monthly'), 
    [packages]
  );

  // 🎯 ENHANCED: Custom Package Wizard Handlers (Gemini's Enhancement)
  const handleOpenCustomWizard = useCallback(() => {
    setIsCustomWizardOpen(true);
  }, []);

  const handleCloseCustomWizard = useCallback(() => {
    setIsCustomWizardOpen(false);
  }, []);

  const handleCustomPackageComplete = useCallback((packageData: CustomPackageData) => {
    // Transform custom package data into StoreItem format for cart
    const customPackageItem: StoreItem = {
      id: Date.now(), // Temporary ID for custom package
      name: `Custom Training Package (${packageData.sessions} Sessions)`,
      description: `${packageData.sessions} sessions at $${packageData.pricePerSession}/session with ${packageData.discountTier} tier discount`,
      packageType: 'custom',
      sessions: packageData.sessions,
      pricePerSession: packageData.pricePerSession,
      totalCost: packageData.totalCost,
      displayPrice: packageData.totalCost,
      price: packageData.totalCost,
      theme: 'cosmic',
      isActive: true,
      imageUrl: null,
      displayOrder: 999,
      includedFeatures: `${packageData.schedulePreference} scheduling${packageData.notes ? ` | Notes: ${packageData.notes}` : ''}`,
      customPackageConfig: {
        selectedSessions: packageData.sessions,
        pricePerSession: packageData.pricePerSession,
        volumeDiscount: packageData.volumeDiscount,
        discountTier: packageData.discountTier,
        calculatedTotal: packageData.totalCost
      }
    };

    // Add to cart via parent's handler
    onAddToCart(customPackageItem);

    // Close wizard
    setIsCustomWizardOpen(false);
  }, [onAddToCart]);

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

      {/* 🎯 ENHANCED: Custom Package Section (Gemini's Enhancement) */}
      <PackageSection
        ref={customPackageSectionRef}
        initial="hidden"
        animate={customPackageControls}
        variants={containerVariants}
      >
        <SectionTitle
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          variants={itemVariants}
        >
          Build Your Perfect Package
        </SectionTitle>
        <GalaxyGrid
          initial="hidden"
          animate={customPackageControls}
          variants={gridVariants}
          aria-label="Custom package builder"
        >
          <CustomPackageCard onClick={handleOpenCustomWizard} />
        </GalaxyGrid>
      </PackageSection>

      {/* 🎯 ENHANCED: Custom Package Builder Wizard Modal (Gemini's Enhancement) */}
      <CustomPackageErrorBoundary onReset={handleCloseCustomWizard}>
        <CustomPackageBuilder
          isOpen={isCustomWizardOpen}
          onClose={handleCloseCustomWizard}
          onComplete={handleCustomPackageComplete}
        />
      </CustomPackageErrorBoundary>
    </SectionContainer>
  );
});

PackagesGrid.displayName = 'PackagesGrid';

export default PackagesGrid;