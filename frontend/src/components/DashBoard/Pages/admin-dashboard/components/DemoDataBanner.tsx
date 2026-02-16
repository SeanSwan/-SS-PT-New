/**
 * DemoDataBanner.tsx
 * Renders a visible warning banner when a panel is showing demo/fallback data
 * instead of real API data. Ensures the admin always knows what's real vs fake.
 */
import React from 'react';
import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';

interface DemoDataBannerProps {
  /** Optional message override */
  message?: string;
  /** Whether the panel has no API at all (vs API that failed) */
  noApi?: boolean;
}

const Banner = styled.div<{ $noApi?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  margin-bottom: 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  line-height: 1.4;
  background: ${({ $noApi }) =>
    $noApi
      ? 'rgba(139, 92, 246, 0.12)'
      : 'rgba(245, 158, 11, 0.12)'};
  border: 1px solid ${({ $noApi }) =>
    $noApi
      ? 'rgba(139, 92, 246, 0.3)'
      : 'rgba(245, 158, 11, 0.3)'};
  color: ${({ $noApi }) =>
    $noApi ? '#c4b5fd' : '#fcd34d'};
`;

const IconWrap = styled.span`
  flex-shrink: 0;
  display: flex;
`;

const DemoDataBanner: React.FC<DemoDataBannerProps> = ({ message, noApi }) => {
  const defaultMessage = noApi
    ? 'This panel shows placeholder data. Real-time integration is coming soon.'
    : 'Showing demo data — the live API is currently unavailable. Data shown is illustrative only.';

  return (
    <Banner $noApi={noApi} role="status" aria-live="polite">
      <IconWrap>
        <AlertTriangle size={18} />
      </IconWrap>
      <span>{message || defaultMessage}</span>
    </Banner>
  );
};

export default DemoDataBanner;
