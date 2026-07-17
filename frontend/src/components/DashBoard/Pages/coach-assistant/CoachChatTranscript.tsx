/**
 * COMPONENT: CoachChatTranscript
 * PURPOSE: Talk-first conversation view for the Swan Coach terminal.
 *
 * Renders the existing command/conversation log as the live chat transcript. The
 * empty state gives concrete prompt starters and keeps the approval rule visible
 * without creating fake save actions.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Sparkles } from 'lucide-react';

import type { ConversationSummary } from '../../../../hooks/useAIChat';
import type { CommandLogConfirmation, CommandLogEntry } from './CoachCommandCenter.data';
import CoachCommandLogEntry from './CoachCommandLogEntry';
import CoachActiveThreadHeader from './CoachActiveThreadHeader';
import { dayDividerIds } from './coachTranscriptDays';

type CoachChatTranscriptProps = {
  activeThread: ConversationSummary | null;
  /** True while a send is awaiting Swan Coach — renders the pending row. */
  busy?: boolean;
  clientFacing?: boolean;
  logs: CommandLogEntry[];
  nextActionLabel?: string | null;
  onCancelCommand?: (confirmation: CommandLogConfirmation) => Promise<void>;
  onConfirmCommand?: (confirmation: CommandLogConfirmation) => Promise<{ success: boolean; error?: string }>;
  onRetryMessage?: (message: string) => void;
  onSpeak?: (text: string) => void;
  onSuggestedPrompt?: (prompt: string) => void;
  /** True while a history thread is being loaded into the transcript. */
  threadLoading?: boolean;
  workoutLoggerRoute?: string | null;
  workoutLoggerScopeLabel?: string | null;
};

const OPERATOR_PROMPTS = [
  { label: 'Log workout', prompt: "Log today's workout: " },
  { label: 'Onboard client', prompt: 'Create an onboarding draft for ' },
  { label: 'Recall history', prompt: 'Pull recent workout history and flag what changed for ' },
];

const CLIENT_PROMPTS = [
  { label: 'Log workout', prompt: "Log today's workout: " },
  { label: 'Plan next workout', prompt: 'Help me plan my next workout based on my recent training. ' },
  { label: 'Recall history', prompt: 'Pull my recent workout history and tell me what changed. ' },
];

function liveAnnouncement(entry: CommandLogEntry): string {
  const body = entry.body.replace(/\s+/g, ' ').trim();
  return `${entry.actor === 'coach' ? 'Swan Coach' : entry.label}: ${(body || entry.label).slice(0, 320)}`;
}

const CoachChatTranscript: React.FC<CoachChatTranscriptProps> = ({
  activeThread,
  busy = false,
  clientFacing = false,
  logs,
  nextActionLabel,
  onCancelCommand,
  onConfirmCommand,
  onRetryMessage,
  onSpeak,
  onSuggestedPrompt,
  threadLoading = false,
  workoutLoggerRoute,
  workoutLoggerScopeLabel,
}) => {
  const streamRef = useRef<HTMLDivElement>(null);
  const [unseenBelow, setUnseenBelow] = useState(false);

  // Controller prepends new entries (newest first); a chat reads oldest to newest.
  const ordered = useMemo(() => [...logs].reverse(), [logs]);
  const dividers = useMemo(() => dayDividerIds(ordered), [ordered]);
  const latestEntry = ordered[ordered.length - 1];
  const suggestedPrompts = clientFacing ? CLIENT_PROMPTS : OPERATOR_PROMPTS;

  const scrollToNewest = () => {
    const el = streamRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setUnseenBelow(false);
  };

  // "Near bottom" must be measured BEFORE the DOM grows: a long reply pushes
  // scrollHeight past the threshold in the same frame, which would misread a
  // pinned-to-bottom reader as scrolled-up. Track it live from scroll events.
  const wasNearBottomRef = useRef(true);
  const threadKeyRef = useRef<string | number | null>(null);
  useEffect(() => {
    const el = streamRef.current;
    const threadKey = activeThread?.id ?? null;
    const threadChanged = threadKeyRef.current !== threadKey;
    threadKeyRef.current = threadKey;
    if (threadChanged) wasNearBottomRef.current = true;
    if (!el || !logs.length) {
      if (threadChanged) setUnseenBelow(false);
      return;
    }
    // A (re)opened thread always lands on the newest message. During a live
    // session, follow the conversation only while the reader was near the
    // bottom — never yank them out of older history (background sends from
    // sibling surfaces flip `busy` too); offer a jump pill instead.
    if (threadChanged || wasNearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      wasNearBottomRef.current = true;
      setUnseenBelow(false);
    } else {
      setUnseenBelow(true);
    }
  }, [activeThread?.id, busy, logs.length]);

  const handleStreamScroll = () => {
    const el = streamRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    wasNearBottomRef.current = nearBottom;
    if (nearBottom) setUnseenBelow(false);
  };

  return (
    <section className="chat-transcript" aria-label="Conversation with Swan Coach">
      <CoachActiveThreadHeader thread={activeThread} />

      {latestEntry ? (
        <div className="transcript-live-announcement" aria-live="polite" aria-atomic="true">
          {liveAnnouncement(latestEntry)}
        </div>
      ) : null}

      {unseenBelow ? (
        <button type="button" className="transcript-jump-newest" onClick={scrollToNewest}>
          <ArrowDown size={16} aria-hidden="true" />
          New reply
        </button>
      ) : null}

      <div className="transcript-stream" ref={streamRef} onScroll={handleStreamScroll}>
        {ordered.length ? (
          <>
            {ordered.map((entry) => (
              <React.Fragment key={entry.id}>
                {dividers.has(entry.id) ? (
                  <div className="transcript-day-divider" role="separator">{dividers.get(entry.id)}</div>
                ) : null}
                <CoachCommandLogEntry
                  entry={entry}
                  onCancelCommand={onCancelCommand}
                  onConfirmCommand={onConfirmCommand}
                  onRetryMessage={onRetryMessage}
                  onSpeak={onSpeak}
                  workoutLoggerRoute={workoutLoggerRoute}
                  workoutLoggerScopeLabel={workoutLoggerScopeLabel}
                />
              </React.Fragment>
            ))}
            {busy ? (
              <div className="transcript-pending" role="status">
                <span className="voice-strip-pulse" aria-hidden="true"><i /><i /><i /></span>
                Swan Coach is thinking...
              </div>
            ) : null}
          </>
        ) : threadLoading ? (
          <div className="transcript-empty" role="status">
            <span className="voice-strip-pulse" aria-hidden="true"><i /><i /><i /></span>
            <strong>Loading thread...</strong>
          </div>
        ) : (
          <div className="transcript-empty">
            <Sparkles size={22} aria-hidden="true" />
            <strong>Talk to Swan Coach</strong>
            <p>Example: Log today's workout: bench 4x8 at 185.</p>
            <span className="transcript-empty-safe">Nothing saves until you confirm.</span>
            {nextActionLabel ? (
              <span className="transcript-empty-next" role="status" aria-label="Recommended coach action">
                Next: {nextActionLabel}
              </span>
            ) : null}
            {onSuggestedPrompt ? (
              <div className="transcript-empty-actions" aria-label="Suggested coach prompts">
                {suggestedPrompts.map(({ label, prompt }) => (
                  <button
                    type="button"
                    key={label}
                    aria-label={`Use suggestion: ${label}`}
                    onClick={() => onSuggestedPrompt(prompt)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
};

export default CoachChatTranscript;
