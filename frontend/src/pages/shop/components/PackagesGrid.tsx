import React, { memo, useMemo } from 'react';
import PackageCard from './PackageCard';
import ProductCard from './ProductCard';
import type { ProductVariant, StoreItem } from './storeCatalog.types';
import { isPhysicalProduct } from './storeCatalog';
import { GalaxyGrid, PackageSection, SectionContainer, SectionTitle } from './PackagesGrid.styles';

export interface PackagesGridProps {
  packages: StoreItem[];
  canViewPrices: boolean;
  canPurchase: boolean;
  revealPrices?: Record<string, boolean>;
  isAddingToCart: number | null;
  onTogglePrice?: (packageId: number) => void;
  onAddToCart: (pkg: StoreItem, productVariant?: ProductVariant | null) => void;
  onInquire?: (pkg: StoreItem) => void;
}

type Shelf = { key: string; title: string; label: string; items: StoreItem[] };

const PackagesGrid: React.FC<PackagesGridProps> = memo(({ packages, canViewPrices, canPurchase, isAddingToCart, onAddToCart, onInquire }) => {
  const shelves = useMemo<Shelf[]>(() => [
    { key: 'fixed', title: 'Training packages', label: 'Session packages', items: packages.filter((item) => !isPhysicalProduct(item) && item.packageType === 'fixed') },
    { key: 'monthly', title: 'Longer commitments', label: 'Monthly training packages', items: packages.filter((item) => !isPhysicalProduct(item) && item.packageType === 'monthly') },
    { key: 'products', title: 'Recovery products', label: 'Physical recovery products', items: packages.filter(isPhysicalProduct) },
  ].filter((shelf) => shelf.items.length > 0), [packages]);

  return (
    <SectionContainer id="packages-section" aria-label="Store catalog">
      {shelves.map((shelf) => (
        <PackageSection key={shelf.key} aria-label={shelf.label}>
          <SectionTitle>{shelf.title}</SectionTitle>
          <GalaxyGrid aria-label={shelf.label}>
            {shelf.items.map((item) => isPhysicalProduct(item)
              ? <ProductCard key={item.id} product={item} canViewPrices canPurchase={canPurchase} isAdding={isAddingToCart === item.id} isCartBusy={isAddingToCart !== null} onAddToCart={onAddToCart} />
              : <PackageCard key={item.id} package={item} activeSpecial={item.activeSpecial} canViewPrices={canViewPrices} canPurchase={canPurchase} isAdding={isAddingToCart === item.id} isCartBusy={isAddingToCart !== null} onAddToCart={onAddToCart} onInquire={onInquire} />)}
          </GalaxyGrid>
        </PackageSection>
      ))}
    </SectionContainer>
  );
});

PackagesGrid.displayName = 'PackagesGrid';
export default PackagesGrid;
