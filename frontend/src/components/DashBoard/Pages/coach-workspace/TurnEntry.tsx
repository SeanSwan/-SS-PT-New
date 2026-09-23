/**
 * Blueprint: TurnEntry
 * Parent: ConversationColumn. One transcript entry in the v4 reading model:
 *  - the person      → a compact right-aligned bubble (no "OPERATOR COMMAND" label);
 *  - Swan Coach      → full-width prose, rendered by the SAME CoachCommandLogEntry
 *                      the legacy page uses (variants, logger hand-off, copy, read
 *                      aloud), in its flat presentation;
 *  - a system entry  → one quiet notice line, unless it carries an approval, a
 *                      result, an access hand-off or proposals — then a card that
 *                      still delegates to CoachCommandLogEntry, so the approval
 *                      sheet, confirm/cancel and every write path stay host-fixed.
 */
import React from 'react';
import { AlertTriangle, Feather, Info } from 'lucide-react';
import CoachCommandLogEntry from '../coach-assistant/CoachCommandLogEntry';
import type { CommandLogEntry } from '../coach-assistant/CoachCommandCenter.data';
import type { CoachCommandLogEntryProps } from '../coach-assistant/CoachCommandLogEntry.types';
import { Notice, Turn } from './CoachWorkspace.conversation.styles';

type Handlers = Omit<CoachCommandLogEntryProps, 'entry' | 'presentation'>;
type Props = Handlers & { entry: CommandLogEntry };

export type TurnKind = 'user' | 'coach' | 'card' | 'notice';

export function turnKind(entry: CommandLogEntry): TurnKind {
  if (entry.actor === 'operator') return 'user';
  if (entry.actor === 'coach') return 'coach';
  const rich = Boolean(entry.commandConfirmation || entry.commandResult || entry.accessHandoff || entry.proposals?.length);
  return rich ? 'card' : 'notice';
}

const WARN = /(fail|not sent|not shown|limit|required|expired|unavailable|error|blocked)/i;

function timeOf(at?: string): string | null {
  if (!at) return null;
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const TurnEntry: React.FC<Props> = ({ entry, ...handlers }) => {
  const kind = turnKind(entry);
  const time = timeOf(entry.at);

  if (kind === 'user') {
    return (
      <Turn className="ws-turn-user" aria-label="You">
        <div className="ws-bubble">{entry.body}</div>
        {time ? <span className="ws-who"><time dateTime={entry.at}>{time}</time></span> : null}
      </Turn>
    );
  }

  if (kind === 'notice') {
    const warn = WARN.test(entry.label);
    const retry = entry.retryMessage && handlers.onRetryMessage ? entry.retryMessage : null;
    return (
      <Notice role={warn ? 'alert' : undefined} data-tone={warn ? 'warn' : undefined}>
        {warn ? <AlertTriangle size={16} aria-hidden="true" /> : <Info size={16} aria-hidden="true" />}
        <div className="ws-notice-body">
          <span className="ws-notice-title">{entry.label}</span>
          {entry.body ? <span>{entry.body}</span> : null}
          {entry.attachments?.length ? (
            <span className="ws-chips">
              {entry.attachments.map((chip) => <span className="ws-chip" key={chip}>{chip}</span>)}
            </span>
          ) : null}
        </div>
        {retry ? (
          <button type="button" className="ws-retry" onClick={() => handlers.onRetryMessage?.(retry)}>Retry</button>
        ) : null}
      </Notice>
    );
  }

  return (
    <Turn className={kind === 'coach' ? 'ws-turn-coach' : 'ws-turn-card'} aria-label={kind === 'coach' ? 'Swan Coach' : entry.label}>
      <span className="ws-who">
        <Feather size={14} aria-hidden="true" />
        <b>Swan Coach</b>
        {kind === 'card' ? <span>· {entry.label}</span> : null}
        {time ? <time dateTime={entry.at}>{time}</time> : null}
      </span>
      <div className={kind === 'card' ? 'ws-card-shell ws-flat-entry' : 'ws-flat-entry'}>
        <CoachCommandLogEntry entry={entry} presentation="flat" {...handlers} />
      </div>
    </Turn>
  );
};

export default React.memo(TurnEntry);
