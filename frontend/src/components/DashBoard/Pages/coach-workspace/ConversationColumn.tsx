/**
 * Blueprint: ConversationColumn
 * Parent: CoachWorkspacePage. The reading column: day dividers, turns, the live
 * "thinking" row, an honest empty state with starters, then the composer.
 * Scroll follows new replies only while the reader is near the bottom; reading
 * history is never yanked (a "New reply" pill appears instead). The latest entry
 * is mirrored into a polite live region for screen readers.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, CalendarClock, Dumbbell, Feather, Sparkles, UserRound } from 'lucide-react';
import { ConversationRoot, EmptyState, Thinking } from './CoachWorkspace.conversation.styles';
import { dayDividerIds } from '../coach-assistant/coachTranscriptDays';
import TurnEntry from './TurnEntry';
import WorkspaceComposer from './WorkspaceComposer';
import type { CoachWorkspaceModel } from './useCoachWorkspaceModel';

type Props = { model: CoachWorkspaceModel };

type Starter = { icon: typeof Dumbbell; title: string; hint: string; prompt: string; commandType?: string; needsClient?: boolean };

/** Read-only starters send the exact registry command in one tap; "Log" prefills. */
const STAFF_STARTERS: Starter[] = [
  { icon: CalendarClock, title: 'Brief my day', hint: "Today's sessions with attention flags", prompt: 'Brief my day', commandType: 'brief_my_day' },
  { icon: Sparkles, title: 'Who needs attention?', hint: 'At-risk clients, ranked', prompt: 'Who are my at-risk clients', commandType: 'at_risk_clients' },
  { icon: UserRound, title: 'Brief this client', hint: 'Cross-domain status for the selected client', prompt: 'Brief me on this client', commandType: 'brief_client', needsClient: true },
  { icon: Dumbbell, title: 'Log a workout', hint: 'Bench 4×8 at 185, rows 3×10…', prompt: "Log today's workout: " },
];
const CLIENT_STARTERS: Starter[] = [
  { icon: CalendarClock, title: "Today's workout", hint: 'What your plan says for today', prompt: "What's my workout today", commandType: 'my_workout_today' },
  { icon: Sparkles, title: 'How am I doing?', hint: 'Your progress this month', prompt: 'Show my progress', commandType: 'my_progress' },
  { icon: Dumbbell, title: 'Log today', hint: 'Tell me what you did', prompt: "Log today's workout: " },
];

const ConversationColumn: React.FC<Props> = ({ model }) => {
  const { controller, isClientMode } = model;
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const threadKeyRef = useRef<number | null>(null);
  const [unseen, setUnseen] = useState(false);
  const ordered = useMemo(() => [...controller.logs].reverse(), [controller.logs]);
  const dividers = useMemo(() => dayDividerIds(ordered), [ordered]);
  const latest = ordered[ordered.length - 1];
  const busy = controller.commandBusy;

  useEffect(() => {
    const el = scrollRef.current;
    const key = controller.activeThread?.id ?? null;
    const changed = threadKeyRef.current !== key;
    threadKeyRef.current = key;
    if (changed) nearBottomRef.current = true;
    if (!el) return;
    if (!ordered.length) { el.scrollTop = 0; return; } // the empty state reads from the top
    if (changed || nearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      nearBottomRef.current = true;
      setUnseen(false);
    } else if (ordered.length) {
      setUnseen(true);
    }
  }, [controller.activeThread?.id, busy, ordered.length]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (nearBottomRef.current) setUnseen(false);
  };
  const jump = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setUnseen(false);
  };

  // The controller rebuilds its action callbacks every render (every keystroke).
  // Stable forwarders let React.memo(TurnEntry) skip re-parsing the whole thread
  // while the operator types; they always call the latest callback.
  const liveRef = useRef(controller);
  liveRef.current = controller;
  const actions = useMemo(() => ({
    onCancelCommand: (...args: Parameters<typeof controller.handleCancelCommand>) => liveRef.current.handleCancelCommand(...args),
    onConfirmCommand: (...args: Parameters<typeof controller.handleConfirmCommand>) => liveRef.current.handleConfirmCommand(...args),
    onRetryMessage: (message: string) => { void liveRef.current.handleRetryMessage(message); },
    onSpeak: (text: string) => liveRef.current.speakText(text),
  }), []);
  const handlers = { ...actions, workoutLoggerRoute: model.workoutLoggerRoute, workoutLoggerScopeLabel: model.loggerScopeLabel };
  const available = useMemo(() => new Set(model.catalog.commands.map((command) => command.type)), [model.catalog.commands]);
  const starters = (isClientMode ? CLIENT_STARTERS : STAFF_STARTERS)
    .filter((starter) => !starter.needsClient || Boolean(controller.routeClientId));
  const runStarter = (starter: Starter) => {
    // Only a type the role-scoped catalog really carries is sent directly.
    if (starter.commandType && available.has(starter.commandType)) model.sendCommand(starter.prompt, starter.commandType);
    else model.prefill(starter.prompt);
  };

  return (
    <ConversationRoot aria-label="Conversation with Swan Coach">
      {latest ? (
        <div className="ws-live" aria-live="polite" aria-atomic="true">
          {`${latest.actor === 'coach' ? 'Swan Coach' : latest.actor === 'operator' ? 'You' : latest.label}: ${latest.body.replace(/\s+/g, ' ').slice(0, 320)}`}
        </div>
      ) : null}
      <div className="ws-scroll" ref={scrollRef} onScroll={onScroll} data-testid="ws-transcript">
        {ordered.length ? (
          <div className="ws-thread">
            {ordered.map((entry) => (
              <React.Fragment key={entry.id}>
                {dividers.has(entry.id) ? <div className="ws-day" role="separator">{dividers.get(entry.id)}</div> : null}
                <TurnEntry entry={entry} {...handlers} />
              </React.Fragment>
            ))}
            {busy ? (
              <Thinking role="status"><i /><i /><i /> Swan Coach is thinking…</Thinking>
            ) : null}
          </div>
        ) : controller.chatLoading ? (
          <div className="ws-thread"><Thinking role="status"><i /><i /><i /> Loading conversation…</Thinking></div>
        ) : (
          <EmptyState>
            <span className="ws-empty-mark"><Feather size={24} aria-hidden="true" /></span>
            <h2>{isClientMode ? 'What are we training today?' : `What do you need, ${model.user?.firstName || 'coach'}?`}</h2>
            <p>
              {isClientMode
                ? 'Log a workout, plan the next one, or ask how you are progressing.'
                : controller.routeClientId
                  ? `Talk, dictate, or type / for commands. Coaching ${model.scopeLabel}.`
                  : 'Talk, dictate, or type / for commands. Pick a client with @ to scope the chat.'}
            </p>
            <div className="ws-starters">
              {starters.map((starter) => (
                <button type="button" key={starter.title} className="ws-starter" onClick={() => runStarter(starter)}>
                  <b><starter.icon size={15} aria-hidden="true" /> {starter.title}</b>
                  <span>{starter.hint}</span>
                </button>
              ))}
            </div>
            {model.nextActionLabel ? <span className="ws-safe" role="status">Next: {model.nextActionLabel}</span> : null}
            <span className="ws-safe">Nothing saves until you approve it.</span>
          </EmptyState>
        )}
        {unseen ? (
          <button type="button" className="ws-jump" onClick={jump}>
            <ArrowDown size={15} aria-hidden="true" /> New reply
          </button>
        ) : null}
      </div>
      <WorkspaceComposer model={model} />
    </ConversationRoot>
  );
};

export default ConversationColumn;
