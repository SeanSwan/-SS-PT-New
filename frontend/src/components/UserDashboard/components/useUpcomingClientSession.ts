/**
 * FILE: useUpcomingClientSession.ts
 * PURPOSE: Read the authenticated client's next scheduled session.
 */
import { useEffect, useState } from 'react';
import sessionService from '../../../services/sessionService';
import type { Session } from '../../UniversalMasterSchedule/types';

interface UpcomingClientSessionState {
  session: Session | null;
  loading: boolean;
  error: boolean;
}

function normalizeUserId(raw: unknown): string {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return String(raw);
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return '';
}

export function useUpcomingClientSession(userId: unknown): UpcomingClientSessionState {
  const [state, setState] = useState<UpcomingClientSessionState>({
    session: null,
    loading: false,
    error: false,
  });

  useEffect(() => {
    const safeUserId = normalizeUserId(userId);
    if (!safeUserId) {
      setState({ session: null, loading: false, error: false });
      return undefined;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: false }));

    sessionService.getUpcomingSessions(safeUserId, 1)
      .then((sessions) => {
        if (cancelled) return;
        setState({ session: sessions[0] ?? null, loading: false, error: false });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ session: null, loading: false, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}
