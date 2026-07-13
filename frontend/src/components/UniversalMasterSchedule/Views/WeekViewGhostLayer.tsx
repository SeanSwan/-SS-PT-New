/**
 * WeekViewGhostLayer — recent-history echo cards for one day column.
 *
 * Renders a faded, dashed "ghost" of the most recent client who occupied each
 * of this day's slots within the last month, but only where the slot is still
 * empty this week (selection rules live in WeekView.ghostLogic). Older ghosts
 * fade further back, so last week reads louder than three weeks ago. Gives
 * trainers instant recall of the training rhythm — weekly regulars, every-
 * other-week clients, and anyone who has drifted — so slots aren't double-
 * booked and clients aren't forgotten. Tapping a ghost opens the booking flow
 * pre-aimed at the same time.
 */
import React from 'react';
import { getWeekSessionDisplay, isKeyboardActivationKey } from './WeekView.logic';
import {
  formatGhostAge,
  getGhostClientName,
  type GhostEntry,
} from './WeekView.ghostLogic';
import {
  GhostSessionCard,
  GhostTag,
  SessionClient,
  SessionTime,
} from './WeekView.sessionStyles';

interface WeekViewGhostLayerProps {
  day: Date;
  ghosts: GhostEntry[];
  onSlotClick: (day: Date, hour: number, minute?: number) => void;
}

const WeekViewGhostLayer: React.FC<WeekViewGhostLayerProps> = ({ day, ghosts, onSlotClick }) => (
  <>
    {ghosts.map(({ session, weeksAgo }) => {
      const display = getWeekSessionDisplay(session);
      if (!display) return null;
      const ghostDate = new Date(session.sessionDate);
      const clientName = getGhostClientName(session) || 'Booked client';
      const age = formatGhostAge(weeksAgo);
      const book = () => onSlotClick(day, ghostDate.getHours(), ghostDate.getMinutes());

      return (
        <GhostSessionCard
          key={`ghost-${session.id}`}
          $top={display.top}
          $height={display.height}
          $weeksAgo={weeksAgo}
          onClick={(event) => {
            event.stopPropagation();
            book();
          }}
          onKeyDown={(event) => {
            if (!isKeyboardActivationKey(event)) return;
            event.preventDefault();
            event.stopPropagation();
            book();
          }}
          title={`${age}: ${display.timeStr} - ${clientName}${display.trainerName ? ` / ${display.trainerName}` : ''}. Tap to book this slot.`}
          role="button"
          tabIndex={0}
          aria-label={`${age} ${display.timeStr} ${clientName}. Book this slot.`}
        >
          <GhostTag>{age}</GhostTag>
          <SessionTime>{display.timeStr}</SessionTime>
          {clientName && <SessionClient>{clientName}</SessionClient>}
        </GhostSessionCard>
      );
    })}
  </>
);

export default WeekViewGhostLayer;
