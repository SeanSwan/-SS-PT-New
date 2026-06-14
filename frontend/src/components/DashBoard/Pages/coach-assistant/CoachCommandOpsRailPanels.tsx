/**
 * COMPONENT: CoachCommandOpsRailPanels
 * PURPOSE: Panel-level pieces for the Coach Command Center operations rail.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  Dumbbell,
  FileAudio,
  FileCheck2,
  Inbox,
  MessageSquareText,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import type { CoachCommandClientSource } from '../../../../services/coachCommandClientService';
import type { QueueHealthRow } from './CoachCommandCenter.types';

const CLIENT_PICKER_ROUTE = '/dashboard/admin/client-management?intent=log_workout';

type WorkoutCommandPanelProps = {
  selectedClientLabel: string;
  workoutLoggerRoute: string | null;
  workoutLoggerScopeLabel: string | null;
  workoutPlannerRoute: string | null;
  onOpenIntake: () => void;
  onOpenPlaud: () => void;
  onStageWorkoutLog: () => void;
};

type OperatorControlsPanelProps = {
  teachMode: boolean;
  onTeachModeToggle: () => void;
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

export function WorkoutCommandPanel({
  selectedClientLabel,
  workoutLoggerRoute,
  workoutLoggerScopeLabel,
  workoutPlannerRoute,
  onOpenIntake,
  onOpenPlaud,
  onStageWorkoutLog,
}: WorkoutCommandPanelProps) {
  const hasLoggerRoute = Boolean(workoutLoggerRoute);
  const scopeLabel = hasLoggerRoute ? (workoutLoggerScopeLabel || selectedClientLabel) : 'Select a client route';

  return (
    <section className="panel workout-command-panel">
      <div className="section-title-row">
        <div>
          <h2 className="panel-title">Workout command</h2>
          <p className="panel-subtitle">The fastest route from Coach talk to training action.</p>
        </div>
        <Dumbbell size={19} aria-hidden="true" />
      </div>

      <div className={`workout-command-scope ${hasLoggerRoute ? 'is-ready' : ''}`}>
        <span className="workout-command-scope-kicker">Active scope</span>
        <strong>{scopeLabel}</strong>
      </div>

      <div className="workout-command-primary-grid" aria-label="Priority coach actions">
        <button
          type="button"
          className="workout-command-card mission full"
          onClick={onOpenIntake}
          aria-label="Review next intake"
        >
          <span className="workout-command-icon"><Inbox size={18} aria-hidden="true" /></span>
          <span>
            <strong>Review next</strong>
            <small>Open intake queue</small>
          </span>
          <ArrowRight size={17} aria-hidden="true" />
        </button>

        <button
          type="button"
          className="workout-command-card"
          onClick={onStageWorkoutLog}
          aria-label="Draft workout log prompt"
        >
          <span className="workout-command-icon"><MessageSquareText size={18} aria-hidden="true" /></span>
          <span>
            <strong>Draft log</strong>
            <small>Stage prompt only</small>
          </span>
        </button>

        <button type="button" className="workout-command-card" onClick={onOpenPlaud} aria-label="Import PLAUD audio">
          <span className="workout-command-icon"><FileAudio size={18} aria-hidden="true" /></span>
          <span>
            <strong>PLAUD</strong>
            <small>Import audio</small>
          </span>
        </button>
      </div>

      <div className="workout-command-route-grid" aria-label="Selected client workout routes">
        {workoutLoggerRoute ? (
          <Link className="workout-command-card route" to={workoutLoggerRoute} aria-label="Open Logger">
            <span className="workout-command-icon"><CalendarCheck size={18} aria-hidden="true" /></span>
            <span>
              <strong>Open log</strong>
              <small>{workoutPlannerRoute ? 'Selected client' : 'Your account'}</small>
            </span>
          </Link>
        ) : null}

        {workoutPlannerRoute ? (
          <Link className="workout-command-card route" to={workoutPlannerRoute} aria-label="Open Planner">
            <span className="workout-command-icon"><Dumbbell size={18} aria-hidden="true" /></span>
            <span>
              <strong>Open builder</strong>
              <small>Create plan</small>
            </span>
          </Link>
        ) : null}

        {!workoutPlannerRoute ? (
          <Link
            className="workout-command-card route full"
            to={CLIENT_PICKER_ROUTE}
            aria-label="Pick a client for workout logging"
          >
            <span className="workout-command-icon"><UserPlus size={18} aria-hidden="true" /></span>
            <span>
              <strong>Pick client</strong>
              <small>Open Client Hub, then log or build</small>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export function OperatorControlsPanel({ teachMode, onTeachModeToggle }: OperatorControlsPanelProps) {
  return (
    <section className="panel">
      <div className="section-title-row">
        <div>
          <h2 className="panel-title">Operator controls</h2>
          <p className="panel-subtitle">Review-gated settings for Swan Coach output.</p>
        </div>
        <ShieldCheck size={19} aria-hidden="true" />
      </div>
      <div className="item-row">
        <span>Teach Mode</span>
        <button
          type="button"
          className={`switch ${teachMode ? 'is-on' : ''}`}
          aria-label="Toggle Teach Mode"
          aria-pressed={teachMode}
          onClick={onTeachModeToggle}
        >
          <span />
        </button>
      </div>
      <p className="small-copy">
        Review blockers, confirm selected client context, then approve, revise, or hold the prepared recommendation.
      </p>
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
    <section className="panel">
      <div className="section-title-row">
        <div>
          <h2 className="panel-title">Quick client capture</h2>
          <p className="panel-subtitle">Name-only client stub for staged PLAUD and workout review.</p>
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
          {quickClientBusy ? 'Creating stub...' : 'Create stub client'}
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
