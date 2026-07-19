/**
 * Dashboard V2 session and chart projections.
 *
 * Keeps model-independent transformation logic out of the role query service:
 * - booked/adherence status scopes reflect Session's authoritative status model;
 * - session rows expose only masked references and bounded display states;
 * - seven-day charts are assembled from one bounded read instead of N+1 counts.
 */
import {
  dayStart,
  fmtTime,
  maskClient,
  maskId,
  maskTrainer,
  sessionRowStatus,
} from './refs.mjs';

export const BOOKED_SESSION_STATUSES = ['scheduled', 'confirmed', 'completed'];
export const ADHERENCE_SESSION_STATUSES = ['scheduled', 'confirmed', 'completed'];

export function sessionEnd(session) {
  if (session.endDate) {
    const explicit = new Date(session.endDate);
    if (!Number.isNaN(explicit.getTime())) return explicit;
  }
  const start = session.sessionDate ? new Date(session.sessionDate) : null;
  const duration = Number(session.duration);
  return start && !Number.isNaN(start.getTime()) && Number.isFinite(duration) && duration > 0
    ? new Date(start.getTime() + duration * 60000)
    : null;
}

export function toSessionRow(session) {
  const start = session.sessionDate ? new Date(session.sessionDate) : null;
  const end = sessionEnd(session);
  return {
    id: maskId(session.id),
    clientRef: maskClient(session.userId),
    trainerRef: maskTrainer(session.trainerId),
    startLabel: fmtTime(start),
    endLabel: fmtTime(end),
    status: sessionRowStatus(
      session.status,
      session.sessionDate,
      session.attendanceStatus,
      end,
    ),
  };
}

/** Build an oldest-to-newest seven-day chart from one bounded model read. */
export function dailySeries(rows, field, unit) {
  const days = Array.from({ length: 7 }, (_, index) => dayStart(6 - index));
  const counts = new Map(days.map((day) => [day.getTime(), 0]));
  for (const row of Array.isArray(rows) ? rows : []) {
    const day = new Date(row[field]);
    if (Number.isNaN(day.getTime())) continue;
    day.setHours(0, 0, 0, 0);
    const key = day.getTime();
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  }
  return {
    labels: days.map((day) => day.toLocaleDateString('en-US', { weekday: 'short' })),
    values: days.map((day) => counts.get(day.getTime()) || 0),
    unit,
  };
}

/** Completed/booked percentage by linked client for a bounded session set. */
export function adherenceByClient(sessions) {
  const counts = new Map();
  for (const session of Array.isArray(sessions) ? sessions : []) {
    if (session.userId === null || session.userId === undefined) continue;
    if (!ADHERENCE_SESSION_STATUSES.includes(session.status)) continue;
    const key = String(session.userId);
    const current = counts.get(key) || { booked: 0, completed: 0 };
    current.booked += 1;
    if (session.status === 'completed') current.completed += 1;
    counts.set(key, current);
  }
  return new Map(
    [...counts.entries()].map(([key, value]) => [
      key, Math.round((value.completed / value.booked) * 100),
    ]),
  );
}
