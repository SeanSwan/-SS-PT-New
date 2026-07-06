/**
 * LockedChartCard (D2, Sean lock 2026-07-06)
 * ==========================================
 * Starter-tier upsell card for tier-locked charts: the teaser pair renders
 * live; the other ten render this honest locked state — the teaser IS the
 * upsell. Reuses the live CrystallineLockOverlay primitive with an
 * /ascension CTA.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import CrystallineLockOverlay from '../../../Shared/CrystallineLockOverlay';
import { ChartCard } from './CanonicalProgressChartsGrid.styles';

const LockedChartCard: React.FC<{ title: string }> = ({ title }) => {
  const navigate = useNavigate();
  return (
    <ChartCard data-testid={`chart-card-locked-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <CrystallineLockOverlay
        isLocked
        featureName={title}
        description="Part of the full 12-chart Guardian analytics cockpit."
        ctaLabel="Upgrade"
        badgeLabel="Guardian"
        onConfigure={() => navigate('/ascension')}
      >
        <div style={{ minHeight: 180 }} />
      </CrystallineLockOverlay>
    </ChartCard>
  );
};

export default LockedChartCard;
