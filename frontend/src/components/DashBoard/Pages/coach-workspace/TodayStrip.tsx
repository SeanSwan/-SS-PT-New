/**
 * Blueprint: TodayStrip
 * Parent: ConversationColumn. The Day Sheet folded into one line above the chat
 * (unified design): today's sessions in order with a now-line, from the same
 * Universal Master Schedule read as the Today view. Any chip opens Today. It
 * renders nothing while loading, on error, or on an empty day — the Today view
 * and the inspector own those states, so the chat never shows a false "clear day".
 */
import React from 'react';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { StripRoot } from './CoachWorkspace.strip.styles';
import type { TodayScheduleState } from './useTodaySchedule';

type Props = { state: TodayScheduleState; onOpen: () => void; now?: number };

const time = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const TodayStrip: React.FC<Props> = ({ state, onOpen, now = Date.now() }) => {
  if (state.phase !== 'ready') return null;
  const slots = state.slots.filter((slot) => slot.status !== 'cancelled');
  if (!slots.length) return null;
  const nextIndex = slots.findIndex((slot) => now < slot.startsAt.getTime() + slot.minutes * 60_000);
  const next = nextIndex >= 0 ? slots[nextIndex] : null;

  return (
    <StripRoot aria-label="Today on the schedule">
      <span className="ws-strip-label"><CalendarDays size={13} aria-hidden="true" /> Today</span>
      <ol>
        {slots.map((slot, index) => (
          <React.Fragment key={slot.id}>
            {index === nextIndex ? <li className="ws-strip-now" aria-hidden="true" /> : null}
            <li data-next={slot === next ? 'true' : undefined} data-past={nextIndex >= 0 && index < nextIndex ? 'true' : nextIndex < 0 ? 'true' : undefined}>
              <button type="button" onClick={onOpen} aria-label={`${time(slot.startsAt)} ${slot.who}${slot === next ? ', next' : ''} — open Today`}>
                <code>{time(slot.startsAt)}</code> {slot.who}
              </button>
            </li>
          </React.Fragment>
        ))}
      </ol>
      <button type="button" className="ws-strip-open" onClick={onOpen}>
        Full day <ChevronRight size={14} aria-hidden="true" />
      </button>
    </StripRoot>
  );
};

export default TodayStrip;
