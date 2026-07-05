/**
 * COMPONENT: AdminProgressChartsGrid
 * PARENT: ProgressTabContent, WorkoutHistoryPanel
 * PURPOSE: Admin/trainer-scoped 12-chart client progress surface.
 */

import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useAdminClientProgressCharts } from '../../../../../hooks/analytics/useAdminClientProgressCharts';
import { getProgressProofStatusText } from '../../../../../utils/progressProofStatusText';
import ProgressProofCockpit from '../../../progress-proof/ProgressProofCockpit';
import type { ProgressChartLensId } from '../../../progress-proof/progressChartLens';
import AdminBodyCompPanel from './AdminBodyCompPanel';
import { AdminProgressChartDeck } from './AdminProgressChartsGrid.cards';
import ClientExerciseMegaStats from '../../../progress/ClientExerciseMegaStats';
import ExerciseCodexMatrix from '../../../progress/ExerciseCodexMatrix';
import ProgressChartCube from '../../../progress/ProgressChartCube';
import ProgressChartRecoveryObservatory from '../../../progress/ProgressChartRecoveryObservatory';
import ProgressChartWarRoomBoard from '../../../progress/ProgressChartWarRoomBoard';
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
  const [activeLensId, setActiveLensId] = useState<ProgressChartLensId>('all');
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
      <ProgressProofCockpit
        activeLensId={activeLensId}
        audience="admin"
        nonEmptyChartCount={nonEmptyChartCount}
        subjectLabel={clientName}
        unavailableChartCount={unavailableChartCount}
        onLensChange={setActiveLensId}
      />
      <SummaryLine>
        <TrendingUp size={13} />
        <span>{clientName} - {getProgressProofStatusText(nonEmptyChartCount, unavailableChartCount)}</span>
      </SummaryLine>
      <ProgressChartCube
        charts={charts}
        nonEmptyChartCount={nonEmptyChartCount}
        unavailableChartCount={unavailableChartCount}
      />
      <ProgressChartWarRoomBoard
        charts={charts}
        storageKey={`swan-progress-war-room-board-admin-${clientId}`}
      />
      <ProgressChartRecoveryObservatory charts={charts} />
      <ExerciseCodexMatrix loggedExercises={charts.exerciseFrequency} />
      <ClientExerciseMegaStats exercises={charts.exerciseFrequency} />
      <AdminProgressChartDeck charts={charts} activeLensId={activeLensId} />
      <AdminBodyCompPanel clientId={clientId} />
    </div>
  );
};

export default React.memo(AdminProgressChartsGrid);
