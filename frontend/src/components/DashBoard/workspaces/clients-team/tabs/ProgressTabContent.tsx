/**
 * ┌─── TAB: ProgressTabContent ───────────────────────────────┐
 * │ PARENT: ClientDetailView (Clients & Team)                  │
 * │ PURPOSE: Truthful 12-chart canonical progress view for the │
 * │          selected client in the admin/trainer context.      │
 * │ OWNER: Claude Opus 4.6 | CREATED: 2026-04-16 (Phase 15.3) │
 * │                                                              │
 * │ Reuses the same Phase 14 chart cards from                   │
 * │ CanonicalProgressChartsGrid, but wired to the admin-scoped  │
 * │ hook (useAdminClientProgressCharts) which fetches from       │
 * │ /api/analytics/:userId/chart-* instead of the JWT-derived   │
 * │ client-safe path.                                            │
 * │                                                              │
 * │ Props: { clientId, clientName }                              │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { Suspense } from 'react';
import styled from 'styled-components';
import { getNumericClientId } from './clientTabId';

const AdminProgressChartsGrid = React.lazy(
  () => import('./AdminProgressChartsGrid'),
);

interface ProgressTabContentProps {
  clientId: number | string;
  clientName?: string;
}

const FallbackWrap = styled.div`
  padding: 2rem;
  text-align: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
`;

const ProgressTabContent: React.FC<ProgressTabContentProps> = ({
  clientId,
  clientName,
}) => {
  const numericClientId = getNumericClientId(clientId);

  if (numericClientId === null) {
    return (
      <FallbackWrap role="alert" aria-live="assertive">
        Select a valid client before opening progress charts.
      </FallbackWrap>
    );
  }

  return (
    <Suspense fallback={<FallbackWrap>Loading progress charts...</FallbackWrap>}>
      <AdminProgressChartsGrid
        clientId={numericClientId}
        clientName={clientName || 'Client'}
      />
    </Suspense>
  );
};

export default React.memo(ProgressTabContent);
