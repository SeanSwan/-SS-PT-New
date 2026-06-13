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

interface AdminProgressChartDeckProps {
  charts: CanonicalProgressCharts;
  activeLensId: ProgressChartLensId;
}

export const AdminProgressChartDeck: React.FC<AdminProgressChartDeckProps> = ({ charts, activeLensId }) => (
  <GridWrap>
    <AdminProgressPrimaryCards charts={charts} activeLensId={activeLensId} />
    <AdminProgressDetailCards charts={charts} activeLensId={activeLensId} />
  </GridWrap>
);
