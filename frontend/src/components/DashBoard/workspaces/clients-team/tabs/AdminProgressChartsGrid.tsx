/**
 * COMPONENT: AdminProgressChartsGrid
 * PARENT: ProgressTabContent, WorkoutHistoryPanel
 * PURPOSE: Admin/trainer-scoped 12-chart client progress surface.
 */

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useAdminClientProgressCharts } from '../../../../../hooks/analytics/useAdminClientProgressCharts';
import { getProgressProofStatusText } from '../../../../../utils/progressProofStatusText';
import { AdminProgressChartDeck } from './AdminProgressChartsGrid.cards';
import ClientExerciseMegaStats from '../../../progress/ClientExerciseMegaStats';
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
  const {
    charts,
    isLoading,
    error,
    nonEmptyChartCount,
    unavailableChartCount,
  } = useAdminClientProgressCharts(clientId);

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
        <span>{clientName} - {getProgressProofStatusText(nonEmptyChartCount, unavailableChartCount)}</span>
      </SummaryLine>
      <ClientExerciseMegaStats exercises={charts.exerciseFrequency} />
      <AdminProgressChartDeck charts={charts} />
    </div>
  );
};

export default React.memo(AdminProgressChartsGrid);
