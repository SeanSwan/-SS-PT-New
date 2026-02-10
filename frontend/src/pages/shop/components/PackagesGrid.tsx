/**
 * PackagesGrid.tsx - Packages Grid Component (EW Theme v2.0)
 * ================================================================
 * Ethereal Wilderness section layout with glass-morphism cards.
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
 * - MotionConfig for reduced-motion compliance
 */

import React, { memo, useRef } from 'react';
import styled, { css } from 'styled-components';
import { motion, useAnimation, useInView, MotionConfig } from 'framer-motion';
import PackageCard from './PackageCard';

// EW Design Tokens
const T = {
  bg: '#0a0a1a',
  surface: 'rgba(15, 25, 35, 0.92)',
  primary: '#00D4AA',
  secondary: '#7851A9',
  accent: '#48E8C8',
  text: '#F0F8FF',
  textSecondary: '#8AA8B8',
} as const;

const noMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

// Package Interface
interface StoreItem {
  id: number;
  name: string;
  description: string;
  pricePerSession?: number | null;
  sessions?: number | null;
  packageType: 'fixed' | 'monthly';
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
  activeSpecial?: {
    id: number;
    name: string;
    bonusSessions: number;
    bonusDuration?: number;
    endsAt: string;
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

// Styled Components
const SectionContainer = styled.section`
  padding: 5rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 10;
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;

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
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  font-size: 2.8rem;
  font-weight: 600;
  font-style: italic;
  position: relative;
  padding-bottom: 20px;
  width: 100%;
  background: linear-gradient(135deg, ${T.text} 0%, ${T.primary} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  ${noMotion}

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 2px;
    background: linear-gradient(90deg, ${T.primary}, ${T.secondary});
    border-radius: 1px;
  }

  @media (max-width: 768px) {
    font-size: 2.2rem;
    margin-bottom: 2rem;
  }
`;

const GalaxyGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  z-index: 15;

  @media (min-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 900px) and (max-width: 1199px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-width: 450px;
    margin: 0 auto;
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
  const fixedPackagesSectionRef = useRef<HTMLDivElement>(null);
  const monthlyPackagesSectionRef = useRef<HTMLDivElement>(null);

  const fixedPackagesControls = useAnimation();
  const monthlyPackagesControls = useAnimation();

  const isFixedPackagesInView = useInView(fixedPackagesSectionRef, { once: true, amount: 0.1 });
  const isMonthlyPackagesInView = useInView(monthlyPackagesSectionRef, { once: true, amount: 0.1 });

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

  const fixedPackages = React.useMemo(() =>
    packages.filter(pkg => pkg.packageType === 'fixed'),
    [packages]
  );

  const monthlyPackages = React.useMemo(() =>
    packages.filter(pkg => pkg.packageType === 'monthly'),
    [packages]
  );

  const renderPackageCards = React.useCallback((packageList: StoreItem[]) => {
    return packageList.map(pkg => (
      <PackageCard
        key={pkg.id}
        package={pkg}
        activeSpecial={pkg.activeSpecial}
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
    <MotionConfig reducedMotion="user">
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
    </MotionConfig>
  );
});

PackagesGrid.displayName = 'PackagesGrid';

export default PackagesGrid;
