/**
 * Store V4 — PackageGrid (KIMI-STORE-CORRECTED §d: "the grid is the drawer"). The non-flagship blocks,
 * 2-up ≥768px, single column on mobile. The flagship is NOT here — it's on the pedestal above. Never a
 * 4th column on ultrawide (the reground praised this taste). Cards are the crystal SwanPackageCard.
 */
import styled from 'styled-components';
import type { StorePackage } from '../storeV4.types';
import { SwanPackageCard } from './SwanPackageCard';

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 1440px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

export interface PackageGridProps {
  packages: StorePackage[];
  pricesVisible: boolean;
  busyId: string | null;
  onAdd: (id: string) => void;
}

export function StoreV4PackageGrid({ packages, pricesVisible, busyId, onAdd }: PackageGridProps) {
  if (!packages.length) return null;
  return (
    <Grid data-testid="store-drawer-grid">
      {packages.map((pkg) => (
        <SwanPackageCard
          key={pkg.id}
          pkg={pkg}
          pricesVisible={pricesVisible}
          busy={busyId === pkg.id}
          onAdd={onAdd}
        />
      ))}
    </Grid>
  );
}
