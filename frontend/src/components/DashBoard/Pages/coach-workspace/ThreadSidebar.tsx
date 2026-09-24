/**
 * Blueprint: ThreadSidebar
 * Parent: CoachWorkspacePage. The conversation list (Codex / Claude Code style):
 * New chat, "Waiting on you" (the review queue by kind — unified design), search,
 * threads grouped by recency, and a short footer of the places a coach jumps
 * to from a conversation (Schedule, Logger).
 * Docked in operator-grid ≥768px; a left sheet everywhere else.
 * It takes NO controller rail ref: the legacy drawer effect treats a ref'd rail
 * with no data-drawer as a closed dialog and makes it aria-hidden + inert
 * (brain-v4 hostile review #1). The workspace panels own this sheet.
 */
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AudioLines, CalendarDays, ClipboardList, Dumbbell, FileCheck2, Inbox, MessageSquarePlus, Search, X } from 'lucide-react';
import { SidebarRoot } from './CoachWorkspace.panels.styles';
import { groupThreads, threadWhen } from './threadGroups';
import { useStableThreadList } from './useStableThreadList';
import { getConversationTitle } from '../coach-assistant/CoachCommandCenter.logic';
import type { CoachWorkspaceModel } from './useCoachWorkspaceModel';

type Props = { model: CoachWorkspaceModel };

const WAITING = [
  { section: 'intake', label: 'Intake to review', Icon: ClipboardList },
  { section: 'audio', label: 'Audio to log', Icon: AudioLines },
  { section: 'drafts', label: 'Drafts to approve', Icon: FileCheck2 },
] as const;

const ThreadSidebar: React.FC<Props> = ({ model }) => {
  const { controller, panels, isClientMode } = model;
  const searching = controller.threadSearch.trim().length > 0;
  const actorKey = model.user ? `${model.user.id}:${model.user.role}` : null;
  // Only a selection still in flight is "loading"; a failed one is not (the header says so).
  const settling = ['unadmitted', 'checking', 'committing'].includes(controller.selectionPhase);
  const refreshing = settling || ((controller.selectionPhase === 'ready' || isClientMode) && controller.conversationsRefreshing);
  const failed = controller.conversationListFailed && (controller.selectionPhase === 'ready' || isClientMode);
  const list = useStableThreadList(controller.coachThreads, actorKey, searching, refreshing, failed);
  const groups = useMemo(() => groupThreads(list.threads), [list.threads]);
  const holds = isClientMode ? [] : controller.queueHealthRows.filter((row) => row.tone !== 'ready' && Number(row.value) > 0);

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
      {!isClientMode ? (
        <section className="ws-waiting" aria-labelledby="ws-waiting-title">
          <h3 className="ws-group-label" id="ws-waiting-title">
            <Inbox size={13} aria-hidden="true" /> Waiting on you
            {model.reviewTotal ? <span className="ws-count" aria-label={`${model.reviewTotal} in total`}>{model.reviewTotal}</span> : null}
          </h3>
          <ul>
            {WAITING.map(({ section, label, Icon }) => (
              <li key={section}>
                <button
                  type="button"
                  className="ws-wait-row"
                  data-empty={model.counts[section] ? undefined : 'true'}
                  aria-current={model.view === 'review' && model.reviewSection === section ? 'true' : undefined}
                  onClick={() => { model.openReview(section); panels.afterThreadPick(); }}
                >
                  <Icon size={15} aria-hidden="true" />
                  <span>{label}</span>
                  <b>{model.counts[section]}</b>
                </button>
              </li>
            ))}
          </ul>
          {holds.length ? <p className="ws-side-empty" data-tone="warn">{holds.map((row) => `${row.value} ${row.label.toLowerCase()}`).join(' · ')}</p> : null}
          {model.nextActionLabel ? <p className="ws-side-empty">Next: {model.nextActionLabel}</p> : null}
        </section>
      ) : null}
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
      <div className="ws-thread-list" aria-busy={refreshing || undefined} data-refreshing={list.refreshing || undefined}>
        {failed ? (
          <div role="status">
            <p className="ws-side-empty">{list.threads.length ? "Couldn't refresh conversations. Showing the last loaded list." : "Couldn't load conversations."}</p>
            <button type="button" className="ws-side-link" onClick={controller.retryConversations}>Retry conversations</button>
          </div>
        ) : null}
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
            {failed ? '' : searching ? 'No conversation matches that search.' : refreshing ? 'Loading conversations…' : 'No conversations yet. Anything you ask starts one.'}
          </p>
        )}
      </div>
      <div className="ws-side-foot">
        <Link className="ws-side-link" to={model.scheduleRoute}>
          <CalendarDays size={16} aria-hidden="true" /> {model.scheduleRole === 'admin' ? 'Master schedule' : 'Schedule'}
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
