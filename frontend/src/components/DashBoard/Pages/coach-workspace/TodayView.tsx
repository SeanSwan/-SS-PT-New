/**
 * Blueprint: TodayView (the Day Sheet)
 * Parent: CoachWorkspacePage, when the header view is "Today". The day at a
 * glance from the Universal Master Schedule (useTodaySchedule — the same source
 * as the schedule page): the day's sessions in order with a now-line, the one up next with
 * its planned workout (Plan Reveal read), and what is waiting on you.
 *
 * Every action reuses an existing path: Floor pins the client by ID; "Ask" is
 * the schedule Ask (client id + time, never a name to the model); the PDF is the
 * on-device report; "Brief my day" sends the real registry command.
 */
import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, Dumbbell, FileText, MessageCircleQuestion, RotateCcw, Sparkles } from 'lucide-react';
import { TodayRoot } from './CoachWorkspace.today.styles';
import { useSessionPlannedWorkout } from '../../../UniversalMasterSchedule/useSessionPlannedWorkout';
import { type FloorLink, localDateISO } from './floorSession';
import { useNowClock } from './useNowClock';
import type { TodaySlot } from './useTodaySchedule';
import type { CoachWorkspaceModel } from './useCoachWorkspaceModel';

type Props = { model: CoachWorkspaceModel };

const time = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** Booked statuses a Floor save may complete (never requested, completed or cancelled). */
const LINKABLE = new Set<TodaySlot['status']>(['scheduled', 'booked', 'confirmed']);

/** The booking Floor carries into its save: the logger's scheduledSessionId, the session's own date. */
export function floorLinkFor(slot: TodaySlot): FloorLink | null {
  return LINKABLE.has(slot.status)
    ? { scheduledSessionId: slot.id, date: localDateISO(slot.startsAt), startsAt: slot.startsAt.toISOString() }
    : null;
}

/** The session in progress, else the next one to start, else the last of the day. */
export function upNext(slots: TodaySlot[], now: number): TodaySlot | null {
  const live = slots.filter((slot) => slot.status !== 'cancelled');
  return live.find((slot) => now < slot.startsAt.getTime() + slot.minutes * 60_000) ?? live[live.length - 1] ?? null;
}

function PlanPeek({ clientId, day }: { clientId: number | null; day: string }) {
  const plan = useSessionPlannedWorkout(clientId, clientId ? day : null);
  if (plan.status === 'hidden') return null;
  if (plan.status === 'loading') return <p className="ws-today-note" role="status">Loading today’s plan…</p>;
  if (plan.status === 'error') return <p className="ws-today-note" data-tone="warn">Today’s plan did not load.</p>;
  if (plan.status === 'none') return <p className="ws-today-note">No plan day for today — Floor mode starts blank.</p>;
  return (
    <div className="ws-plan">
      <span className="ws-eyebrow">{plan.dayLabel || plan.planTitle || 'Today’s plan'}{plan.completionState === 'completed' ? ' · done' : ''}</span>
      <ul>
        {plan.exercises.slice(0, 5).map((exercise, index) => (
          <li key={`${exercise.name}-${index}`}><span>{exercise.name}</span><code>{exercise.setScheme}</code></li>
        ))}
      </ul>
      {plan.exercises.length > 5 ? <span className="ws-today-note">+{plan.exercises.length - 5} more</span> : null}
    </div>
  );
}

const TodayView: React.FC<Props> = ({ model }) => {
  const { schedule, isClientMode } = model;
  const state = schedule.state;
  const [picked, setPicked] = useState<string | null>(null);
  const now = useNowClock();
  const dayKey = localDateISO(new Date(now));
  // Midnight: a slot picked yesterday falls away (the schedule hook re-reads the new day itself).
  const shownDay = useRef(dayKey);
  useEffect(() => {
    if (shownDay.current === dayKey) return;
    shownDay.current = dayKey;
    setPicked(null);
  }, [dayKey]);
  const slots = state.phase === 'ready' ? state.slots : [];
  const focus = slots.find((slot) => slot.id === picked) ?? upNext(slots, now);
  const liveCount = slots.filter((slot) => slot.status !== 'cancelled').length;
  // The now-line sits before the first session that has not ended (none after the last).
  const nowBefore = slots.find((slot) => now < slot.startsAt.getTime() + slot.minutes * 60_000)?.id ?? null;
  const today = new Date(now).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  // Only a type the role-scoped catalog carries is sent directly (same rule as the starters).
  const canBrief = model.catalog.commands.some((command) => command.type === 'brief_my_day');
  // Floor and the PDF act on a client by ID only when the viewer's roster has them — never a guess that
  // could log sets under the previously pinned client if the pin were refused.
  const inRoster = Boolean(focus?.clientId && model.controller.clientPin.clients.some((client) => client.id === focus.clientId));

  return (
    <TodayRoot aria-label="Your day">
      <header className="ws-today-head">
        <span className="ws-eyebrow">{isClientMode ? 'Your training day' : 'Your day · Universal Master Schedule'}</span>
        <h1>{today}</h1>
        {state.phase === 'ready' ? (
          <div className="ws-today-chips">
            <span className="ws-pill"><b>{liveCount}</b> session{liveCount === 1 ? '' : 's'}</span>
            {!isClientMode && model.reviewTotal ? <span className="ws-pill" data-tone="gold"><b>{model.reviewTotal}</b> waiting on you</span> : null}
          </div>
        ) : null}
      </header>

      {state.phase === 'loading' ? <p className="ws-today-note" role="status">Loading today’s sessions…</p> : null}
      {state.phase === 'error' ? (
        <div className="ws-today-card" role="alert">
          <p className="ws-today-note" data-tone="warn">
            {state.reason === 'waiver' ? 'Your schedule opens once your waiver is signed.' : 'Today’s schedule did not load. This is not an empty day.'}
          </p>
          {state.reason === 'failed' ? (
            <button type="button" className="ws-btn" onClick={() => { void schedule.refresh(); }}><RotateCcw size={15} aria-hidden="true" /> Try again</button>
          ) : null}
        </div>
      ) : null}

      {state.phase === 'ready' && slots.length ? (
        <section className="ws-timeline" aria-label="Today's sessions">
          <ol>
            {slots.map((slot) => {
              const ended = now >= slot.startsAt.getTime() + slot.minutes * 60_000;
              return (
                <React.Fragment key={slot.id}>
                  {slot.id === nowBefore ? <li className="ws-now" aria-label={`Now, ${time(new Date(now))}`}><span>{time(new Date(now))}</span></li> : null}
                  <li>
                    <button
                      type="button"
                      aria-pressed={focus?.id === slot.id}
                      data-status={slot.status}
                      data-past={ended ? 'true' : undefined}
                      onClick={() => setPicked(slot.id)}
                    >
                      <span className="ws-slot-at">{time(slot.startsAt)}</span>
                      <b>{slot.who}</b>
                      <span>{slot.minutes} min{slot.status === 'cancelled' ? ' · cancelled' : ended ? ' · done' : ''}</span>
                    </button>
                  </li>
                </React.Fragment>
              );
            })}
          </ol>
        </section>
      ) : null}

      {state.phase === 'ready' && !slots.length ? (
        <div className="ws-today-card"><p className="ws-today-note">{isClientMode ? 'No session booked today.' : 'No sessions on the books today.'}</p></div>
      ) : null}

      <div className="ws-today-grid">
        {focus ? (
          <section className="ws-today-card ws-next" aria-labelledby="ws-next-title">
            <span className="ws-eyebrow">{focus !== upNext(slots, now) ? 'Selected' : now >= focus.startsAt.getTime() + focus.minutes * 60_000 ? 'Last session today' : now >= focus.startsAt.getTime() ? 'In session now' : 'Up next'}</span>
            <h2 id="ws-next-title">{focus.who} · {time(focus.startsAt)}</h2>
            <p className="ws-today-note">{focus.minutes} min · {focus.status}{focus.what ? ` · ${focus.what}` : ''}</p>
            <PlanPeek clientId={isClientMode ? (Number(model.user?.id) || null) : focus.clientId} day={localDateISO(focus.startsAt)} />
            <div className="ws-actions">
              {(isClientMode || inRoster) && focus.status !== 'cancelled' ? (
                <button type="button" className="ws-btn ws-btn-primary" onClick={() => model.startFloor(isClientMode ? null : focus.clientId, floorLinkFor(focus))}>
                  <Dumbbell size={15} aria-hidden="true" /> Start in Floor mode
                </button>
              ) : null}
              {focus.status !== 'cancelled' ? (
                <button type="button" className="ws-btn" onClick={() => { model.askAboutSession(focus); model.showView('chat'); }}>
                  <MessageCircleQuestion size={15} aria-hidden="true" /> Ask Swan Coach
                </button>
              ) : null}
              {!isClientMode && inRoster && focus.clientId ? (
                <button type="button" className="ws-btn" onClick={() => model.requestPdfFor(focus.clientId as number)}>
                  <FileText size={15} aria-hidden="true" /> Progress PDF
                </button>
              ) : null}
              {isClientMode ? (
                <button type="button" className="ws-btn" onClick={() => model.requestPdf()}>
                  <FileText size={15} aria-hidden="true" /> My progress PDF
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {!isClientMode ? (
          <aside className="ws-today-side">
            <section className="ws-today-card" aria-labelledby="ws-wait-title">
              <h2 id="ws-wait-title">Waiting on you</h2>
              <div className="ws-counts">
                <button type="button" onClick={() => model.openReview('intake')}><b>{model.counts.intake}</b><span>Intake</span></button>
                <button type="button" onClick={() => model.openReview('audio')}><b>{model.counts.audio}</b><span>Audio</span></button>
                <button type="button" onClick={() => model.openReview('drafts')}><b>{model.counts.drafts}</b><span>Drafts</span></button>
              </div>
              {model.nextActionLabel ? <p className="ws-today-note">Next: {model.nextActionLabel}</p> : null}
            </section>
            <section className="ws-today-card ws-brief" aria-labelledby="ws-brief-title">
              <h2 id="ws-brief-title"><Sparkles size={15} aria-hidden="true" /> Morning brief</h2>
              <p>Swan Coach reads today’s sessions and flags who needs attention.</p>
              <button type="button" className="ws-btn" onClick={() => (canBrief ? model.sendCommand('Brief my day', 'brief_my_day') : model.writeUnderDraft('Brief my day'))}>
                <CalendarDays size={15} aria-hidden="true" /> Brief my day
              </button>
            </section>
          </aside>
        ) : null}
      </div>
    </TodayRoot>
  );
};

export default TodayView;
