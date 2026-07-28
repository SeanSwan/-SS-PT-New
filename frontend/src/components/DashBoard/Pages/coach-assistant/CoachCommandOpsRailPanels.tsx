/**
 * COMPONENT: CoachCommandOpsRailPanels
 * PURPOSE: Panel-level pieces for the Coach Command Center operations rail.
 */
import React from 'react';
import { Activity, BookOpenCheck, FileCheck2, ShieldCheck, UserPlus } from 'lucide-react';
import type { CoachCommandClientSource } from '../../../../services/coachCommandClientService';
import type { QueueHealthRow } from './CoachCommandCenter.types';

type OperatorControlsPanelProps = {
  teachMode: boolean;
  onTeachModeToggle: () => void;
};

type AccountControlsToggleButtonProps = {
  accountControlsOpen: boolean;
  onAccountControlsToggle: () => void;
};

type ClientSetupToggleButtonProps = {
  clientSetupOpen: boolean;
  onClientSetupToggle: () => void;
};

type QuickClientPanelProps = {
  quickClientBusy: boolean;
  quickClientError: string | null;
  quickClientMessage: string | null;
  quickClientName: string;
  quickClientSource: CoachCommandClientSource;
  onQuickClientNameChange: (value: string) => void;
  onQuickClientSourceChange: (value: CoachCommandClientSource) => void;
  onQuickClientSubmit: (event: React.FormEvent) => void;
};

type QueueSnapshotPanelProps = {
  queueHealthRows: QueueHealthRow[];
  rightRailItems: string[];
};

function QuickClientNote({ message, tone }: { message: string | null; tone: 'success' | 'error' }) {
  if (!message) return null;
  return <p className={`quick-client-note ${tone}`}>{message}</p>;
}

export function TeachModeToggleButton({ teachMode, onTeachModeToggle }: OperatorControlsPanelProps) {
  return (
    <button
      type="button"
      className={`teach-mode-toggle ${teachMode ? 'is-on' : ''}`}
      aria-controls="coach-teach-mode-panel"
      aria-expanded={teachMode}
      aria-pressed={teachMode}
      onClick={onTeachModeToggle}
    >
      <span className="workout-command-icon" aria-hidden="true">
        <BookOpenCheck size={17} />
      </span>
      <span>
        <strong>{teachMode ? 'Teach Mode active' : 'Teach Mode'}</strong>
        <small>Review guidance</small>
      </span>
    </button>
  );
}

export function AccountControlsToggleButton({
  accountControlsOpen,
  onAccountControlsToggle,
}: AccountControlsToggleButtonProps) {
  return (
    <button
      type="button"
      className={`account-controls-toggle ${accountControlsOpen ? 'is-on' : ''}`}
      aria-controls="coach-owner-account-controls"
      aria-expanded={accountControlsOpen}
      aria-pressed={accountControlsOpen}
      onClick={onAccountControlsToggle}
    >
      <span className="workout-command-icon" aria-hidden="true">
        <ShieldCheck size={17} />
      </span>
      <span>
        <strong>{accountControlsOpen ? 'Owner Controls open' : 'Owner Controls'}</strong>
        <small>Test accounts + lifecycle</small>
      </span>
    </button>
  );
}

export function ClientSetupToggleButton({
  clientSetupOpen,
  onClientSetupToggle,
}: ClientSetupToggleButtonProps) {
  return (
    <button
      type="button"
      className={`client-setup-toggle teach-mode-toggle ${clientSetupOpen ? 'is-on' : ''}`}
      aria-controls="coach-client-setup-panel"
      aria-expanded={clientSetupOpen}
      aria-pressed={clientSetupOpen}
      onClick={onClientSetupToggle}
    >
      <span className="workout-command-icon" aria-hidden="true">
        <UserPlus size={17} />
      </span>
      <span>
        <strong>{clientSetupOpen ? 'Client setup open' : 'Client setup'}</strong>
        <small>Stage a quick client</small>
      </span>
    </button>
  );
}

export function OperatorControlsPanel({ teachMode, onTeachModeToggle }: OperatorControlsPanelProps) {
  if (!teachMode) return null;

  return (
    <section className="panel teach-mode-panel" id="coach-teach-mode-panel" aria-label="Teach Mode review guidance">
      <div className="section-title-row">
        <div>
          <h2 className="panel-title">Teach Mode</h2>
          <p className="panel-subtitle">Review-gated settings for Swan Coach output.</p>
        </div>
        <ShieldCheck size={19} aria-hidden="true" />
      </div>
      <div className="teach-mode-panel-actions">
        <p className="small-copy">
          Review blockers, confirm selected client context, then approve, revise, or hold the prepared recommendation.
        </p>
        <button
          type="button"
          className="secondary-button"
          aria-label="Hide Teach Mode guidance"
          aria-pressed={teachMode}
          onClick={onTeachModeToggle}
        >
          Hide
        </button>
      </div>
    </section>
  );
}

export function QuickClientPanel({
  quickClientBusy,
  quickClientError,
  quickClientMessage,
  quickClientName,
  quickClientSource,
  onQuickClientNameChange,
  onQuickClientSourceChange,
  onQuickClientSubmit,
}: QuickClientPanelProps) {
  return (
    <section className="panel" id="coach-client-setup-panel">
      <div className="section-title-row">
        <div>
          <h2 className="panel-title">Add client fast</h2>
          <p className="panel-subtitle">Name-only client record for staged audio and workout review.</p>
        </div>
        <UserPlus size={19} aria-hidden="true" />
      </div>
      <form className="quick-client-form" onSubmit={onQuickClientSubmit}>
        <label className="quick-client-field" htmlFor="quick-client-name">
          <span>Client name</span>
          <input
            id="quick-client-name"
            value={quickClientName}
            onChange={(event) => onQuickClientNameChange(event.target.value)}
            placeholder="First Last"
            autoComplete="off"
          />
        </label>
        <label className="quick-client-field" htmlFor="quick-client-source">
          <span>Client source</span>
          <select
            id="quick-client-source"
            value={quickClientSource}
            onChange={(event) => onQuickClientSourceChange(event.target.value as CoachCommandClientSource)}
          >
            <option value="move_fitness">Move Fitness</option>
            <option value="swanstudios">SwanStudios</option>
            <option value="external">External</option>
          </select>
        </label>
        <button type="submit" className="primary-button quick-client-submit" disabled={quickClientBusy}>
          <UserPlus size={16} aria-hidden="true" />
          {quickClientBusy ? 'Adding client...' : 'Add client'}
        </button>
        <QuickClientNote message={quickClientMessage} tone="success" />
        <QuickClientNote message={quickClientError} tone="error" />
      </form>
    </section>
  );
}

export function QueueSnapshotPanel({ queueHealthRows, rightRailItems }: QueueSnapshotPanelProps) {
  return (
    <section className="panel">
      <div className="section-title-row">
        <div>
          <h2 className="panel-title">Queue snapshot</h2>
          <p className="panel-subtitle">Live intake pressure and ready review work.</p>
        </div>
        <Activity size={19} aria-hidden="true" />
      </div>
      <ul className="health-list">
        {queueHealthRows.map((row) => (
          <li className="health-item item-row" key={row.label}>
            <span>{row.label}</span>
            <span className={`status-pill ${row.tone}`}>{row.value}</span>
          </li>
        ))}
      </ul>
      <div className="section-title-row compact-section-title">
        <h3 className="panel-title">Ready drafts and holds</h3>
        <FileCheck2 size={18} aria-hidden="true" />
      </div>
      <ul className="draft-list">
        {rightRailItems.map((item) => (
          <li className="draft-item" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
