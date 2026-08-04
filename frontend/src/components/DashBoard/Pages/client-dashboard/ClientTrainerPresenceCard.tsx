/**
 * ============================================================================
 * FILE: ClientTrainerPresenceCard.tsx
 * PURPOSE: Put the client's TRAINER — the human they are paying for — on the
 *          client home. Photo, name, one-tap Message.
 * ============================================================================
 *
 * WHY: The 2026-08-03 launch panel (Kimi K3 + HY3, independent reviews) both
 * ranked "the trainer is invisible on the client dashboard" as the single
 * biggest absence for a trainer-led premium product. This card is the fix:
 * the human appears in the first 60 seconds.
 *
 * DATA: GET /api/assignments/my-trainer (self-scoped, added same slice).
 * States: loading → skeleton row; no trainer → renders NOTHING (a brand-new
 * unassigned client sees the onboarding card instead — never a fake trainer);
 * error → renders nothing (the card is additive trust, not critical path).
 * Swan data-card standard: low-motion, tokens with fallbacks, 44px CTA.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

interface TrainerSummary {
  id: number;
  firstName: string | null;
  lastName: string | null;
  photo: string | null;
}

const Card = styled.section`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 16px 20px;
  margin: 0 0 16px;
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    var(--surface-elevated, #003080) 0%,
    var(--bg-primary, #002060) 100%
  );
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
`;

const Avatar = styled.img`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
`;

const AvatarFallback = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary, #002060);
  border: 2px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 1rem;
`;

const Meta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
`;

const Kicker = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary, #9FB0C8);
`;

const Name = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MessageButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const SkeletonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const SkeletonBlock = styled.span`
  display: inline-block;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
`;

const AvatarSkeleton = styled(SkeletonBlock)`
  width: 52px;
  height: 52px;
  border-radius: 50%;
`;

const NameSkeleton = styled(SkeletonBlock)`
  width: 140px;
  height: 16px;
  border-radius: 8px;
`;

const ClientTrainerPresenceCard: React.FC = () => {
  const navigate = useNavigate();
  const { authAxios } = useAuth();
  const [trainer, setTrainer] = useState<TrainerSummary | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!authAxios) return;
    let isMounted = true;
    authAxios.get('/api/assignments/my-trainer')
      .then((res: { data?: { trainer?: TrainerSummary | null } }) => {
        if (isMounted) setTrainer(res?.data?.trainer ?? null);
      })
      .catch(() => { /* additive card — absent on error, never fake */ })
      .finally(() => { if (isMounted) setSettled(true); });
    return () => { isMounted = false; };
  }, [authAxios]);

  // No auth client yet (hydration, or a test rendering without one): show
  // nothing rather than an indefinite skeleton — the effect re-runs when
  // authAxios arrives.
  if (!authAxios) return null;

  if (!settled) {
    return (
      <Card aria-busy="true">
        <SkeletonRow>
          <AvatarSkeleton />
          <NameSkeleton />
        </SkeletonRow>
      </Card>
    );
  }

  if (!trainer) return null;

  const displayName = [trainer.firstName, trainer.lastName].filter(Boolean).join(' ') || 'Your Trainer';
  const initials = `${(trainer.firstName || '')[0] || ''}${(trainer.lastName || '')[0] || ''}`.toUpperCase() || 'T';

  return (
    <Card data-testid="client-trainer-presence-card">
      {trainer.photo
        ? <Avatar src={trainer.photo} alt={`${displayName} profile`} />
        : <AvatarFallback aria-hidden="true">{initials}</AvatarFallback>}
      <Meta>
        <Kicker>Your Trainer</Kicker>
        <Name>{displayName}</Name>
      </Meta>
      <MessageButton
        type="button"
        onClick={() => navigate('/dashboard/client/messages')}
        aria-label={`Message ${displayName}`}
      >
        <MessageCircle size={17} aria-hidden="true" /> Message
      </MessageButton>
    </Card>
  );
};

export default ClientTrainerPresenceCard;
