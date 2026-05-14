/**
 * FILE: CoachCommandCenterPage.tsx
 * PURPOSE: Admin-only Swan Coach Command Center shell based on the accepted Open Design prototype.
 *
 * The page is intentionally review-gated: Swan Coach prepares operator drafts,
 * blockers, and recommendations, while final writes remain an operator action.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Brain,
  FileAudio,
  FileCheck2,
  MessageSquare,
  Mic,
  PanelLeftOpen,
  PanelRightOpen,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import { CommandCenterShell } from './CoachCommandCenter.styles';
import {
  COMMAND_THREADS,
  COMMAND_WORKFLOWS,
  INITIAL_COMMAND_LOGS,
  type CommandLogEntry,
  type CommandThread,
} from './CoachCommandCenter.data';

type DrawerSide = 'left' | 'right';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const statusMetrics = [
  { label: 'Coach intake queue', value: '18', note: '5 ready, 7 holds, 3 parsing, 3 recovery', accent: '#60c0f0' },
  { label: 'Queue health', value: '91%', note: 'Review SLA inside target', accent: '#47e89a' },
  { label: 'Ready drafts', value: '5', note: 'Final writes blocked until approval', accent: '#c6a84b' },
  { label: 'Failed intake recovery', value: '3', note: 'Audio/transcript recovery lane open', accent: '#ff6d85' },
];

const intakeStates = [
  { label: 'Client confirmation holds', value: '2', tone: 'hold' },
  { label: 'Clarification holds', value: '5', tone: 'hold' },
  { label: 'Duplicate-risk holds', value: '3', tone: 'stale' },
  { label: 'Transcript upload/parsing', value: '82%', tone: 'processing' },
];

const dossierTiles = [
  { label: 'Active intake dossier', value: 'PLAUD review', note: 'Audio parsing, notes attached' },
  { label: 'Selected client context', value: 'Client A-104', note: '30-day training and nutrition context' },
  { label: 'Attachments', value: '4 files', note: 'Audio, transcript, session note, draft summary' },
  { label: 'Operator approval', value: 'Required', note: 'Prepared recommendations only' },
];

const rightRailItems = [
  'Ready draft: Client C-309 4-week block',
  'Client confirmation hold: Client A-104',
  'Clarification hold: missing shoulder note',
  'Duplicate-risk hold: Client B-217',
];

const CoachCommandCenterPage: React.FC = () => {
  const [activeThreadId, setActiveThreadId] = useState(COMMAND_THREADS[0].id);
  const [commandText, setCommandText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(COMMAND_THREADS[0].clientStatus);
  const [logs, setLogs] = useState<CommandLogEntry[]>(INITIAL_COMMAND_LOGS);
  const [voiceActive, setVoiceActive] = useState(false);
  const [teachMode, setTeachMode] = useState(true);
  const [drawer, setDrawer] = useState<DrawerSide | null>(null);

  const shellRef = useRef<HTMLDivElement>(null);
  const commandFormRef = useRef<HTMLFormElement>(null);
  const commandTextRef = useRef<HTMLTextAreaElement>(null);
  const leftRailRef = useRef<HTMLElement>(null);
  const rightRailRef = useRef<HTMLElement>(null);
  const lastDrawerTriggerRef = useRef<HTMLButtonElement | null>(null);

  const activeThread = useMemo(
    () => COMMAND_THREADS.find((thread) => thread.id === activeThreadId) ?? COMMAND_THREADS[0],
    [activeThreadId],
  );

  const focusComposer = (value?: string, status?: string) => {
    if (value !== undefined) setCommandText(value);
    if (status) setSelectedStatus(status);
    window.setTimeout(() => commandTextRef.current?.focus(), 0);
  };

  const closeDrawer = (restoreFocus = true) => {
    setDrawer(null);
    if (restoreFocus) window.setTimeout(() => lastDrawerTriggerRef.current?.focus(), 0);
  };

  const openDrawer = (side: DrawerSide, event: React.MouseEvent<HTMLButtonElement>) => {
    lastDrawerTriggerRef.current = event.currentTarget;
    setDrawer(side);
  };

  const addLog = (entry: Omit<CommandLogEntry, 'id'>) => {
    setLogs((current) => [
      {
        ...entry,
        id: `log-${Date.now()}-${current.length}`,
      },
      ...current,
    ]);
  };

  const handleThreadSelect = (thread: CommandThread) => {
    setActiveThreadId(thread.id);
    setSelectedStatus(thread.clientStatus);
    closeDrawer(false);
    focusComposer(thread.prompt, thread.clientStatus);
  };

  const handleWorkflowSelect = (prompt: string) => {
    closeDrawer(false);
    focusComposer(prompt, `${activeThread.title} - command staged`);
  };

  const handleNewThread = () => {
    closeDrawer(false);
    focusComposer('Start a new review-gated coach thread for the selected client.', 'New coach thread staged');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = commandText.trim();
    if (!trimmed) return;

    addLog({
      actor: 'operator',
      label: 'operator command',
      body: trimmed,
    });
    addLog({
      actor: 'coach',
      label: 'prepared draft',
      body: 'Prepared a review package with blockers, source context, and approval steps. No final write is made until the operator approves it.',
      attachments: ['draft_review_packet.md', 'approval gate remains locked'],
    });
    setCommandText('');
    setSelectedStatus('Prepared draft awaiting operator approval');
  };

  const handleAttach = () => {
    setSelectedStatus('Attachment staged for transcript/audio review');
    addLog({
      actor: 'system',
      label: 'attachment staged',
      body: 'Attachment lane opened for audio, transcript, or note review. Parsed content remains blocked from final write until approved.',
      attachments: ['attachment pending'],
    });
    focusComposer();
  };

  const handleVoice = () => {
    setVoiceActive((current) => !current);
    setSelectedStatus(voiceActive ? 'Voice input paused' : 'Voice input listening');
    focusComposer();
  };

  const handleReadback = () => {
    setSelectedStatus('Readback prepared for operator review');
    addLog({
      actor: 'coach',
      label: 'readback',
      body: 'Readback prepared from the active intake dossier, queue state, and selected client context.',
      attachments: ['readback pending operator review'],
    });
    focusComposer();
  };

  useEffect(() => {
    const syncDockSpace = () => {
      const dockHeight = commandFormRef.current?.getBoundingClientRect().height ?? 0;
      shellRef.current?.style.setProperty('--mobile-dock-space', `${Math.ceil(dockHeight + 18)}px`);
    };

    syncDockSpace();
    window.addEventListener('resize', syncDockSpace);
    return () => window.removeEventListener('resize', syncDockSpace);
  }, [commandText, drawer]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;

    const mainStage = shell.querySelector<HTMLElement>('.main-stage');
    const leftRail = leftRailRef.current as (HTMLElement & { inert?: boolean }) | null;
    const rightRail = rightRailRef.current as (HTMLElement & { inert?: boolean }) | null;
    const main = mainStage as (HTMLElement & { inert?: boolean }) | null;

    [leftRail, rightRail].forEach((rail) => {
      if (!rail) return;
      const isMobile = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 860px)').matches;
      rail.setAttribute('role', 'dialog');
      rail.setAttribute('aria-modal', drawer ? 'true' : 'false');
      rail.inert = drawer ? rail.dataset.drawer !== drawer : isMobile;
    });

    if (main) {
      main.inert = Boolean(drawer);
      main.setAttribute('aria-hidden', drawer ? 'true' : 'false');
    }

    if (!drawer) return undefined;

    const rail = drawer === 'left' ? leftRailRef.current : rightRailRef.current;
    window.setTimeout(() => rail?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDrawer();
        return;
      }

      if (event.key !== 'Tab' || !rail) return;
      const focusable = Array.from(rail.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute('disabled') && element.offsetParent !== null,
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawer]);

  useEffect(() => {
    return () => {
      [leftRailRef.current, rightRailRef.current, shellRef.current?.querySelector<HTMLElement>('.main-stage')].forEach(
        (node) => {
          if (!node) return;
          (node as HTMLElement & { inert?: boolean }).inert = false;
          node.removeAttribute('aria-hidden');
        },
      );
    };
  }, []);

  return (
    <CommandCenterShell ref={shellRef}>
      <button
        type="button"
        className={`drawer-scrim ${drawer ? 'is-open' : ''}`}
        aria-label="Close command drawers"
        onClick={() => closeDrawer()}
      />

      <div className="app-shell">
        <aside
          id="coach-command-threads"
          className={`left-rail glass ${drawer === 'left' ? 'is-open' : ''}`}
          ref={leftRailRef}
          data-drawer="left"
          aria-label="Coach threads and command modes"
        >
          <section className="brand-block">
            <span className="route-chip">admin / coach-assistant</span>
            <div>
              <h2 className="brand-title">Swan Coach Command Center</h2>
              <p className="brand-subtitle">Review-gated command console for intake, drafts, holds, and approval work.</p>
            </div>
            <button type="button" className="primary-button new-thread" onClick={handleNewThread}>
              <Plus size={16} aria-hidden="true" />
              New Coach Thread
            </button>
          </section>

          <section className="rail-section">
            <label className="search-wrap" htmlFor="coach-thread-search">
              <Search size={16} aria-hidden="true" />
              <input id="coach-thread-search" type="search" placeholder="Search coach threads..." />
            </label>
          </section>

          <section className="client-card">
            <div className="client-name-row">
              <div>
                <p className="panel-subtitle">Selected client context</p>
                <strong>Client A-104</strong>
              </div>
              <span className="status-pill processing">approval gate</span>
            </div>
            <div className="context-grid">
              <span className="context-item">
                <span className="panel-subtitle">Last 30 days</span>
                <span className="context-value">12 sessions</span>
              </span>
              <span className="context-item">
                <span className="panel-subtitle">Nutrition</span>
                <span className="context-value">context on</span>
              </span>
            </div>
          </section>

          <section className="rail-section">
            <div className="section-title-row">
              <h3 className="panel-title">Threads</h3>
              <span className="mini-chip cyan">3 live</span>
            </div>
            <ul className="thread-list">
              {COMMAND_THREADS.map((thread) => (
                <li key={thread.id}>
                  <button
                    type="button"
                    className={`thread-item ${thread.id === activeThreadId ? 'is-active' : ''}`}
                    aria-current={thread.id === activeThreadId ? 'true' : undefined}
                    onClick={() => handleThreadSelect(thread)}
                  >
                    <span className="thread-title">{thread.title}</span>
                    <span className="thread-meta">{thread.meta}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rail-section">
            <h3 className="panel-title">Coach Command Modes</h3>
            <ul className="mode-list">
              <li className="mode-item">
                <span className="mode-title">Prepare draft</span>
                <span className="thread-meta">Draft only, approval required</span>
              </li>
              <li className="mode-item">
                <span className="mode-title">Review intake</span>
                <span className="thread-meta">PLAUD/audio, transcript, and failed recovery</span>
              </li>
              <li className="mode-item">
                <span className="mode-title">Resolve holds</span>
                <span className="thread-meta">Confirmation, clarification, duplicate risk</span>
              </li>
            </ul>
          </section>
        </aside>

        <main className="main-stage" aria-label="Swan Coach command workspace">
          <div className="mobile-topbar">
            <button
              type="button"
              className="mobile-drawer-button"
              aria-label="Open coach threads"
              aria-controls="coach-command-threads"
              aria-expanded={drawer === 'left'}
              onClick={(event) => openDrawer('left', event)}
            >
              <PanelLeftOpen size={18} aria-hidden="true" />
            </button>
            <div className="mobile-topbar-title">
              <h1>Swan Coach Command Center</h1>
              <p>{selectedStatus}</p>
            </div>
            <button
              type="button"
              className="mobile-drawer-button"
              aria-label="Open operations rail"
              aria-controls="coach-command-ops"
              aria-expanded={drawer === 'right'}
              onClick={(event) => openDrawer('right', event)}
            >
              <PanelRightOpen size={18} aria-hidden="true" />
            </button>
          </div>

          <section className="command-banner glass">
            <div className="banner-content">
              <div className="banner-copy">
                <div className="banner-top">
                  <span className="mini-chip cyan">review-gated operator console</span>
                  <span className="mini-chip gold">final writes require approval</span>
                </div>
                <h1>Swan Coach Command Center</h1>
                <p>
                  Command observatory for intake review, PLAUD/audio parsing, prepared drafts, client holds,
                  and Teach Mode work. Swan Coach prepares the plan; the operator approves the final write.
                </p>
                <div className="banner-actions">
                  <button type="button" className="primary-button" onClick={() => handleWorkflowSelect('Review next intake')}>
                    <FileAudio size={17} aria-hidden="true" />
                    Review next intake
                  </button>
                  <button type="button" className="secondary-button" onClick={handleReadback}>
                    <Volume2 size={17} aria-hidden="true" />
                    Readback dossier
                  </button>
                  <button type="button" className="ghost-button" onClick={() => setTeachMode((current) => !current)}>
                    <Brain size={17} aria-hidden="true" />
                    Teach Mode
                  </button>
                </div>
              </div>
              <div className="banner-orbit" aria-label="Queue health overview">
                <span className="orbit-core" />
                <div className="orbit-readout">
                  intake queue: 18
                  <br />
                  ready drafts: 5
                  <br />
                  operator holds: 10
                </div>
              </div>
            </div>
          </section>

          <section className="queue-summary" aria-label="Coach intake queue health">
            {statusMetrics.map((metric) => (
              <article className="metric-card" style={{ '--accent-fill': metric.accent } as React.CSSProperties} key={metric.label}>
                <span className="panel-subtitle">{metric.label}</span>
                <strong className="metric-value">{metric.value}</strong>
                <span className="metric-note">{metric.note}</span>
              </article>
            ))}
          </section>

          <section className="content-grid">
            <article className="panel">
              <div className="section-title-row">
                <div>
                  <h2 className="panel-title">Active intake dossier</h2>
                  <p className="panel-subtitle">PLAUD/audio review, transcript parsing, and selected context.</p>
                </div>
                <span className="status-pill processing">parsing 82%</span>
              </div>
              <div className="dossier-main">
                {dossierTiles.map((tile) => (
                  <div className="dossier-tile" key={tile.label}>
                    <span className="panel-subtitle">{tile.label}</span>
                    <strong className="tile-value">{tile.value}</strong>
                    <span className="small-copy">{tile.note}</span>
                  </div>
                ))}
              </div>
              <div className="progress-track" aria-label="Transcript parsing progress">
                <span className="progress-fill" style={{ '--progress': '82%' } as React.CSSProperties} />
              </div>
            </article>

            <article className="panel">
              <div className="section-title-row">
                <div>
                  <h2 className="panel-title">Intake holds</h2>
                  <p className="panel-subtitle">Blocked states stay visible before approval.</p>
                </div>
                <AlertTriangle size={20} aria-hidden="true" />
              </div>
              <ul className="state-list">
                {intakeStates.map((state) => (
                  <li className="state-item item-row" key={state.label}>
                    <span className="item-title">{state.label}</span>
                    <span className={`status-pill ${state.tone}`}>{state.value}</span>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="panel">
            <div className="section-title-row">
              <div>
                <h2 className="panel-title">Start with a workflow</h2>
                <p className="panel-subtitle">Each workflow fills the command dock and waits for operator review.</p>
              </div>
              <span className="mini-chip purple">8 workflows</span>
            </div>
            <div className="workflow-grid">
              {COMMAND_WORKFLOWS.map((workflow) => (
                <button
                  type="button"
                  className="workflow-card"
                  key={workflow.id}
                  onClick={() => handleWorkflowSelect(workflow.prompt)}
                >
                  <span className={`mini-chip ${workflow.chip}`}>{workflow.label}</span>
                  <strong>{workflow.title}</strong>
                  <span>{workflow.copy}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="log-card">
            <div className="log-top">
              <div>
                <h2 className="panel-title">Command log</h2>
                <p className="panel-subtitle">Prepared recommendations, readbacks, attachments, and approval holds.</p>
              </div>
              <button type="button" className="ghost-button" onClick={() => setLogs(INITIAL_COMMAND_LOGS)}>
                <RefreshCw size={16} aria-hidden="true" />
                Reset
              </button>
            </div>
            <div className="log-stream" aria-live="polite">
              {logs.map((entry) => (
                <article className={`log-entry ${entry.actor}`} key={entry.id}>
                  <div className="log-meta">
                    <span>{entry.actor}</span>
                    <span>{entry.label}</span>
                  </div>
                  <p>{entry.body}</p>
                  {entry.attachments?.length ? (
                    <div className="attachment-row">
                      {entry.attachments.map((attachment) => (
                        <span className="attachment" key={attachment}>
                          {attachment}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <form className="composer mobile-command-dock" ref={commandFormRef} onSubmit={handleSubmit}>
            <div className="mobile-command-strip">
              <button
                type="button"
                aria-controls="coach-command-threads"
                aria-expanded={drawer === 'left'}
                onClick={(event) => openDrawer('left', event)}
              >
                Threads
              </button>
              <span className="mobile-command-client">{selectedStatus}</span>
              <button
                type="button"
                aria-controls="coach-command-ops"
                aria-expanded={drawer === 'right'}
                onClick={(event) => openDrawer('right', event)}
              >
                Ops
              </button>
            </div>
            <textarea
              ref={commandTextRef}
              value={commandText}
              onChange={(event) => setCommandText(event.target.value)}
              placeholder="Ask Swan Coach, paste notes, or attach audio/transcript..."
              aria-describedby="composerStatus"
            />
            <div className="composer-actions">
              <button type="button" className="secondary-button" onClick={handleAttach}>
                <Paperclip size={16} aria-hidden="true" />
                <span className="desktop-label">Attach</span>
                <span className="mobile-label">Attach</span>
              </button>
              <button
                type="button"
                className={`secondary-button ${voiceActive ? 'is-listening' : ''}`}
                aria-pressed={voiceActive}
                onClick={handleVoice}
              >
                <Mic size={16} aria-hidden="true" />
                <span className="desktop-label">{voiceActive ? 'Listening' : 'Mic'}</span>
                <span className="mobile-label">Mic</span>
              </button>
              <button type="button" className="secondary-button" onClick={handleReadback}>
                <Volume2 size={16} aria-hidden="true" />
                <span>Readback</span>
              </button>
              <button type="submit" className="primary-button">
                <ShieldCheck size={16} aria-hidden="true" />
                <span>Prepare</span>
              </button>
            </div>
            <span id="composerStatus" className="panel-subtitle">
              {selectedStatus}
            </span>
          </form>
        </main>

        <aside
          id="coach-command-ops"
          className={`right-rail glass ${drawer === 'right' ? 'is-open' : ''}`}
          ref={rightRailRef}
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
                onClick={() => setTeachMode((current) => !current)}
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
              <h2 className="panel-title">Queue health</h2>
              <Activity size={19} aria-hidden="true" />
            </div>
            <ul className="health-list">
              <li className="health-item item-row">
                <span>Ready drafts</span>
                <span className="status-pill ready">5</span>
              </li>
              <li className="health-item item-row">
                <span>Client confirmation holds</span>
                <span className="status-pill hold">2</span>
              </li>
              <li className="health-item item-row">
                <span>Clarification holds</span>
                <span className="status-pill hold">5</span>
              </li>
              <li className="health-item item-row">
                <span>Duplicate-risk holds</span>
                <span className="status-pill stale">3</span>
              </li>
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
      </div>
    </CommandCenterShell>
  );
};

export default CoachCommandCenterPage;
