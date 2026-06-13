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
import { useAnimation, useInView, MotionConfig } from 'framer-motion';
import PackageCard from './PackageCard';
import ProductCard from './ProductCard';
import type { ProductVariant, StoreItem } from './storeCatalog.types';
import { isPhysicalProduct } from './storeCatalog';
import {
  SectionContainer,
  PackageSection,
  SectionTitle,
  GalaxyGrid,
  containerVariants,
  itemVariants,
  gridVariants,
} from './PackagesGrid.styles';

// Component Props Interface
interface PackagesGridProps {
  packages: StoreItem[];
  canViewPrices: boolean;
  canPurchase: boolean;
  revealPrices?: { [key: string]: boolean };
  isAddingToCart: number | null;
  onTogglePrice?: (packageId: number) => void;
  onAddToCart: (pkg: StoreItem, productVariant?: ProductVariant | null) => void;
}

interface StorefrontSectionConfig {
  sectionKey: string;
  id?: string;
  title: string;
  ariaLabel: string;
  items: StoreItem[];
  renderItems: (items: StoreItem[]) => React.ReactNode;
}

interface StorefrontSectionProps extends StorefrontSectionConfig {}

const hasSectionItems = (section: StorefrontSectionConfig): boolean => section.items.length > 0;

const buildSections = (
  fixedPackages: StoreItem[],
  monthlyPackages: StoreItem[],
  productItems: StoreItem[],
  renderPackageCards: (items: StoreItem[]) => React.ReactNode,
  renderProductCards: (items: StoreItem[]) => React.ReactNode
): StorefrontSectionConfig[] => ([
  {
    sectionKey: 'fixed',
    id: 'packages-section',
    title: 'Premium Training Packages',
    ariaLabel: 'Session packages',
    items: fixedPackages,
    renderItems: renderPackageCards,
  },
  {
    sectionKey: 'monthly',
    title: 'Long-Term Excellence Programs',
    ariaLabel: 'Monthly packages',
    items: monthlyPackages,
    renderItems: renderPackageCards,
  },
  {
    sectionKey: 'products',
    title: 'SwanStudios Recovery Products',
    ariaLabel: 'Recovery products',
    items: productItems,
    renderItems: renderProductCards,
  },
].filter(hasSectionItems));

const StorefrontSection: React.FC<StorefrontSectionProps> = ({
  id,
  title,
  ariaLabel,
  items,
  renderItems,
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const controls = useAnimation();
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });

  React.useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [isInView, controls]);

  return (
    <PackageSection
      id={id}
      ref={sectionRef}
      initial="hidden"
      animate={controls}
      variants={containerVariants}
    >
      <SectionTitle
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        variants={itemVariants}
      >
        {title}
      </SectionTitle>
      <GalaxyGrid
        initial="hidden"
        animate={controls}
        variants={gridVariants}
        aria-label={ariaLabel}
      >
        {renderItems(items)}
      </GalaxyGrid>
    </PackageSection>
  );
};

// Memoized PackagesGrid Component
const PackagesGrid: React.FC<PackagesGridProps> = memo(({
  packages,
  canViewPrices,
  canPurchase,
  isAddingToCart,
  onAddToCart
}) => {
  const fixedPackages = React.useMemo(() =>
    packages.filter(pkg => !isPhysicalProduct(pkg) && pkg.packageType === 'fixed'),
    [packages]
  );

  const monthlyPackages = React.useMemo(() =>
    packages.filter(pkg => !isPhysicalProduct(pkg) && pkg.packageType === 'monthly'),
    [packages]
  );

  const productItems = React.useMemo(() =>
    packages.filter(isPhysicalProduct),
    [packages]
  );

  const renderPackageCards = React.useCallback((packageList: StoreItem[]) => {
    return packageList.map(pkg => (
      <PackageCard
        key={pkg.id}
        package={pkg as any}
        activeSpecial={pkg.activeSpecial}
        canViewPrices={canViewPrices}
        canPurchase={canPurchase}
        isAdding={isAddingToCart === pkg.id}
        onAddToCart={onAddToCart}
      />
    ));
  }, [canViewPrices, canPurchase, isAddingToCart, onAddToCart]);

  const renderProductCards = React.useCallback((productList: StoreItem[]) => {
    return productList.map(product => (
      <ProductCard
        key={product.id}
        product={product}
        canViewPrices={canViewPrices}
        canPurchase={canPurchase}
        isAdding={isAddingToCart === product.id}
        onAddToCart={onAddToCart}
      />
    ));
  }, [canViewPrices, canPurchase, isAddingToCart, onAddToCart]);

  const sections = React.useMemo(
    () => buildSections(
      fixedPackages,
      monthlyPackages,
      productItems,
      renderPackageCards,
      renderProductCards
    ),
    [fixedPackages, monthlyPackages, productItems, renderPackageCards, renderProductCards]
  );

  return (
    <MotionConfig reducedMotion="user">
      <SectionContainer>
        {sections.map((section) => (
          <StorefrontSection key={section.sectionKey} {...section} />
        ))}
      </SectionContainer>
    </MotionConfig>
  );
});

PackagesGrid.displayName = 'PackagesGrid';

export default PackagesGrid;
