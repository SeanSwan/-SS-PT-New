/**
 * Blueprint: TodaySchedulePanel
 * Parent: InspectorPanel. Today's sessions from the Universal Master Schedule
 * (useTodaySchedule), with one "ask the coach" button per session that scopes
 * the chat to that client by ID and pre-writes a prep question by time only.
 * States: loading · error (waiver named as waiver; retry) · empty · list.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MessageCircleQuestion, RotateCcw } from 'lucide-react';
import { InspectorCard, ScheduleList } from './CoachWorkspace.panels.styles';
import type { TodaySlot, TodayScheduleState } from './useTodaySchedule';

type Props = {
  state: TodayScheduleState;
  onRetry: () => void;
  onAsk: (slot: TodaySlot) => void;
  scheduleRoute: string;
  scheduleLabel: string;
  clientMode: boolean;
};

const fmt = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function isNow(slot: TodaySlot, now: number): boolean {
  const start = slot.startsAt.getTime();
  return now >= start && now < start + slot.minutes * 60_000;
}

const TodaySchedulePanel: React.FC<Props> = ({ state, onRetry, onAsk, scheduleRoute, scheduleLabel, clientMode }) => {
  const now = Date.now();
  return (
    <InspectorCard aria-labelledby="ws-today-title">
      <div className="ws-card-head">
        <span className="ws-card-title" id="ws-today-title"><CalendarDays size={15} aria-hidden="true" /> Today</span>
        <Link className="ws-card-link" to={scheduleRoute}>{scheduleLabel}</Link>
      </div>
      {state.phase === 'loading' ? <p className="ws-card-note" role="status">Loading today’s sessions…</p> : null}
      {state.phase === 'error' ? (
        <>
          <p className="ws-card-note" data-tone="warn" role="alert">
            {state.reason === 'waiver'
              ? 'Your schedule opens once your waiver is signed.'
              : 'Today’s schedule did not load. This is not an empty day.'}
          </p>
          {state.reason === 'failed' ? (
            <button type="button" className="ws-primary" onClick={onRetry}>
              <RotateCcw size={14} aria-hidden="true" /> Try again
            </button>
          ) : null}
        </>
      ) : null}
      {state.phase === 'ready' ? (
        state.slots.length ? (
          <>
            <p className="ws-card-note">{state.scopeLabel} · {state.slots.length} session{state.slots.length === 1 ? '' : 's'}</p>
            <ScheduleList aria-label="Today's sessions">
              {state.slots.map((slot) => (
                <li key={slot.id} data-status={slot.status} data-now={isNow(slot, now) ? 'true' : undefined}>
                  <span className="ws-slot-time">{fmt(slot.startsAt)}</span>
                  <span className="ws-slot-body">
                    <span className="ws-slot-who">{slot.who}</span>
                    <span className="ws-slot-meta">
                      {slot.minutes} min · {slot.status}{slot.what ? ` · ${slot.what}` : ''}
                    </span>
                  </span>
                  {slot.status !== 'cancelled' ? (
                    <button
                      type="button"
                      className="ws-ask"
                      aria-label={`Ask Swan Coach about the ${fmt(slot.startsAt)} session`}
                      onClick={() => onAsk(slot)}
                    >
                      <MessageCircleQuestion size={16} aria-hidden="true" />
                    </button>
                  ) : <span aria-hidden="true" />}
                </li>
              ))}
            </ScheduleList>
          </>
        ) : (
          <p className="ws-card-note">
            {clientMode ? 'No session booked today.' : 'No sessions on the books today.'}{' '}
            <Link className="ws-card-link" to={scheduleRoute}>{clientMode ? 'Book one' : 'Open the schedule'}</Link>
          </p>
        )
      ) : null}
    </InspectorCard>
  );
};

export default TodaySchedulePanel;
