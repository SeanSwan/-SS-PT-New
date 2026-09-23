/**
 * FILE: useTodaySchedule.ts
 * PURPOSE: Today's sessions for the Coach Workspace inspector, read from the
 * SAME source as the Universal Master Schedule (brain-v4 J11).
 *
 * Source: universalMasterScheduleService.getSessions → GET /api/sessions, whose
 * RBAC is server-side (session.service.mjs getAllSessions): admin sees the whole
 * studio, a trainer sees sessions assigned to them, a client sees their own
 * plus open slots (open slots are dropped here — they are not "my day").
 * Freshness: re-reads on the schedule's own cross-dashboard sync event
 * (setupDashboardSync), when the tab becomes visible, and on retry.
 *
 * Truth rules: an error is never rendered as an empty day; the waiver gate is
 * named as the waiver gate. Names are for this screen only — nothing here is
 * sent to a model (rule 8); "Ask coach" uses the client id and the time.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import universalMasterScheduleService, { setupDashboardSync } from '../../../../services/universal-master-schedule-service';
import type { Session } from '../../../UniversalMasterSchedule/types';

export type TodaySlot = {
  id: string;
  startsAt: Date;
  minutes: number;
  status: Session['status'];
  clientId: number | null;
  who: string;
  what: string | null;
};

export type TodayScheduleState =
  | { phase: 'loading' }
  | { phase: 'ready'; slots: TodaySlot[]; scopeLabel: string }
  | { phase: 'error'; reason: 'waiver' | 'failed' };

type Role = 'admin' | 'trainer' | 'client' | 'user';

const HIDDEN_STATUSES = new Set<Session['status']>(['available', 'blocked']);

export function dayBounds(now: Date): { start: string; end: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function displayWho(session: Session, role: Role): string {
  if (role === 'client' || role === 'user') {
    const trainer = session.trainer;
    return trainer?.firstName ? `with ${trainer.firstName}` : 'Your session';
  }
  const first = session.client?.firstName?.trim() || session.clientName?.trim()?.split(/\s+/)[0] || '';
  const lastInitial = session.client?.lastName?.trim()?.charAt(0);
  if (!first) return session.status === 'requested' ? 'Requested slot' : 'Client session';
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

function sessionTypeName(session: Session): string | null {
  const type = session.sessionType;
  if (!type) return null;
  return typeof type === 'string' ? type : type.name ?? null;
}

/** Pure: API rows → the day's visible slots, earliest first. */
export function toTodaySlots(sessions: Session[], role: Role, actorId: number | null): TodaySlot[] {
  return sessions
    .filter((session) => !HIDDEN_STATUSES.has(session.status))
    .filter((session) => (role === 'client' || role === 'user') ? Number(session.userId) === actorId : true)
    .map((session) => {
      const startsAt = new Date(session.start ?? session.sessionDate);
      const clientId = session.userId !== null && session.userId !== undefined && Number.isFinite(Number(session.userId))
        ? Number(session.userId) : null;
      return {
        id: String(session.id),
        startsAt,
        minutes: Number(session.duration) || 60,
        status: session.status,
        clientId,
        who: displayWho(session, role),
        what: sessionTypeName(session) ?? session.location ?? null,
      };
    })
    .filter((slot) => !Number.isNaN(slot.startsAt.getTime()))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function scheduleScopeLabel(role: Role): string {
  if (role === 'admin') return 'Across the studio';
  if (role === 'trainer') return 'Your sessions';
  return 'Your training';
}

export function useTodaySchedule(role: Role, actorId: number | null, enabled = true) {
  const [state, setState] = useState<TodayScheduleState>({ phase: 'loading' });
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const request = ++requestRef.current;
    const { start, end } = dayBounds(new Date());
    try {
      const sessions = await universalMasterScheduleService.getSessions({ customDateStart: start, customDateEnd: end });
      if (request !== requestRef.current) return;
      setState({ phase: 'ready', slots: toTodaySlots(sessions, role, actorId), scopeLabel: scheduleScopeLabel(role) });
    } catch (error) {
      if (request !== requestRef.current) return;
      const waiver = (error as { code?: string } | null)?.code === 'WAIVER_REQUIRED';
      setState({ phase: 'error', reason: waiver ? 'waiver' : 'failed' });
    }
  }, [actorId, enabled, role]);

  useEffect(() => {
    if (!enabled) return undefined;
    void refresh();
    const stopSync = setupDashboardSync(() => { void refresh(); });
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      requestRef.current += 1;
      stopSync();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, refresh]);

  return { state, refresh };
}
