import React from 'react';
import { Plus, Search } from 'lucide-react';

import type {
  ClientContextTile,
  CoachThreadSummary,
  DrawerSide,
} from './CoachCommandCenter.types';
import { formatThreadMeta, getConversationTitle } from './CoachCommandCenter.logic';

type CoachCommandLeftRailProps = {
  activeThreadId: number | null;
  clientContextTiles: ClientContextTile[];
  coachThreads: CoachThreadSummary[];
  drawer: DrawerSide | null;
  railRef: React.RefObject<HTMLElement>;
  selectedClientLabel: string;
  threadSearch: string;
  onNewThread: () => void;
  onThreadSearchChange: (value: string) => void;
  onThreadSelect: (thread: CoachThreadSummary) => void;
};

const CoachCommandLeftRail: React.FC<CoachCommandLeftRailProps> = ({
  activeThreadId,
  clientContextTiles,
  coachThreads,
  drawer,
  railRef,
  selectedClientLabel,
  threadSearch,
  onNewThread,
  onThreadSearchChange,
  onThreadSelect,
}) => (
  <aside
    id="coach-command-threads"
    className={`left-rail glass ${drawer === 'left' ? 'is-open' : ''}`}
    ref={railRef}
    data-drawer="left"
    aria-label="Coach threads and selected client context"
  >
    <section className="brand-block">
      <span className="route-chip">admin / coach-assistant</span>
      <div>
        <h2 className="brand-title">Swan Coach Command Center</h2>
        <p className="brand-subtitle">Review-gated command console for intake, drafts, holds, and approval work.</p>
      </div>
      <button type="button" className="primary-button new-thread" onClick={onNewThread}>
        <Plus size={16} aria-hidden="true" />
        New Coach Thread
      </button>
    </section>

    <section className="rail-section">
      <label className="search-wrap" htmlFor="coach-thread-search">
        <Search size={16} aria-hidden="true" />
        <input
          id="coach-thread-search"
          type="search"
          placeholder="Search coach threads..."
          value={threadSearch}
          onChange={(event) => onThreadSearchChange(event.target.value)}
        />
      </label>
    </section>

    <section className="client-card">
      <div className="client-name-row">
        <div>
          <p className="panel-subtitle">Selected client context</p>
          <strong>{selectedClientLabel}</strong>
        </div>
        <span className="status-pill processing">approval gate</span>
      </div>
      <div className="context-grid">
        {clientContextTiles.map((tile) => (
          <span className="context-item" key={tile.label}>
            <span className="panel-subtitle">{tile.label}</span>
            <span className="context-value">{tile.value}</span>
          </span>
        ))}
      </div>
    </section>

    <section className="rail-section">
      <div className="section-title-row">
        <h3 className="panel-title">Threads</h3>
        <span className="mini-chip cyan">{coachThreads.length} live</span>
      </div>
      <ul className="thread-list">
        {coachThreads.length ? (
          coachThreads.map((thread) => (
            <li key={thread.id}>
              <button
                type="button"
                className={`thread-item ${thread.id === activeThreadId ? 'is-active' : ''}`}
                aria-current={thread.id === activeThreadId ? 'true' : undefined}
                onClick={() => onThreadSelect(thread)}
              >
                <span className="thread-title">{getConversationTitle(thread)}</span>
                <span className="thread-meta">{formatThreadMeta(thread)}</span>
              </button>
            </li>
          ))
        ) : (
          <li className="mode-item">
            <span className="mode-title">No coach threads yet</span>
            <span className="thread-meta">Start a New Coach Thread from the command dock.</span>
          </li>
        )}
      </ul>
    </section>

  </aside>
);

export default CoachCommandLeftRail;
