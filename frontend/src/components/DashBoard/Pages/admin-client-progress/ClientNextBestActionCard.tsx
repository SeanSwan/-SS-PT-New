/**
 * COMPONENT: ClientNextBestActionCard
 * OWNER: Admin Client Progress (Slice 8.5 — Progress Intelligence)
 * PURPOSE: Coach-voiced "what should this client do next" strip for the
 *          admin/trainer per-client progress surface.
 * DATA: GET /api/analytics/:userId/next-best-action (ownership-gated,
 *       coach-audience copy computed server-side from real logged data).
 * STATES: loading skeleton; error/denied -> self-hides (renders null);
 *         ready -> primary action + up to two secondary chips.
 */

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Compass } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

interface CoachAction { code: string; title: string; message: string }
interface CoachDecision { primary: CoachAction; secondary: CoachAction[] }

const Strip = styled.section`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.75rem 1.25rem;
  margin: 0 0 1rem;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  border-left: 3px solid var(--accent-primary, #60C0F0);
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--surface-primary, #002060) 70%, transparent),
    color-mix(in srgb, var(--bg-elevated, #141419) 90%, transparent));
`;

const Kicker = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  flex: 0 0 100%;
`;

const Primary = styled.div`
  min-width: 0;
  flex: 1 1 260px;
`;

const Title = styled.h4`
  margin: 0 0 0.25rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
`;

const Message = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 75%, transparent);
  font-size: 0.82rem;
  line-height: 1.5;
`;

const ChipRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 0 1 auto;
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent);
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 0.66rem;
`;

const LoadingBar = styled.div`
  height: 68px;
  margin: 0 0 1rem;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 80%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
`;

const ClientNextBestActionCard: React.FC<{ clientId: number | string | null }> = ({ clientId }) => {
  const { authAxios } = useAuth();
  const [status, setStatus] = useState<'loading' | 'ready' | 'hidden'>('loading');
  const [decision, setDecision] = useState<CoachDecision | null>(null);

  useEffect(() => {
    if (!authAxios || clientId === null || clientId === undefined || clientId === '') {
      setStatus('hidden');
      return;
    }
    let isMounted = true;
    setStatus('loading');
    authAxios
      .get(`/api/analytics/${clientId}/next-best-action`)
      .then((res: { data?: { success?: boolean; data?: CoachDecision } }) => {
        if (!isMounted) return;
        const payload = res?.data?.data;
        if (res?.data?.success && payload?.primary?.title) {
          setDecision(payload);
          setStatus('ready');
        } else {
          setStatus('hidden');
        }
      })
      .catch(() => { if (isMounted) setStatus('hidden'); });
    return () => { isMounted = false; };
  }, [authAxios, clientId]);

  if (status === 'loading') return <LoadingBar data-testid="nba-skeleton" aria-hidden="true" />;
  if (status !== 'ready' || !decision) return null;

  return (
    <Strip aria-label="Client next best action">
      <Kicker><Compass size={12} aria-hidden="true" /> Next Best Action</Kicker>
      <Primary>
        <Title>{decision.primary.title}</Title>
        <Message>{decision.primary.message}</Message>
      </Primary>
      {decision.secondary.length > 0 && (
        <ChipRow aria-label="Also worth reviewing">
          {decision.secondary.map((s) => (
            <Chip key={s.code} title={s.message}>{s.title}</Chip>
          ))}
        </ChipRow>
      )}
    </Strip>
  );
};

export default ClientNextBestActionCard;
