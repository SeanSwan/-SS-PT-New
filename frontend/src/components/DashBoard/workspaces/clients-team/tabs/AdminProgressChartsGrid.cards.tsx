/**
 * COMPONENT: AdminProgressChartsGrid.cards
 * PURPOSE: Composes the primary and detail admin progress card groups.
 */

import React from 'react';
import type { CanonicalProgressCharts } from '../../../../../hooks/analytics/useAdminClientProgressCharts';
import { AdminProgressDetailCards } from './AdminProgressChartsGrid.detailCards';
import { AdminProgressPrimaryCards } from './AdminProgressChartsGrid.primaryCards';
import { GridWrap } from './AdminProgressChartsGrid.styles';

interface AdminProgressChartDeckProps {
  charts: CanonicalProgressCharts;
}

export const AdminProgressChartDeck: React.FC<AdminProgressChartDeckProps> = ({ charts }) => (
  <GridWrap>
    <AdminProgressPrimaryCards charts={charts} />
    <AdminProgressDetailCards charts={charts} />
  </GridWrap>
);
