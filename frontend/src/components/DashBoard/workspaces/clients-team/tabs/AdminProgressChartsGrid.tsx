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

const TOTAL_PROGRESS_CHARTS = 12;

const toChartCount = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.round(value), TOTAL_PROGRESS_CHARTS));
};

export const getProgressProofStatusText = (
  nonEmptyChartCount: number,
  unavailableChartCount = 0,
): string => {
  const populated = toChartCount(nonEmptyChartCount);
  const unavailable = toChartCount(unavailableChartCount);
  const feedLabel = unavailable === 1 ? 'feed' : 'feeds';

  if (unavailable > 0) {
    return `${populated} of ${TOTAL_PROGRESS_CHARTS} charts populated - ${unavailable} ${feedLabel} unavailable`;
  }

  if (populated === 0) {
    return 'No saved workout proof yet - log a workout to populate charts';
  }

  if (populated === TOTAL_PROGRESS_CHARTS) {
    return `Full progress proof ready - ${TOTAL_PROGRESS_CHARTS} charts populated`;
  }

  return `Progress proof building - ${populated} of ${TOTAL_PROGRESS_CHARTS} charts populated`;
};

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
