import React from 'react';
import { formatStorePrice } from './storeCatalog';
import type { StoreItem } from './storeCatalog.types';
import { ComparisonCell, ComparisonDisclosure, ComparisonHeader, ComparisonRow, ComparisonTable, ExperienceHeading, ExperienceLead, ExperienceSection, Eyebrow } from './StoreExperience.styles';

interface StoreComparisonProps { items: StoreItem[]; canViewPrices: boolean; }
const value = (value: number | null | undefined, suffix = '') => value == null ? 'Details unavailable' : `${value}${suffix}`;

const StoreComparison: React.FC<StoreComparisonProps> = ({ items, canViewPrices }) => {
  const packages = items.filter((item) => item.itemKind === 'training_package' && item.isActive);
  if (!packages.length) return null;
  return (
    <ExperienceSection aria-labelledby="store-comparison-heading">
      <Eyebrow>Read the details</Eyebrow>
      <ExperienceHeading id="store-comparison-heading">Compare your training options.</ExperienceHeading>
      <ExperienceLead>Review the schedule, session count, and package price together. A missing detail is a useful question to bring to your consultation.</ExperienceLead>
      <ComparisonDisclosure open>
        <summary>Open package comparison</summary>
      <ComparisonTable role="table" aria-label="Training package comparison">
        <ComparisonRow role="row"><ComparisonHeader role="columnheader">Package</ComparisonHeader><ComparisonHeader role="columnheader">Months</ComparisonHeader><ComparisonHeader role="columnheader">Sessions/week</ComparisonHeader><ComparisonHeader role="columnheader">Sessions</ComparisonHeader><ComparisonHeader role="columnheader">Price</ComparisonHeader></ComparisonRow>
        {packages.map((item) => <ComparisonRow role="row" key={item.id}><ComparisonCell role="cell">{item.name}</ComparisonCell><ComparisonCell role="cell">{value(item.months)}</ComparisonCell><ComparisonCell role="cell">{value(item.sessionsPerWeek)}</ComparisonCell><ComparisonCell role="cell">{value(item.totalSessions ?? item.sessions)}</ComparisonCell><ComparisonCell role="cell">{item.displayPrice == null ? 'Price unavailable' : canViewPrices ? formatStorePrice(item.displayPrice) : 'Ask about pricing'}</ComparisonCell></ComparisonRow>)}
      </ComparisonTable>
      </ComparisonDisclosure>
    </ExperienceSection>
  );
};

export default StoreComparison;
