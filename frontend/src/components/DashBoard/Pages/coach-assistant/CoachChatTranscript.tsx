/**
 * COMPONENT: CoachChatTranscript
 * PURPOSE: Talk-first conversation view for the Swan Coach terminal.
 *
 * Renders the existing command/conversation log as the live chat transcript. The
 * empty state gives one concrete trainer-floor example and keeps the approval
 * rule visible without adding fake prompt buttons.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Sparkles } from 'lucide-react';

import type { ConversationSummary } from '../../../../hooks/useAIChat';
import type { CommandLogConfirmation, CommandLogEntry } from './CoachCommandCenter.data';
import CoachCommandLogEntry from './CoachCommandLogEntry';
import CoachActiveThreadHeader from './CoachActiveThreadHeader';

type CoachChatTranscriptProps = {
  activeThread: ConversationSummary | null;
  logs: CommandLogEntry[];
  onCancelCommand?: (confirmation: CommandLogConfirmation) => Promise<void>;
  onConfirmCommand?: (confirmation: CommandLogConfirmation) => Promise<{ success: boolean; error?: string }>;
  onReset: () => void;
  workoutLoggerRoute?: string | null;
  workoutLoggerScopeLabel?: string | null;
};

const CoachChatTranscript: React.FC<CoachChatTranscriptProps> = ({
  activeThread,
  logs,
  onCancelCommand,
  onConfirmCommand,
  workoutLoggerRoute,
  workoutLoggerScopeLabel,
}) => {
  const streamRef = useRef<HTMLDivElement>(null);

  // Controller prepends new entries (newest first); a chat reads oldest to newest.
  const ordered = useMemo(() => [...logs].reverse(), [logs]);

  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length]);

  return (
    <section className="chat-transcript" aria-label="Conversation with Swan Coach">
      <CoachActiveThreadHeader thread={activeThread} />

      <div className="transcript-stream" ref={streamRef} aria-live="polite">
        {ordered.length ? (
          ordered.map((entry) => (
            <CoachCommandLogEntry
              entry={entry}
              key={entry.id}
              onCancelCommand={onCancelCommand}
              onConfirmCommand={onConfirmCommand}
              workoutLoggerRoute={workoutLoggerRoute}
              workoutLoggerScopeLabel={workoutLoggerScopeLabel}
            />
          ))
        ) : (
          <div className="transcript-empty">
            <Sparkles size={22} aria-hidden="true" />
            <strong>Talk to Swan Coach</strong>
            <p>Example: Log Sean's workout: bench 4x8 at 185.</p>
            <span className="transcript-empty-safe">Nothing saves until you confirm.</span>
            <ul className="transcript-empty-actions" aria-label="Suggested coach intents">
              <li>Log workout</li>
              <li>Onboard client</li>
              <li>Recall history</li>
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};

export default CoachChatTranscript;
