/**
 * TAB: ProgressTabContent
 * PARENT: ClientDetailView (Clients & Team)
 * PURPOSE: Truthful 15-chart canonical progress view for the selected client.
 * DATA: admin-scoped useAdminClientProgressCharts, not the JWT-derived client path.
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
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent));
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
