import React from 'react';
import { X } from 'lucide-react';

import AdminAccountSwitcher from '../../../Admin/AdminAccountSwitcher';
import type { CoachCommandClientSource } from '../../../../services/coachCommandClientService';
import type { DrawerSide, QueueHealthRow } from './CoachCommandCenter.types';
import CoachCommandOpsLaunchpad from './CoachCommandOpsLaunchpad';
import {
  AccountControlsToggleButton,
  ClientSetupToggleButton,
  OperatorControlsPanel,
  QueueSnapshotPanel,
  QuickClientPanel,
  TeachModeToggleButton,
} from './CoachCommandOpsRailPanels';

type CoachCommandOpsRailProps = {
  accountControlsOpen: boolean;
  clientPickerRoute: string;
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
  showAccountControls?: boolean;
  teachMode: boolean;
  workoutLoggerRoute: string | null;
  workoutLoggerScopeLabel?: string | null;
  workoutPlannerRoute: string | null;
  workflowReturnLabel?: string | null;
  workflowReturnTo?: string | null;
  onAccountControlsToggle: () => void;
  onClose: () => void;
  onOpenIntake: () => void;
  onOpenPlaud: () => void;
  onQuickClientNameChange: (value: string) => void;
  onQuickClientSourceChange: (value: CoachCommandClientSource) => void;
  onQuickClientSubmit: (event: React.FormEvent) => void;
  onTeachModeToggle: () => void;
};

function opsRailDescription({
  selectedClientLabel,
  workoutLoggerRoute,
  workoutLoggerScopeLabel,
}: {
  selectedClientLabel: string;
  workoutLoggerRoute: string | null;
  workoutLoggerScopeLabel?: string | null;
}): string {
  const scopeLabel = (workoutLoggerScopeLabel || selectedClientLabel || '').trim();

  if (scopeLabel === 'My workout log') {
    return 'Review intake, import audio, or open your own logger from one place.';
  }

  if (workoutLoggerRoute && scopeLabel) {
    return `Review, import, or route workout actions for ${scopeLabel}.`;
  }

  return 'Pick a client, review intake, or import audio before building a workout.';
}

const CoachCommandOpsRail: React.FC<CoachCommandOpsRailProps> = ({
  accountControlsOpen,
  clientPickerRoute,
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
  showAccountControls = false,
  teachMode,
  workoutLoggerRoute,
  workoutLoggerScopeLabel = null,
  workoutPlannerRoute,
  workflowReturnLabel = null,
  workflowReturnTo = null,
  onAccountControlsToggle,
  onClose,
  onOpenIntake,
  onOpenPlaud,
  onQuickClientNameChange,
  onQuickClientSourceChange,
  onQuickClientSubmit,
  onTeachModeToggle,
}) => {
  const [clientSetupOpen, setClientSetupOpen] = React.useState(false);
  const headerDescription = opsRailDescription({
    selectedClientLabel,
    workoutLoggerRoute,
    workoutLoggerScopeLabel,
  });

  return (
    <aside
      id="coach-command-ops"
      className={`right-rail glass ${drawer === 'right' ? 'is-open' : ''}`}
      ref={railRef}
      data-drawer="right"
      aria-label="Coach operations command surface"
    >
      <div className="ops-rail-header">
        <div>
          <span className="ops-rail-kicker">Coach Actions</span>
          <strong>Workout command center</strong>
          <p>{headerDescription}</p>
        </div>
        <button
          type="button"
          className="ops-rail-close"
          onClick={onClose}
          aria-label="Close Coach operations"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <CoachCommandOpsLaunchpad
        clientPickerRoute={clientPickerRoute}
        selectedClientLabel={selectedClientLabel}
        workoutLoggerRoute={workoutLoggerRoute}
        workoutLoggerScopeLabel={workoutLoggerScopeLabel}
        workoutPlannerRoute={workoutPlannerRoute}
        workflowReturnLabel={workflowReturnLabel}
        workflowReturnTo={workflowReturnTo}
        onOpenIntake={onOpenIntake}
        onOpenPlaud={onOpenPlaud}
      />
      {showAccountControls ? (
        <>
          <AccountControlsToggleButton
            accountControlsOpen={accountControlsOpen}
            onAccountControlsToggle={onAccountControlsToggle}
          />
          <div id="coach-owner-account-controls" className="owner-account-controls-panel">
            {accountControlsOpen ? <AdminAccountSwitcher /> : null}
          </div>
        </>
      ) : null}
      <TeachModeToggleButton teachMode={teachMode} onTeachModeToggle={onTeachModeToggle} />
      <OperatorControlsPanel teachMode={teachMode} onTeachModeToggle={onTeachModeToggle} />
      <ClientSetupToggleButton
        clientSetupOpen={clientSetupOpen}
        onClientSetupToggle={() => setClientSetupOpen((current) => !current)}
      />
      {clientSetupOpen ? (
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
      ) : null}
      <QueueSnapshotPanel queueHealthRows={queueHealthRows} rightRailItems={rightRailItems} />
    </aside>
  );
};

export default CoachCommandOpsRail;
