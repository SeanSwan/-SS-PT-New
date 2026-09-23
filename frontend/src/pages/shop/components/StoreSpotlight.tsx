import React, { useMemo } from 'react';
import { formatStorePrice } from './storeCatalog';
import type { StoreItem } from './storeCatalog.types';
import { ExperienceActions, ExperienceButton, ExperienceHeading, ExperienceLead, ExperienceSection, Eyebrow, FactRow, FactValue, SpotlightCard, SpotlightFacts } from './StoreExperience.styles';

interface StoreSpotlightProps {
  items: StoreItem[];
  canViewPrices: boolean;
  canPurchase: boolean;
  isCartBusy?: boolean;
  onAddToCart: (item: StoreItem) => void;
  onInquire?: (item: StoreItem) => void;
}

const sortByDuration = (left: StoreItem, right: StoreItem, field: 'months' | 'sessions' | 'totalSessions') => (
  (right[field] ?? 0) - (left[field] ?? 0) || (left.displayOrder ?? left.id) - (right.displayOrder ?? right.id)
);

const StoreSpotlight: React.FC<StoreSpotlightProps> = ({ items, canViewPrices, canPurchase, isCartBusy = false, onAddToCart, onInquire }) => {
  const item = useMemo(() => {
    const available = items.filter((candidate) => candidate.itemKind === 'training_package' && candidate.isActive);
    const monthly = available.filter((candidate) => candidate.months != null);
    if (monthly.length) return [...monthly].sort((a, b) => sortByDuration(a, b, 'months'))[0] ?? null;
    const sessionPackages = available.filter((candidate) => candidate.sessions != null);
    if (sessionPackages.length) return [...sessionPackages].sort((a, b) => sortByDuration(a, b, 'sessions'))[0] ?? null;
    const totalSessionPackages = available.filter((candidate) => candidate.totalSessions != null);
    return [...totalSessionPackages].sort((a, b) => sortByDuration(a, b, 'totalSessions'))[0] ?? available[0] ?? null;
  }, [items]);
  if (!item) return null;
  const priced = item.displayPrice != null;
  const canAdd = canViewPrices && canPurchase && priced && item.id > 0;
  return (
    <ExperienceSection aria-labelledby="store-spotlight-heading">
      <Eyebrow>One considered commitment</Eyebrow>
      <SpotlightCard>
        <div>
          <ExperienceHeading id="store-spotlight-heading">{item.name}</ExperienceHeading>
          <ExperienceLead>{item.description || 'Review the details and choose a rhythm that fits your calendar.'}</ExperienceLead>
          <ExperienceLead>Choose a rhythm that fits your calendar and the way you want to train.</ExperienceLead>
          <ExperienceActions>
            {!canViewPrices && onInquire && <ExperienceButton type="button" onClick={() => onInquire(item)}>Ask about this package</ExperienceButton>}
            {canAdd && <ExperienceButton type="button" disabled={isCartBusy} onClick={() => { if (!isCartBusy) onAddToCart(item); }}>Add to cart</ExperienceButton>}
          </ExperienceActions>
        </div>
        <SpotlightFacts>
          <FactRow><span>Duration</span><FactValue>{item.months ? `${item.months} months` : item.totalSessions ? `${item.totalSessions} sessions` : 'Details unavailable'}</FactValue></FactRow>
          <FactRow><span>Schedule</span><FactValue>{item.sessionsPerWeek ? `${item.sessionsPerWeek}/week` : 'Details unavailable'}</FactValue></FactRow>
          <FactRow><span>Package price</span><FactValue>{item.displayPrice == null ? 'Price unavailable' : canViewPrices ? formatStorePrice(item.displayPrice) : 'Ask about pricing'}</FactValue></FactRow>
        </SpotlightFacts>
      </SpotlightCard>
    </ExperienceSection>
  );
};

export default StoreSpotlight;
