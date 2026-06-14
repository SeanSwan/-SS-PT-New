import React from 'react';

import type { CoachCommandClientSource } from '../../../../services/coachCommandClientService';
import type { DrawerSide, QueueHealthRow } from './CoachCommandCenter.types';
import {
  OperatorControlsPanel,
  QueueSnapshotPanel,
  QuickClientPanel,
  WorkoutCommandPanel,
} from './CoachCommandOpsRailPanels';

type CoachCommandOpsRailProps = {
  drawer: DrawerSide | null;
  quickClientBusy: boolean;
  quickClientError: string | null;
  quickClientMessage: string | null;
  quickClientName: string;
  quickClientSource: CoachCommandClientSource;
  queueHealthRows: QueueHealthRow[];
  railRef: React.RefObject<HTMLElement>;
  rightRailItems: string[];
  selectedClientLabel: string;
  teachMode: boolean;
  workoutLoggerRoute: string | null;
  workoutPlannerRoute: string | null;
  onOpenIntake: () => void;
  onOpenPlaud: () => void;
  onQuickClientNameChange: (value: string) => void;
  onQuickClientSourceChange: (value: CoachCommandClientSource) => void;
  onQuickClientSubmit: (event: React.FormEvent) => void;
  onStageWorkoutLog: () => void;
  onTeachModeToggle: () => void;
};

const CoachCommandOpsRail: React.FC<CoachCommandOpsRailProps> = ({
  drawer,
  quickClientBusy,
  quickClientError,
  quickClientMessage,
  quickClientName,
  quickClientSource,
  queueHealthRows,
  railRef,
  rightRailItems,
  selectedClientLabel,
  teachMode,
  workoutLoggerRoute,
  workoutPlannerRoute,
  onOpenIntake,
  onOpenPlaud,
  onQuickClientNameChange,
  onQuickClientSourceChange,
  onQuickClientSubmit,
  onStageWorkoutLog,
  onTeachModeToggle,
}) => (
  <aside
    id="coach-command-ops"
    className={`right-rail glass ${drawer === 'right' ? 'is-open' : ''}`}
    ref={railRef}
    data-drawer="right"
    aria-label="Coach operations rail"
  >
    <WorkoutCommandPanel
      selectedClientLabel={selectedClientLabel}
      workoutLoggerRoute={workoutLoggerRoute}
      workoutPlannerRoute={workoutPlannerRoute}
      onOpenIntake={onOpenIntake}
      onOpenPlaud={onOpenPlaud}
      onStageWorkoutLog={onStageWorkoutLog}
    />
    <OperatorControlsPanel teachMode={teachMode} onTeachModeToggle={onTeachModeToggle} />
    <QuickClientPanel
      quickClientBusy={quickClientBusy}
      quickClientError={quickClientError}
      quickClientMessage={quickClientMessage}
      quickClientName={quickClientName}
      quickClientSource={quickClientSource}
      onQuickClientNameChange={onQuickClientNameChange}
      onQuickClientSourceChange={onQuickClientSourceChange}
      onQuickClientSubmit={onQuickClientSubmit}
    />
    <QueueSnapshotPanel queueHealthRows={queueHealthRows} rightRailItems={rightRailItems} />
  </aside>
);

export default CoachCommandOpsRail;
