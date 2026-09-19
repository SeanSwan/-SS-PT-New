/**
 * COMPONENT: ComebackMoment
 * PURPOSE: S4 shame-free welcome-back recognition (MEGA-BLUEPRINT §6 S4).
 *
 * WHAT IT DOES: asks GET /api/social/comeback whether the member's most recent completed
 * session followed a real absence, and if so shows a warm card with a cheer count.
 *
 * SHAME-FREE BY CONSTRUCTION: the endpoint does not return the length of the absence, so
 * this component cannot render one even by accident — there is no "N days" copy to write.
 * No streak language, no "don't lose it", no countdown.
 *
 * FIRES ONCE PER RETURN: the acknowledged session id is stored in localStorage, so the card
 * appears on the return itself and not on every subsequent visit.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Heart, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  ComebackActions,
  ComebackCard,
  ComebackDismiss,
  ComebackTitle,
  ComebackCopy,
  ComebackCheers,
} from './ComebackMoment.styles';

export const COMEBACK_SEEN_KEY = 'swan.comeback.seen';

interface ComebackState {
  celebrate: boolean;
  cheers: number;
  sessionId?: string | null;
}

const readSeen = (): string | null => {
  try {
    return localStorage.getItem(COMEBACK_SEEN_KEY);
  } catch {
    return null;
  }
};

const ComebackMoment: React.FC = () => {
  const { authAxios } = useAuth();
  const [state, setState] = useState<ComebackState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authAxios.get('/api/social/comeback');
        if (cancelled) return;
        const data = res.data ?? {};
        if (!data.celebrate) {
          setState({ celebrate: false, cheers: 0 });
          return;
        }
        // Pair the acknowledgement with the session that triggered it so the card fires
        // once per return rather than on every visit.
        const latest = await authAxios.get('/api/social/proof-card/latest');
        const sessionId = latest.data?.proofCard?.sessionId ?? null;
        if (!cancelled) setState({ celebrate: true, cheers: Number(data.cheers) || 0, sessionId });
      } catch {
        if (!cancelled) setState({ celebrate: false, cheers: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authAxios]);

  const acknowledge = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(COMEBACK_SEEN_KEY, state?.sessionId ?? 'true');
    } catch {
      /* storage unavailable — dismissing still applies for this session */
    }
  }, [state?.sessionId]);

  if (dismissed || !state?.celebrate) return null;
  if (state.sessionId && readSeen() === state.sessionId) return null;

  return (
    <ComebackCard role="status" data-testid="comeback-moment">
      <ComebackDismiss type="button" onClick={acknowledge} aria-label="Dismiss the welcome back card">
        <X size={16} />
      </ComebackDismiss>
      <ComebackTitle>Welcome back</ComebackTitle>
      <ComebackCopy>Good to see you training again. That first session back is the one that counts.</ComebackCopy>
      <ComebackActions>
        <ComebackCheers>
          <Heart size={14} aria-hidden="true" />
          {state.cheers > 0 ? `${state.cheers} cheering you on` : 'Your people are here'}
        </ComebackCheers>
      </ComebackActions>
    </ComebackCard>
  );
};

export default ComebackMoment;
