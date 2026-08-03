/**
 * COMPONENT: ClientMembershipCard
 * PARENT: ClientProfilePage (rendered after Personal Information)
 * PURPOSE: FTC-posture membership surface (SUPER-PROMPT §7b promoted item
 * 2): shows the client's real subscription truth and exposes the
 * EXISTING cancel path (POST /api/subscriptions/cancel →
 * cancel_at_period_end) in two honest taps — tap Cancel, tap Confirm.
 * No dark patterns: plain copy, no retention detour, access-until date
 * stated. Free tiers see status only (nothing to cancel).
 */
import React, { useEffect, useRef, useState } from 'react';
import { CreditCard } from 'lucide-react';
import styled from 'styled-components';
import SharedErrorNote from '../../../ui/ErrorNote';
import { useSubscription } from '../../../../hooks/useSubscription';

const CancelError = styled(SharedErrorNote)`
  margin: 10px 0 0;
`;

const Card = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent));
  border-radius: var(--world-panel-radius, 12px);
  padding: 1.25rem;
  margin-bottom: 1rem;
`;

const Title = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-size: 1rem;
  color: var(--text-primary, #E0ECF4);
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const Facts = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.9rem;
  color: var(--text-secondary, #c8d6e5);
  strong { color: var(--text-primary, #E0ECF4); }
`;

const CancelButton = styled.button<{ $armed: boolean }>`
  min-height: 44px;
  padding: 8px 18px;
  border-radius: 10px;
  border: 1px solid ${({ $armed }) => ($armed ? 'var(--danger, #ef4444)' : 'var(--border-soft, rgba(96, 192, 240, 0.2))')};
  background: ${({ $armed }) => ($armed ? 'color-mix(in srgb, var(--danger, #ef4444) 15%, transparent)' : 'transparent')};
  color: ${({ $armed }) => ($armed ? 'var(--danger-text, #f87171)' : 'var(--text-secondary, #c8d6e5)')};
  font-weight: 600;
  cursor: pointer;
  &:focus-visible { outline: 2px solid var(--accent-secondary, #8B5CF6); outline-offset: 2px; }
`;

const Note = styled.p`
  margin: 10px 0 0;
  font-size: 0.8rem;
  color: var(--text-muted, #94a3b8);
`;

const formatDate = (iso: string | null): string | null => {
  if (!iso) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString();
};

const ClientMembershipCard: React.FC = () => {
  const { subscription, loading, cancel, error } = useSubscription({ withTiers: false });
  const [armed, setArmed] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelDone, setCancelDone] = useState(false);
  const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (disarmTimer.current) clearTimeout(disarmTimer.current); }, []);

  // A transient status-endpoint failure must not silently remove the whole
  // membership + cancel section — a paying client losing sight of their billing
  // and cancel path on a 500 is worse than a visible "couldn't load" hint.
  if (!loading && error && !subscription) {
    return (
      <Card>
        <Title><CreditCard size={18} /> Membership</Title>
        <Facts role="status">
          <span>We couldn&apos;t load your membership details right now. Refresh to try again.</span>
        </Facts>
      </Card>
    );
  }

  // Staff get a synthetic entitlement payload with no billing facts — no card.
  if (loading || !subscription || subscription.isAdmin) return null;

  const periodEnd = formatDate(subscription.currentPeriodEnd);
  // Cancellation truth survives remounts via the status payload's cancelledAt.
  const cancelPending = cancelDone || Boolean(subscription.cancelledAt);
  // past_due/paused subs still bill or retry — the escape hatch stays visible.
  const cancellableStatus = ['active', 'trial', 'past_due', 'paused'].includes(subscription.status);
  const showCancel = subscription.tier !== 'free' && cancellableStatus && !cancelPending;

  const handleCancelTap = async () => {
    if (!armed) {
      setArmed(true);
      setCancelError(null);
      disarmTimer.current = setTimeout(() => setArmed(false), 8000);
      return;
    }
    if (disarmTimer.current) clearTimeout(disarmTimer.current);
    setCancelling(true);
    const result = await cancel('client-self-serve');
    setCancelling(false);
    setArmed(false);
    if (result?.success) {
      setCancelDone(true);
    } else {
      setCancelError(result?.message || 'Could not cancel — please try again or contact support.');
    }
  };

  return (
    <Card>
      <Title><CreditCard size={18} /> Membership</Title>
      <Row>
        <Facts>
          <span><strong>{subscription.tierName}</strong>{subscription.amount ? ` — $${subscription.amount}/mo` : ''}</span>
          <span>Status: {subscription.status}{subscription.isInTrial ? ` (trial, ${subscription.trialDaysRemaining} days left)` : ''}</span>
          {periodEnd && <span>{cancelPending ? `Access until ${periodEnd}` : `Renews ${periodEnd}`}</span>}
        </Facts>
        {showCancel && (
          <CancelButton
            type="button"
            $armed={armed}
            disabled={cancelling}
            aria-pressed={armed}
            onClick={handleCancelTap}
          >
            {cancelling ? 'Cancelling…' : armed ? 'Tap again to confirm cancel' : 'Cancel membership'}
          </CancelButton>
        )}
      </Row>
      <div aria-live="polite">
        {cancelPending && (
          <Note>
            Your membership is cancelled and will not renew.
            {periodEnd ? ` You keep full access until ${periodEnd}.` : ''}
          </Note>
        )}
        {cancelError && <CancelError>{cancelError}</CancelError>}
      </div>
      {showCancel && !armed && (
        <Note>Cancelling stops future charges at the end of the current period — two taps, no hoops.</Note>
      )}
    </Card>
  );
};

export default ClientMembershipCard;
