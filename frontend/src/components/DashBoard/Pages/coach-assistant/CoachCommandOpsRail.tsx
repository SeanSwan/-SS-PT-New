import React from 'react';
import { Activity, FileCheck2, MessageSquare, ShieldCheck, UserPlus } from 'lucide-react';

import type { CoachCommandClientSource } from '../../../../services/coachCommandClientService';
import type { DrawerSide, QueueHealthRow } from './CoachCommandCenter.types';

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
  teachMode: boolean;
  onQuickClientNameChange: (value: string) => void;
  onQuickClientSourceChange: (value: CoachCommandClientSource) => void;
  onQuickClientSubmit: (event: React.FormEvent) => void;
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
  teachMode,
  onQuickClientNameChange,
  onQuickClientSourceChange,
  onQuickClientSubmit,
  onTeachModeToggle,
}) => (
  <aside
    id="coach-command-ops"
    className={`right-rail glass ${drawer === 'right' ? 'is-open' : ''}`}
    ref={railRef}
    data-drawer="right"
    aria-label="Coach operations rail"
  >
    <section className="panel">
      <div className="section-title-row">
        <div>
          <h2 className="panel-title">Teach Mode</h2>
          <p className="panel-subtitle">Reusable coaching logic, not client-facing output.</p>
        </div>
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
      <p className="small-copy">Teach Mode available for exercise substitutions, cueing patterns, and plan rationale.</p>
    </section>

    <section className="panel">
      <div className="section-title-row">
        <h2 className="panel-title">Next operator action</h2>
        <ShieldCheck size={19} aria-hidden="true" />
      </div>
      <p className="small-copy">
        Review blockers, confirm selected client context, then approve, revise, or hold the prepared recommendation.
      </p>
    </section>

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
        {quickClientMessage ? <p className="quick-client-note success">{quickClientMessage}</p> : null}
        {quickClientError ? <p className="quick-client-note error">{quickClientError}</p> : null}
      </form>
    </section>

    <section className="panel">
      <div className="section-title-row">
        <h2 className="panel-title">Queue health</h2>
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
    </section>

    <section className="panel">
      <div className="section-title-row">
        <h2 className="panel-title">Ready drafts and holds</h2>
        <FileCheck2 size={19} aria-hidden="true" />
      </div>
      <ul className="draft-list">
        {rightRailItems.map((item) => (
          <li className="draft-item" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </section>

    <section className="panel">
      <div className="section-title-row">
        <h2 className="panel-title">Use Nutrition Context</h2>
        <MessageSquare size={19} aria-hidden="true" />
      </div>
      <p className="small-copy">
        Nutrition context can be included in draft reasoning when it is relevant to the selected client and remains inside review.
      </p>
    </section>
  </aside>
);

export default CoachCommandOpsRail;
