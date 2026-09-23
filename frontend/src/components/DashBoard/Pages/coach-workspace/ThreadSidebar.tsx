/**
 * Blueprint: ThreadSidebar
 * Parent: CoachWorkspacePage. The conversation list (Codex / Claude Code style):
 * New chat, search, threads grouped by recency, and a short footer of the
 * places a coach jumps to from a conversation (Review, Schedule, Logger).
 * Docked in operator-grid ≥768px; a left sheet everywhere else.
 * It takes NO controller rail ref: the legacy drawer effect treats a ref'd rail
 * with no data-drawer as a closed dialog and makes it aria-hidden + inert
 * (brain-v4 hostile review #1). The workspace panels own this sheet.
 */
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Dumbbell, Inbox, MessageSquarePlus, Search, X } from 'lucide-react';
import { SidebarRoot } from './CoachWorkspace.panels.styles';
import { groupThreads, threadWhen } from './threadGroups';
import { getConversationTitle } from '../coach-assistant/CoachCommandCenter.logic';
import type { CoachWorkspaceModel } from './useCoachWorkspaceModel';

type Props = { model: CoachWorkspaceModel };

const ThreadSidebar: React.FC<Props> = ({ model }) => {
  const { controller, panels, isClientMode } = model;
  const groups = useMemo(() => groupThreads(controller.coachThreads), [controller.coachThreads]);
  const searching = controller.threadSearch.trim().length > 0;

  const pick = (thread: (typeof controller.coachThreads)[number]) => {
    controller.handleThreadSelect(thread);
    model.setView('chat');
    panels.afterThreadPick();
  };
  const startNew = () => {
    controller.handleNewThread();
    model.setView('chat');
    panels.afterThreadPick();
  };

  return (
    <SidebarRoot className="ws-sidebar" id="ws-sidebar" aria-label="Coach conversations">
      <div className="ws-side-head">
        <button type="button" className="ws-new-chat" onClick={startNew}>
          <MessageSquarePlus size={17} aria-hidden="true" />
          New chat
        </button>
        <button type="button" className="ws-icon-btn ws-panel-close" aria-label="Close conversations" onClick={panels.closeSheets}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <label className="ws-search">
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          value={controller.threadSearch}
          onChange={(event) => controller.setThreadSearch(event.target.value)}
          placeholder="Search conversations"
          aria-label="Search conversations"
        />
      </label>
      <div className="ws-thread-list">
        {groups.length ? groups.map((group) => (
          <section key={group.label} aria-label={group.label}>
            <h3 className="ws-group-label">{group.label}</h3>
            <ul>
              {group.threads.map((thread) => (
                <li key={thread.id}>
                  <button
                    type="button"
                    className="ws-thread-row"
                    aria-current={thread.id === controller.activeThreadId ? 'true' : undefined}
                    onClick={() => pick(thread)}
                  >
                    <span className="ws-thread-name">{getConversationTitle(thread)}</span>
                    <span className="ws-thread-sub">
                      {threadWhen(thread)}{thread.messageCount ? ` · ${thread.messageCount} messages` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )) : (
          <p className="ws-side-empty">
            {searching ? 'No conversation matches that search.' : 'No conversations yet. Anything you ask starts one.'}
          </p>
        )}
      </div>
      <div className="ws-side-foot">
        {!isClientMode ? (
          <button type="button" className="ws-side-link" onClick={() => model.openReview('intake')}>
            <Inbox size={16} aria-hidden="true" /> Review queue
            {model.reviewTotal ? <span className="ws-count" aria-label={`${model.reviewTotal} waiting`}>{model.reviewTotal}</span> : null}
          </button>
        ) : null}
        <Link className="ws-side-link" to={model.scheduleRoute}>
          <CalendarDays size={16} aria-hidden="true" /> {model.userRole === 'admin' ? 'Master schedule' : 'Schedule'}
        </Link>
        {model.workoutLoggerRoute ? (
          <Link className="ws-side-link" to={model.workoutLoggerRoute}>
            <Dumbbell size={16} aria-hidden="true" /> {isClientMode ? 'Log today' : 'Workout logger'}
          </Link>
        ) : null}
      </div>
    </SidebarRoot>
  );
};

export default ThreadSidebar;
