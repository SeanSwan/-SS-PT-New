/**
 * COMPONENT: AdminProgressChartsGrid
 * PARENT: ProgressTabContent, WorkoutHistoryPanel
 * PURPOSE: Admin/trainer-scoped 12-chart client progress surface.
 */

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useAdminClientProgressCharts } from '../../../../../hooks/analytics/useAdminClientProgressCharts';
import { AdminProgressChartDeck } from './AdminProgressChartsGrid.cards';
import ClientExerciseMegaStats from './ClientExerciseMegaStats';
import {
  ErrorLoadingStrip,
  LoadingStrip,
  SummaryLine,
} from './AdminProgressChartsGrid.styles';

interface Props {
  clientId: number;
  clientName: string;
}

const AdminProgressChartsGrid: React.FC<Props> = ({ clientId, clientName }) => {
  const { charts, isLoading, error, nonEmptyChartCount } = useAdminClientProgressCharts(clientId);

  if (isLoading && nonEmptyChartCount === 0) {
    return <LoadingStrip>Loading {clientName}&apos;s progress charts...</LoadingStrip>;
  }

  if (error) {
    return <ErrorLoadingStrip>{error}</ErrorLoadingStrip>;
  }

  return (
    <div data-testid="admin-progress-charts-grid">
      <SummaryLine>
        <TrendingUp size={13} />
        <span>{clientName} - {nonEmptyChartCount} of 12 charts populated</span>
      </SummaryLine>
      <ClientExerciseMegaStats exercises={charts.exerciseFrequency} />
      <AdminProgressChartDeck charts={charts} />
    </div>
  );
};

export default React.memo(AdminProgressChartsGrid);
