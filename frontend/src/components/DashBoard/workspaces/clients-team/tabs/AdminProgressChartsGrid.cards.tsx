/**
 * COMPONENT: AdminProgressChartsGrid.cards
 * PURPOSE: Composes the primary and detail admin progress card groups.
 */

import React from 'react';
import type { CanonicalProgressCharts } from '../../../../../hooks/analytics/useAdminClientProgressCharts';
import type { ProgressChartLensId } from '../../../progress-proof/progressChartLens';
import { AdminProgressDetailCards } from './AdminProgressChartsGrid.detailCards';
import { AdminProgressPrimaryCards } from './AdminProgressChartsGrid.primaryCards';
import { GridWrap } from './AdminProgressChartsGrid.styles';
import SafeChart from '../../../../Charts/SafeChart';

interface AdminProgressChartDeckProps {
  charts: CanonicalProgressCharts;
  activeLensId: ProgressChartLensId;
}

// P1-4: isolate each card group behind its own error boundary so a single
// Victory render fault can't blank the entire admin client-progress view.
export const AdminProgressChartDeck: React.FC<AdminProgressChartDeckProps> = ({ charts, activeLensId }) => (
  <GridWrap>
    <SafeChart chartName="Primary progress charts">
      <AdminProgressPrimaryCards charts={charts} activeLensId={activeLensId} />
    </SafeChart>
    <SafeChart chartName="Detailed progress charts">
      <AdminProgressDetailCards charts={charts} activeLensId={activeLensId} />
    </SafeChart>
  </GridWrap>
);
