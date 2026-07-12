/**
 * WeekViewGhostLayer — last-week echo cards for one day column.
 *
 * Renders a faded, dashed "ghost" of each booking that occupied this
 * day's slots exactly one week ago, but only where this week's slot is
 * still empty (selection rules live in getGhostSessionsForDay). Gives
 * trainers instant recall of the weekly rhythm so recurring clients
 * aren't forgotten and slots aren't double-booked away. Tapping a ghost
 * opens the booking flow pre-aimed at the same time.
 */
import React from 'react';
import {
  getGhostClientName,
  getWeekSessionDisplay,
  isKeyboardActivationKey,
} from './WeekView.logic';
import {
  GhostSessionCard,
  GhostTag,
  SessionClient,
  SessionTime,
} from './WeekView.sessionStyles';

interface WeekViewGhostLayerProps {
  day: Date;
  ghosts: any[];
  onSlotClick: (day: Date, hour: number, minute?: number) => void;
}

const WeekViewGhostLayer: React.FC<WeekViewGhostLayerProps> = ({ day, ghosts, onSlotClick }) => (
  <>
    {ghosts.map((ghost) => {
      const display = getWeekSessionDisplay(ghost);
      if (!display) return null;
      const ghostDate = new Date(ghost.sessionDate);
      const clientName = getGhostClientName(ghost) || 'Booked client';
      const book = () => onSlotClick(day, ghostDate.getHours(), ghostDate.getMinutes());

      return (
        <GhostSessionCard
          key={`ghost-${ghost.id}`}
          $top={display.top}
          $height={display.height}
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
          title={`Last week: ${display.timeStr} - ${clientName}${display.trainerName ? ` / ${display.trainerName}` : ''}. Tap to book this slot.`}
          role="button"
          tabIndex={0}
          aria-label={`Last week ${display.timeStr} ${clientName}. Book this slot.`}
        >
          <GhostTag>Last wk</GhostTag>
          <SessionTime>{display.timeStr}</SessionTime>
          {clientName && <SessionClient>{clientName}</SessionClient>}
        </GhostSessionCard>
      );
    })}
  </>
);

export default WeekViewGhostLayer;
