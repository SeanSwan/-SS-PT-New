/**
 * COMPONENT: CoachChatTranscript
 * PURPOSE: ChatGPT-style conversation view for the Swan Coach terminal.
 *
 * Renders the command/conversation log as a chat transcript (oldest first, newest at
 * the bottom, auto-scrolled) using the existing CoachCommandLogEntry renderer — which
 * already carries inline confirmation + execution-result cards. Empty state invites the
 * trainer to talk. No data rewire: `logs` is the same stream the controller already builds.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

import type { CommandLogConfirmation, CommandLogEntry } from './CoachCommandCenter.data';
import CoachCommandLogEntry from './CoachCommandLogEntry';

type CoachChatTranscriptProps = {
  logs: CommandLogEntry[];
  onCancelCommand?: (confirmation: CommandLogConfirmation) => Promise<void>;
  onConfirmCommand?: (confirmation: CommandLogConfirmation) => Promise<{ success: boolean; error?: string }>;
  onReset: () => void;
  workoutLoggerRoute?: string | null;
};

const CoachChatTranscript: React.FC<CoachChatTranscriptProps> = ({
  logs,
  onCancelCommand,
  onConfirmCommand,
  onReset,
  workoutLoggerRoute,
}) => {
  const streamRef = useRef<HTMLDivElement>(null);

  // Controller prepends new entries (newest first); a chat reads oldest -> newest.
  const ordered = useMemo(() => [...logs].reverse(), [logs]);

  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length]);

  return (
    <section className="chat-transcript" aria-label="Conversation with Swan Coach">
      <div className="transcript-top">
        <span className="transcript-title">Conversation</span>
        <button type="button" className="transcript-reset" onClick={onReset}>
          <RefreshCw size={15} aria-hidden="true" />
          <span>Clear</span>
        </button>
      </div>

      <div className="transcript-stream" ref={streamRef} aria-live="polite">
        {ordered.length ? (
          ordered.map((entry) => (
            <CoachCommandLogEntry
              entry={entry}
              key={entry.id}
              onCancelCommand={onCancelCommand}
              onConfirmCommand={onConfirmCommand}
              workoutLoggerRoute={workoutLoggerRoute}
            />
          ))
        ) : (
          <div className="transcript-empty">
            <Sparkles size={22} aria-hidden="true" />
            <strong>Talk to Swan Coach</strong>
            <p>
              Dictate a client's workout, onboard a new client, or pick up a past conversation. Swan Coach
              prepares each action and waits for your confirmation before anything is saved.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CoachChatTranscript;
