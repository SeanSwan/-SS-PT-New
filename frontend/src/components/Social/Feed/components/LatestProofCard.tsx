/**
 * COMPONENT: LatestProofCard
 * PURPOSE: Live entry point for the S2 Proof Card on the member's own Home
 *          (hostile review F2.5 follow-up: ProofCard shipped with no mount point).
 *
 * WHAT IT DOES: resolves the member's most recent completed session via
 * GET /api/social/proof-card/latest and renders the ProofCard for it. A 204 means
 * "no completed workout yet" — a normal state, so the card renders NOTHING rather than
 * an empty shell or an error. That matches the Home rail's existing progressive-disclosure
 * rule (no standing tombstones).
 *
 * PRIVACY: the endpoint is own-stats only, so this component can never display another
 * member's session (rule 8).
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import ProofCard from './ProofCard';

const LatestProofCard: React.FC = () => {
  const { authAxios } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authAxios.get('/api/social/proof-card/latest');
        if (cancelled) return;
        setSessionId(res.data?.proofCard?.sessionId ?? null);
      } catch {
        // No proof is a normal state; a failed lookup simply shows nothing.
        if (!cancelled) setSessionId(null);
      } finally {
        if (!cancelled) setResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authAxios]);

  if (!resolved || !sessionId) return null;
  return <ProofCard sessionId={sessionId} />;
};

export default LatestProofCard;
