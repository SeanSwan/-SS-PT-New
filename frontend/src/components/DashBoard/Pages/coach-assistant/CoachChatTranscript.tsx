/**
 * COMPONENT: CoachChatTranscript
 * PURPOSE: Talk-first conversation view for the Swan Coach terminal.
 *
 * Renders the existing command/conversation log as the live chat transcript. The
 * empty state gives concrete prompt starters and keeps the approval rule visible
 * without creating fake save actions.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Sparkles } from 'lucide-react';

import type { ConversationSummary } from '../../../../hooks/useAIChat';
import type { CommandLogConfirmation, CommandLogEntry } from './CoachCommandCenter.data';
import CoachCommandLogEntry from './CoachCommandLogEntry';
import CoachActiveThreadHeader from './CoachActiveThreadHeader';

type CoachChatTranscriptProps = {
  activeThread: ConversationSummary | null;
  clientFacing?: boolean;
  logs: CommandLogEntry[];
  onCancelCommand?: (confirmation: CommandLogConfirmation) => Promise<void>;
  onConfirmCommand?: (confirmation: CommandLogConfirmation) => Promise<{ success: boolean; error?: string }>;
  onReset: () => void;
  onRetryMessage?: (message: string) => void;
  onSuggestedPrompt?: (prompt: string) => void;
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
  clientFacing = false,
  logs,
  onCancelCommand,
  onConfirmCommand,
  onRetryMessage,
  onSuggestedPrompt,
  workoutLoggerRoute,
  workoutLoggerScopeLabel,
}) => {
  const streamRef = useRef<HTMLDivElement>(null);

  // Controller prepends new entries (newest first); a chat reads oldest to newest.
  const ordered = useMemo(() => [...logs].reverse(), [logs]);
  const latestEntry = ordered[ordered.length - 1];
  const suggestedPrompts = clientFacing ? CLIENT_PROMPTS : OPERATOR_PROMPTS;

  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = logs.length ? el.scrollHeight : 0;
  }, [logs.length]);

  return (
    <section className="chat-transcript" aria-label="Conversation with Swan Coach">
      <CoachActiveThreadHeader thread={activeThread} />

      {latestEntry ? (
        <div className="transcript-live-announcement" aria-live="polite" aria-atomic="true">
          {liveAnnouncement(latestEntry)}
        </div>
      ) : null}

      <div className="transcript-stream" ref={streamRef}>
        {ordered.length ? (
          ordered.map((entry) => (
            <CoachCommandLogEntry
              entry={entry}
              key={entry.id}
              onCancelCommand={onCancelCommand}
              onConfirmCommand={onConfirmCommand}
              onRetryMessage={onRetryMessage}
              workoutLoggerRoute={workoutLoggerRoute}
              workoutLoggerScopeLabel={workoutLoggerScopeLabel}
            />
          ))
        ) : (
          <div className="transcript-empty">
            <Sparkles size={22} aria-hidden="true" />
            <strong>Talk to Swan Coach</strong>
            <p>Example: Log today's workout: bench 4x8 at 185.</p>
            <span className="transcript-empty-safe">Nothing saves until you confirm.</span>
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
